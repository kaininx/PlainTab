<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  一個快速、安靜、以桌布為核心的 Chrome / Edge 新分頁。
</p>

<p align="center">
  <a href="../README.md">English</a>
  ·
  <a href="README_zh-CN.md">简体中文</a>
  ·
  <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome 線上應用程式商店</a>
  ·
  <a href="https://plaintab.kaininx.workers.dev">線上體驗</a>
  ·
  <a href="technical/README_en.md">Technical Notes</a>
  ·
  <a href="changelog-i18n/zh-TW.txt">更新日誌</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/version-3.2.1-111827?style=flat-square" alt="Version 3.2.1">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="無需建置">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="原生 JavaScript">
</p>

<div align="center">
  <img src="../imgs/chrome_01.jpg" width="45%" alt="PlainTab 截圖 1" />
  <img src="../imgs/chrome_02.jpg" width="45%" alt="PlainTab 截圖 2" />
</div>

## PlainTab 是什麼

PlainTab 是一個基於 Manifest V3 的 Chrome / Edge 新分頁擴充功能。安裝後，它會把預設新分頁換成一張乾淨的桌布、一個可調整的搜尋列，以及需要時才出現的捷徑入口。

它適合想要安靜起始頁的人：沒有新聞流，沒有推廣卡片，沒有帳號系統，也沒有滿版小工具。打開新分頁，看一眼桌布，搜尋或輸入網址，然後繼續做自己的事。

同一個頁面也可以直接以網頁模式執行：用瀏覽器開啟 `index.html` 就能體驗，因此也很適合閱讀、修改和學習。

## 先試試看

### 安裝

