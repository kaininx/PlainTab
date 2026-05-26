# Chrome Web Store Release Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local Chrome Web Store draft update helper that takes a downloaded GitHub Release zip, updates localized store listings, uploads through the newest supported API path, prints dashboard links, and leaves publishing to the maintainer.

**Architecture:** Keep tag-triggered GitHub Release unchanged. Add focused local tools under `upload/tools/`: `build_release.py` builds the latest tag zip and `chrome_webstore_release.py` calls it before updating Chrome Web Store draft metadata/package state. The Chrome helper uses V2 for upload/status where available and V1.1 only for metadata/listing updates. Keep tests self-contained by stubbing network calls and filesystem fixtures instead of requiring real Chrome credentials.

**Tech Stack:** GitHub Actions, Python 3 standard library, Chrome Web Store API V2 and V1.1, existing `docs/store-listing/*.txt`.

---

### Task 1: Script Contract And Tests

**Files:**
- Create: `upload/tools/chrome_webstore_release.py`
- Create: `docs/ai-tasks/20260527-chrome-webstore-release-test.py`

- [ ] **Step 1: Write failing tests for listing loading and metadata merge**

Create `docs/ai-tasks/20260527-chrome-webstore-release-test.py` with tests that import `upload/tools/chrome_webstore_release.py`, create a temporary `docs/store-listing` directory, and assert:
- all listing files are read into locale keys
- `pt_BR` becomes `pt_BR`, `zh-CN` becomes `zh_CN`, and `zh-TW` becomes `zh_TW` for Chrome locale metadata
- metadata merge preserves unrelated fields and writes long descriptions into localized metadata

- [ ] **Step 2: Run the test and confirm it fails**

Run: `python docs/ai-tasks/20260527-chrome-webstore-release-test.py`
Expected: fail because `upload/tools/chrome_webstore_release.py` does not exist.

- [ ] **Step 3: Implement minimal listing and metadata helpers**

Create `upload/tools/chrome_webstore_release.py` with pure functions:
- `chrome_locale(locale)`
- `load_store_listings(path)`
- `merge_listing_metadata(metadata, listings, field_name)`

- [ ] **Step 4: Run the test and confirm it passes**

Run: `python docs/ai-tasks/20260527-chrome-webstore-release-test.py`
Expected: pass.

### Task 2: API Client And Dry Run

**Files:**
- Modify: `upload/tools/chrome_webstore_release.py`
- Modify: `docs/ai-tasks/20260527-chrome-webstore-release-test.py`

- [ ] **Step 1: Write failing tests for request construction**

Add tests with a fake `urlopen` transport and assert:
- OAuth refresh token request goes to `https://oauth2.googleapis.com/token`
- V2 upload uses `https://chromewebstore.googleapis.com/upload/v2/publishers/{publisherId}/items/{itemId}:upload`
- V2 status uses `https://chromewebstore.googleapis.com/v2/publishers/{publisherId}/items/{itemId}:fetchStatus`
- V1.1 metadata update uses `https://www.googleapis.com/chromewebstore/v1.1/items/{itemId}`
- dry-run prints planned operations without calling network mutating endpoints

- [ ] **Step 2: Run the test and confirm it fails**

Run: `python docs/ai-tasks/20260527-chrome-webstore-release-test.py`
Expected: fail because API client methods are missing.

- [ ] **Step 3: Implement API client**

Add:
- `ChromeWebStoreConfig.from_env()`
- `ChromeWebStoreConfig.from_sources()` with local `upload/store-secrets.toml` support
- `ChromeWebStoreClient.fetch_token()`
- `fetch_draft_metadata()`
- `update_metadata_v11()`
- `upload_zip_v2()`
- `fetch_status_v2()`
- CLI args: optional `--zip` and `--dry-run`; no arguments should call `upload/tools/build_release.py`, update listing metadata, upload the latest tag zip from `release/`, fetch status, and print dashboard links.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `python docs/ai-tasks/20260527-chrome-webstore-release-test.py`
Expected: pass.

### Task 3: Local Secret Template And Dashboard Links

**Files:**
- Create: `upload/store-secrets.example.toml`
- Modify: `.gitignore`
- Modify: `upload/tools/chrome_webstore_release.py`

- [ ] **Step 1: Add local secret template**

Create `upload/store-secrets.example.toml` with a `[chrome_web_store]` section and no real secret values. Add `upload/store-secrets.toml` to `.gitignore`.

- [ ] **Step 2: Print dashboard links**

After local upload/status operations, print the Chrome Web Store item editor and package tab URLs so the maintainer can review the draft and publish manually.

- [ ] **Step 3: Validate script dry-run**

Run: `python upload/tools/chrome_webstore_release.py --dry-run --zip release/PlainTab-v0.0.0.zip`
Expected: reports planned operations and does not require the zip to exist in dry-run mode.

### Task 4: Documentation And Verification

**Files:**
- Test: `docs/ai-tasks/20260527-chrome-webstore-release-test.py`

- [ ] **Step 1: Document the release split**

Keep release documentation out of README and technical README. The implementation plan, script help, and `upload/store-secrets.example.toml` document local-only secret fields.

- [ ] **Step 2: Run final checks**

Run:
- `python docs/ai-tasks/20260527-chrome-webstore-release-test.py`
- `python -m py_compile upload/tools/chrome_webstore_release.py docs/ai-tasks/20260527-chrome-webstore-release-test.py`
- `git diff --check`

Expected: all pass.
