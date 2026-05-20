<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Una nuova scheda veloce, silenziosa e centrata sugli sfondi per Chrome ed Edge.
</p>

<p align="center">
  <a href="../README.md">English</a> · <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a> · <a href="https://plaintab.kaininx.workers.dev">Demo live</a> · <a href="technical/README_en.md">Note tecniche</a> · <a href="changelog-i18n/it.txt">Changelog</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="Licenza MIT"></a>
  <img src="https://img.shields.io/badge/version-3.2.1-111827?style=flat-square" alt="Versione 3.2.1">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="Nessun build">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="JavaScript vanilla">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="Screenshot PlainTab 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="Screenshot PlainTab 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="Screenshot PlainTab 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="Screenshot PlainTab 4" />
</div>

## Che cos'è PlainTab

PlainTab è un'estensione Manifest V3 per la nuova scheda di Chrome ed Edge. Sostituisce la pagina predefinita con uno sfondo pulito, una barra di ricerca configurabile e scorciatoie che restano nascoste finché non servono.

È pensata per chi vuole una pagina iniziale calma e immediata: niente feed di notizie, schede sponsorizzate, account o dashboard piene di widget. Apri una scheda, guardi lo sfondo, cerchi o digiti un URL e vai avanti.

La stessa pagina può funzionare anche come sito autonomo aprendo direttamente `index.html`, quindi il progetto è facile da provare, leggere e modificare.

## Provalo

### Installazione

