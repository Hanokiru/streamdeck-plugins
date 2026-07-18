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

<p align="center">
  <b>Русский</b> · <a href="README.en.md">English</a>
</p>

# Stream Deck Plugins

Коллекция кастомных плагинов для [Elgato Stream Deck](https://www.elgato.com/stream-deck).

Автор: **[Hanokiru](https://github.com/Hanokiru)**.

## Плагины

| Плагин | Версия | Описание |
|--------|--------|----------|
| [**True Cursor Usage**](./plugins/cursor-usage/) | `0.2.0.0` | Остаток Cursor AI usage на кнопках и dials (Total / Auto / API) |
| [**Yandex Alice Home**](./plugins/yandex-alice/) | `0.3.0.0` | Умный дом Яндекса: сценарии, устройства, dials, цвет, режимы, комнаты, сенсоры, пресеты |

## Установка для пользователей

1. Откройте [**Releases**](https://github.com/Hanokiru/streamdeck-plugins/releases)
2. Скачайте нужный `.streamDeckPlugin`:
   - `com.hanokiru.cursor-usage.streamDeckPlugin`
   - `com.hanokiru.yandex-alice.streamDeckPlugin`
3. Дважды кликните по файлу — Stream Deck установит плагин

Подробные инструкции:

- Cursor Usage → [RU](./plugins/cursor-usage/README.md) · [EN](./plugins/cursor-usage/README.en.md)
- Yandex Alice Home → [RU](./plugins/yandex-alice/README.md) · [EN](./plugins/yandex-alice/README.en.md)

### Папка плагинов Stream Deck

| ОС | Путь |
|----|------|
| **Windows** | `%APPDATA%\Elgato\StreamDeck\Plugins\` |
| **macOS** | `~/Library/Application Support/com.elgato.StreamDeck/Plugins/` |

## Сборка из исходников

```bash
git clone https://github.com/Hanokiru/streamdeck-plugins.git

# Cursor Usage
cd streamdeck-plugins/plugins/cursor-usage
npm install && npm run icons && npm run build

# Yandex Alice Home
cd ../yandex-alice
npm install && npm run icons && npm run build
```

## Сборка релиза

```bash
cd plugins/yandex-alice   # или cursor-usage
npm run pack
# → releases/com.hanokiru.*.streamDeckPlugin
```

Тег плагина запускает GitHub Actions: validate + pack **только этого** плагина + upload в отдельный Release.

| Плагин | Пример тега | Что попадёт в Release |
|--------|-------------|------------------------|
| Alice | `yandex-alice-v0.3.0.0` | только `com.hanokiru.yandex-alice.streamDeckPlugin` |
| Cursor Usage | `cursor-usage-v0.3.0.0` | только `com.hanokiru.cursor-usage.streamDeckPlugin` |

Предыдущие релизы других плагинов **остаются** в списке Releases.

## Структура репозитория

```
streamdeck-plugins/
├── plugins/
│   ├── cursor-usage/
│   └── yandex-alice/
│       ├── src/
│       ├── scripts/
│       ├── com.hanokiru.yandex-alice.sdPlugin/
│       └── releases/          # не в git
├── .github/workflows/ci.yml
└── LICENSE
```

## Что не попадает в git

- `bin/plugin.js`, `*.streamDeckPlugin`, `releases/`
- `.env`, `.env.local`, любые секреты
- runtime-логи `*.sdPlugin/logs/*`

Токены хранятся **только локально** в профиле Stream Deck на вашем ПК.

## Автор

[Hanokiru](https://github.com/Hanokiru)

MIT License — см. [LICENSE](./LICENSE).
