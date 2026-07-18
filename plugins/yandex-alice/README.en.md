<p align="center">
  <img src="https://img.shields.io/badge/Yandex_Alice_Home-7C3AED?style=for-the-badge&logo=elgato&logoColor=F5F3FF" alt="Yandex Alice Home" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.0.0-7C3AED?style=flat-square" alt="Version" />
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-A78BFA?style=flat-square&logo=opensourceinitiative&logoColor=4C1D95" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/keys-✓-4C1D95?style=flat-square&logo=elgato&logoColor=white" alt="Keys" />
  <img src="https://img.shields.io/badge/dials-✓-7C3AED?style=flat-square&logo=elgato&logoColor=white" alt="Dials" />
  <img src="https://img.shields.io/badge/Yandex_IoT-API-C4B5FD?style=flat-square" alt="Yandex IoT" />
  <a href="https://github.com/Hanokiru/streamdeck-plugins/releases"><img src="https://img.shields.io/badge/download-Releases-A78BFA?style=flat-square&logo=github&logoColor=4C1D95" alt="Download" /></a>
</p>

<p align="center">
  <a href="README.md">Русский</a> · <b>English</b>
</p>

# Yandex Alice Home

An [Elgato Stream Deck](https://www.elgato.com/stream-deck) plugin that controls **Yandex Smart Home (Alice)** from keys and Stream Deck+ dials.

Author: **[Hanokiru](https://github.com/Hanokiru)**.

---

## Table of contents

1. [Features](#features)
2. [Requirements](#requirements)
3. [Install (end users)](#install-end-users)
4. [Get a Yandex OAuth token](#get-a-yandex-oauth-token) — **required**
5. [First-time setup in Stream Deck](#first-time-setup-in-stream-deck)
6. [Actions reference](#actions-reference)
7. [Stream Deck+](#stream-deck-1)
8. [Build from source](#build-from-source)
9. [Pack a release](#pack-a-release)
10. [Security](#security)
11. [Troubleshooting](#troubleshooting)
12. [FAQ](#faq)

---

## Features

| Action | Keys | Dials | Purpose |
|--------|:----:|:-----:|---------|
| **Run Scenario** | ✓ | | Run a Smart Home scenario |
| **Toggle Device** | ✓ | | Power on/off + type-aware icons |
| **Device Dial** | | ✓ | Brightness / volume / temperature / humidity / open… |
| **Color Light** | ✓ | ✓ | Color temperature, HSV, scenes; dial for fine control |
| **Device Mode** | ✓ | | Cycle modes (cool / heat / auto / turbo…) |
| **Room / Group** | ✓ | ✓ | Whole room or group; dial = room brightness |
| **Sensor** | ✓ | ✓ | Show temperature, humidity, CO₂, etc. (read-only) |
| **Quick Preset** | ✓ | | Multi-step macro on one press |

Visual style: Mana-inspired dark keys with neon purple glow.

---

## Requirements

| | |
|--|--|
| **Stream Deck** | Software **6.9+** (Windows 10+ or macOS 12+) |
| **Hardware** | any Stream Deck with keys; dials need **Stream Deck+** |
| **Account** | Yandex account with Smart Home set up |
| **Network** | access to `api.iot.yandex.net` and `oauth.yandex.ru` |
| **For building** | Node.js **20+**, ImageMagick (`convert`), [Stream Deck CLI](https://docs.elgato.com/streamdeck/cli/introduction/getting-started) |

---

## Install (end users)

### Option A — from Releases (recommended)

1. Open the repo [**Releases**](https://github.com/Hanokiru/streamdeck-plugins/releases) page.
2. Download  
   `com.hanokiru.yandex-alice.streamDeckPlugin`
3. Double-click the file — Stream Deck installs the plugin.
4. Restart Stream Deck if needed.
5. Find category **Yandex Alice Home** in the action catalog.

### Option B — copy the plugin folder

1. [Build from source](#build-from-source) **or** obtain a ready `com.hanokiru.yandex-alice.sdPlugin` folder.
2. Copy it into:

| OS | Path |
|----|------|
| **Windows** | `%APPDATA%\Elgato\StreamDeck\Plugins\` |
| **macOS** | `~/Library/Application Support/com.elgato.StreamDeck/Plugins/` |

3. Restart Stream Deck.

> The folder must include `bin/plugin.js`, `bin/package.json` (`{ "type": "module" }`), `manifest.json`, `ui/`, `imgs/`, and `layouts/`.

---

## Get a Yandex OAuth token

The plugin calls the **Yandex IoT API** on your behalf. You need a personal OAuth token with scopes:

- `iot:view` — read devices, scenarios, sensors  
- `iot:control` — control (power, brightness, scenarios…)

### Step 1. Create an OAuth app

1. Open [oauth.yandex.ru](https://oauth.yandex.ru) and sign in.
2. Click **Create new application** (or open an existing one).
3. Name it, e.g. `Stream Deck Alice`.
4. Under **Platforms**, keep web services / set a redirect if your console requires it.
5. Under **Accesses (API)**, enable:
   - **Yandex Smart Home** → `iot:view`
   - **Yandex Smart Home** → `iot:control`
6. Save the app.
7. Copy the **ClientID**.

> **Client Secret is not required** for `response_type=token` (implicit flow).  
> **Never publish** Client Secret, tokens, or `.env.local` to git, Issues, Discussions, or screenshots.

### Step 2. Open the authorize URL

Build this URL (replace with your ClientID):

```text
https://oauth.yandex.ru/authorize?response_type=token&client_id=YOUR_CLIENT_ID
```

Or use the local helper:

```bash
cd plugins/yandex-alice
cp .env.example .env.local
# edit .env.local — set YANDEX_CLIENT_ID=...
npm run auth-url
```

### Step 3. Authorize and copy the token

1. Open the URL in a browser.
2. Allow access.
3. After redirect, the address bar looks like:

```text
https://oauth.yandex.ru/verification_code#access_token=AQAAAAA....&token_type=bearer&expires_in=31536000
```

4. Copy the **`access_token`** value (everything between `access_token=` and the next `&`).
5. Keep it safe — you will paste it into Stream Deck.

> Tokens may expire (`expires_in`). When they stop working, repeat this flow.

---

## First-time setup in Stream Deck

1. Drag any **Yandex Alice Home** action onto a key or dial.
2. In the Property Inspector, find **OAuth token**.
3. Paste the token. It is **shared** across all actions of this plugin (global setting).
4. Click **↻** to refresh lists.
5. Wait for a status like `Loaded N …` or `Plugin connected, loading…`.
6. Pick a device / scenario / room.

If you see `No response from plugin` — see [Troubleshooting](#troubleshooting).

---

## Actions reference

### 1. Run Scenario

Runs a Smart Home scenario.

| | |
|--|--|
| **Where** | keys only |
| **Setup** | pick a scenario after ↻ |
| **Press** | run scenario + purple success flash |

---

### 2. Toggle Device

Toggles devices that expose `on_off`.

| | |
|--|--|
| **Where** | keys only |
| **Setup** | device list + poll interval |
| **Icons** | chosen by type/name (light, strip, purifier, speaker, TV, headphones…) |
| **Press** | toggle power |

---

### 3. Device Dial

Numeric ranges (`devices.capabilities.range`): brightness, volume, temperature, humidity, curtains, channel, etc.

| | |
|--|--|
| **Where** | **Stream Deck+** dials only |
| **Rotate** | change value (debounced; UI does not bounce on stale API reads) |
| **Press / touch** | configurable: toggle / refresh / max / min / mid |
| **Settings** | step, tick multiplier, invert rotate, sync interval |

---

### 4. Color Light

Color and white temperature (`color_setting`).

| | |
|--|--|
| **Key** | cycle presets: temperature K / HSV colors / light scenes |
| **Dial rotate** | fine-tune temperature (±100 K) or hue |
| **Dial press** | same preset cycle |
| **Settings** | device, cycle kind, dial kind |

Temperature presets: 2700 / 3400 / 4500 / 5600 / 6500 K (clamped to the lamp’s range).

---

### 5. Device Mode

Cycles `devices.capabilities.mode` values — AC, purifier, vacuum, etc.

| | |
|--|--|
| **Where** | keys |
| **Setup** | device + mode instance (e.g. `thermostat`, `fan_speed`) |
| **Press** | next mode in the device’s list |

---

### 6. Room / Group

Control a whole Yandex room or group.

| | |
|--|--|
| **Key** | toggle / always ON / always OFF (Press setting) |
| **Dial rotate** | brightness for all `brightness` devices in the room/group |
| **Dial press** | same as key |
| **Setup** | Room or Group → pick target → ↻ |

Groups use `groups/{id}/actions` when available.

---

### 7. Sensor

Read-only float properties (`devices.properties.float`): temperature, humidity, CO₂, battery, etc.

| | |
|--|--|
| **Key / dial** | shows the value |
| **Press / touch** | force refresh |
| **Setup** | device + property instance + sync interval |

---

### 8. Quick Preset

One-press multi-step macro.

Supported PI steps:

| Step type | Example |
|-----------|---------|
| **Run scenario** | “Movie” scenario |
| **Device power** | lamp ON/OFF |
| **Device range** | `brightness:20` |
| **Color temperature** | `2700` |
| **Device mode** | `thermostat:cool` |

1. Set a **Preset name** (e.g. `Movie night`).
2. Click **↻ Refresh lists**.
3. Add steps with **+ Add step**.
4. Key press runs steps **in order**.

---

## Stream Deck+

Dial-capable actions:

- **Device Dial**
- **Color Light** (as dial)
- **Room / Group** (as dial)
- **Sensor** (as dial)

Dial feedback shows title, value, subtitle, and a purple progress bar.

---

## Build from source

```bash
git clone https://github.com/Hanokiru/streamdeck-plugins.git
cd streamdeck-plugins/plugins/yandex-alice
npm install
npm run icons    # rebuild PNGs from scripts/ai-icons (needs ImageMagick)
npm run build    # → com.hanokiru.yandex-alice.sdPlugin/bin/plugin.js
```

Copy `com.hanokiru.yandex-alice.sdPlugin` into the plugins folder (see table above) and restart Stream Deck.

### Hot-reload (development)

```bash
npm run watch
```

Requires Stream Deck + CLI on the same machine.

---

## Pack a release

```bash
cd plugins/yandex-alice
npm run pack
# → releases/com.hanokiru.yandex-alice.streamDeckPlugin
```

The `releases/` folder is gitignored.

A `yandex-alice-v*` tag triggers CI that builds and attaches **only** the Alice `.streamDeckPlugin` to its own Release (Cursor Usage is left untouched).

```bash
git tag yandex-alice-v0.3.0.0
git push origin yandex-alice-v0.3.0.0
```

---

## Security

| What | Stored where | In git? |
|------|--------------|---------|
| OAuth **access token** | Stream Deck settings on your PC only | **no** |
| `YANDEX_CLIENT_ID` / Secret | optional local `.env.local` (for `auth-url`) | **no** (gitignore) |
| Client Secret | not needed for implicit flow | **never commit** |

Do not paste tokens into Issues, Discussions, PI screenshots, or logs.

---

## Troubleshooting

### “No response from plugin. Is the plugin running?”

1. Ensure the **full** `.sdPlugin` folder was copied, including `bin/package.json` with `"type":"module"`.
2. Restart Stream Deck / toggle the plugin off and on.
3. Open logs under:  
   `…/Plugins/com.hanokiru.yandex-alice.sdPlugin/logs/`
4. Look for `[yandex-alice] plugin starting` and any errors.

### Empty lists / AUTH error

- Token expired or missing `iot:view` / `iot:control` — get a new token.
- After pasting the token, press **↻** in the PI.

### Dial value jumps backward

v0.3 caches the value locally and ignores stale API reads right after rotation. Update to the latest build.

### Color / Mode / Sensor shows no devices

The device may not expose that capability/property in the Yandex API. Confirm the feature exists in the Alice Home app.

### Plugin missing in Stream Deck

- Stream Deck software ≥ 6.9  
- Folder name is exactly `com.hanokiru.yandex-alice.sdPlugin`  
- Valid `manifest.json`

---

## FAQ

**Do I need Client Secret?**  
No — `response_type=token` only needs ClientID.

**Is the token shared across buttons?**  
Yes — it is a plugin global setting.

**Does it work without Stream Deck+?**  
Yes — all key actions work on classic Stream Decks. Dials require Stream Deck+.

**Is this an official Yandex / Elgato plugin?**  
No. Open-source project by [Hanokiru](https://github.com/Hanokiru), MIT licensed.

**Can it control someone else’s home?**  
Only the Yandex account whose OAuth token you pasted.

---

## License

[MIT](../../LICENSE) © Hanokiru