[Installa PlainTab dal Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### Demo online

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### Esecuzione locale

```bash
git clone https://github.com/kaininx/PlainTab.git
```

Modalità estensione:

1. Apri `chrome://extensions`.
2. Attiva la modalità sviluppatore.
3. Scegli "Carica estensione non pacchettizzata".
4. Seleziona la cartella del progetto PlainTab.

Modalità web:

Apri `index.html` direttamente nel browser.

Nessuna dipendenza, nessun package manager, nessun passaggio di build.

## Perché PlainTab

### Prima lo sfondo, non una pagina vuota

PlainTab cura la sensazione di apertura immediata. Salva un'anteprima leggera in `localStorage`, poi rimanda caricamento completo, cache e colori del tema a dopo il primo rendering.

La velocità percepita è parte del prodotto, non solo un numero nei benchmark.

### Tranquillo per impostazione predefinita

La home resta essenziale: sfondo, ricerca e pochi controlli. Scorciatoie, link nascosti, impostazioni, backup e opzioni avanzate esistono, ma non invadono la pagina.

### Sfondi flessibili

Puoi usare lo sfondo giornaliero di Bing, Wallhaven, immagini caricate, una cartella locale, feed RSS, una tua API di immagini o sfondi video. PlainTab resta semplice per l'uso quotidiano e flessibile per chi vuole personalizzare.

### Ricerca e scorciatoie senza confusione

La barra di ricerca permette di regolare posizione, dimensione, raggio, trasparenza, visibilità, cronologia e motore. Le scorciatoie stanno nella palette comandi, dove puoi cercare, aggiungere, modificare, importare e nascondere link.

## Funzionalità

| Funzionalità | Cosa fa |
|--------------|---------|
| Nuova scheda | Sostituisce la nuova scheda del browser dopo l'installazione |
| Modalità web autonoma | Si avvia da `index.html` senza pacchettizzare l'estensione |
| Avvio rapido dello sfondo | Riduce i lampi bianchi con un'anteprima iniziale |
| Sfondo Bing | Supporta lo sfondo giornaliero di Bing |
| Sfondo Wallhaven | Supporta esplorazione e scelta da Wallhaven |
| Sfondi locali | Upload, galleria e selezione di cartelle locali |
| Sfondi RSS / API | Connette feed e API di immagini personalizzate |
| Sfondi video | Permette di usare video come sfondo |
| Barra di ricerca | Posizione, dimensione, stile, trasparenza e visibilità |
| Cronologia ricerche | Salva ricerche recenti o può essere disattivata |
| Palette comandi | Gestisce scorciatoie senza sporcare la home |
| Spazio nascosto | Link disponibili ma non visibili |
| Pannello impostazioni | Interfaccia, sfondi, scorciatoie, dati e lingua |
| Backup e ripristino | Import, export e backup cifrati |
| Interfaccia multilingue | Include 16 pacchetti lingua |
| Traccia di collaborazione IA | Note e documenti dello sviluppo assistito da IA |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="Screenshot delle impostazioni di PlainTab 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="Screenshot delle impostazioni di PlainTab 2" />
</div>

## Per sviluppatori

PlainTab usa una tecnologia volutamente semplice:

- JavaScript vanilla, CSS e API del browser.
- Niente `npm`, `package.json`, framework o bundler.
- Un'unica codebase per estensione e modalità web.
- Configurazione Manifest V3 in `manifest.json`.
- Script caricati direttamente da `index.html`.

Da dove iniziare:

- [Note tecniche](technical/README_en.md) per architettura e responsabilità.
- [Note di rilascio](RELEASE_NOTES.md) per la storia delle funzionalità.
- [Diagnostica memoria e storage](ai-tasks/20260519-memory-storage-diagnostic-report.md) per la cache degli sfondi.
- [Istruzioni per agenti IA](../AGENTS.md) per vincoli e regole del progetto.

Aree delicate: percorso di avvio, rendering a due livelli dello sfondo, dati grandi in IndexedDB, compatibilità delle chiavi localStorage e permessi richiesti dal Chrome Web Store.

## Struttura del progetto

```text
PlainTab/
├── index.html              # Nuova scheda e ingresso web
├── manifest.json           # Manifest Chrome / Edge
├── css/                    # Stili per funzionalità
├── js/                     # Moduli runtime
├── js/wallpaper/           # Sfondi, fonti ed estrazione tema
├── wasm/                   # Motore tema e script di build
├── _locales/               # Messaggi i18n dell'estensione
├── docs/                   # Documentazione e note di rilascio
├── icon/                   # Icone
└── imgs/                   # Screenshot e asset dello store
```

## Cosa evita PlainTab

PlainTab resterà sobrio. Non rientrano nella direzione attuale: feed di notizie, trend, raccomandazioni, pubblicità, grandi pannelli meteo/calendario/todo, account, social, flussi cloud, decine di scorciatoie fisse o contenuti promozionali in autoplay.

Una versione Safari non è prevista per ora: pubblicazione e manutenzione sarebbero troppo pesanti per un progetto personale.

## Collaborazione IA e apprendimento

PlainTab è stato sviluppato con molta collaborazione IA: codice, documentazione, refactoring, rilascio e diagnostica. Non è una demo giocattolo: ha interfaccia reale, impostazioni persistenti, import/export, storage degli sfondi, più lingue e modalità estensione/web.

È utile per studiare come si costruisce un'estensione nuova scheda, come organizzare un piccolo frontend senza framework, come documentare lo sviluppo assistito da IA e come la sobrietà del prodotto guida le scelte tecniche.

## Roadmap

Possibili direzioni: fonti di sfondi più stabili, impostazioni più fluide, documentazione tecnica più chiara, registro più completo dello sviluppo assistito da IA e possibile supporto Firefox se API e manutenzione lo permetteranno.

## Contribuire

Issue e pull request sono benvenute, soprattutto per compatibilità browser, fonti di sfondi, documentazione e piccoli miglioramenti UI.

Prima di modificare avvio, sfondi, storage, ricerca, impostazioni o palette comandi, leggi [AGENTS.md](../AGENTS.md) e le regole in `.claude/rules/`. L'apertura di PlainTab è sensibile: meglio cambi piccoli e mirati.

## Lingue

<details>
<summary>Traduzioni del README</summary>

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
- Italiano
- [Türkçe](README_tr.md)
- [Tiếng Việt](README_vi.md)
- [한국어](README_ko.md)
- [Polski](README_pl.md)

</details>

## Link utili

- [Changelog](changelog-i18n/it.txt)
- [Note di rilascio dettagliate](RELEASE_NOTES.md)
- [Note tecniche](technical/README_en.md)
- [Diagnostica memoria e storage](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [Demo live](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## Licenza

PlainTab è open source sotto [licenza MIT](../LICENSE).

Creato e mantenuto da [Kaelri](https://github.com/kaininx).
