import type {
  ColorCapability,
  FloatProperty,
  HomeSnapshot,
  ModeCapability,
  PresetStep,
  RangeCapability,
  YandexDevice,
  YandexGroup,
  YandexRoom,
  YandexScenario,
} from "./types";

const API_BASE = "https://api.iot.yandex.net/v1.0";

type JsonRecord = Record<string, unknown>;

export type DeviceAction = {
  type: string;
  state: Record<string, unknown>;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const REQUEST_TIMEOUT_MS = 12_000;

async function apiRequest<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const body = await response.text();
    let json: unknown = {};
    if (body.length > 0) {
      try {
        json = JSON.parse(body);
      } catch {
        json = { raw: body };
      }
    }

    if (!response.ok) {
      throw new Error(`Yandex IoT API ${response.status}: ${response.statusText}`);
    }

    return json as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yandex IoT API request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function readOnOff(capabilities: unknown): boolean | undefined {
  if (!Array.isArray(capabilities)) return undefined;
  for (const capability of capabilities) {
    if (!isRecord(capability) || capability.type !== "devices.capabilities.on_off") continue;
    if (!isRecord(capability.state)) continue;
    if (typeof capability.state.value === "boolean") return capability.state.value;
  }
  return undefined;
}

function hasOnOffCapability(capabilities: unknown): boolean {
  if (!Array.isArray(capabilities)) return false;
  return capabilities.some(
    (c) => isRecord(c) && c.type === "devices.capabilities.on_off",
  );
}

function readRanges(capabilities: unknown): RangeCapability[] {
  if (!Array.isArray(capabilities)) return [];
  const ranges: RangeCapability[] = [];
  for (const capability of capabilities) {
    if (!isRecord(capability) || capability.type !== "devices.capabilities.range") continue;
    const parameters = isRecord(capability.parameters) ? capability.parameters : {};
    const state = isRecord(capability.state) ? capability.state : {};
    const range = isRecord(parameters.range) ? parameters.range : {};
    const instance =
      typeof parameters.instance === "string"
        ? parameters.instance
        : typeof state.instance === "string"
          ? state.instance
          : undefined;
    if (!instance) continue;
    ranges.push({
      instance,
      value: typeof state.value === "number" ? state.value : undefined,
      min: typeof range.min === "number" ? range.min : 0,
      max: typeof range.max === "number" ? range.max : 100,
      precision: typeof range.precision === "number" && range.precision > 0 ? range.precision : 1,
      unit: typeof parameters.unit === "string" ? parameters.unit : undefined,
    });
  }
  return ranges;
}

function readModes(capabilities: unknown): ModeCapability[] {
  if (!Array.isArray(capabilities)) return [];
  const modes: ModeCapability[] = [];
  for (const capability of capabilities) {
    if (!isRecord(capability) || capability.type !== "devices.capabilities.mode") continue;
    const parameters = isRecord(capability.parameters) ? capability.parameters : {};
    const state = isRecord(capability.state) ? capability.state : {};
    const instance =
      typeof parameters.instance === "string"
        ? parameters.instance
        : typeof state.instance === "string"
          ? state.instance
          : undefined;
    if (!instance) continue;
    const modeList = Array.isArray(parameters.modes)
      ? parameters.modes
          .map((m) => (isRecord(m) && typeof m.value === "string" ? m.value : undefined))
          .filter((v): v is string => Boolean(v))
      : [];
    modes.push({
      instance,
      value: typeof state.value === "string" ? state.value : undefined,
      modes: modeList,
    });
  }
  return modes;
}

function readColor(capabilities: unknown): ColorCapability | undefined {
  if (!Array.isArray(capabilities)) return undefined;
  for (const capability of capabilities) {
    if (!isRecord(capability) || capability.type !== "devices.capabilities.color_setting") {
      continue;
    }
    const parameters = isRecord(capability.parameters) ? capability.parameters : {};
    const state = isRecord(capability.state) ? capability.state : {};
    const temp = isRecord(parameters.temperature_k) ? parameters.temperature_k : {};
    const sceneObj = isRecord(parameters.color_scene) ? parameters.color_scene : {};
    const scenes = Array.isArray(sceneObj.scenes)
      ? sceneObj.scenes
          .map((s) => (isRecord(s) && typeof s.id === "string" ? s.id : undefined))
          .filter((v): v is string => Boolean(v))
      : [];

    const color: ColorCapability = {
      supportsHsv: parameters.color_model === "hsv",
      supportsRgb: parameters.color_model === "rgb",
      supportsTemperature: Boolean(parameters.temperature_k) || state.instance === "temperature_k",
      temperatureMin: typeof temp.min === "number" ? temp.min : 2700,
      temperatureMax: typeof temp.max === "number" ? temp.max : 6500,
      scenes,
    };

    if (typeof state.instance === "string") {
      if (state.instance === "hsv" && isRecord(state.value)) {
        color.current = {
          instance: "hsv",
          hsv: {
            h: typeof state.value.h === "number" ? state.value.h : 0,
            s: typeof state.value.s === "number" ? state.value.s : 100,
            v: typeof state.value.v === "number" ? state.value.v : 100,
          },
        };
      } else if (state.instance === "rgb" && typeof state.value === "number") {
        color.current = { instance: "rgb", rgb: state.value };
      } else if (state.instance === "temperature_k" && typeof state.value === "number") {
        color.current = { instance: "temperature_k", temperature_k: state.value };
      } else if (state.instance === "scene" && typeof state.value === "string") {
        color.current = { instance: "scene", scene: state.value };
      }
    }

    return color;
  }
  return undefined;
}

function readProperties(properties: unknown): FloatProperty[] {
  if (!Array.isArray(properties)) return [];
  const result: FloatProperty[] = [];
  for (const prop of properties) {
    if (!isRecord(prop) || prop.type !== "devices.properties.float") continue;
    const parameters = isRecord(prop.parameters) ? prop.parameters : {};
    const state = isRecord(prop.state) ? prop.state : {};
    const instance =
      typeof parameters.instance === "string"
        ? parameters.instance
        : typeof state.instance === "string"
          ? state.instance
          : undefined;
    if (!instance) continue;
    result.push({
      instance,
      value: typeof state.value === "number" ? state.value : undefined,
      unit: typeof parameters.unit === "string" ? parameters.unit : undefined,
    });
  }
  return result;
}

function mapDevice(raw: unknown): YandexDevice | undefined {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") {
    return undefined;
  }

  return {
    id: raw.id,
    name: raw.name,
    type: typeof raw.type === "string" ? raw.type : "devices.types.other",
    room: typeof raw.room === "string" ? raw.room : undefined,
    on: readOnOff(raw.capabilities),
    online: raw.state !== "offline",
    hasOnOff: hasOnOffCapability(raw.capabilities),
    ranges: readRanges(raw.capabilities),
    modes: readModes(raw.capabilities),
    color: readColor(raw.capabilities),
    properties: readProperties(raw.properties),
  };
}

