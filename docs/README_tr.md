<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Chrome ve Edge için hızlı, sakin ve duvar kâğıdı odaklı yeni sekme sayfası.
</p>

<p align="center">
  <a href="../README.md">English</a> · <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a> · <a href="https://plaintab.kaininx.workers.dev">Canlı demo</a> · <a href="technical/README_en.md">Teknik notlar</a> · <a href="changelog-i18n/tr.txt">Değişiklik günlüğü</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT Lisansı"></a>
  <img src="https://img.shields.io/badge/version-3.2.1-111827?style=flat-square" alt="Sürüm 3.2.1">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="Derleme yok">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="Vanilla JavaScript">
</p>

<div align="center">
  <img src="../imgs/chrome_01.jpg" width="45%" alt="PlainTab ekran görüntüsü 1" />
  <img src="../imgs/chrome_02.jpg" width="45%" alt="PlainTab ekran görüntüsü 2" />
</div>

## PlainTab nedir?

PlainTab, Chrome ve Edge için Manifest V3 tabanlı bir yeni sekme uzantısıdır. Varsayılan yeni sekmeyi temiz bir duvar kâğıdı, ayarlanabilir bir arama çubuğu ve ihtiyaç duyulana kadar ortada görünmeyen kısayollarla değiştirir.

Sakin ve hızlı açılan bir başlangıç sayfası isteyenler içindir: haber akışı, sponsorlu kart, hesap sistemi veya widget dolu panel yok. Sekmeyi aç, duvar kâğıdını gör, ara ya da URL yaz ve devam et.

Aynı sayfa `index.html` doğrudan açılarak bağımsız web sayfası olarak da çalışır; bu yüzden projeyi denemek, okumak ve değiştirmek kolaydır.

## Deneyin

### Kurulum

