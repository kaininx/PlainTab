<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Быстрая, спокойная и ориентированная на обои страница новой вкладки для Chrome и Edge.
</p>

<p align="center">
  <a href="../README.md">English</a> · <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a> · <a href="https://plaintab.kaininx.workers.dev">Демо</a> · <a href="technical/README_en.md">Технические заметки</a> · <a href="changelog-i18n/ru.txt">История изменений</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="Лицензия MIT"></a>
  <img src="https://img.shields.io/badge/version-3.2.3-111827?style=flat-square" alt="Версия 3.2.3">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="Без сборки">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="Vanilla JavaScript">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="Скриншот PlainTab 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="Скриншот PlainTab 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="Скриншот PlainTab 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="Скриншот PlainTab 4" />
</div>

## Что такое PlainTab

PlainTab — расширение Manifest V3 для новой вкладки Chrome и Edge. Оно заменяет стандартную страницу чистыми обоями, настраиваемой строкой поиска и ярлыками, которые не мешают, пока не понадобятся.

Проект для тех, кому нужна спокойная стартовая страница: без новостей, рекламных карточек, аккаунтов и панели с виджетами. Открыли вкладку, увидели обои, ввели запрос или URL — и продолжили работу.

Та же страница работает как обычный сайт: достаточно открыть `index.html`. Поэтому проект легко запустить, прочитать и изменить.

## Попробовать

### Установить

