<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Eine schnelle, ruhige und wallpaper-orientierte neue Tab-Seite für Chrome und Edge.
</p>

<p align="center">
  <a href="../README.md">English</a>
  ·
  <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a>
  ·
  <a href="https://plaintab.kaininx.workers.dev">Live-Demo</a>
  ·
  <a href="technical/README_en.md">Technische Notizen</a>
  ·
  <a href="changelog-i18n/de.txt">Änderungsprotokoll</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT-Lizenz"></a>
  <img src="https://img.shields.io/badge/version-3.2.3-111827?style=flat-square" alt="Version 3.2.3">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="Kein Build-Schritt">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="Vanilla JavaScript">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="PlainTab Screenshot 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="PlainTab Screenshot 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="PlainTab Screenshot 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="PlainTab Screenshot 4" />
</div>

## Was ist PlainTab?

PlainTab ist eine Manifest-V3-Erweiterung für die neue Tab-Seite in Chrome und Edge. Sie ersetzt die Standardseite durch ein sauberes Wallpaper, eine anpassbare Suchleiste und Verknüpfungen, die erst sichtbar werden, wenn du sie brauchst.

Sie ist für Menschen gedacht, die eine ruhige Startseite wollen: kein Newsfeed, keine beworbenen Karten, kein Konto, kein Dashboard voller Widgets. Tab öffnen, Wallpaper sehen, suchen oder URL eingeben, weiterarbeiten.

Dieselbe Seite läuft auch als eigenständige Webseite, indem du `index.html` direkt öffnest. Dadurch ist das Projekt leicht auszuprobieren, zu lesen und zu verändern.

## Ausprobieren

### Installieren

