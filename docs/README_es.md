<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Una página de nueva pestaña rápida, tranquila y centrada en fondos para Chrome y Edge.
</p>

<p align="center">
  <a href="../README.md">English</a>
  ·
  <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a>
  ·
  <a href="https://plaintab.kaininx.workers.dev">Demo en vivo</a>
  ·
  <a href="technical/README_en.md">Notas técnicas</a>
  ·
  <a href="changelog-i18n/es.txt">Historial de cambios</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="Licencia MIT"></a>
  <img src="https://img.shields.io/badge/version-3.2.2-111827?style=flat-square" alt="Versión 3.2.2">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="Sin paso de compilación">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="JavaScript puro">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="Captura de PlainTab 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="Captura de PlainTab 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="Captura de PlainTab 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="Captura de PlainTab 4" />
</div>

## Qué es PlainTab

PlainTab es una extensión Manifest V3 para la nueva pestaña de Chrome y Edge. Sustituye la página predeterminada por un fondo limpio, una barra de búsqueda configurable y accesos directos que permanecen guardados hasta que los necesitas.

Está pensada para quien quiere una página de inicio calmada e inmediata: sin noticias, tarjetas promocionadas, cuentas ni paneles llenos de widgets. Abres una pestaña, ves el fondo, buscas o escribes una URL, y sigues con lo tuyo.

La misma página también puede ejecutarse como sitio independiente abriendo `index.html`, así que el proyecto es fácil de probar, leer y modificar.

## Pruébalo

### Instalar

