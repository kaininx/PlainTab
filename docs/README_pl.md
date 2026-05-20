<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Szybka, spokojna i skupiona na tapetach strona nowej karty dla Chrome i Edge.
</p>

<p align="center">
  <a href="../README.md">English</a> · <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a> · <a href="https://plaintab.kaininx.workers.dev">Demo online</a> · <a href="technical/README_en.md">Notatki techniczne</a> · <a href="changelog-i18n/pl.txt">Lista zmian</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="Licencja MIT"></a>
  <img src="https://img.shields.io/badge/version-3.2.1-111827?style=flat-square" alt="Wersja 3.2.1">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="Bez budowania">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="Vanilla JavaScript">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="Zrzut ekranu PlainTab 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="Zrzut ekranu PlainTab 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="Zrzut ekranu PlainTab 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="Zrzut ekranu PlainTab 4" />
</div>

## Czym jest PlainTab

PlainTab to rozszerzenie Manifest V3 dla nowej karty w Chrome i Edge. Zastępuje domyślną stronę czystą tapetą, konfigurowalnym paskiem wyszukiwania i skrótami, które pozostają schowane, dopóki nie są potrzebne.

Jest dla osób, które chcą spokojnej strony startowej: bez wiadomości, promowanych kart, konta i pulpitu pełnego widżetów. Otwierasz kartę, widzisz tapetę, wyszukujesz albo wpisujesz URL i wracasz do pracy.

Ta sama strona działa też jako samodzielna strona WWW po otwarciu `index.html`, więc projekt łatwo przetestować, przeczytać i zmienić.

## Wypróbuj

### Instalacja