[PlainTab im Chrome Web Store installieren](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### Live-Demo öffnen

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### Lokal starten

```bash
git clone https://github.com/kaininx/PlainTab.git
```

Erweiterungsmodus:

1. Öffne `chrome://extensions`.
2. Aktiviere den Entwicklermodus.
3. Wähle „Entpackte Erweiterung laden“.
4. Wähle den PlainTab-Projektordner aus.

Webmodus:

Öffne `index.html` direkt im Browser.

Keine Abhängigkeiten, kein Paketmanager, kein Build-Schritt.

## Warum PlainTab?

### Wallpaper zuerst, möglichst ohne leeren Moment

PlainTab legt Wert darauf, dass beim Öffnen eines neuen Tabs sofort ein Bild da ist. Eine leichte Startvorschau liegt in `localStorage`; vollständiges Laden, Caching und Theme-Farben passieren nach dem ersten Anzeigen.

Gefühlte Geschwindigkeit ist hier Teil des Produkts, nicht nur ein Benchmark-Wert.

### Standardmäßig ruhig

Die Startseite bleibt reduziert: Wallpaper, Suche und wenige Bedienelemente. Verknüpfungen, versteckte Links, Einstellungen, Backups und tiefere Wallpaper-Optionen sind da, liegen aber nicht offen auf dem Bildschirm.

### Flexible Wallpaper-Quellen

Du kannst Bing Daily Wallpaper, Wallhaven, hochgeladene Bilder, lokale Ordner, RSS-Feeds, eigene Bild-APIs oder Video-Wallpaper verwenden. PlainTab bleibt einfach, wenn du nur täglich ein schönes Bild möchtest, und flexibel, wenn du mehr einrichten willst.

### Suche und Links ohne Unordnung

Die Suchleiste unterstützt Position, Größe, Radius, Transparenz, Sichtbarkeit, Suchverlauf und Suchmaschinenverhalten. Verknüpfungen leben in einer Befehlspalette, wo du Links suchen, hinzufügen, bearbeiten, importieren und verstecken kannst.

## Funktionen

| Funktion | Beschreibung |
|----------|--------------|
| Neue Tab-Seite | Ersetzt nach der Installation die neue Tab-Seite |
| Eigenständiger Webmodus | Läuft über `index.html` ohne Erweiterungspaket |
| Schneller Wallpaper-Start | Reduziert weiße Blitzer durch eine frühe Vorschau |
| Bing-Wallpaper | Unterstützt Bing Daily Wallpaper |
| Wallhaven-Wallpaper | Unterstützt Browsing und Auswahl über Wallhaven |
| Lokale Wallpaper | Uploads, Galerie und lokale Ordnerauswahl |
| RSS / API-Wallpaper | Bindet Bildfeeds und eigene APIs ein |
| Video-Wallpaper | Videos können als Wallpaper genutzt werden |
| Suchleiste | Position, Größe, Stil, Transparenz und Sichtbarkeit |
| Suchverlauf | Speichert letzte Suchen oder lässt sich deaktivieren |
| Befehlspalette | Verwaltet Verknüpfungen ohne Startseiten-Chaos |
| Versteckter Bereich | Links bleiben verfügbar, aber unsichtbar |
| Einstellungsbereich | Oberfläche, Wallpaper, Tastenkürzel, Daten und Sprache |
| Backup und Wiederherstellung | Import, Export und verschlüsselte Backups |
| Mehrsprachige Oberfläche | Enthält 16 Sprachpakete |
| KI-Kollaborationsspur | Notizen und Dokumente aus KI-unterstützter Entwicklung |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="PlainTab Screenshot der Einstellungen 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="PlainTab Screenshot der Einstellungen 2" />
</div>

## Für Entwickler

PlainTab bleibt bewusst schlicht:

- Vanilla JavaScript, CSS und Browser-APIs.
- Kein `npm`, kein `package.json`, kein Framework, kein Bundler.
- Eine Codebasis für Erweiterung und Webmodus.
- Manifest-V3-Konfiguration in `manifest.json`.
- Laufzeitskripte werden direkt aus `index.html` geladen.

Gute Einstiegspunkte:

- [Technische Notizen](technical/README_en.md) für Architektur und Zuständigkeiten.
- [Release Notes](RELEASE_NOTES.md) für die Funktionshistorie.
- [Speicherdiagnose](ai-tasks/20260519-memory-storage-diagnostic-report.md) zum Wallpaper-Cache.
- [KI-Agent-Anweisungen](../AGENTS.md) für Projektregeln.

Empfindliche Bereiche:

- Der Startpfad ist auf weniger weiße Blitzer optimiert.
- Wallpaper-Rendering nutzt eine stabile Rückschicht und eine Übergangsschicht.
- Große Wallpaper-Daten laufen über Speichermodul und IndexedDB.
- localStorage-Schlüssel müssen kompatibel bleiben, sofern keine Migration existiert.
- Erweiterungsberechtigungen müssen zur Chrome-Web-Store-Prüfung passen.

## Projektstruktur

```text
PlainTab/
├── index.html              # Neue Tab-Seite und Web-Einstieg
├── manifest.json           # Chrome / Edge Manifest
├── css/                    # Feature-bezogene Styles
├── js/                     # Laufzeitmodule
├── js/wallpaper/           # Wallpaper, Quellen und Theme-Extraktion
├── wasm/                   # Theme-Engine und Build-Skripte
├── _locales/               # i18n-Nachrichten der Erweiterung
├── docs/                   # Dokumentation, Releases und Aufgaben
├── icon/                   # Erweiterungssymbole
└── imgs/                   # Screenshots und Store-Material
```

## Was PlainTab vermeidet

PlainTab bleibt zurückhaltend. Diese Dinge gehören derzeit nicht zur Richtung:

- Newsfeeds, Trends oder Empfehlungen.
- Startanzeigen, gesponserte Karten oder Promo-Flächen.
- Große Wetter-, Kalender- oder Aufgabenpanels.
- Konten, soziale Funktionen oder Cloud-Content-Streams.
- Dutzende festgepinnte Verknüpfungen auf der Startseite.
- Automatisch abspielende Promotion-Inhalte.

Safari ist derzeit nicht geplant, weil Veröffentlichung und Wartung für ein persönliches Projekt zu aufwendig wären.

## KI-Kollaboration und Lernen

PlainTab wurde stark mit KI-Unterstützung entwickelt: Code, Dokumentation, Refactoring, Release-Vorbereitung und Diagnosen. Es ist keine Spielzeugdemo, sondern eine vollständige Erweiterung mit echter Oberfläche, persistenten Einstellungen, Import/Export, Wallpaper-Speicher, mehreren Sprachen und zwei Laufzeitumgebungen.

Es eignet sich zum Lernen von:

- Aufbau einer New-Tab-Erweiterung;
- Organisation eines kleinen Frontends ohne Framework;
- Dokumentation und Review KI-unterstützter Entwicklung;
- Einfluss von Produktzurückhaltung auf technische Entscheidungen.

## Roadmap

PlainTab kann sich weiterentwickeln in Richtung:

- stabilere Wallpaper-Quellen;
- flüssigere Einstellungs- und Wallpaper-Abläufe;
- klarere technische Dokumentation;
- vollständigere KI-Entwicklungsaufzeichnungen;
- möglicher Firefox-Support, falls APIs und Wartung passen.

## Mitwirken

Issues und Pull Requests sind willkommen, besonders zu Browser-Kompatibilität, Wallpaper-Quellen, Dokumentation und kleinen UI-Verbesserungen.

Lies vor Änderungen an Start, Wallpaper, Speicher, Suche, Einstellungen oder Befehlspalette bitte [AGENTS.md](../AGENTS.md) und die Regeln unter `.claude/rules/`. PlainTabs Startgefühl ist empfindlich; kleine, fokussierte Änderungen sind bevorzugt.

## Sprachen

<details>
<summary>README-Übersetzungen</summary>

- [English](../README.md)
- [简体中文](README_zh-CN.md)
- [繁體中文](README_zh-TW.md)
- [हिन्दी](README_hi.md)
- [Español](README_es.md)
- [العربية](README_ar.md)
- [Français](README_fr.md)
- [Português](README_pt_BR.md)
- [Русский](README_ru.md)
- Deutsch
- [日本語](README_ja.md)
- [Italiano](README_it.md)
- [Türkçe](README_tr.md)
- [Tiếng Việt](README_vi.md)
- [한국어](README_ko.md)
- [Polski](README_pl.md)

</details>

## Links

- [Änderungsprotokoll](changelog-i18n/de.txt)
- [Detaillierte Release Notes](RELEASE_NOTES.md)
- [Technische Notizen](technical/README_en.md)
- [Speicherdiagnose](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [Live-Demo](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## Lizenz

PlainTab ist Open Source unter der [MIT-Lizenz](../LICENSE).

Erstellt und gepflegt von [Kaelri](https://github.com/kaininx).
