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
  <a href="README.md">Русский</a> · <b>English</b>
</p>

# Stream Deck Plugins

A collection of custom plugins for [Elgato Stream Deck](https://www.elgato.com/stream-deck).

Author: **[Hanokiru](https://github.com/Hanokiru)**.

## Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| [**True Cursor Usage**](./plugins/cursor-usage/) | `0.2.0.0` | Remaining Cursor AI usage on keys and dials (Total / Auto / API) |
| [**Yandex Alice Home**](./plugins/yandex-alice/) | `0.3.0.0` | Yandex Smart Home: scenarios, devices, dials, color, modes, rooms, sensors, presets |

## Install (end users)

1. Open [**Releases**](https://github.com/Hanokiru/streamdeck-plugins/releases)
2. Download the `.streamDeckPlugin` you need:
   - `com.hanokiru.cursor-usage.streamDeckPlugin`
   - `com.hanokiru.yandex-alice.streamDeckPlugin`
3. Double-click the file — Stream Deck installs the plugin

Detailed guides:

- Cursor Usage → [RU](./plugins/cursor-usage/README.md) · [EN](./plugins/cursor-usage/README.en.md)
- Yandex Alice Home → [RU](./plugins/yandex-alice/README.md) · [EN](./plugins/yandex-alice/README.en.md)

### Stream Deck plugins folder

| OS | Path |
|----|------|
| **Windows** | `%APPDATA%\Elgato\StreamDeck\Plugins\` |
| **macOS** | `~/Library/Application Support/com.elgato.StreamDeck/Plugins/` |

## Build from source

```bash
git clone https://github.com/Hanokiru/streamdeck-plugins.git

# Cursor Usage
cd streamdeck-plugins/plugins/cursor-usage
npm install && npm run icons && npm run build

# Yandex Alice Home
cd ../yandex-alice
npm install && npm run icons && npm run build
```

## Pack a release

```bash
cd plugins/yandex-alice   # or cursor-usage
npm run pack
# → releases/com.hanokiru.*.streamDeckPlugin
```

A plugin tag triggers GitHub Actions: validate + pack **only that** plugin + upload to its own Release.

| Plugin | Example tag | Release asset |
|--------|-------------|---------------|
| Alice | `yandex-alice-v0.3.0.0` | only `com.hanokiru.yandex-alice.streamDeckPlugin` |
| Cursor Usage | `cursor-usage-v0.3.0.0` | only `com.hanokiru.cursor-usage.streamDeckPlugin` |

Earlier releases of other plugins **remain** in the Releases list.

## Repository structure

```
streamdeck-plugins/
├── plugins/
│   ├── cursor-usage/
│   └── yandex-alice/
│       ├── src/
│       ├── scripts/
│       ├── com.hanokiru.yandex-alice.sdPlugin/
│       └── releases/          # not in git
├── .github/workflows/ci.yml
└── LICENSE
```

## What is not committed

- `bin/plugin.js`, `*.streamDeckPlugin`, `releases/`
- `.env`, `.env.local`, any secrets
- runtime logs `*.sdPlugin/logs/*`

Tokens live **only locally** in your Stream Deck profile on your PC.

## Author

[Hanokiru](https://github.com/Hanokiru)

MIT License — see [LICENSE](./LICENSE).
