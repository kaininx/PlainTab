# PlainTab 上传工具说明

这个目录放维护者本地使用的发布辅助工具，不属于扩展运行时代码，也不会被打进 Chrome Web Store 上传包。

## 文件说明

- `tools/build_release.py`：根据 git tag 生成 `release/PlainTab-vX.Y.Z.zip`。
- `tools/chrome_webstore_release.py`：生成最新 tag 的 zip，并通过 Chrome Web Store API V2 上传为草稿包。它只上传包，不更新 listing，不发布。
- `tools/chrome_webstore_listing_dashboard.py`：打开 Chrome Web Store Developer Dashboard，用浏览器自动化逐个语言填写“产品详情”，每个语言都会点击一次“保存草稿”并等待保存完成。
- `tools/_chrome_webstore_listing_dashboard.mjs`：dashboard 自动化的内部 Playwright 脚本，由 Python 包装脚本调用，不需要手动运行。
- `store-secrets.example.toml`：可提交的本地凭据模板。
- `store-secrets.toml`：本地真实凭据文件，已被 git 忽略。

## 本地凭据

先复制模板：

```powershell
Copy-Item upload\store-secrets.example.toml upload\store-secrets.toml
```

Chrome Web Store 只需要填写这个 section：

```toml
[chrome_web_store]
oauth_client_id = ""
oauth_client_secret = ""
oauth_refresh_token = ""
extension_id = ""
publisher_id = ""
```

`oauth_client_secret` 和 `oauth_refresh_token` 是敏感信息，只能留在本地，不要提交 `store-secrets.toml`。

## 生成发布 Zip

生成最新 git tag 的 zip：

```powershell
python upload/tools/build_release.py
```

生成指定 tag 的 zip：

```powershell
python upload/tools/build_release.py v3.2.3
```

输出位置：

```text
release/PlainTab-v3.2.3.zip
```

生成 zip 时会排除文档、文档图片、wasm 构建产物、benchmark、dotfile、Python 脚本、Markdown 文件，以及整个 `upload/` 目录。

## 上传 Chrome 草稿包

日常只需要运行：

```powershell
python upload/tools/chrome_webstore_release.py
```

脚本会自动执行：

1. 调用 `tools/build_release.py` 生成最新 tag 的 zip。
2. 读取 `upload/store-secrets.toml`。
3. 用 refresh token 换取 access token。
4. 通过 Chrome Web Store API V2 上传 zip。
5. 通过 V2 查询上传状态并输出后台链接。

它不会更新商店描述，也不会发布扩展。

只检查流程、不联网上传：

```powershell
python upload/tools/chrome_webstore_release.py --dry-run
```

调试时使用已有 zip，不重新生成：

```powershell
python upload/tools/chrome_webstore_release.py --zip release/PlainTab-v3.2.3.zip
```

## 更新 16 国语言产品详情

上传包成功后运行：

```powershell
python upload/tools/chrome_webstore_listing_dashboard.py
```

脚本会读取 `docs/store-listing/*.txt`，打开：

```text
https://chrome.google.com/webstore/devconsole/{publisher_id}/{extension_id}/edit/listing
```

然后按语言逐个执行：

1. 选择当前编辑语言。
2. 填写详细描述 textarea。
3. 点击“保存草稿 / Save draft”。
4. 等待保存成功，再进入下一个语言。

第一次运行会在 `upload/.tool-cache/playwright/` 安装本地 Playwright 工具包，并启动一个普通 Chrome：

```text
http://127.0.0.1:9222
```

脚本使用 Chrome DevTools 连接这个浏览器，而不是使用 Playwright 自己启动的浏览器。这样可以避开 Google 登录页的“不安全浏览器”拦截。

`upload/.chrome-webstore-profile/` 会保存这个 Chrome 的登录状态，后续运行通常不需要重新登录。缓存和 profile 目录都被 git 忽略。

如果打开后要求登录 Google，请在弹出的浏览器里手动登录；登录完成后脚本会继续。

如果 `9222` 端口被占用，可以换一个端口：

```powershell
python upload/tools/chrome_webstore_listing_dashboard.py --cdp-port 9223
```

只检查会读取哪些语言、不打开浏览器：

```powershell
python upload/tools/chrome_webstore_listing_dashboard.py --dry-run
```

## 使用的 Chrome API

OAuth access token：

- `POST https://oauth2.googleapis.com/token`

上传草稿包：

- `POST https://chromewebstore.googleapis.com/upload/v2/publishers/{publisherId}/items/{itemId}:upload`

查询上传状态：

- `GET https://chromewebstore.googleapis.com/v2/publishers/{publisherId}/items/{itemId}:fetchStatus`

发布接口没有实现，这是有意保留的边界。最终发布由维护者在后台手动完成。

## 安全说明

脚本不会打印 OAuth secret、refresh token 或 access token，也不会把 token 放进命令行参数。

脚本会通过 HTTPS 把凭据发送到 Google OAuth 和 Chrome Web Store API。普通 HTTPS 代理通常只能看到目标域名，看不到请求体；但如果代理或本机安全软件安装了可信根证书并解密 HTTPS，它就可能看到 OAuth 请求内容。运行上传脚本时，请使用可信网络和可信代理。
