<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Une nouvelle page d’onglet rapide, calme et centrée sur les fonds d’écran pour Chrome et Edge.
</p>

<p align="center">
  <a href="../README.md">English</a>
  ·
  <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a>
  ·
  <a href="https://plaintab.kaininx.workers.dev">Démo en ligne</a>
  ·
  <a href="technical/README_en.md">Notes techniques</a>
  ·
  <a href="changelog-i18n/fr.txt">Journal des changements</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="Licence MIT"></a>
  <img src="https://img.shields.io/badge/version-3.2.3-111827?style=flat-square" alt="Version 3.2.3">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="Aucune compilation">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="JavaScript vanilla">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="Capture PlainTab 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="Capture PlainTab 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="Capture PlainTab 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="Capture PlainTab 4" />
</div>

## Qu’est-ce que PlainTab ?

PlainTab est une extension Manifest V3 pour la nouvelle page d’onglet de Chrome et Edge. Elle remplace la page par défaut par un fond d’écran propre, une barre de recherche configurable et des raccourcis qui restent discrets jusqu’au moment où vous en avez besoin.

Elle s’adresse aux personnes qui veulent une page d’accueil calme et immédiate : pas de fil d’actualité, pas de cartes sponsorisées, pas de compte, pas de tableau de bord rempli de widgets. Ouvrez un onglet, regardez le fond, cherchez ou saisissez une URL, puis continuez.

La même page peut aussi fonctionner comme une page web autonome en ouvrant directement `index.html`, ce qui rend le projet facile à essayer, lire et modifier.

## Essayer

### Installer