[Instala PlainTab desde Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### Abrir la demo

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### Ejecutar localmente

```bash
git clone https://github.com/kaininx/PlainTab.git
```

Modo extensión:

1. Abre `chrome://extensions`.
2. Activa el modo de desarrollador.
3. Elige "Cargar descomprimida".
4. Selecciona la carpeta del proyecto PlainTab.

Modo web:

Abre `index.html` directamente en el navegador.

No hay dependencias, gestor de paquetes ni paso de compilación.

## Por qué PlainTab

### El fondo aparece primero

PlainTab cuida la sensación de abrir una pestaña y ver algo útil de inmediato. Guarda una vista previa ligera en `localStorage` y deja la carga completa del fondo, la caché y los colores del tema para después del primer renderizado.

La velocidad percibida forma parte del producto, no es solo una cifra de rendimiento.

### Tranquilo por defecto

La página mantiene lo esencial: fondo, búsqueda y unos pocos controles. Los accesos directos, enlaces ocultos, ajustes, copias de seguridad y opciones avanzadas están disponibles, pero no ocupan la pantalla de entrada.

### Fondos flexibles

Puedes usar el fondo diario de Bing, Wallhaven, imágenes subidas, una carpeta local, feeds RSS, una API propia de imágenes o fondos de video. Puede ser simple para el uso diario y flexible si quieres personalizar más.

### Búsqueda y accesos sin desorden

La barra de búsqueda permite ajustar posición, tamaño, radio, transparencia, visibilidad, historial y comportamiento del motor de búsqueda. Los accesos directos viven en una paleta de comandos, donde puedes buscar, añadir, editar, importar y ocultar enlaces.

## Funciones

| Función | Qué hace |
|---------|----------|
| Nueva pestaña | Sustituye la nueva pestaña del navegador tras instalarse |
| Modo web independiente | Se ejecuta desde `index.html` sin empaquetar la extensión |
| Inicio rápido del fondo | Usa una vista previa temprana para reducir pantallas en blanco |
| Fondos de Bing | Soporta el fondo diario de Bing |
| Fondos de Wallhaven | Permite explorar y configurar fondos desde Wallhaven |
| Fondos locales | Soporta subidas, galerías y selección de carpeta local |
| Fondos RSS / API | Conecta feeds de imágenes y APIs personalizadas |
| Fondos de video | Permite elegir videos como fondo |
| Barra de búsqueda | Ajusta posición, tamaño, estilo, transparencia y visibilidad |
| Historial de búsqueda | Guarda búsquedas recientes o permite desactivarlo |
| Paleta de comandos | Gestiona accesos directos sin ensuciar la página principal |
| Espacio oculto | Guarda enlaces disponibles pero no visibles |
| Panel de ajustes | Gestiona interfaz, fondos, atajos, datos e idioma |
| Copia y restauración | Importa, exporta y usa copias cifradas |
| Interfaz multilingüe | Incluye 16 paquetes de idioma |
| Rastro de colaboración con IA | Conserva notas y documentos del desarrollo asistido por IA |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="Captura de ajustes de PlainTab 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="Captura de ajustes de PlainTab 2" />
</div>

## Para desarrolladores

PlainTab usa una tecnología deliberadamente sencilla:

- JavaScript puro, CSS y APIs del navegador.
- Sin `npm`, `package.json`, frameworks ni bundlers.
- Una sola base de código para extensión y modo web.
- Configuración Manifest V3 en `manifest.json`.
- Scripts cargados directamente desde `index.html`.

Puntos de partida útiles:

- [Notas técnicas](technical/README_en.md) para arquitectura y responsabilidades.
- [Notas de versión](RELEASE_NOTES.md) para el historial de funciones.
- [Diagnóstico de memoria y almacenamiento](ai-tasks/20260519-memory-storage-diagnostic-report.md) para la caché de fondos.
- [Instrucciones para agentes de IA](../AGENTS.md) para reglas de mantenimiento.

Zonas que requieren cuidado:

- La ruta de inicio evita destellos blancos al abrir una pestaña.
- El fondo usa una capa estable y otra de transición.
- Los datos grandes de fondos pasan por el módulo de almacenamiento e IndexedDB.
- Las claves de localStorage deben conservar compatibilidad salvo migración.
- Los permisos deben seguir alineados con la revisión de Chrome Web Store.

## Estructura del proyecto

```text
PlainTab/
├── index.html              # Nueva pestaña y entrada web independiente
├── manifest.json           # Manifiesto de la extensión Chrome / Edge
├── css/                    # Estilos por función
├── js/                     # Módulos de ejecución
├── js/wallpaper/           # Fondos, fuentes y extracción de tema
├── wasm/                   # Motor de tema de fondos y scripts de build
├── _locales/               # Mensajes i18n de la extensión
├── docs/                   # Documentación, versiones y notas técnicas
├── icon/                   # Iconos de la extensión
└── imgs/                   # Capturas y recursos de tienda
```

## Lo que PlainTab evita

PlainTab mantendrá su sobriedad. Estas funciones no forman parte de la dirección actual:

- Noticias, tendencias o recomendaciones.
- Publicidad de inicio, tarjetas patrocinadas o espacios promocionados.
- Grandes paneles de clima, calendario o tareas.
- Cuentas, funciones sociales o flujos de contenido en la nube.
- Decenas de accesos fijados en la página principal.
- Contenido promocional con reproducción automática.

Tampoco hay planes para Safari por ahora; publicar y mantener otra plataforma es demasiado costoso para un proyecto personal.

## Colaboración con IA y aprendizaje

PlainTab se desarrolló con mucha colaboración de IA en código, documentación, refactorización, preparación de versiones y diagnósticos. No es una demo: incluye interfaz real, ajustes persistentes, importación/exportación, almacenamiento de fondos, varios idiomas y rutas tanto de extensión como de web.

Puede servirte para estudiar:

- cómo se construye una extensión de nueva pestaña;
- cómo organizar un frontend pequeño sin framework;
- cómo documentar y revisar desarrollo asistido por IA;
- cómo las decisiones de producto influyen en la técnica.

## Hoja de ruta

PlainTab puede seguir creciendo en estas direcciones:

- Fuentes de fondos más estables.
- Flujos de ajustes y fondos más fluidos.
- Documentación técnica y comentarios más claros.
- Registro más completo del desarrollo asistido por IA.
- Posible soporte para Firefox si las APIs y el mantenimiento lo permiten.

## Contribuir

Se agradecen issues y pull requests, especialmente sobre compatibilidad de navegadores, fuentes de fondos, documentación y pequeños refinamientos de interfaz.

Antes de cambiar inicio, fondos, almacenamiento, búsqueda, ajustes o paleta de comandos, lee [AGENTS.md](../AGENTS.md) y las reglas en `.claude/rules/`. La apertura de PlainTab es sensible; se prefieren cambios pequeños y enfocados.

## Idiomas

<details>
<summary>Traducciones del README</summary>

- [English](../README.md)
- [简体中文](README_zh-CN.md)
- [繁體中文](README_zh-TW.md)
- [हिन्दी](README_hi.md)
- Español
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

## Enlaces relacionados

- [Historial de cambios](changelog-i18n/es.txt)
- [Notas de versión detalladas](RELEASE_NOTES.md)
- [Notas técnicas](technical/README_en.md)
- [Diagnóstico de memoria y almacenamiento](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [Demo en vivo](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## Licencia

PlainTab es software libre bajo la [licencia MIT](../LICENSE).

Creado y mantenido por [Kaelri](https://github.com/kaininx).
