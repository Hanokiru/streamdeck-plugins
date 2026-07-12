<p align="center">
  <img src="https://img.shields.io/badge/Stream_Deck-Plugins-4C1D95?style=for-the-badge&logo=elgato&logoColor=F5F3FF" alt="Stream Deck Plugins" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-A78BFA?style=flat-square&logo=opensourceinitiative&logoColor=4C1D95" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-4C1D95?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/Stream%20Deck-6.9%2B-7C3AED?style=flat-square&logo=elgato&logoColor=white" alt="Stream Deck 6.9+" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-C4B5FD?style=flat-square&logo=windows&logoColor=4C1D95" alt="Windows | macOS" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-4C1D95?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <a href="https://github.com/Hanokiru/streamdeck-plugins/actions"><img src="https://img.shields.io/github/actions/workflow/status/Hanokiru/streamdeck-plugins/ci.yml?branch=main&style=flat-square&label=CI&logo=github&logoColor=white&color=7C3AED" alt="CI" /></a>
  <a href="https://github.com/Hanokiru/streamdeck-plugins/releases"><img src="https://img.shields.io/github/v/release/Hanokiru/streamdeck-plugins?style=flat-square&label=release&color=A78BFA&logo=github&logoColor=4C1D95" alt="Release" /></a>
</p>

# Stream Deck Plugins

Коллекция кастомных плагинов для [Elgato Stream Deck](https://www.elgato.com/stream-deck).

## Плагины

| Плагин | Версия | Описание |
|--------|--------|----------|
| [**True Cursor Usage**](./plugins/cursor-usage/) | `0.2.0.0` | Остаток Cursor AI usage на кнопках и dials (Total / Auto / API) |

## Установка

### Для пользователей (без сборки)

1. Откройте [**Releases**](https://github.com/Hanokiru/streamdeck-plugins/releases) на GitHub
2. Скачайте `True-Cursor-Usage-vX.X.X.streamDeckPlugin`
3. Дважды кликните по файлу — Stream Deck установит плагин

### Для разработчиков (из исходников)

```bash
git clone https://github.com/Hanokiru/streamdeck-plugins.git
cd streamdeck-plugins/plugins/cursor-usage
npm install
npm run icons
npm run build
```

Скопируйте `com.hanokiru.cursor-usage.sdPlugin` в каталог плагинов:

| ОС | Путь |
|----|------|
| **Windows** | `%APPDATA%\Elgato\StreamDeck\Plugins\` |
| **macOS** | `~/Library/Application Support/com.elgato.StreamDeck/Plugins/` |

Перезапустите Stream Deck.

## Сборка релиза

```bash
cd plugins/cursor-usage
npm run pack
```

Архив появится в `plugins/cursor-usage/releases/`.

## Разработка

```bash
cd plugins/cursor-usage
npm run watch   # hot-reload (нужен Stream Deck CLI)
```

## Структура репозитория

```
streamdeck-plugins/
├── plugins/
│   └── cursor-usage/
│       ├── src/                    # TypeScript исходники
│       ├── scripts/                # генерация иконок
│       ├── com.hanokiru.cursor-usage.sdPlugin/
│       │   ├── manifest.json
│       │   ├── ui/
│       │   ├── layouts/
│       │   └── imgs/
│       └── releases/               # .streamDeckPlugin (не в git)
├── .github/workflows/ci.yml
└── LICENSE
```

## Что не попадает в git

Сборочные артефакты (`bin/plugin.js`, `sql-wasm.wasm`, `*.streamDeckPlugin`) игнорируются — каждый собирает локально или качает из Releases. **Ваш Cursor-токен в репозиторий не попадает** — он хранится только в настройках Stream Deck на вашем ПК.

## Автор

[Hanokiru](https://github.com/Hanokiru)