function mapScenario(raw: unknown): YandexScenario | undefined {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") {
    return undefined;
  }
  return {
    id: raw.id,
    name: raw.name,
    isActive: raw.is_active === true,
  };
}

export async function fetchHomeSnapshot(token: string): Promise<HomeSnapshot> {
  const json = await apiRequest<JsonRecord>(token, "/user/info");

  const roomById = new Map<string, string>();
  const rooms: YandexRoom[] = [];
  if (Array.isArray(json.rooms)) {
    for (const room of json.rooms) {
      if (!isRecord(room) || typeof room.id !== "string" || typeof room.name !== "string") {
        continue;
      }
      roomById.set(room.id, room.name);
      const deviceIds = Array.isArray(room.devices)
        ? room.devices.filter((id): id is string => typeof id === "string")
        : [];
      rooms.push({ id: room.id, name: room.name, deviceIds });
    }
  }

  const devices = Array.isArray(json.devices)
    ? json.devices
        .map(mapDevice)
        .filter((d): d is YandexDevice => Boolean(d))
        .map((device) => {
          // room field from API may be room id
          const roomId = device.room && roomById.has(device.room) ? device.room : undefined;
          const roomName = roomId
            ? roomById.get(roomId)
            : device.room && !roomById.has(device.room)
              ? device.room
              : roomId
                ? roomById.get(roomId)
                : undefined;
          return {
            ...device,
            roomId,
            room: roomName ?? device.room,
          };
        })
    : [];

  // If rooms didn't list devices, infer from device.room names
  if (rooms.every((r) => r.deviceIds.length === 0)) {
    for (const room of rooms) {
      room.deviceIds = devices.filter((d) => d.room === room.name || d.roomId === room.id).map((d) => d.id);
    }
  }

  const scenarios = Array.isArray(json.scenarios)
    ? json.scenarios.map(mapScenario).filter((s): s is YandexScenario => Boolean(s))
    : [];

  const groups: YandexGroup[] = [];
  if (Array.isArray(json.groups)) {
    for (const group of json.groups) {
      if (!isRecord(group) || typeof group.id !== "string" || typeof group.name !== "string") {
        continue;
      }
      groups.push({
        id: group.id,
        name: group.name,
        type: typeof group.type === "string" ? group.type : undefined,
        deviceIds: Array.isArray(group.devices)
          ? group.devices.filter((id): id is string => typeof id === "string")
          : [],
      });
    }
  }

  return { devices, scenarios, groups, rooms };
}