[Installer PlainTab depuis le Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### Ouvrir la démo

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### Lancer localement

```bash
git clone https://github.com/kaininx/PlainTab.git
```

Mode extension :

1. Ouvrez `chrome://extensions`.
2. Activez le mode développeur.
3. Choisissez « Charger l’extension non empaquetée ».
4. Sélectionnez le dossier du projet PlainTab.

Mode web :

Ouvrez directement `index.html` dans un navigateur.

Aucune dépendance à installer, aucun gestionnaire de paquets, aucune étape de build.

## Pourquoi PlainTab

### Le fond d’écran d’abord

PlainTab soigne la sensation d’ouverture instantanée. Une prévisualisation légère est conservée dans `localStorage`, puis le chargement complet du fond, la mise en cache et l’extraction des couleurs sont reportés après le premier affichage.

La vitesse perçue fait donc partie de l’expérience produit, pas seulement des chiffres de performance.

### Calme par défaut

La page garde l’essentiel : fond d’écran, recherche et quelques contrôles. Les raccourcis, liens masqués, réglages, sauvegardes et options avancées restent accessibles sans envahir l’accueil.

### Sources de fonds flexibles

Vous pouvez utiliser le fond quotidien Bing, Wallhaven, des images importées, un dossier local, des flux RSS, une API d’images personnalisée ou des fonds vidéo. PlainTab reste simple au quotidien et laisse de la place aux configurations plus personnelles.

### Recherche et raccourcis sans désordre

La barre de recherche permet d’ajuster position, taille, arrondi, transparence, visibilité, historique et moteur. Les raccourcis vivent dans une palette de commandes pour chercher, ajouter, modifier, importer et masquer des liens sans transformer l’accueil en grille.

## Fonctionnalités

| Fonctionnalité | Rôle |
|----------------|------|
| Remplacement de nouvel onglet | Remplace la nouvelle page d’onglet après installation |
| Mode web autonome | Fonctionne depuis `index.html` sans empaquetage |
| Démarrage rapide du fond | Réduit les écrans blancs grâce à une prévisualisation précoce |
| Fond Bing | Prend en charge le fond quotidien Bing |
| Fond Wallhaven | Permet de parcourir et définir des fonds Wallhaven |
| Fonds locaux | Import, galerie et sélection de dossier local |
| Fonds RSS / API | Connexion à des flux et APIs d’images |
| Fonds vidéo | Choix de vidéos comme fond |
| Barre de recherche | Position, taille, style, transparence et visibilité réglables |
| Historique de recherche | Peut être conservé ou désactivé |
| Palette de commandes | Gestion des raccourcis sans encombrer l’accueil |
| Espace masqué | Liens disponibles mais non visibles |
| Panneau de réglages | Interface, fonds, raccourcis clavier, données et langue |
| Sauvegarde et restauration | Import, export et sauvegarde chiffrée |
| Interface multilingue | 16 langues d’interface incluses |
| Trace de collaboration IA | Notes et documents du développement assisté par IA |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="Capture des réglages de PlainTab 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="Capture des réglages de PlainTab 2" />
</div>

## Pour les développeurs

PlainTab reste volontairement simple :

- JavaScript vanilla, CSS et APIs du navigateur.
- Pas de `npm`, pas de `package.json`, pas de framework, pas de bundler.
- Une seule base de code pour le mode extension et le mode web.
- Configuration Manifest V3 dans `manifest.json`.
- Scripts chargés directement par `index.html`.

Points d’entrée utiles :

- [Notes techniques](technical/README_en.md) pour l’architecture et les responsabilités.
- [Notes de version](RELEASE_NOTES.md) pour l’historique des fonctionnalités.
- [Diagnostic mémoire et stockage](ai-tasks/20260519-memory-storage-diagnostic-report.md) pour le cache des fonds.
- [Instructions pour agents IA](../AGENTS.md) pour les règles de maintenance.

Zones sensibles :

- Le chemin de démarrage limite les flashs blancs.
- Le rendu du fond utilise une couche stable et une couche de transition.
- Les gros fichiers de fond passent par le module de stockage et IndexedDB.
- Les clés localStorage doivent rester compatibles sauf migration.
- Les permissions doivent rester adaptées à la validation du Chrome Web Store.

## Structure du projet

```text
PlainTab/
├── index.html              # Nouvelle page d’onglet et entrée web
├── manifest.json           # Manifeste Chrome / Edge
├── css/                    # Styles par fonctionnalité
├── js/                     # Modules d’exécution
├── js/wallpaper/           # Fonds, sources et extraction de thème
├── wasm/                   # Moteur de thème et scripts de build
├── _locales/               # Messages i18n de l’extension
├── docs/                   # Docs, notes de version et tâches
├── icon/                   # Icônes
└── imgs/                   # Captures et ressources de boutique
```

## Ce que PlainTab évite

PlainTab restera sobre. Ces fonctionnalités ne font pas partie de la direction actuelle :

- Flux d’actualité, tendances ou recommandations.
- Publicités de démarrage, cartes sponsorisées ou emplacements promus.
- Grands panneaux météo, calendrier ou tâches.
- Comptes, fonctions sociales ou flux cloud.
- Des dizaines de raccourcis épinglés sur l’accueil.
- Contenu promotionnel en lecture automatique.

Une version Safari n’est pas prévue pour le moment : la publication et la maintenance seraient trop lourdes pour un projet personnel.

## Collaboration IA et apprentissage

PlainTab a été développé avec une forte collaboration IA : code, documentation, refactorisation, préparation de versions et diagnostics. Ce n’est pas une démo jouet : il contient une vraie interface, des réglages persistants, import/export, stockage de fonds, plusieurs langues et deux modes d’exécution.

Il peut servir à étudier :

- la construction d’une extension de nouvelle page d’onglet ;
- l’organisation d’un petit frontend sans framework ;
- la documentation et la revue du développement assisté par IA ;
- l’impact des choix produit sur les choix techniques.

## Feuille de route

PlainTab pourra évoluer vers :

- des sources de fonds plus stables ;
- des réglages et flux de fonds plus fluides ;
- une documentation technique plus claire ;
- un historique plus complet du développement assisté par IA ;
- un possible support Firefox si les APIs et la maintenance le permettent.

## Contribuer

Les issues et pull requests sont bienvenues, surtout pour la compatibilité navigateur, les sources de fonds, la documentation et les petites améliorations d’interface.

Avant de modifier le démarrage, les fonds, le stockage, la recherche, les réglages ou la palette de commandes, lisez [AGENTS.md](../AGENTS.md) et les règles dans `.claude/rules/`. L’ouverture de PlainTab est sensible ; privilégiez les changements petits et ciblés.

## Langues

<details>
<summary>Traductions du README</summary>

- [English](../README.md)
- [简体中文](README_zh-CN.md)
- [繁體中文](README_zh-TW.md)
- [हिन्दी](README_hi.md)
- [Español](README_es.md)
- [العربية](README_ar.md)
- Français
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

## Liens utiles

- [Journal des changements](changelog-i18n/fr.txt)
- [Notes de version détaillées](RELEASE_NOTES.md)
- [Notes techniques](technical/README_en.md)
- [Diagnostic mémoire et stockage](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [Démo en ligne](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## Licence

PlainTab est open source sous [licence MIT](../LICENSE).

Créé et maintenu par [Kaelri](https://github.com/kaininx).
