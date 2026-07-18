/**
 * Mana-style Stream Deck key art paths (AI-rendered PNGs).
 */

export type DeviceKind =
  | "light"
  | "strip"
  | "socket"
  | "speaker"
  | "tv"
  | "headphones"
  | "purifier"
  | "humidifier"
  | "climate"
  | "kettle"
  | "vacuum"
  | "curtain"
  | "sensor"
  | "pc"
  | "other";

const NAME_HINTS: Array<{ re: RegExp; kind: DeviceKind }> = [
  { re: /наушник|headphone|headset|airpods/i, kind: "headphones" },
  { re: /лент|strip|led.?strip|гирлянд/i, kind: "strip" },
  { re: /очистител|purifier|воздухооч/i, kind: "purifier" },
  { re: /увлажн|humidifier/i, kind: "humidifier" },
  { re: /кондиц|сплит|ac\b|climate|термостат/i, kind: "climate" },
  { re: /чайник|kettle|кипятиль/i, kind: "kettle" },
  { re: /пылесос|vacuum|робот.?пол/i, kind: "vacuum" },
  { re: /штор|curtain|жалюз|blinds/i, kind: "curtain" },
  { re: /ноутбук|laptop|компьютер|пк\b|pc\b|монитор/i, kind: "pc" },
  { re: /телев|тв\b|\btv\b|телевизор/i, kind: "tv" },
  { re: /станци|колонк|speaker|алиса|яндекс/i, kind: "speaker" },
  { re: /розетк|socket|plug/i, kind: "socket" },
  { re: /ламп|свет|люстр|бра\b|light/i, kind: "light" },
];

export function resolveDeviceKind(type?: string, name?: string): DeviceKind {
  const t = (type ?? "").toLowerCase();
  const n = name ?? "";

  if (t.includes("light.strip") || t.includes("led_strip")) return "strip";
  if (t.includes("light")) return "light";
  if (t.includes("socket") || t.includes("switch")) return "socket";
  if (t.includes("smart_speaker") || t.includes("speaker")) return "speaker";
  if (t.includes("media_device.tv") || t.endsWith(".tv")) return "tv";
  if (t.includes("media_device")) return "tv";
  if (t.includes("purifier")) return "purifier";
  if (t.includes("humidifier")) return "humidifier";
  if (t.includes("thermostat") || t.includes("ac") || t.includes("fan")) return "climate";
  if (t.includes("kettle")) return "kettle";
  if (t.includes("vacuum")) return "vacuum";
  if (t.includes("curtain") || t.includes("openable")) return "curtain";
  if (t.includes("sensor")) return "sensor";
  if (t.includes("cooking") || t.includes("coffee")) return "kettle";

  for (const hint of NAME_HINTS) {
    if (hint.re.test(n)) return hint.kind;
  }

  return "other";
}

export function kindLabel(kind: DeviceKind): string {
  const labels: Record<DeviceKind, string> = {
    light: "Light",
    strip: "LED",
    socket: "Socket",
    speaker: "Speaker",
    tv: "TV",
    headphones: "Audio",
    purifier: "Air",
    humidifier: "Humid",
    climate: "Climate",
    kettle: "Kettle",
    vacuum: "Vacuum",
    curtain: "Curtain",
    sensor: "Sensor",
    pc: "PC",
    other: "Device",
  };
  return labels[kind];
}

/** Path relative to plugin root (Stream Deck resolves @2x automatically). */
export function deviceKeyImage(kind: DeviceKind, on: boolean): string {
  return `imgs/actions/device/kinds/${kind}-${on ? "on" : "off"}`;
}

export function scenarioKeyImage(): string {
  return "imgs/actions/scenario/key";
}

export function successFlashImage(): string {
  return "imgs/actions/feedback/success";
}

export function dialInstanceIcon(instance?: string): string {
  const known = new Set(["brightness", "volume", "temperature", "humidity", "open"]);
  const key = instance && known.has(instance) ? instance : "generic";
  return `imgs/actions/dial/${key}`;
}

export function truncateTitle(text: string, max = 11): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
