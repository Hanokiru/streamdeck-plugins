<p align="center">
  <img src="https://img.shields.io/badge/True_Cursor_Usage-7C3AED?style=for-the-badge&logo=elgato&logoColor=F5F3FF" alt="True Cursor Usage" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0.0-7C3AED?style=flat-square" alt="Version" />
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-A78BFA?style=flat-square&logo=opensourceinitiative&logoColor=4C1D95" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/keys-✓-4C1D95?style=flat-square&logo=elgato&logoColor=white" alt="Keys" />
  <img src="https://img.shields.io/badge/dials-✓-7C3AED?style=flat-square&logo=elgato&logoColor=white" alt="Dials" />
  <img src="https://img.shields.io/badge/theme-purple-C4B5FD?style=flat-square" alt="Purple theme" />
  <a href="https://github.com/Hanokiru/streamdeck-plugins/releases"><img src="https://img.shields.io/badge/download-Releases-A78BFA?style=flat-square&logo=github&logoColor=4C1D95" alt="Download" /></a>
</p>

<p align="center">
  <a href="README.md">Русский</a> · <b>English</b>
</p>

# True Cursor Usage

Shows remaining Cursor AI usage on keys and **Stream Deck+** dials — just like the Cursor dashboard.

## Metrics

| Mode | What it shows |
|------|---------------|
| **Total Spend** | `$387.53 left` — remaining budget |
| **Auto** | `% left` for Auto |
| **Composer / API** | `% left` for Composer/API |
| **Total %** | overall usage percentage |

## Installation

### Quick (Releases)

Download `.streamDeckPlugin` from [**Releases**](https://github.com/Hanokiru/streamdeck-plugins/releases) and open the file.

### From source

```bash
npm install
npm run icons
npm run build
```

Copy `com.hanokiru.cursor-usage.sdPlugin` to your Stream Deck plugins folder.

## Token setup

1. Open [cursor.com](https://cursor.com) → DevTools → Application → Cookies
2. Copy the full `WorkosCursorSessionToken` value
3. Paste it into the action settings in Stream Deck

> Your token is stored **locally only** in your Stream Deck profile on your PC.

## Controls

| Surface | Action |
|---------|--------|
| **Key** | Press — refresh |
| **Dial: rotate** | Switch metric |
| **Dial: press / touch** | Refresh |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Session / Token | (auto) | Cookie or JWT |
| Display metric | Total Spend | Default metric |
| Refresh interval | 300 sec | Auto-refresh (min. 60) |
| Warning below | 20% | Warning threshold |

## Building a release

```bash
npm run pack
# → releases/com.hanokiru.cursor-usage.streamDeckPlugin
```

## How it works

The plugin uses `WorkosCursorSessionToken` (cookie) or a JWT from `state.vscdb` and fetches usage via `api2.cursor.sh`. These endpoints are unofficial and may change.

## Development

```bash
npm run watch
```

Requires the [Stream Deck CLI](https://docs.elgato.com/streamdeck/cli/introduction/getting-started).
