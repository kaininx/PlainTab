<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Chrome / Edge 向けの、高速で静かな壁紙中心の新しいタブページ。
</p>

<p align="center">
  <a href="../README.md">English</a> · <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome ウェブストア</a> · <a href="https://plaintab.kaininx.workers.dev">ライブデモ</a> · <a href="technical/README_en.md">技術ノート</a> · <a href="changelog-i18n/ja.txt">更新履歴</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/version-3.2.3-111827?style=flat-square" alt="Version 3.2.3">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="ビルド不要">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="Vanilla JavaScript">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="PlainTab スクリーンショット 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="PlainTab スクリーンショット 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="PlainTab スクリーンショット 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="PlainTab スクリーンショット 4" />
</div>

## PlainTab とは

PlainTab は Chrome / Edge の新しいタブを置き換える Manifest V3 拡張機能です。標準の新しいタブを、すっきりした壁紙、調整できる検索バー、必要なときだけ使うショートカットに置き換えます。

ニュースフィード、宣伝カード、アカウント、ウィジェットだらけのダッシュボードはいりません。新しいタブを開き、壁紙を見て、検索するか URL を入力して、そのまま作業に戻るためのページです。

同じページは `index.html` を直接開くだけで通常の Web ページとしても動くため、試す・読む・改造するのも簡単です。

## 試してみる

### インストール