export async function fetchDevice(token: string, deviceId: string): Promise<YandexDevice> {
  const json = await apiRequest<JsonRecord>(token, `/devices/${encodeURIComponent(deviceId)}`);
  const device = mapDevice(json);
  if (!device) throw new Error("Device payload could not be parsed.");
  return device;
}

export async function sendDeviceActions(
  token: string,
  devices: Array<{ id: string; actions: DeviceAction[] }>,
): Promise<void> {
  await apiRequest(token, "/devices/actions", {
    method: "POST",
    body: JSON.stringify({ devices }),
  });
}

export async function setDevicePower(
  token: string,
  deviceId: string,
  on: boolean,
): Promise<void> {
  await sendDeviceActions(token, [
    {
      id: deviceId,
      actions: [
        {
          type: "devices.capabilities.on_off",
          state: { instance: "on", value: on },
        },
      ],
    },
  ]);
}

export async function setDevicesPower(
  token: string,
  deviceIds: string[],
  on: boolean,
): Promise<void> {
  if (!deviceIds.length) return;
  await sendDeviceActions(
    token,
    deviceIds.map((id) => ({
      id,
      actions: [
        {
          type: "devices.capabilities.on_off",
          state: { instance: "on", value: on },
        },
      ],
    })),
  );
}

export async function setDeviceRange(
  token: string,
  deviceId: string,
  instance: string,
  value: number,
): Promise<void> {
  await sendDeviceActions(token, [
    {
      id: deviceId,
      actions: [
        {
          type: "devices.capabilities.range",
          state: { instance, value },
        },
      ],
    },
  ]);
}

export async function setDevicesRange(
  token: string,
  deviceIds: string[],
  instance: string,
  value: number,
): Promise<void> {
  if (!deviceIds.length) return;
  await sendDeviceActions(
    token,
    deviceIds.map((id) => ({
      id,
      actions: [
        {
          type: "devices.capabilities.range",
          state: { instance, value },
        },
      ],
    })),
  );
}

export async function setDeviceMode(
  token: string,
  deviceId: string,
  instance: string,
  value: string,
): Promise<void> {
  await sendDeviceActions(token, [
    {
      id: deviceId,
      actions: [
        {
          type: "devices.capabilities.mode",
          state: { instance, value },
        },
      ],
    },
  ]);
}

export async function setDeviceColorTemperature(
  token: string,
  deviceId: string,
  temperature_k: number,
): Promise<void> {
  await sendDeviceActions(token, [
    {
      id: deviceId,
      actions: [
        {
          type: "devices.capabilities.color_setting",
          state: { instance: "temperature_k", value: temperature_k },
        },
      ],
    },
  ]);
}

export async function setDeviceColorHsv(
  token: string,
  deviceId: string,
  hsv: { h: number; s: number; v: number },
): Promise<void> {
  await sendDeviceActions(token, [
    {
      id: deviceId,
      actions: [
        {
          type: "devices.capabilities.color_setting",
          state: { instance: "hsv", value: hsv },
        },
      ],
    },
  ]);
}

export async function setDeviceColorScene(
  token: string,
  deviceId: string,
  scene: string,
): Promise<void> {
  await sendDeviceActions(token, [
    {
      id: deviceId,
      actions: [
        {
          type: "devices.capabilities.color_setting",
          state: { instance: "scene", value: scene },
        },
      ],
    },
  ]);
}