[Установить PlainTab из Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### Открыть демо

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### Запустить локально

```bash
git clone https://github.com/kaininx/PlainTab.git
```

Режим расширения:

1. Откройте `chrome://extensions`.
2. Включите режим разработчика.
3. Выберите «Загрузить распакованное расширение».
4. Укажите папку проекта PlainTab.

Веб-режим:

Откройте `index.html` напрямую в браузере.

Без зависимостей, менеджера пакетов и шага сборки.

## Почему PlainTab

### Сначала обои, меньше пустого ожидания

PlainTab старается показать изображение сразу после открытия новой вкладки. Лёгкий предпросмотр хранится в `localStorage`, а полная загрузка обоев, кэширование и цвета темы выполняются уже после первого отображения.

Воспринимаемая скорость здесь часть продукта, а не только метрика производительности.

### Спокойно по умолчанию

На странице остаются обои, поиск и несколько элементов управления. Ярлыки, скрытые ссылки, настройки, резервные копии и расширенные параметры доступны, но не занимают весь экран.

### Гибкие источники обоев

Можно использовать ежедневные обои Bing, Wallhaven, загруженные изображения, локальную папку, RSS, собственный API изображений или видеообои. PlainTab прост для ежедневного использования и гибок для настройки.

### Поиск и ярлыки без беспорядка

Строка поиска настраивает положение, размер, скругление, прозрачность, видимость, историю и поисковик. Ярлыки находятся в командной палитре: их можно искать, добавлять, редактировать, импортировать и скрывать.

## Возможности

| Возможность | Что делает |
|-------------|------------|
| Новая вкладка | Заменяет страницу новой вкладки после установки |
| Веб-режим | Работает через `index.html` без упаковки расширения |
| Быстрый старт обоев | Уменьшает белые вспышки ранним предпросмотром |
| Обои Bing | Поддерживает ежедневные обои Bing |
| Обои Wallhaven | Поддерживает просмотр и выбор через Wallhaven |
| Локальные обои | Загрузка, галерея и выбор локальной папки |
| RSS / API | Подключает ленты и пользовательские API изображений |
| Видеообои | Позволяет использовать видео как фон |
| Поиск | Положение, размер, стиль, прозрачность и видимость |
| История поиска | Сохраняется или отключается |
| Командная палитра | Управляет ярлыками без захламления страницы |
| Скрытое пространство | Ссылки доступны, но не видны на главной |
| Настройки | Интерфейс, обои, горячие клавиши, данные и язык |
| Резервные копии | Импорт, экспорт и зашифрованные копии |
| Многоязычный интерфейс | Включает 16 языковых пакетов |
| След AI-сотрудничества | Документы и заметки разработки с участием AI |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="Скриншот настроек PlainTab 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="Скриншот настроек PlainTab 2" />
</div>

## Для разработчиков

PlainTab намеренно остаётся простым:

- Vanilla JavaScript, CSS и браузерные API.
- Без `npm`, `package.json`, фреймворков и сборщика.
- Одна кодовая база для расширения и веб-режима.
- Manifest V3 настраивается в `manifest.json`.
- Скрипты загружаются напрямую из `index.html`.

Полезные входные точки: [технические заметки](technical/README_en.md), [release notes](RELEASE_NOTES.md), [диагностика памяти и хранилища](ai-tasks/20260519-memory-storage-diagnostic-report.md), [инструкции для AI-агентов](../AGENTS.md).

Особенно осторожно меняйте путь запуска, двухслойный рендеринг обоев, хранение крупных данных в IndexedDB, совместимость ключей localStorage и разрешения Chrome Web Store.

## Структура проекта

```text
PlainTab/
├── index.html              # Новая вкладка и веб-вход
├── manifest.json           # Manifest Chrome / Edge
├── css/                    # Стили по функциям
├── js/                     # Runtime-модули
├── js/wallpaper/           # Обои, источники и тема
├── wasm/                   # Движок темы и скрипты сборки
├── _locales/               # i18n-сообщения расширения
├── docs/                   # Документация и заметки релизов
├── icon/                   # Иконки
└── imgs/                   # Скриншоты и материалы магазина
```

## Чего PlainTab избегает

PlainTab останется сдержанным. В текущий курс не входят новостные ленты, тренды, рекомендации, реклама, спонсорские карточки, большие панели погоды/календаря/задач, аккаунты, социальные функции, облачные потоки, десятки закреплённых ярлыков и автопроигрываемый промоконтент.

Версия для Safari пока не планируется: публикация и поддержка слишком затратны для личного проекта.

## AI-сотрудничество и обучение

PlainTab активно разрабатывался с AI: код, документация, рефакторинг, подготовка релизов и диагностика. Это не игрушечная демо-страница, а полноценное расширение с настоящим интерфейсом, постоянными настройками, импортом/экспортом, хранением обоев, несколькими языками и двумя режимами запуска.

Проект подходит для изучения расширений новой вкладки, небольшого frontend без фреймворка, документирования AI-assisted development и влияния продуктовой сдержанности на технические решения.

## Roadmap

Возможные направления: более стабильные источники обоев, более плавные настройки, ясная техническая документация, полный журнал AI-разработки и возможная поддержка Firefox, если позволят API и стоимость поддержки.

## Участие

Issues и pull requests приветствуются, особенно по совместимости браузеров, источникам обоев, документации и небольшим улучшениям UI.

Перед изменениями запуска, обоев, хранилища, поиска, настроек или командной палитры прочитайте [AGENTS.md](../AGENTS.md) и правила в `.claude/rules/`. Предпочтительны небольшие сфокусированные изменения.

## Языки

<details>
<summary>Переводы README</summary>

- [English](../README.md)
- [简体中文](README_zh-CN.md)
- [繁體中文](README_zh-TW.md)
- [हिन्दी](README_hi.md)
- [Español](README_es.md)
- [العربية](README_ar.md)
- [Français](README_fr.md)
- [Português](README_pt_BR.md)
- Русский
- [Deutsch](README_de.md)
- [日本語](README_ja.md)
- [Italiano](README_it.md)
- [Türkçe](README_tr.md)
- [Tiếng Việt](README_vi.md)
- [한국어](README_ko.md)
- [Polski](README_pl.md)

</details>

## Ссылки

- [История изменений](changelog-i18n/ru.txt)
- [Подробные release notes](RELEASE_NOTES.md)
- [Технические заметки](technical/README_en.md)
- [Диагностика памяти и хранилища](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [Демо](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## Лицензия

PlainTab распространяется как open source под [лицензией MIT](../LICENSE).

Создан и поддерживается [Kaelri](https://github.com/kaininx).