[Chrome ウェブストアから PlainTab をインストール](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### ライブデモ

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### ローカルで実行

```bash
git clone https://github.com/kaininx/PlainTab.git
```

拡張機能モード:

1. `chrome://extensions` を開きます。
2. デベロッパーモードを有効にします。
3. 「パッケージ化されていない拡張機能を読み込む」を選びます。
4. PlainTab のプロジェクトフォルダーを選択します。

Web モード:

ブラウザーで `index.html` を直接開きます。

依存関係、パッケージマネージャー、ビルド手順は不要です。

## PlainTab を選ぶ理由

### まず壁紙を表示する

PlainTab は、新しいタブを開いた瞬間に何もない白画面ではなく壁紙が見える感覚を大切にしています。軽量な起動プレビューを `localStorage` に保存し、完全な壁紙読み込み、キャッシュ、テーマカラー計算は初回描画のあとに回します。

体感速度も製品体験の一部です。

### デフォルトで静か

ホームには壁紙、検索、少しの操作だけを置きます。ショートカット、隠しリンク、設定、バックアップ、詳細な壁紙設定はありますが、最初から画面を埋めません。

### 柔軟な壁紙ソース

Bing 日替わり壁紙、Wallhaven、アップロード画像、ローカルフォルダー、RSS、独自画像 API、動画壁紙を利用できます。毎日きれいな画像を見たいだけなら簡単に、細かく作り込みたいなら柔軟に使えます。

### 検索とショートカットは邪魔しない

検索バーは位置、サイズ、角丸、透明度、表示方式、検索履歴、検索エンジン動作を調整できます。ショートカットはコマンドパレットに置かれ、検索、追加、編集、インポート、非表示ができます。

## 機能

| 機能 | 内容 |
|------|------|
| 新しいタブの置き換え | インストール後にブラウザーの新しいタブを置き換えます |
| Web モード | 拡張機能としてパッケージせず `index.html` から実行できます |
| 高速な壁紙起動 | 早期プレビューで白いちらつきを減らします |
| Bing 壁紙 | Bing 日替わり壁紙に対応 |
| Wallhaven 壁紙 | Wallhaven からの閲覧と設定に対応 |
| ローカル壁紙 | アップロード、ギャラリー、ローカルフォルダー選択 |
| RSS / API 壁紙 | 画像フィードや独自 API を接続 |
| 動画壁紙 | 動画を壁紙として利用可能 |
| 検索バー | 位置、サイズ、スタイル、透明度、表示方式を調整 |
| 検索履歴 | 最近の検索を保存、または無効化 |
| コマンドパレット | ホームを散らかさずショートカットを管理 |
| 隠しスペース | 表示せずに使えるリンクを保存 |
| 設定パネル | UI、壁紙、ホットキー、データ、言語を管理 |
| バックアップと復元 | インポート、エクスポート、暗号化バックアップ |
| 多言語 UI | 16 言語パックを同梱 |
| AI 協作の記録 | AI 支援開発のメモとドキュメントを保持 |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="PlainTab 設定スクリーンショット 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="PlainTab 設定スクリーンショット 2" />
</div>

## 開発者向け

PlainTab は意図的に素朴な技術で作られています。

- Vanilla JavaScript、CSS、ブラウザー API。
- `npm`、`package.json`、フレームワーク、bundler はありません。
- 拡張機能モードと Web モードで同じコードベースを使います。
- Manifest V3 設定は `manifest.json` にあります。
- ランタイムスクリプトは `index.html` から直接読み込まれます。

入口としては [技術ノート](technical/README_en.md)、[リリースノート](RELEASE_NOTES.md)、[メモリとストレージ診断](ai-tasks/20260519-memory-storage-diagnostic-report.md)、[AI エージェント向け指示](../AGENTS.md) がおすすめです。

起動経路、2 層の壁紙描画、IndexedDB の大きなデータ、localStorage キー互換性、Chrome ウェブストアの権限要件には特に注意してください。

## プロジェクト構成

```text
PlainTab/
├── index.html              # 新しいタブと Web 入口
├── manifest.json           # Chrome / Edge Manifest
├── css/                    # 機能別スタイル
├── js/                     # ランタイムモジュール
├── js/wallpaper/           # 壁紙、ソース、テーマ抽出
├── wasm/                   # テーマエンジンとビルドスクリプト
├── _locales/               # 拡張機能の i18n メッセージ
├── docs/                   # ドキュメントとリリースノート
├── icon/                   # アイコン
└── imgs/                   # スクリーンショットとストア素材
```

## PlainTab が避けるもの

PlainTab は控えめな方向性を保ちます。ニュースフィード、トレンド、推薦、広告、スポンサー枠、大きな天気・カレンダー・ToDo パネル、アカウント、ソーシャル機能、クラウドコンテンツ、ホームを埋める大量のショートカット、自動再生の宣伝コンテンツは現在の方向ではありません。

Safari 版は現時点では予定していません。個人プロジェクトとして公開と保守の負担が大きいためです。

## AI 協作と学習

PlainTab はコード、ドキュメント、リファクタリング、リリース準備、診断で多くの AI 協作を使って開発されました。実際の UI、永続設定、インポート/エクスポート、壁紙保存、多言語、拡張機能と Web の両方の実行経路を持つ、実用的なサンプルです。

新しいタブ拡張の作り方、フレームワークなしの小さな frontend、AI 支援開発の記録方法、製品の抑制が技術判断に与える影響を学ぶのに向いています。

## ロードマップ

より安定した壁紙ソース、より自然な設定フロー、より分かりやすい技術文書、AI 支援開発記録の充実、API と保守コストが合えば Firefox 対応を検討します。

## コントリビュート

Issue と Pull Request を歓迎します。特にブラウザー互換性、壁紙ソース、ドキュメント、小さな UI 改善に関するものは助かります。

起動、壁紙、ストレージ、検索、設定、コマンドパレットを変更する前に、[AGENTS.md](../AGENTS.md) と `.claude/rules/` のルールを読んでください。小さく焦点の合った変更を推奨します。

## 言語

<details>
<summary>README 翻訳</summary>

- [English](../README.md)
- [简体中文](README_zh-CN.md)
- [繁體中文](README_zh-TW.md)
- [हिन्दी](README_hi.md)
- [Español](README_es.md)
- [العربية](README_ar.md)
- [Français](README_fr.md)
- [Português](README_pt_BR.md)
- [Русский](README_ru.md)
- [Deutsch](README_de.md)
- 日本語
- [Italiano](README_it.md)
- [Türkçe](README_tr.md)
- [Tiếng Việt](README_vi.md)
- [한국어](README_ko.md)
- [Polski](README_pl.md)

</details>

## 関連リンク

- [更新履歴](changelog-i18n/ja.txt)
- [詳細リリースノート](RELEASE_NOTES.md)
- [技術ノート](technical/README_en.md)
- [メモリとストレージ診断](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [ライブデモ](https://plaintab.kaininx.workers.dev)
- [Chrome ウェブストア](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## ライセンス

PlainTab は [MIT License](../LICENSE) のもとで公開されています。

[Kaelri](https://github.com/kaininx) が作成・保守しています。
