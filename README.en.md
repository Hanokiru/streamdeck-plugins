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

## Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| [**True Cursor Usage**](./plugins/cursor-usage/README.en.md) | `0.2.0.0` | Remaining Cursor AI usage on keys and dials (Total / Auto / API) |

## Installation

### For users (no build required)

1. Open [**Releases**](https://github.com/Hanokiru/streamdeck-plugins/releases) on GitHub
2. Download `com.hanokiru.cursor-usage.streamDeckPlugin`
3. Double-click the file — Stream Deck will install the plugin

### For developers (from source)

```bash
git clone https://github.com/Hanokiru/streamdeck-plugins.git
cd streamdeck-plugins/plugins/cursor-usage
npm install
npm run icons
npm run build
```

Copy `com.hanokiru.cursor-usage.sdPlugin` to the plugins folder:

| OS | Path |
|----|------|
| **Windows** | `%APPDATA%\Elgato\StreamDeck\Plugins\` |
| **macOS** | `~/Library/Application Support/com.elgato.StreamDeck/Plugins/` |

Restart Stream Deck.

## Building a release

```bash
cd plugins/cursor-usage
npm run pack
```

The package will appear in `plugins/cursor-usage/releases/`.

## Development

```bash
cd plugins/cursor-usage
npm run watch   # hot-reload (requires Stream Deck CLI)
```

## Repository structure

```
streamdeck-plugins/
├── plugins/
│   └── cursor-usage/
│       ├── src/                    # TypeScript sources
│       ├── scripts/                # icon generation
│       ├── com.hanokiru.cursor-usage.sdPlugin/
│       │   ├── manifest.json
│       │   ├── ui/
│       │   ├── layouts/
│       │   └── imgs/
│       └── releases/               # .streamDeckPlugin (not in git)
├── .github/workflows/ci.yml
└── LICENSE
```

## What is not committed to git

Build artifacts (`bin/plugin.js`, `sql-wasm.wasm`, `*.streamDeckPlugin`) are gitignored — build locally or download from Releases. **Your session token is never stored in the repo** — it lives only in Stream Deck settings on your PC.

## Author

[Hanokiru](https://github.com/Hanokiru)