[從 Chrome 線上應用程式商店安裝 PlainTab](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### 開啟線上體驗

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### 本機執行

```bash
git clone https://github.com/kaininx/PlainTab.git
```

擴充功能模式：

1. 開啟 `chrome://extensions`。
2. 啟用「開發人員模式」。
3. 選擇「載入未封裝項目」。
4. 選取 PlainTab 專案資料夾。

網頁模式：

直接用瀏覽器開啟 `index.html`。

不需要安裝依賴，不需要套件管理器，也不需要建置步驟。

## 為什麼選 PlainTab

### 桌布優先，盡量少等空白

PlainTab 很在意打開新分頁時「馬上有畫面」的感覺。它會在 `localStorage` 裡保存輕量的啟動預覽，先讓桌布出現，再把更完整的桌布載入、快取和主題色計算交給執行階段處理。

這代表專案把體感速度視為產品體驗的一部分，而不只是效能數字。

### 預設安靜

首頁只保留桌布、搜尋和少量控制入口，不主動搶注意力。捷徑、隱藏空間、設定、備份和更深入的桌布選項都在，但不會一開始就攤滿畫面。

### 桌布來源彈性

你可以使用 Bing 每日桌布、Wallhaven、上傳圖片、本機資料夾、RSS 圖片源、自訂圖片 API，或影片桌布。只想每天換一張圖時可以很簡單；想慢慢調整自己的桌布流程時，也有足夠空間。

### 搜尋與捷徑不佔畫面

搜尋列支援位置、大小、圓角、透明度、顯示方式、搜尋紀錄和搜尋引擎行為調整。捷徑放在命令面板裡，可以搜尋、新增、編輯、匯入和隱藏，不會把新分頁變成一整片圖示。

## 功能

| 功能 | 說明 |
|------|------|
| 新分頁替換 | 安裝後接管瀏覽器的新分頁 |
| 獨立網頁模式 | 不打包擴充功能也能從 `index.html` 執行 |
| 快速桌布啟動 | 透過早期預覽路徑減少新分頁空白閃爍 |
| Bing 桌布 | 支援 Bing 每日桌布 |
| Wallhaven 桌布 | 支援基於 Wallhaven 的桌布瀏覽與設定 |
| 本機桌布 | 支援上傳圖片、圖庫管理和本機資料夾選擇 |
| RSS / API 桌布 | 支援接入自訂圖片源和圖片 API |
| 影片桌布 | 支援選擇影片作為桌布 |
| 搜尋列 | 可調整位置、大小、樣式、透明度和顯示方式 |
| 搜尋紀錄 | 可保存最近搜尋，也可以關閉 |
| 命令面板 | 用可搜尋、可編輯的方式管理捷徑，不佔首頁 |
| 隱藏空間 | 保存想要隨時存取、但不想顯示出來的連結 |
| 設定面板 | 管理介面、桌布、快捷鍵、資料和語言 |
| 備份與還原 | 支援匯入、匯出和加密備份流程 |
| 多語言介面 | 內建 16 種介面語言 |
| AI 協作記錄 | 保留 AI 輔助開發過程中的文件和任務記錄 |

## 給開發者

PlainTab 有意保持技術棧樸素：

- 原生 JavaScript、CSS 和瀏覽器 API。
- 沒有 `npm`，沒有 `package.json`，沒有前端框架，也沒有打包工具。
- 擴充功能模式和獨立網頁模式共用同一套程式碼。
- `manifest.json` 管理 Manifest V3 擴充功能設定。
- 執行階段腳本由 `index.html` 直接按順序載入。

建議從這些地方開始看：

- [Technical notes](technical/README_en.md)：架構、啟動路徑和模組職責。
- [詳細更新說明](RELEASE_NOTES.md)：功能演進紀錄。
- [記憶體與儲存診斷](ai-tasks/20260519-memory-storage-diagnostic-report.md)：桌布快取與儲存成長邊界。
- [AI Agent 協作說明](../AGENTS.md)：專案限制和維護規則。

這些區域改動時要特別小心：

- 啟動路徑經過專門設計，用來減少新分頁白屏閃爍。
- 桌布渲染使用穩定的 back 層和過渡用的 front 層。
- 大型桌布資料需要透過儲存模組和 IndexedDB 管理。
- 除非有遷移邏輯，否則要保持 localStorage key 相容。
- 擴充功能權限需要繼續符合 Chrome 線上應用程式商店的審查預期。

## 專案結構

```text
PlainTab/
├── index.html              # 新分頁和獨立網頁入口
├── manifest.json           # Chrome / Edge 擴充功能清單
├── css/                    # 依功能拆分的頁面樣式
├── js/                     # 執行階段模組
├── js/wallpaper/           # 桌布渲染、來源和主題色提取
├── wasm/                   # 桌布主題引擎的原始碼和建置腳本
├── _locales/               # Chrome 擴充功能 i18n 文字
├── docs/                   # 使用文件、發布說明、技術說明和任務紀錄
├── icon/                   # 擴充功能圖示
└── imgs/                   # 截圖和商店素材
```

## PlainTab 不打算做什麼

PlainTab 會繼續保持克制。下面這些功能不在目前方向裡：

- 新聞流、熱門榜或推薦內容。
- 開屏廣告、贊助卡片或推廣位。
- 大面積天氣、日曆或待辦面板。
- 帳號系統、社交功能或雲端內容流。
- 把幾十個捷徑固定鋪滿首頁。
- 自動播放的推廣內容。

Safari 版本目前也沒有計畫。對個人專案來說，它需要額外的發布和維護成本，現階段不太現實。

## AI 協作與學習

PlainTab 在編碼、文件、重構、發布準備和診斷過程中大量使用了 AI 協作。它不是只做給人看的展示專案，而是一個完整的新分頁擴充功能：有真實介面、持久化設定、匯入匯出、桌布儲存、多語言介面，也同時支援擴充功能和網頁執行環境。

如果你想學習這些內容，它會是很好的樣本：

- 瀏覽器新分頁擴充功能是怎麼做出來的；
- 不用前端框架的小型專案如何組織；
- AI 輔助開發如何留下可回顧、可審查的記錄；
- 產品上的克制如何影響技術決策。

## 路線圖

PlainTab 後續可能繼續往這些方向完善：

- 更穩定的桌布來源。
- 更順手的設定和桌布配置流程。
- 更清楚的技術文件和程式碼說明。
- 更完整的 AI 輔助開發記錄。
- 如果擴充功能 API 和維護成本允許，未來可能支援 Firefox。

## 參與貢獻

歡迎提交 Issue 和 Pull Request，尤其是瀏覽器相容性、桌布來源、文件和小範圍介面優化相關的改進。

在修改啟動、桌布、儲存、搜尋、設定或命令面板行為前，請先閱讀 [AGENTS.md](../AGENTS.md) 和 `.claude/rules/` 下的相關規則。PlainTab 的開啟體驗比較敏感，建議優先做小而聚焦的改動。

## 語言

<details>
<summary>README 翻譯</summary>

- [English](../README.md)
- [简体中文](README_zh-CN.md)
- 繁體中文
- [हिन्दी](README_hi.md)
- [Español](README_es.md)
- [العربية](README_ar.md)
- [Français](README_fr.md)
- [Português](README_pt_BR.md)
- [Русский](README_ru.md)
- [Deutsch](README_de.md)
- [日本語](README_ja.md)
- [Italiano](README_it.md)
- [Türkçe](README_tr.md)
- [Tiếng Việt](README_vi.md)
- [한국어](README_ko.md)
- [Polski](README_pl.md)

</details>

## 相關連結

- [更新日誌](changelog-i18n/zh-TW.txt)
- [詳細更新說明](RELEASE_NOTES.md)
- [Technical notes](technical/README_en.md)
- [記憶體與儲存診斷](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [線上體驗](https://plaintab.kaininx.workers.dev)
- [Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub 專案首頁](https://github.com/kaininx/PlainTab)

## 授權

PlainTab 基於 [MIT License](../LICENSE) 開源。

由 [Kaelri](https://github.com/kaininx) 建立並維護。
