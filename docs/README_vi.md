<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Trang tab mới nhanh, yên tĩnh và ưu tiên hình nền cho Chrome và Edge.
</p>

<p align="center">
  <a href="../README.md">English</a> · <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a> · <a href="https://plaintab.kaininx.workers.dev">Dùng thử</a> · <a href="technical/README_en.md">Ghi chú kỹ thuật</a> · <a href="changelog-i18n/vi.txt">Nhật ký thay đổi</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="Giấy phép MIT"></a>
  <img src="https://img.shields.io/badge/version-3.2.1-111827?style=flat-square" alt="Phiên bản 3.2.1">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="Không cần build">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="JavaScript thuần">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="Ảnh chụp PlainTab 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="Ảnh chụp PlainTab 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="Ảnh chụp PlainTab 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="Ảnh chụp PlainTab 4" />
</div>

## PlainTab là gì

PlainTab là tiện ích Manifest V3 cho trang tab mới của Chrome và Edge. Nó thay trang mặc định bằng một hình nền gọn gàng, thanh tìm kiếm có thể tùy chỉnh và các lối tắt chỉ xuất hiện khi bạn cần.

PlainTab dành cho người muốn một trang bắt đầu nhẹ và yên: không bảng tin, không thẻ quảng bá, không tài khoản, không dashboard đầy widget. Mở tab, nhìn hình nền, tìm kiếm hoặc nhập URL, rồi tiếp tục việc của bạn.

Cùng một trang cũng có thể chạy như web độc lập bằng cách mở trực tiếp `index.html`, nên dự án rất dễ thử, đọc và chỉnh sửa.

## Dùng thử

### Cài đặt