[PlainTab'i Chrome Web Store'dan yükleyin](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### Canlı demo

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### Yerelde çalıştırma

```bash
git clone https://github.com/kaininx/PlainTab.git
```

Uzantı modu:

1. `chrome://extensions` sayfasını açın.
2. Geliştirici modunu etkinleştirin.
3. "Paketlenmemiş öğe yükle" seçeneğini kullanın.
4. PlainTab proje klasörünü seçin.

Web modu:

`index.html` dosyasını doğrudan tarayıcıda açın.

Bağımlılık, paket yöneticisi veya derleme adımı yoktur.

## Neden PlainTab?

### Önce duvar kâğıdı, daha az boş bekleme

PlainTab yeni sekme açıldığında hemen bir görüntü gelmesine odaklanır. Hafif bir başlangıç önizlemesini `localStorage` içinde tutar; tam duvar kâğıdı yükleme, önbellek ve tema renkleri ilk çizimden sonraya bırakılır.

Algılanan hız burada ürün deneyiminin parçasıdır.

### Varsayılan olarak sakin

Ana sayfa duvar kâğıdı, arama ve birkaç kontrolle sınırlıdır. Kısayollar, gizli bağlantılar, ayarlar, yedekler ve gelişmiş duvar kâğıdı seçenekleri vardır, ama ekranı doldurmaz.

### Esnek duvar kâğıdı kaynakları

Bing günlük duvar kâğıdı, Wallhaven, yüklenen görseller, yerel klasör, RSS, özel görüntü API'si veya video duvar kâğıtları kullanılabilir. Basit kullanım için sade, kurcalamak isteyenler için esnektir.

### Dağınıklık oluşturmayan arama ve kısayollar

Arama çubuğunun konumu, boyutu, köşesi, şeffaflığı, görünürlüğü, geçmişi ve arama motoru davranışı ayarlanabilir. Kısayollar komut paletinde durur; bağlantı arama, ekleme, düzenleme, içe aktarma ve gizleme yapılabilir.

## Özellikler

| Özellik | Açıklama |
|---------|----------|
| Yeni sekme değiştirme | Kurulumdan sonra tarayıcının yeni sekmesini değiştirir |
| Bağımsız web modu | Uzantı paketi olmadan `index.html` ile çalışır |
| Hızlı duvar kâğıdı başlangıcı | Erken önizleme ile beyaz ekran hissini azaltır |
| Bing duvar kâğıdı | Bing günlük duvar kâğıdını destekler |
| Wallhaven duvar kâğıdı | Wallhaven üzerinden göz atma ve ayarlamayı destekler |
| Yerel duvar kâğıtları | Yükleme, galeri ve yerel klasör seçimi |
| RSS / API | Özel görüntü akışları ve API'leri |
| Video duvar kâğıdı | Videoyu duvar kâğıdı olarak kullanma |
| Arama çubuğu | Konum, boyut, stil, şeffaflık ve görünürlük |
| Arama geçmişi | Son aramaları saklar veya kapatılabilir |
| Komut paleti | Kısayolları ana sayfayı kalabalıklaştırmadan yönetir |
| Gizli alan | Görünmeden erişilebilir bağlantılar |
| Ayarlar paneli | Arayüz, duvar kâğıdı, kısayollar, veri ve dil |
| Yedekleme | İçe/dışa aktarma ve şifreli yedekler |
| Çok dilli arayüz | 16 dil paketi içerir |
| Yapay zekâ iş birliği izi | AI destekli geliştirme notları ve belgeleri |

## Geliştiriciler için

PlainTab bilinçli olarak sade teknoloji kullanır:

- Vanilla JavaScript, CSS ve tarayıcı API'leri.
- `npm`, `package.json`, framework veya bundler yok.
- Uzantı ve web modu için tek kod tabanı.
- Manifest V3 ayarları `manifest.json` içinde.
- Çalışma zamanı scriptleri doğrudan `index.html` tarafından yüklenir.

Başlangıç noktaları: [Teknik notlar](technical/README_en.md), [Sürüm notları](RELEASE_NOTES.md), [Bellek ve depolama tanısı](ai-tasks/20260519-memory-storage-diagnostic-report.md), [AI agent talimatları](../AGENTS.md).

Dikkatli olunması gereken alanlar: açılış yolu, iki katmanlı duvar kâğıdı gösterimi, büyük verilerin IndexedDB ile saklanması, localStorage anahtar uyumluluğu ve Chrome Web Store izin beklentileri.

## Proje yapısı

```text
PlainTab/
├── index.html              # Yeni sekme ve web girişi
├── manifest.json           # Chrome / Edge manifest dosyası
├── css/                    # Özelliklere göre stiller
├── js/                     # Çalışma zamanı modülleri
├── js/wallpaper/           # Duvar kâğıtları, kaynaklar ve tema çıkarımı
├── wasm/                   # Tema motoru ve derleme scriptleri
├── _locales/               # Uzantı i18n mesajları
├── docs/                   # Belgeler ve sürüm notları
├── icon/                   # Simgeler
└── imgs/                   # Ekran görüntüleri ve mağaza görselleri
```

## PlainTab nelerden kaçınır?

PlainTab sakin kalacaktır. Haber akışları, trendler, öneriler, açılış reklamları, sponsorlu kartlar, büyük hava durumu/takvim/görev panelleri, hesap sistemleri, sosyal özellikler, bulut içerik akışları, ana sayfayı kaplayan onlarca kısayol ve otomatik oynayan tanıtım içerikleri mevcut yönün parçası değildir.

Safari sürümü şimdilik planlanmıyor; yayınlama ve bakım maliyeti kişisel bir proje için gerçekçi değil.

## AI iş birliği ve öğrenme

PlainTab kod, dokümantasyon, refactor, sürüm hazırlığı ve tanılama süreçlerinde yoğun AI iş birliğiyle geliştirildi. Gerçek arayüzü, kalıcı ayarları, içe/dışa aktarma akışları, duvar kâğıdı depolaması, çoklu dili ve uzantı/web çalışma yolları olan tamamlanmış bir örnektir.

Yeni sekme uzantısı geliştirmeyi, framework'süz küçük frontend yapısını, AI destekli geliştirmeyi belgelendirmeyi ve ürün sadeliğinin teknik kararlara etkisini incelemek için uygundur.

## Yol haritası

Daha kararlı duvar kâğıdı kaynakları, daha akıcı ayar akışları, daha açık teknik belgeler, daha kapsamlı AI geliştirme kayıtları ve API/bakım şartları uygunsa Firefox desteği değerlendirilebilir.

## Katkı

Issue ve pull request'ler memnuniyetle karşılanır; özellikle tarayıcı uyumluluğu, duvar kâğıdı kaynakları, dokümantasyon ve küçük UI iyileştirmeleri.

Başlangıç, duvar kâğıdı, depolama, arama, ayarlar veya komut paleti davranışını değiştirmeden önce [AGENTS.md](../AGENTS.md) ve `.claude/rules/` altındaki kuralları okuyun. Küçük, odaklı değişiklikler tercih edilir.

## Diller

<details>
<summary>README çevirileri</summary>

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
- Türkçe
- [Tiếng Việt](README_vi.md)
- [한국어](README_ko.md)
- [Polski](README_pl.md)

</details>

## Bağlantılar

- [Değişiklik günlüğü](changelog-i18n/tr.txt)
- [Ayrıntılı sürüm notları](RELEASE_NOTES.md)
- [Teknik notlar](technical/README_en.md)
- [Bellek ve depolama tanısı](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [Canlı demo](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## Lisans

PlainTab [MIT Lisansı](../LICENSE) ile açık kaynaklıdır.

[Kaelri](https://github.com/kaininx) tarafından oluşturulmuş ve sürdürülmektedir.
