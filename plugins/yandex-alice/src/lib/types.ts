export type GlobalSettings = {
  oauthToken?: string;
};

export type ScenarioSettings = {
  scenarioId?: string;
  scenarioName?: string;
};

export type DeviceSettings = {
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  pollIntervalSeconds?: number;
};

export type DialPressAction = "toggle" | "refresh" | "max" | "min" | "mid";

export type DialSettings = {
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  rangeInstance?: string;
  step?: number;
  stepMultiplier?: number;
  invertRotate?: boolean;
  pressAction?: DialPressAction;
  pollIntervalSeconds?: number;
};

/** Color / temperature light control */
export type ColorCycleKind = "temperature_k" | "hsv" | "scene";

export type ColorSettings = {
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  cycleKind?: ColorCycleKind;
  /** Dial adjusts temperature_k or hue */
  dialKind?: "temperature_k" | "hsv";
  pollIntervalSeconds?: number;
};

export type ModeSettings = {
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  modeInstance?: string;
  pollIntervalSeconds?: number;
};

export type RoomTargetKind = "room" | "group";
export type RoomPressAction = "toggle" | "on" | "off";

export type RoomSettings = {
  targetKind?: RoomTargetKind;
  /** Room name or group id */
  targetId?: string;
  targetName?: string;
  pressAction?: RoomPressAction;
  /** Dial brightness for lights in room/group */
  brightnessStep?: number;
  pollIntervalSeconds?: number;
};

export type SensorSettings = {
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  propertyInstance?: string;
  pollIntervalSeconds?: number;
};

export type PresetStep =
  | { type: "scenario"; scenarioId: string; scenarioName?: string }
  | { type: "power"; deviceId: string; deviceName?: string; on: boolean }
  | { type: "range"; deviceId: string; deviceName?: string; instance: string; value: number }
  | {
      type: "color_temp";
      deviceId: string;
      deviceName?: string;
      temperature_k: number;
    }
  | { type: "mode"; deviceId: string; deviceName?: string; instance: string; value: string };

export type PresetSettings = {
  presetName?: string;
  /** JSON-serialized PresetStep[] */
  stepsJson?: string;
};

export type RangeCapability = {
  instance: string;
  value?: number;
  min: number;
  max: number;
  precision: number;
  unit?: string;
};

export type ModeCapability = {
  instance: string;
  value?: string;
  modes: string[];
};

export type ColorCapability = {
  supportsHsv: boolean;
  supportsRgb: boolean;
  supportsTemperature: boolean;
  temperatureMin?: number;
  temperatureMax?: number;
  scenes: string[];
  current?: {
    instance: "hsv" | "rgb" | "temperature_k" | "scene";
    hsv?: { h: number; s: number; v: number };
    rgb?: number;
    temperature_k?: number;
    scene?: string;
  };
};

export type FloatProperty = {
  instance: string;
  value?: number;
  unit?: string;
};

export type YandexDevice = {
  id: string;
  name: string;
  type: string;
  room?: string;
  roomId?: string;
  on?: boolean;
  online?: boolean;
  hasOnOff: boolean;
  ranges: RangeCapability[];
  modes: ModeCapability[];
  color?: ColorCapability;
  properties: FloatProperty[];
};

export type YandexScenario = {
  id: string;
  name: string;
  isActive: boolean;
};

export type YandexGroup = {
  id: string;
  name: string;
  type?: string;
  deviceIds: string[];
};

export type YandexRoom = {
  id: string;
  name: string;
  deviceIds: string[];
};

export type HomeSnapshot = {
  devices: YandexDevice[];
  scenarios: YandexScenario[];
  groups: YandexGroup[];
  rooms: YandexRoom[];
};
