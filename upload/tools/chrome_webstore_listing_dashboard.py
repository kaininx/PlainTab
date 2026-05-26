#!/usr/bin/env python3
"""Fill Chrome Web Store listing descriptions through the Developer Dashboard."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from urllib import request
from urllib.error import URLError
from pathlib import Path


TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from chrome_webstore_release import ChromeWebStoreConfig, dashboard_links  # noqa: E402


REPO_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = Path(__file__).resolve().parents[1]
DEFAULT_LISTING_DIR = REPO_ROOT / "docs" / "store-listing"
DEFAULT_PROFILE_DIR = UPLOAD_DIR / ".chrome-webstore-profile"
PLAYWRIGHT_CACHE_DIR = UPLOAD_DIR / ".tool-cache" / "playwright"
NODE_SCRIPT = TOOLS_DIR / "_chrome_webstore_listing_dashboard.mjs"
DEFAULT_CDP_PORT = 9222


def cws_locale(file_stem: str) -> str:
    code = file_stem.replace("_", "-")
    if code == "he":
        return "iw"
    return code


def load_store_listings(listing_dir: str | Path | None = None) -> dict[str, str]:
    root = Path(listing_dir) if listing_dir is not None else DEFAULT_LISTING_DIR
    if not root.is_dir():
        raise FileNotFoundError(f"Listing directory not found: {root}")

    listings: dict[str, str] = {}
    for path in sorted(root.glob("*.txt")):
        text = path.read_text(encoding="utf-8").strip()
        if not text:
            raise ValueError(f"Listing file is empty: {path}")
        listings[cws_locale(path.stem)] = text
    if "en" not in listings:
        raise ValueError("docs/store-listing/en.txt is required")
    return listings


def ensure_playwright_package(cache_dir: Path = PLAYWRIGHT_CACHE_DIR) -> Path:
    node_modules = cache_dir / "node_modules"
    package_dir = node_modules / "playwright"
    if package_dir.is_dir():
        return node_modules

    cache_dir.mkdir(parents=True, exist_ok=True)
    npm = "npm.cmd" if os.name == "nt" else "npm"
    print(f"Installing local Playwright package cache: {cache_dir}")
    subprocess.check_call(
        [
            npm,
            "install",
            "--prefix",
            str(cache_dir),
            "--no-audit",
            "--no-fund",
            "--silent",
            "playwright@latest",
        ],
        cwd=REPO_ROOT,
    )
    return node_modules


def find_chrome_executable() -> str:
    candidates = [
        os.environ.get("CHROME_PATH", ""),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        str(Path.home() / r"AppData\Local\Google\Chrome\Application\chrome.exe"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    return "chrome.exe" if os.name == "nt" else "google-chrome"


def is_cdp_ready(endpoint: str) -> bool:
    try:
        with request.urlopen(f"{endpoint.rstrip('/')}/json/version", timeout=1.5) as response:
            return response.status == 200
    except (OSError, URLError):
        return False


def wait_for_cdp(endpoint: str, timeout_seconds: int = 20) -> None:
    started_at = time.time()
    while time.time() - started_at < timeout_seconds:
        if is_cdp_ready(endpoint):
            return
        time.sleep(0.5)
    raise RuntimeError(f"Chrome DevTools endpoint did not become ready: {endpoint}")


def launch_chrome_for_cdp(endpoint: str, profile_dir: Path, url: str, port: int) -> None:
    if is_cdp_ready(endpoint):
        return

    chrome = find_chrome_executable()
    profile_dir.mkdir(parents=True, exist_ok=True)
    print(f"Launching regular Chrome for dashboard automation: {chrome}")
    subprocess.Popen(
        [
            chrome,
            f"--remote-debugging-port={port}",
            f"--user-data-dir={profile_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            "--lang=en-US",
            url,
        ],
        cwd=REPO_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    wait_for_cdp(endpoint)


def run_dashboard_automation(
    url: str,
    listings: dict[str, str],
    profile_dir: Path,
    dry_run: bool = False,
    save_timeout_ms: int = 30000,
    cdp_port: int = DEFAULT_CDP_PORT,
) -> int:
    cdp_endpoint = f"http://127.0.0.1:{cdp_port}"
    print(f"Listing page: {url}")
    print(f"Locales: {', '.join(listings)}")
    print(f"Chrome profile: {profile_dir}")
    print(f"Chrome DevTools endpoint: {cdp_endpoint}")

    if dry_run:
        print("Chrome Web Store listing dashboard dry run")
        print("- browser automation not started")
        return 0

    node_modules = ensure_playwright_package()
    launch_chrome_for_cdp(cdp_endpoint, profile_dir, url, cdp_port)

    payload = {
        "url": url,
        "locales": listings,
        "cdpEndpoint": cdp_endpoint,
        "saveTimeoutMs": save_timeout_ms,
    }
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False) as payload_file:
        json.dump(payload, payload_file, ensure_ascii=False)
        payload_path = Path(payload_file.name)

    env = dict(os.environ)
    env["NODE_PATH"] = str(node_modules)
    node = "node.exe" if os.name == "nt" else "node"
    try:
        return subprocess.call([node, str(NODE_SCRIPT), "--payload", str(payload_path)], cwd=REPO_ROOT, env=env)
    finally:
        try:
            payload_path.unlink()
        except OSError:
            pass


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--listing-dir", default=str(DEFAULT_LISTING_DIR), help="Directory containing per-locale .txt files.")
    parser.add_argument("--profile-dir", default=str(DEFAULT_PROFILE_DIR), help="Persistent regular Chrome profile for dashboard login.")
    parser.add_argument("--cdp-port", type=int, default=DEFAULT_CDP_PORT, help="Chrome remote debugging port.")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--save-timeout-ms", type=int, default=30000)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    config = ChromeWebStoreConfig.from_local()
    listings = load_store_listings(args.listing_dir)
    url = dashboard_links(config)["listing"]
    return run_dashboard_automation(
        url=url,
        listings=listings,
        profile_dir=Path(args.profile_dir),
        dry_run=args.dry_run,
        save_timeout_ms=args.save_timeout_ms,
        cdp_port=args.cdp_port,
    )


if __name__ == "__main__":
    raise SystemExit(main())