export async function setGroupActions(
  token: string,
  groupId: string,
  actions: DeviceAction[],
): Promise<void> {
  await apiRequest(token, `/groups/${encodeURIComponent(groupId)}/actions`, {
    method: "POST",
    body: JSON.stringify({ actions }),
  });
}

export async function runScenario(token: string, scenarioId: string): Promise<void> {
  await apiRequest(token, `/scenarios/${encodeURIComponent(scenarioId)}/actions`, {
    method: "POST",
    body: "{}",
  });
}

export async function runPresetSteps(token: string, steps: PresetStep[]): Promise<void> {
  for (const step of steps) {
    switch (step.type) {
      case "scenario":
        await runScenario(token, step.scenarioId);
        break;
      case "power":
        await setDevicePower(token, step.deviceId, step.on);
        break;
      case "range":
        await setDeviceRange(token, step.deviceId, step.instance, step.value);
        break;
      case "color_temp":
        await setDeviceColorTemperature(token, step.deviceId, step.temperature_k);
        break;
      case "mode":
        await setDeviceMode(token, step.deviceId, step.instance, step.value);
        break;
    }
  }
}

export function devicesWithOnOff(devices: YandexDevice[]): YandexDevice[] {
  return devices.filter((device) => device.hasOnOff);
}

export function devicesWithRange(devices: YandexDevice[]): YandexDevice[] {
  return devices.filter((device) => device.ranges.length > 0);
}

export function devicesWithColor(devices: YandexDevice[]): YandexDevice[] {
  return devices.filter((device) => Boolean(device.color));
}

export function devicesWithMode(devices: YandexDevice[]): YandexDevice[] {
  return devices.filter((device) => device.modes.length > 0);
}

export function devicesWithProperties(devices: YandexDevice[]): YandexDevice[] {
  return devices.filter((device) => device.properties.length > 0);
}

export function findRange(
  device: YandexDevice,
  instance?: string,
): RangeCapability | undefined {
  if (!device.ranges.length) return undefined;
  if (instance) {
    return device.ranges.find((r) => r.instance === instance) ?? device.ranges[0];
  }
  const preferred = ["brightness", "volume", "temperature", "humidity", "open", "channel"];
  for (const name of preferred) {
    const match = device.ranges.find((r) => r.instance === name);
    if (match) return match;
  }
  return device.ranges[0];
}

export function findMode(
  device: YandexDevice,
  instance?: string,
): ModeCapability | undefined {
  if (!device.modes.length) return undefined;
  if (instance) {
    return device.modes.find((m) => m.instance === instance) ?? device.modes[0];
  }
  return device.modes[0];
}

export function findProperty(
  device: YandexDevice,
  instance?: string,
): FloatProperty | undefined {
  if (!device.properties.length) return undefined;
  if (instance) {
    return device.properties.find((p) => p.instance === instance) ?? device.properties[0];
  }
  const preferred = ["temperature", "humidity", "co2_level", "battery_level", "illumination"];
  for (const name of preferred) {
    const match = device.properties.find((p) => p.instance === name);
    if (match) return match;
  }
  return device.properties[0];
}

export function clampRangeValue(range: RangeCapability, value: number): number {
  const stepped = Math.round(value / range.precision) * range.precision;
  const clamped = Math.min(range.max, Math.max(range.min, stepped));
  return Number(clamped.toFixed(4));
}

export const COLOR_TEMP_PRESETS = [2700, 3400, 4500, 5600, 6500] as const;

export const HSV_PRESETS: Array<{ name: string; h: number; s: number; v: number }> = [
  { name: "Red", h: 0, s: 100, v: 100 },
  { name: "Orange", h: 30, s: 100, v: 100 },
  { name: "Yellow", h: 60, s: 100, v: 100 },
  { name: "Green", h: 120, s: 100, v: 100 },
  { name: "Cyan", h: 180, s: 100, v: 100 },
  { name: "Blue", h: 240, s: 100, v: 100 },
  { name: "Purple", h: 280, s: 100, v: 100 },
  { name: "Pink", h: 320, s: 80, v: 100 },
];

export function nextInList<T>(list: T[], current: T | undefined, equals: (a: T, b: T) => boolean): T {
  if (!list.length) throw new Error("Empty list.");
  if (current === undefined) return list[0];
  const index = list.findIndex((item) => equals(item, current));
  return list[(index + 1) % list.length];
}
