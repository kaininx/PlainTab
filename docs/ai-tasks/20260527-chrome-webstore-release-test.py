#!/usr/bin/env python3
import importlib.util
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RELEASE_SCRIPT = ROOT / "upload" / "tools" / "chrome_webstore_release.py"
DASHBOARD_SCRIPT = ROOT / "upload" / "tools" / "chrome_webstore_listing_dashboard.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def load_release_module():
    return load_module("chrome_webstore_release", RELEASE_SCRIPT)


def load_dashboard_module():
    release = load_release_module()
    sys.modules["chrome_webstore_release"] = release
    return load_module("chrome_webstore_listing_dashboard", DASHBOARD_SCRIPT)


class ChromeWebStoreReleaseTest(unittest.TestCase):
    def test_dashboard_load_store_listings_maps_file_names_to_cws_locales(self):
        dashboard = load_dashboard_module()
        with tempfile.TemporaryDirectory() as tmp:
            listing_dir = Path(tmp)
            (listing_dir / "en.txt").write_text("English listing\n", encoding="utf-8")
            (listing_dir / "pt_BR.txt").write_text("Portuguese listing\n", encoding="utf-8")
            (listing_dir / "zh-CN.txt").write_text("Simplified listing\n", encoding="utf-8")
            (listing_dir / "zh-TW.txt").write_text("Traditional listing\n", encoding="utf-8")

            listings = dashboard.load_store_listings(listing_dir)

        self.assertEqual(
            listings,
            {
                "en": "English listing",
                "pt-BR": "Portuguese listing",
                "zh-CN": "Simplified listing",
                "zh-TW": "Traditional listing",
            },
        )

    def test_config_loads_store_secrets_toml_and_env_overrides(self):
        cws = load_release_module()
        old_env = dict(os.environ)
        try:
            os.environ.clear()
            os.environ["CWS_REFRESH_TOKEN"] = "env-refresh"
            with tempfile.TemporaryDirectory() as tmp:
                secret_path = Path(tmp) / "store-secrets.toml"
                secret_path.write_text(
                    "\n".join(
                        [
                            "[chrome_web_store]",
                            'oauth_client_id = "file-client"',
                            'oauth_client_secret = "file-secret"',
                            'oauth_refresh_token = "file-refresh"',
                            'extension_id = "file-extension"',
                            'publisher_id = "file-publisher"',
                        ]
                    ),
                    encoding="utf-8",
                )

                config = cws.ChromeWebStoreConfig.from_local(secret_path=secret_path)
        finally:
            os.environ.clear()
            os.environ.update(old_env)

        self.assertEqual(config.client_id, "file-client")
        self.assertEqual(config.client_secret, "file-secret")
        self.assertEqual(config.refresh_token, "env-refresh")
        self.assertEqual(config.extension_id, "file-extension")
        self.assertEqual(config.publisher_id, "file-publisher")

    def test_client_uses_v2_upload_and_status_only(self):
        cws = load_release_module()
        calls = []

        class FakeResponse:
            status = 200

            def __init__(self, payload):
                self.payload = payload

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self):
                return json.dumps(self.payload).encode("utf-8")

        def opener(req):
            calls.append(
                {
                    "url": req.full_url,
                    "method": req.get_method(),
                    "data": req.data,
                    "headers": dict(req.header_items()),
                }
            )
            if req.full_url == cws.TOKEN_URL:
                return FakeResponse({"access_token": "token-123"})
            return FakeResponse({"uploadState": "SUCCESS", "crxVersion": "9.9.9"})

        config = cws.ChromeWebStoreConfig("client", "secret", "refresh", "item123", "publisher456")
        client = cws.ChromeWebStoreClient(config, opener=opener)
        with tempfile.TemporaryDirectory() as tmp:
            zip_path = Path(tmp) / "PlainTab-v9.9.9.zip"
            zip_path.write_bytes(b"zip")

            token = client.fetch_token()
            client.upload_zip(token, zip_path)
            client.fetch_status(token)

        self.assertEqual(calls[0]["url"], cws.TOKEN_URL)
        self.assertEqual(
            calls[1]["url"],
            "https://chromewebstore.googleapis.com/upload/v2/publishers/publisher456/items/item123:upload",
        )
        self.assertEqual(calls[1]["method"], "POST")
        self.assertEqual(calls[1]["headers"]["X-goog-upload-protocol"], "raw")
        self.assertEqual(
            calls[2]["url"],
            "https://chromewebstore.googleapis.com/v2/publishers/publisher456/items/item123:fetchStatus",
        )
        self.assertEqual(calls[2]["method"], "GET")
        self.assertFalse(any("chromewebstore/v1.1/items/item123" in call["url"] for call in calls))

    def test_prepare_release_zip_builds_latest_when_zip_is_not_provided(self):
        cws = load_release_module()
        calls = []

        class FakeBuildRelease:
            RELEASE_DIR = Path("release")

            @staticmethod
            def get_latest_tag():
                calls.append("latest")
                return "v9.9.9"

            @staticmethod
            def build_zip(tag, output_name):
                calls.append((tag, output_name))

        old_build_release = cws.build_release
        try:
            cws.build_release = FakeBuildRelease
            zip_path = cws.prepare_release_zip(None, dry_run=False)
        finally:
            cws.build_release = old_build_release

        self.assertEqual(zip_path, Path("release") / "PlainTab-v9.9.9.zip")
        self.assertEqual(calls, ["latest", ("v9.9.9", Path("release") / "PlainTab-v9.9.9.zip")])

    def test_release_dry_run_does_not_require_env_or_zip_file(self):
        cws = load_release_module()
        old_env = dict(os.environ)
        try:
            os.environ.clear()
            out = StringIO()
            with redirect_stdout(out):
                code = cws.main(["--dry-run", "--zip", "release/missing.zip"])
        finally:
            os.environ.clear()
            os.environ.update(old_env)

        self.assertEqual(code, 0)
        self.assertIn("upload package via Chrome Web Store API V2", out.getvalue())
        self.assertIn("no listing metadata update", out.getvalue())
        self.assertIn("no publish", out.getvalue())

    def test_dashboard_links_use_publisher_and_extension(self):
        cws = load_release_module()
        config = cws.ChromeWebStoreConfig("client", "secret", "refresh", "item123", "publisher456")

        links = cws.dashboard_links(config)

        self.assertEqual(
            links["editor"],
            "https://chrome.google.com/webstore/devconsole/publisher456/item123/edit",
        )
        self.assertEqual(
            links["package"],
            "https://chrome.google.com/webstore/devconsole/publisher456/item123/edit/package",
        )
        self.assertEqual(
            links["listing"],
            "https://chrome.google.com/webstore/devconsole/publisher456/item123/edit/listing",
        )

    def test_dashboard_dry_run_does_not_install_or_open_browser(self):
        dashboard = load_dashboard_module()
        out = StringIO()
        with redirect_stdout(out):
            code = dashboard.run_dashboard_automation(
                url="https://example.test/listing",
                listings={"en": "English"},
                profile_dir=Path("profile"),
                dry_run=True,
            )

        self.assertEqual(code, 0)
        self.assertIn("browser automation not started", out.getvalue())


if __name__ == "__main__":
    unittest.main()
