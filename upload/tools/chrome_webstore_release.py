#!/usr/bin/env python3
"""Build and upload a PlainTab Chrome Web Store draft package."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib import request


TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

import build_release  # noqa: E402


TOKEN_URL = "https://oauth2.googleapis.com/token"
V2_UPLOAD_URL = "https://chromewebstore.googleapis.com/upload/v2/publishers/{publisher_id}/items/{item_id}:upload"
V2_STATUS_URL = "https://chromewebstore.googleapis.com/v2/publishers/{publisher_id}/items/{item_id}:fetchStatus"

REPO_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = Path(__file__).resolve().parents[1]
STORE_SECRETS_FILENAME = "store-secrets.toml"
CHROME_SECRET_SECTION = "chrome_web_store"


@dataclass(frozen=True)
class ChromeWebStoreConfig:
    client_id: str
    client_secret: str
    refresh_token: str
    extension_id: str
    publisher_id: str

    @classmethod
    def from_local(cls, secret_path: str | Path | None = None) -> "ChromeWebStoreConfig":
        path = Path(secret_path) if secret_path else UPLOAD_DIR / STORE_SECRETS_FILENAME
        if not path.is_file():
            raise SystemExit(f"Missing local credential file: {path}")

        data = tomllib.loads(path.read_text(encoding="utf-8"))
        section = data.get(CHROME_SECRET_SECTION)
        if not isinstance(section, dict):
            raise SystemExit(f"Missing [{CHROME_SECRET_SECTION}] section in {path}")

        def value(key: str, env_key: str = "") -> str:
            return os.environ.get(env_key or key.upper()) or str(section.get(key) or "")

        config = cls(
            client_id=value("oauth_client_id", "CWS_CLIENT_ID"),
            client_secret=value("oauth_client_secret", "CWS_CLIENT_SECRET"),
            refresh_token=value("oauth_refresh_token", "CWS_REFRESH_TOKEN"),
            extension_id=value("extension_id", "CWS_EXTENSION_ID"),
            publisher_id=value("publisher_id", "CWS_PUBLISHER_ID"),
        )
        missing = [
            name
            for name, field_value in {
                "oauth_client_id": config.client_id,
                "oauth_refresh_token": config.refresh_token,
                "extension_id": config.extension_id,
                "publisher_id": config.publisher_id,
            }.items()
            if not field_value
        ]
        if missing:
            raise SystemExit(f"Missing Chrome Web Store config values in {path}: {', '.join(missing)}")
        return config


class ChromeWebStoreClient:
    def __init__(self, config: ChromeWebStoreConfig, opener=request.urlopen) -> None:
        self.config = config
        self.opener = opener

    def fetch_token(self) -> str:
        body: dict[str, str] = {
            "client_id": self.config.client_id,
            "refresh_token": self.config.refresh_token,
            "grant_type": "refresh_token",
        }
        if self.config.client_secret:
            body["client_secret"] = self.config.client_secret

        response = self._json_request(TOKEN_URL, "POST", body)
        token = response.get("access_token")
        if not token:
            raise RuntimeError("OAuth response did not include access_token")
        return str(token)

    def upload_zip(self, token: str, zip_path: str | Path) -> dict[str, Any]:
        path = Path(zip_path)
        req = request.Request(
            V2_UPLOAD_URL.format(
                publisher_id=self.config.publisher_id,
                item_id=self.config.extension_id,
            ),
            data=path.read_bytes(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/zip",
                "X-Goog-Upload-Protocol": "raw",
                "X-Goog-Upload-File-Name": path.name,
            },
            method="POST",
        )
        with self.opener(req) as response:
            return read_json_response(response)

    def fetch_status(self, token: str) -> dict[str, Any]:
        url = V2_STATUS_URL.format(
            publisher_id=self.config.publisher_id,
            item_id=self.config.extension_id,
        )
        return self._json_request(url, "GET", token=token)

    def _json_request(
        self,
        url: str,
        method: str,
        body: dict[str, Any] | None = None,
        token: str | None = None,
    ) -> dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = request.Request(url, data=data, headers=headers, method=method)
        with self.opener(req) as response:
            return read_json_response(response)


def read_json_response(response: Any) -> dict[str, Any]:
    text = response.read().decode("utf-8")
    result = json.loads(text) if text else {}
    if not isinstance(result, dict):
        result = {"value": result}
    if hasattr(response, "status"):
        result["_httpStatus"] = response.status
    return result


def prepare_release_zip(zip_arg: str | None, dry_run: bool = False) -> Path:
    if zip_arg:
        return Path(zip_arg)

    tag = build_release.get_latest_tag()
    zip_path = build_release.RELEASE_DIR / f"PlainTab-{tag}.zip"
    if not dry_run:
        build_release.RELEASE_DIR.mkdir(exist_ok=True)
        build_release.build_zip(tag, zip_path)
    return zip_path


def dashboard_links(config: ChromeWebStoreConfig) -> dict[str, str]:
    editor = f"https://chrome.google.com/webstore/devconsole/{config.publisher_id}/{config.extension_id}/edit"
    return {
        "editor": editor,
        "package": f"{editor}/package",
        "listing": f"{editor}/listing",
    }


def item_summary(item: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for key in ("uploadState", "crxVersion", "itemId", "name"):
        if item.get(key):
            lines.append(f"{key}: {item[key]}")
    for key in ("itemError", "errors", "warnings"):
        if item.get(key):
            lines.append(f"{key}: {json.dumps(item[key], ensure_ascii=False)}")
    return lines


def wait_for_upload_status(client: ChromeWebStoreClient, token: str, attempts: int = 6) -> dict[str, Any]:
    status = client.fetch_status(token)
    for _ in range(attempts - 1):
        if status.get("uploadState") != "UPLOAD_IN_PROGRESS":
            break
        time.sleep(2)
        status = client.fetch_status(token)
    return status


def print_response(title: str, response: dict[str, Any]) -> None:
    print(f"{title}:")
    print(json.dumps(response, ensure_ascii=False, indent=2, sort_keys=True))


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", dest="zip_path", help="Use an existing zip instead of building the latest tag.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be uploaded without calling Google APIs.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    zip_path = prepare_release_zip(args.zip_path, dry_run=args.dry_run)

    if args.dry_run:
        print("Chrome Web Store package upload dry run")
        print(f"- build/upload zip: {zip_path}")
        print("- upload package via Chrome Web Store API V2")
        print("- no listing metadata update")
        print("- no publish")
        return 0

    if not zip_path.is_file():
        raise SystemExit(f"Release zip not found: {zip_path}")

    config = ChromeWebStoreConfig.from_local()
    client = ChromeWebStoreClient(config)
    token = client.fetch_token()

    upload_result = client.upload_zip(token, zip_path)
    print(
        "Uploaded release zip via V2: "
        f"uploadState={upload_result.get('uploadState', 'UNKNOWN')}, "
        f"crxVersion={upload_result.get('crxVersion', 'unknown')}"
    )
    print_response("Upload response", upload_result)

    status = wait_for_upload_status(client, token)
    print_response("Fetch status response", status)
    for line in item_summary(status):
        print(line)

    links = dashboard_links(config)
    print("Chrome Web Store draft links:")
    print(f"- Item editor: {links['editor']}")
    print(f"- Package tab: {links['package']}")
    print(f"- Listing tab: {links['listing']}")
    print("Next listing command:")
    print("python upload/tools/chrome_webstore_listing_dashboard.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
