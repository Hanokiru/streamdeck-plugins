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
  <b>Русский</b> · <a href="README.en.md">English</a>
</p>

# Yandex Alice Home

Плагин для [Elgato Stream Deck](https://www.elgato.com/stream-deck), который управляет **умным домом Яндекса (Алиса)** прямо с кнопок и dials Stream Deck+.

Автор: **[Hanokiru](https://github.com/Hanokiru)**.

---

## Содержание

1. [Что умеет плагин](#что-умеет-плагин)
2. [Требования](#требования)
3. [Установка для пользователей](#установка-для-пользователей)
4. [Получение OAuth-токена Яндекса](#получение-oauth-токена-яндекса) — **важно, без этого плагин не работает**
5. [Первая настройка в Stream Deck](#первая-настройка-в-stream-deck)
6. [Описание всех actions](#описание-всех-actions)
7. [Stream Deck+](#stream-deck)
8. [Сборка из исходников](#сборка-из-исходников)
9. [Сборка релизного пакета](#сборка-релизного-пакета)
10. [Безопасность](#безопасность)
11. [Устранение неполадок](#устранение-неполадок)
12. [Частые вопросы](#часто-задаваемые-вопросы)

---

## Что умеет плагин

| Action | Кнопки | Dials | Назначение |
|--------|:------:|:-----:|------------|
| **Run Scenario** | ✓ | | Запуск сценария умного дома |
| **Toggle Device** | ✓ | | Вкл/выкл устройства + иконка по типу |
| **Device Dial** | | ✓ | Яркость / громкость / температура / влажность / открытие… |
| **Color Light** | ✓ | ✓ | Температура света, HSV-цвета, сцены; dial — тонкая настройка |
| **Device Mode** | ✓ | | Цикл режимов (cool / heat / auto / turbo…) |
| **Room / Group** | ✓ | ✓ | Вся комната или группа устройств; dial — яркость комнаты |
| **Sensor** | ✓ | ✓ | Показ температуры, влажности, CO₂ и др. (без управления) |
| **Quick Preset** | ✓ | | Макрос из нескольких шагов одним нажатием |

Визуальный стиль: тёмные Mana-подобные ключи с фиолетовым свечением.

---

## Требования

| | |
|--|--|
| **Stream Deck** | ПО версии **6.9+** (Windows 10+ или macOS 12+) |
| **Устройство** | любой Stream Deck с кнопками; dials — только **Stream Deck+** |
| **Аккаунт** | Яндекс с настроенным умным домом |
| **Сеть** | доступ к `api.iot.yandex.net` и `oauth.yandex.ru` |
| **Для сборки** | Node.js **20+**, ImageMagick (`convert`), [Stream Deck CLI](https://docs.elgato.com/streamdeck/cli/introduction/getting-started) |

---

## Установка для пользователей

### Способ A — из Releases (рекомендуется)

1. Откройте [**Releases**](https://github.com/Hanokiru/streamdeck-plugins/releases) репозитория.
2. Скачайте файл  
   `com.hanokiru.yandex-alice.streamDeckPlugin`
3. Дважды кликните по файлу — Stream Deck установит плагин.
4. Перезапустите Stream Deck при необходимости.
5. В каталоге actions найдите категорию **Yandex Alice Home**.

### Способ B — ручная копия папки плагина

1. Соберите плагин [из исходников](#сборка-из-исходников) **или** возьмите готовую папку `com.hanokiru.yandex-alice.sdPlugin`.
2. Скопируйте её целиком в каталог плагинов:

| ОС | Путь |
|----|------|
| **Windows** | `%APPDATA%\Elgato\StreamDeck\Plugins\` |
| **macOS** | `~/Library/Application Support/com.elgato.StreamDeck/Plugins/` |

3. Перезапустите Stream Deck.

> В папке плагина обязательно должны быть `bin/plugin.js`, `bin/package.json` (`{ "type": "module" }`), `manifest.json`, `ui/`, `imgs/`, `layouts/`.

---

## Получение OAuth-токена Яндекса

Плагин ходит в **Yandex IoT API** от вашего имени. Нужен персональный OAuth-токен со scope:

- `iot:view` — чтение устройств, сценариев, сенсоров  
- `iot:control` — управление (вкл/выкл, яркость, сценарии…)

### Шаг 1. Создайте OAuth-приложение

1. Откройте [oauth.yandex.ru](https://oauth.yandex.ru) и войдите в аккаунт Яндекса.
2. Нажмите **Создать новое приложение** (или откройте существующее).
3. Заполните название, например: `Stream Deck Alice`.
4. В блоке **Платформы** можно оставить веб-сервисы / указать redirect при необходимости.
5. В **Доступах (API)** найдите и включите:
   - **Умный дом Яндекса** → `iot:view`
   - **Умный дом Яндекса** → `iot:control`
6. Сохраните приложение.
7. Скопируйте **ClientID** (идентификатор приложения).

> **Client Secret не нужен** для схемы `response_type=token` (implicit).  
> **Никогда не публикуйте** Client Secret, токен и `.env.local` в git, Issues, Discussions или скриншотах.

### Шаг 2. Откройте URL авторизации

Сформируйте ссылку (подставьте свой ClientID):

```text
https://oauth.yandex.ru/authorize?response_type=token&client_id=ВАШ_CLIENT_ID
```

Или локальный помощник из репозитория:

```bash
cd plugins/yandex-alice
cp .env.example .env.local
# отредактируйте .env.local — укажите YANDEX_CLIENT_ID=...
npm run auth-url
```

Команда выведет готовую ссылку в терминал.

### Шаг 3. Войдите и скопируйте токен

1. Откройте ссылку в браузере.
2. Разрешите доступ приложению.
3. После редиректа адресная строка будет похожа на:

```text
https://oauth.yandex.ru/verification_code#access_token=AQAAAAA....&token_type=bearer&expires_in=31536000
```

4. Скопируйте значение **`access_token`** (всё между `access_token=` и следующим `&`).
5. Сохраните токен в надёжном месте — он понадобится в Stream Deck.

> Токен может иметь срок жизни (`expires_in`). Когда перестанет работать — получите новый тем же способом.

---

## Первая настройка в Stream Deck

1. Перетащите любой action из **Yandex Alice Home** на кнопку или dial.
2. В Property Inspector найдите поле **OAuth token**.
3. Вставьте токен. Он **общий** для всех actions этого плагина (global setting).
4. Нажмите кнопку **↻** (обновить список).
5. Дождитесь статуса вроде `Loaded N …` или `Plugin connected, loading…`.
6. Выберите устройство / сценарий / комнату в списке.

Если видите `No response from plugin` — см. [Устранение неполадок](#устранение-неполадок).

---

## Описание всех actions

### 1. Run Scenario

Запускает сценарий умного дома.

| | |
|--|--|
| **Где** | только кнопки |
| **Настройка** | выбрать сценарий после ↻ |
| **Нажатие** | запуск сценария + фиолетовая вспышка успеха |

---

### 2. Toggle Device

Включает и выключает устройство с capability `on_off`.

| | |
|--|--|
| **Где** | только кнопки |
| **Настройка** | устройство из списка; интервал опроса состояния |
| **Иконки** | подбираются по типу/имени (лампа, лента, очиститель, колонка, ТВ, наушники…) |
| **Нажатие** | переключить питание |

---

### 3. Device Dial

Числовые параметры (`devices.capabilities.range`): яркость, громкость, температура, влажность, открытие штор, канал и т.д.

| | |
|--|--|
| **Где** | только **Stream Deck+** dial |
| **Поворот** | изменить значение (с debounce, без «прыжков» UI) |
| **Нажатие / touch** | настраивается: toggle / refresh / max / min / mid |
| **Настройки** | шаг, множитель тиков, инверсия вращения, интервал sync |

---

### 4. Color Light

Цвет и температура света (`color_setting`).

| | |
|--|--|
| **Кнопка** | цикл пресетов: температура K / HSV-цвета / light scenes |
| **Dial: поворот** | тонкая настройка температуры (±100 K) или hue |
| **Dial: нажатие** | тот же цикл пресетов |
| **Настройки** | устройство, тип цикла, тип dial |

Пресеты температуры: 2700 / 3400 / 4500 / 5600 / 6500 K (в пределах возможностей лампы).

---

### 5. Device Mode

Циклическое переключение режимов (`devices.capabilities.mode`) — кондиционер, очиститель, пылесос и др.

| | |
|--|--|
| **Где** | кнопки |
| **Настройка** | устройство + mode instance (например `thermostat`, `fan_speed`) |
| **Нажатие** | следующий режим в списке устройства |

---

### 6. Room / Group

Управление всей комнатой или группой Яндекса.

| | |
|--|--|
| **Кнопка** | toggle / always ON / always OFF (настройка Press) |
| **Dial: поворот** | яркость всех устройств с `brightness` в комнате/группе |
| **Dial: нажатие** | то же, что кнопка |
| **Настройка** | Room или Group → выбрать цель → ↻ |

Если в аккаунте есть группы Яндекса, для них используется API `groups/{id}/actions`.

---

### 7. Sensor

Только отображение свойств (`devices.properties.float`): температура, влажность, CO₂, батарея и др.

| | |
|--|--|
| **Кнопка / dial** | показывает значение |
| **Нажатие / touch** | принудительное обновление |
| **Настройка** | устройство + property instance + интервал sync |

---

### 8. Quick Preset

Макрос из нескольких шагов одним нажатием.

Поддерживаемые шаги в PI:

| Тип шага | Пример |
|----------|--------|
| **Run scenario** | сценарий «Кино» |
| **Device power** | лампа ON/OFF |
| **Device range** | `brightness:20` |
| **Color temperature** | `2700` |
| **Device mode** | `thermostat:cool` |

1. Задайте **Preset name** (например `Movie night`).
2. Нажмите **↻ Refresh lists**.
3. Добавляйте шаги кнопкой **+ Add step**.
4. Нажатие ключа выполняет шаги **по порядку**.

---

## Stream Deck+

На Stream Deck+ доступны dial-actions:

- **Device Dial**
- **Color Light** (как dial)
- **Room / Group** (как dial)
- **Sensor** (как dial)

На экране dial: название, значение, подпись и progress bar в фиолетовой теме.

---

## Сборка из исходников

```bash
git clone https://github.com/Hanokiru/streamdeck-plugins.git
cd streamdeck-plugins/plugins/yandex-alice
npm install
npm run icons    # пересобрать PNG из scripts/ai-icons (нужен ImageMagick)
npm run build    # → com.hanokiru.yandex-alice.sdPlugin/bin/plugin.js
```

Скопируйте `com.hanokiru.yandex-alice.sdPlugin` в папку плагинов (см. таблицу выше) и перезапустите Stream Deck.

### Hot-reload (разработка)

```bash
npm run watch
```

Нужны установленные Stream Deck и CLI на той же машине.

---

## Сборка релизного пакета

```bash
cd plugins/yandex-alice
npm run pack
# → releases/com.hanokiru.yandex-alice.streamDeckPlugin
```

Папка `releases/` в git не коммитится.

Тег `yandex-alice-v*` на GitHub запускает CI, который собирает и прикрепляет **только** Alice `.streamDeckPlugin` к отдельному Release (Cursor Usage при этом не трогается).

```bash
git tag yandex-alice-v0.3.0.0
git push origin yandex-alice-v0.3.0.0
```

---

## Безопасность

| Что | Где хранится | В git? |
|-----|--------------|--------|
| OAuth **access token** | только настройки Stream Deck на вашем ПК | **нет** |
| `YANDEX_CLIENT_ID` / Secret | локальный `.env.local` (опционально, для `auth-url`) | **нет** (gitignore) |
| Client Secret | не нужен для implicit flow | **никогда не коммитьте** |

Не вставляйте токены в Issues, Discussions, скриншоты PI и логи.

---

## Устранение неполадок

### «No response from plugin. Is the plugin running?»

1. Убедитесь, что скопирована **полная** папка `.sdPlugin`, включая `bin/package.json` с `"type":"module"`.
2. Перезапустите Stream Deck / выключите-включите плагин.
3. Откройте лог:  
   `…/Plugins/com.hanokiru.yandex-alice.sdPlugin/logs/`
4. Ищите строки `[yandex-alice] plugin starting` и ошибки.

### Список устройств пустой / ошибка AUTH

- Токен просрочен или без scope `iot:view` / `iot:control` — получите новый.
- В PI после вставки токена нажмите **↻**.

### Dial «прыгает» назад

В v0.3 значение кэшируется локально и не перетирается устаревшим ответом API сразу после поворота. Обновите плагин до актуальной сборки.

### Color / Mode / Sensor не видят устройства

У устройства может не быть нужной capability/property в ответе API Яндекса. Проверьте в приложении Дом с Алисой, что функция реально доступна.

### Плагин не появляется в Stream Deck

- Версия ПО Stream Deck ≥ 6.9  
- Папка называется точно `com.hanokiru.yandex-alice.sdPlugin`  
- Есть валидный `manifest.json`

---

## Часто задаваемые вопросы

**Нужен ли Client Secret?**  
Нет, для `response_type=token` достаточно ClientID.

**Токен общий для всех кнопок?**  
Да, это global setting плагина.

**Работает ли без Stream Deck+?**  
Да — все key-actions работают на обычных Stream Deck. Dials — только на Stream Deck+.

**Это официальный плагин Яндекса / Elgato?**  
Нет. Open-source проект автора [Hanokiru](https://github.com/Hanokiru), MIT.

**Можно ли управлять чужим домом?**  
Только тем аккаунтом Яндекса, чей OAuth-токен вы вставили.

---

## Лицензия

[MIT](../../LICENSE) © Hanokiru