[Zainstaluj PlainTab z Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### Demo online

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### Uruchom lokalnie

```bash
git clone https://github.com/kaininx/PlainTab.git
```

Tryb rozszerzenia:

1. Otwórz `chrome://extensions`.
2. Włącz tryb dewelopera.
3. Wybierz „Załaduj rozpakowane”.
4. Wskaż katalog projektu PlainTab.

Tryb web:

Otwórz `index.html` bezpośrednio w przeglądarce.

Bez zależności, bez menedżera pakietów i bez kroku budowania.

## Dlaczego PlainTab

### Najpierw tapeta, mniej pustego czekania

PlainTab dba o to, aby po otwarciu nowej karty od razu pojawił się obraz. Lekki podgląd startowy jest trzymany w `localStorage`, a pełne ładowanie tapety, cache i kolory motywu są wykonywane po pierwszym renderowaniu.

Odczuwalna szybkość jest częścią produktu, nie tylko wynikiem benchmarku.

### Spokój domyślnie

Strona główna zostawia tylko tapetę, wyszukiwanie i kilka kontrolek. Skróty, ukryte linki, ustawienia, kopie zapasowe i bardziej zaawansowane opcje są dostępne, ale nie zajmują ekranu.

### Elastyczne źródła tapet

Możesz użyć codziennej tapety Bing, Wallhaven, przesłanych obrazów, folderu lokalnego, RSS, własnego API obrazów albo tapet wideo. PlainTab może być prosty na co dzień i elastyczny dla osób lubiących konfigurację.

### Wyszukiwanie i skróty bez bałaganu

Pasek wyszukiwania obsługuje położenie, rozmiar, zaokrąglenie, przezroczystość, widoczność, historię i zachowanie wyszukiwarki. Skróty są w palecie poleceń, gdzie można je wyszukiwać, dodawać, edytować, importować i ukrywać.

## Funkcje

| Funkcja | Opis |
|---------|------|
| Nowa karta | Zastępuje stronę nowej karty po instalacji |
| Tryb web | Działa z `index.html` bez pakowania rozszerzenia |
| Szybki start tapety | Ogranicza białe mignięcia dzięki wczesnemu podglądowi |
| Tapeta Bing | Obsługuje codzienną tapetę Bing |
| Tapeta Wallhaven | Obsługuje przeglądanie i ustawianie z Wallhaven |
| Tapety lokalne | Przesyłanie, galeria i wybór folderu lokalnego |
| RSS / API | Podłącza feedy i własne API obrazów |
| Tapety wideo | Pozwala używać wideo jako tapety |
| Pasek wyszukiwania | Położenie, rozmiar, styl, przezroczystość i widoczność |
| Historia wyszukiwania | Zapisuje ostatnie wyszukiwania lub można ją wyłączyć |
| Paleta poleceń | Zarządza skrótami bez zaśmiecania strony |
| Ukryta przestrzeń | Linki dostępne, ale niewidoczne |
| Panel ustawień | Interfejs, tapety, skróty, dane i język |
| Kopia i przywracanie | Import, eksport i szyfrowane kopie |
| Wielojęzyczny interfejs | Zawiera 16 pakietów językowych |
| Ślad współpracy z AI | Notatki i dokumenty z rozwoju wspieranego przez AI |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="Zrzut ekranu ustawień PlainTab 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="Zrzut ekranu ustawień PlainTab 2" />
</div>

## Dla deweloperów

PlainTab celowo używa prostych technologii:

- Vanilla JavaScript, CSS i API przeglądarki.
- Bez `npm`, `package.json`, frameworka i bundlera.
- Jedna baza kodu dla rozszerzenia i trybu web.
- Konfiguracja Manifest V3 w `manifest.json`.
- Skrypty ładowane bezpośrednio przez `index.html`.

Punkty startowe: [notatki techniczne](technical/README_en.md), [release notes](RELEASE_NOTES.md), [diagnostyka pamięci i storage](ai-tasks/20260519-memory-storage-diagnostic-report.md), [instrukcje dla agentów AI](../AGENTS.md).

Wrażliwe obszary: ścieżka startowa, dwuwarstwowe renderowanie tapety, duże dane w IndexedDB, zgodność kluczy localStorage i uprawnienia zgodne z Chrome Web Store.

## Struktura projektu

```text
PlainTab/
├── index.html              # Nowa karta i wejście web
├── manifest.json           # Manifest Chrome / Edge
├── css/                    # Style według funkcji
├── js/                     # Moduły runtime
├── js/wallpaper/           # Tapety, źródła i motyw
├── wasm/                   # Silnik motywu i skrypty build
├── _locales/               # Wiadomości i18n rozszerzenia
├── docs/                   # Dokumentacja i notatki wydań
├── icon/                   # Ikony
└── imgs/                   # Zrzuty i materiały sklepu
```

## Czego PlainTab unika

PlainTab pozostanie oszczędny. Poza obecnym kierunkiem są: feedy wiadomości, trendy, rekomendacje, reklamy startowe, sponsorowane karty, duże panele pogody/kalendarza/zadań, konta, funkcje społecznościowe, strumienie chmurowe, dziesiątki skrótów na stronie oraz automatycznie odtwarzane treści promocyjne.

Wersja Safari nie jest teraz planowana, bo publikacja i utrzymanie byłyby zbyt kosztowne dla projektu osobistego.

## Współpraca z AI i nauka

PlainTab powstał z dużą pomocą AI przy kodzie, dokumentacji, refaktoryzacji, przygotowaniu wydań i diagnostyce. To nie jest demo: ma prawdziwy interfejs, trwałe ustawienia, import/eksport, przechowywanie tapet, wiele języków i tryby rozszerzenia oraz web.

Może służyć do nauki budowy rozszerzenia nowej karty, małego frontendu bez frameworka, dokumentowania pracy z AI i wpływu decyzji produktowych na technikę.

## Roadmap

Możliwe kierunki: stabilniejsze źródła tapet, płynniejsze ustawienia, czytelniejsza dokumentacja techniczna, pełniejszy zapis rozwoju z AI i ewentualne wsparcie Firefox, jeśli pozwolą API i koszty utrzymania.

## Wkład

Issues i pull requesty są mile widziane, zwłaszcza dotyczące zgodności przeglądarek, źródeł tapet, dokumentacji i drobnych ulepszeń UI.

Przed zmianami w starcie, tapetach, storage, wyszukiwaniu, ustawieniach lub palecie poleceń przeczytaj [AGENTS.md](../AGENTS.md) i reguły w `.claude/rules/`. Preferowane są małe, skupione zmiany.

## Języki

<details>
<summary>Tłumaczenia README</summary>

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
- [Tiếng Việt](README_vi.md)
- [한국어](README_ko.md)
- Polski

</details>

## Linki

- [Lista zmian](changelog-i18n/pl.txt)
- [Szczegółowe release notes](RELEASE_NOTES.md)
- [Notatki techniczne](technical/README_en.md)
- [Diagnostyka pamięci i storage](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [Demo online](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## Licencja

PlainTab jest open source na [licencji MIT](../LICENSE).

Utworzone i utrzymywane przez [Kaelri](https://github.com/kaininx).
