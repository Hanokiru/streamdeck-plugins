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

# True Cursor Usage

Показывает остаток Cursor AI usage на кнопках и **Stream Deck+** dials — как в дашборде Cursor.

## Метрики

| Режим | Что показывает |
|-------|----------------|
| **Total Spend** | `$387.53 left` — остаток бюджета |
| **Auto** | `% left` для Auto |
| **Composer / API** | `% left` для Composer/API |
| **Total %** | общий процент использования |

## Установка

### Быстрая (Releases)

Скачайте `.streamDeckPlugin` из [**Releases**](https://github.com/Hanokiru/streamdeck-plugins/releases) и откройте файл.

### Из исходников

```bash
npm install
npm run icons
npm run build
```

Скопируйте `com.hanokiru.cursor-usage.sdPlugin` в папку плагинов Stream Deck.

## Настройка токена

1. Откройте [cursor.com](https://cursor.com) → DevTools → Application → Cookies
2. Скопируйте `WorkosCursorSessionToken` целиком
3. Вставьте в настройки action в Stream Deck

> Токен хранится **только локально** в профиле Stream Deck на вашем ПК.

## Управление

| Поверхность | Действие |
|-------------|----------|
| **Кнопка** | Нажатие — обновить |
| **Dial: поворот** | Переключить метрику |
| **Dial: нажатие / touch** | Обновить |

## Настройки

| Параметр | По умолчанию | Описание |
|----------|--------------|----------|
| Session / Token | (авто) | Cookie или JWT из Cursor |
| Display metric | Total Spend | Метрика по умолчанию |
| Refresh interval | 300 сек | Автообновление (мин. 60) |
| Warning below | 20% | Порог предупреждения |

## Сборка релиза

```bash
npm run pack
# → releases/com.hanokiru.cursor-usage.streamDeckPlugin
```

## Как это работает

Плагин использует `WorkosCursorSessionToken` (cookie) или JWT из `state.vscdb` Cursor и запрашивает usage через `api2.cursor.sh`. Эндпоинты неофициальные и могут измениться.

## Разработка

```bash
npm run watch
```

Требуется [Stream Deck CLI](https://docs.elgato.com/streamdeck/cli/introduction/getting-started).