[Cài PlainTab từ Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### Mở bản demo

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### Chạy cục bộ

```bash
git clone https://github.com/kaininx/PlainTab.git
```

Chế độ tiện ích:

1. Mở `chrome://extensions`.
2. Bật chế độ nhà phát triển.
3. Chọn "Load unpacked".
4. Chọn thư mục dự án PlainTab.

Chế độ web:

Mở trực tiếp `index.html` trong trình duyệt.

Không cần dependency, package manager hay bước build.

## Vì sao chọn PlainTab

### Hình nền xuất hiện trước, ít chờ màn hình trắng hơn

PlainTab chú trọng cảm giác mở tab mới và có hình ngay. Nó lưu một bản xem trước nhẹ trong `localStorage`, sau đó mới xử lý tải đầy đủ, cache và màu chủ đề sau lần vẽ đầu tiên.

Tốc độ cảm nhận là một phần của trải nghiệm, không chỉ là con số benchmark.

### Mặc định yên tĩnh

Trang chính chỉ giữ hình nền, tìm kiếm và vài điều khiển. Lối tắt, liên kết ẩn, cài đặt, sao lưu và tùy chọn hình nền nâng cao đều có, nhưng không chiếm màn hình.

### Nguồn hình nền linh hoạt

Bạn có thể dùng hình nền hằng ngày của Bing, Wallhaven, ảnh tải lên, thư mục cục bộ, RSS, API ảnh riêng hoặc hình nền video. PlainTab đơn giản cho dùng hằng ngày và đủ linh hoạt nếu bạn muốn tùy biến.

### Tìm kiếm và lối tắt không gây rối

Thanh tìm kiếm hỗ trợ vị trí, kích thước, bo góc, độ trong suốt, chế độ hiển thị, lịch sử và hành vi công cụ tìm kiếm. Lối tắt nằm trong command palette để tìm, thêm, sửa, nhập và ẩn liên kết.

## Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| Thay trang tab mới | Thay tab mới của trình duyệt sau khi cài |
| Chế độ web độc lập | Chạy từ `index.html` mà không cần đóng gói tiện ích |
| Khởi động hình nền nhanh | Giảm màn hình trắng bằng bản xem trước sớm |
| Hình nền Bing | Hỗ trợ hình nền hằng ngày của Bing |
| Hình nền Wallhaven | Hỗ trợ duyệt và đặt hình từ Wallhaven |
| Hình nền cục bộ | Tải ảnh, quản lý gallery và chọn thư mục cục bộ |
| RSS / API | Kết nối nguồn ảnh và API tùy chỉnh |
| Hình nền video | Dùng video làm hình nền |
| Thanh tìm kiếm | Vị trí, kích thước, kiểu, độ trong suốt và hiển thị |
| Lịch sử tìm kiếm | Lưu tìm kiếm gần đây hoặc tắt đi |
| Command palette | Quản lý lối tắt mà không làm rối trang chính |
| Không gian ẩn | Lưu liên kết có thể dùng nhưng không hiển thị |
| Bảng cài đặt | Giao diện, hình nền, phím tắt, dữ liệu và ngôn ngữ |
| Sao lưu và khôi phục | Nhập, xuất và sao lưu mã hóa |
| Giao diện đa ngôn ngữ | Bao gồm 16 gói ngôn ngữ |
| Dấu vết cộng tác AI | Ghi chú và tài liệu từ quá trình phát triển với AI |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="Ảnh chụp cài đặt PlainTab 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="Ảnh chụp cài đặt PlainTab 2" />
</div>

## Dành cho nhà phát triển

PlainTab cố ý giữ công nghệ đơn giản:

- JavaScript thuần, CSS và API trình duyệt.
- Không `npm`, `package.json`, framework hay bundler.
- Một codebase cho chế độ tiện ích và web.
- Cấu hình Manifest V3 trong `manifest.json`.
- Script runtime được tải trực tiếp từ `index.html`.

Điểm bắt đầu: [ghi chú kỹ thuật](technical/README_en.md), [release notes](RELEASE_NOTES.md), [chẩn đoán bộ nhớ và lưu trữ](ai-tasks/20260519-memory-storage-diagnostic-report.md), [hướng dẫn cho AI agent](../AGENTS.md).

Các vùng cần cẩn thận: đường khởi động, render hình nền hai lớp, dữ liệu lớn trong IndexedDB, tương thích key localStorage và quyền theo kỳ vọng Chrome Web Store.

## Cấu trúc dự án

```text
PlainTab/
├── index.html              # Tab mới và entry web
├── manifest.json           # Manifest Chrome / Edge
├── css/                    # Style theo tính năng
├── js/                     # Module runtime
├── js/wallpaper/           # Hình nền, nguồn và trích màu chủ đề
├── wasm/                   # Theme engine và script build
├── _locales/               # Tin nhắn i18n của tiện ích
├── docs/                   # Tài liệu và ghi chú phát hành
├── icon/                   # Biểu tượng
└── imgs/                   # Ảnh chụp và tài nguyên store
```

## PlainTab tránh điều gì

PlainTab sẽ giữ sự tối giản. Tin tức, xu hướng, gợi ý, quảng cáo mở màn, thẻ tài trợ, bảng thời tiết/lịch/todo lớn, tài khoản, tính năng xã hội, luồng nội dung cloud, hàng chục lối tắt cố định và nội dung quảng bá tự phát không nằm trong hướng hiện tại.

Phiên bản Safari hiện chưa được lên kế hoạch vì chi phí phát hành và bảo trì chưa phù hợp với dự án cá nhân.

## Cộng tác AI và học tập

PlainTab được phát triển với nhiều cộng tác AI trong code, tài liệu, refactor, chuẩn bị phát hành và chẩn đoán. Đây không phải demo đồ chơi: nó có giao diện thật, cài đặt bền vững, import/export, lưu hình nền, nhiều ngôn ngữ và cả chế độ tiện ích lẫn web.

Dự án phù hợp để học cách làm tiện ích tab mới, tổ chức frontend nhỏ không framework, ghi lại phát triển có AI hỗ trợ và xem sự tiết chế sản phẩm ảnh hưởng đến quyết định kỹ thuật ra sao.

## Lộ trình

Có thể tiếp tục với nguồn hình nền ổn định hơn, luồng cài đặt mượt hơn, tài liệu kỹ thuật rõ hơn, hồ sơ phát triển AI đầy đủ hơn và có thể hỗ trợ Firefox nếu API và chi phí bảo trì phù hợp.

## Đóng góp

Issue và pull request luôn được chào đón, nhất là về tương thích trình duyệt, nguồn hình nền, tài liệu và tinh chỉnh UI nhỏ.

Trước khi sửa khởi động, hình nền, lưu trữ, tìm kiếm, cài đặt hoặc command palette, hãy đọc [AGENTS.md](../AGENTS.md) và các quy tắc trong `.claude/rules/`. Ưu tiên thay đổi nhỏ và tập trung.

## Ngôn ngữ

<details>
<summary>Bản dịch README</summary>

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
- [日本語](README_ja.md)
- [Italiano](README_it.md)
- [Türkçe](README_tr.md)
- Tiếng Việt
- [한국어](README_ko.md)
- [Polski](README_pl.md)

</details>

## Liên kết

- [Nhật ký thay đổi](changelog-i18n/vi.txt)
- [Release notes chi tiết](RELEASE_NOTES.md)
- [Ghi chú kỹ thuật](technical/README_en.md)
- [Chẩn đoán bộ nhớ và lưu trữ](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [Dùng thử](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## Giấy phép

PlainTab là mã nguồn mở theo [giấy phép MIT](../LICENSE).

Được tạo và duy trì bởi [Kaelri](https://github.com/kaininx).
