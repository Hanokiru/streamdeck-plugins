import streamDeck, {
  action,
  DialDownEvent,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SingletonAction,
  TouchTapEvent,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";

import { fetchDevice, findProperty } from "../lib/api";
import { requireToken, shortError } from "../lib/auth";
import { truncateTitle } from "../lib/key-art";
import type { GlobalSettings, SensorSettings } from "../lib/types";

function formatProperty(instance: string, value: number | undefined, unit?: string): string {
  if (value === undefined) return "—";
  if (unit?.includes("celsius") || instance === "temperature") return `${value}°`;
  if (unit?.includes("percent") || instance === "humidity" || instance === "battery_level") {
    return `${Math.round(value)}%`;
  }
  if (instance === "co2_level") return `${Math.round(value)}`;
  return String(value);
}

@action({ UUID: "com.hanokiru.yandex-alice.sensor" })
export class SensorDisplayAction extends SingletonAction<SensorSettings> {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();

  override async onWillAppear(ev: WillAppearEvent<SensorSettings>): Promise<void> {
    if (ev.action.isDial()) {
      try {
        await ev.action.setFeedbackLayout("layouts/device-dial.json");
      } catch {
        await ev.action.setFeedbackLayout("$B1");
      }
      await ev.action.setTriggerDescription({
        rotate: "No action",
        push: "Refresh sensor",
        touch: "Refresh sensor",
      });
    }
    await this.render(ev.action, ev.payload.settings);
    this.poll(ev.action.id, ev.action, ev.payload.settings);
  }

  override async onWillDisappear(ev: WillDisappearEvent<SensorSettings>): Promise<void> {
    const t = this.timers.get(ev.action.id);
    if (t) clearInterval(t);
    this.timers.delete(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SensorSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
    this.poll(ev.action.id, ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<SensorSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
  }

  override async onDialDown(ev: DialDownEvent<SensorSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
  }

  override async onTouchTap(ev: TouchTapEvent<SensorSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
  }

  private poll(
    id: string,
    action: WillAppearEvent<SensorSettings>["action"],
    settings: SensorSettings,
  ): void {
    const existing = this.timers.get(id);
    if (existing) clearInterval(existing);
    const sec = Math.max(settings.pollIntervalSeconds ?? 30, 10);
    this.timers.set(
      id,
      setInterval(() => {
        void action.getSettings().then((s) => this.render(action, s));
      }, sec * 1000),
    );
  }

  private async render(
    action: WillAppearEvent<SensorSettings>["action"],
    settings: SensorSettings,
  ): Promise<void> {
    try {
      const deviceId = settings.deviceId?.trim();
      if (!deviceId) {
        if (action.isKey()) await action.setTitle("SETUP");
        else if (action.isDial()) {
          await action.setFeedback({
            title: "SETUP",
            value: "—",
            subtitle: "Sensor",
            bar: 0,
            icon: "imgs/actions/sensor/key",
          });
        }
        return;
      }

      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const device = await fetchDevice(token, deviceId);
      const prop = findProperty(device, settings.propertyInstance);
      if (!prop) throw new Error("No sensor properties.");

      if (!settings.propertyInstance) {
        await action.setSettings({
          ...settings,
          propertyInstance: prop.instance,
          deviceName: device.name,
          deviceType: device.type,
        });
      }

      const valueText = formatProperty(prop.instance, prop.value, prop.unit);
      let bar = 0;
      if (typeof prop.value === "number") {
        if (prop.instance === "humidity" || prop.instance === "battery_level") {
          bar = Math.round(prop.value);
        } else if (prop.instance === "temperature") {
          bar = Math.round(Math.min(100, Math.max(0, ((prop.value - 10) / 30) * 100)));
        } else if (prop.instance === "co2_level") {
          bar = Math.round(Math.min(100, (prop.value / 2000) * 100));
        } else {
          bar = 50;
        }
      }

      if (action.isKey()) {
        await action.setImage("imgs/actions/sensor/key");
        await action.setTitle(`${truncateTitle(device.name, 10)}\n${valueText}`);
      } else if (action.isDial()) {
        await action.setFeedback({
          title: truncateTitle(device.name, 16),
          value: valueText,
          subtitle: prop.instance,
          bar,
          icon: "imgs/actions/sensor/key",
        });
      }
    } catch (error) {
      if (action.isKey()) await action.setTitle(shortError(error));
      else if (action.isDial()) {
        await action.setFeedback({
          title: "Error",
          value: shortError(error),
          subtitle: "Sensor",
          bar: 0,
          icon: "imgs/actions/sensor/key",
        });
      }
    }
  }
}
