import streamDeck, {
  action,
  DialDownEvent,
  DialRotateEvent,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SingletonAction,
  TouchTapEvent,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";

import {
  COLOR_TEMP_PRESETS,
  HSV_PRESETS,
  fetchDevice,
  nextInList,
  setDeviceColorHsv,
  setDeviceColorScene,
  setDeviceColorTemperature,
} from "../lib/api";
import { requireToken, shortError } from "../lib/auth";
import { flashSuccess } from "../lib/feedback";
import { truncateTitle } from "../lib/key-art";
import type { ColorSettings, GlobalSettings } from "../lib/types";

const DEFAULT_POLL = 60;

@action({ UUID: "com.hanokiru.yandex-alice.color" })
export class ColorLightAction extends SingletonAction<ColorSettings> {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly flash = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly hueCache = new Map<string, number>();
  private readonly tempCache = new Map<string, number>();

  override async onWillAppear(ev: WillAppearEvent<ColorSettings>): Promise<void> {
    if (ev.action.isDial()) {
      try {
        await ev.action.setFeedbackLayout("layouts/device-dial.json");
      } catch {
        await ev.action.setFeedbackLayout("$B1");
      }
      await ev.action.setTriggerDescription({
        rotate: "Adjust color / temperature",
        push: "Cycle preset",
        touch: "Cycle preset",
      });
    }
    await this.render(ev.action, ev.payload.settings);
    this.startPoll(ev.action.id, ev.action, ev.payload.settings);
  }

  override async onWillDisappear(ev: WillDisappearEvent<ColorSettings>): Promise<void> {
    this.stopPoll(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ColorSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
    this.startPoll(ev.action.id, ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<ColorSettings>): Promise<void> {
    await this.cycle(ev.action, ev.payload.settings);
  }

  override async onDialDown(ev: DialDownEvent<ColorSettings>): Promise<void> {
    await this.cycle(ev.action, ev.payload.settings);
  }

  override async onTouchTap(ev: TouchTapEvent<ColorSettings>): Promise<void> {
    await this.cycle(ev.action, ev.payload.settings);
  }

  override async onDialRotate(ev: DialRotateEvent<ColorSettings>): Promise<void> {
    try {
      const settings = ev.payload.settings;
      const deviceId = settings.deviceId?.trim();
      if (!deviceId) throw new Error("Device is not selected.");
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const device = await fetchDevice(token, deviceId);
      if (!device.color) throw new Error("No color capability.");

      const ticks = ev.payload.ticks ?? 0;
      const dialKind = settings.dialKind ?? (device.color.supportsTemperature ? "temperature_k" : "hsv");

      if (dialKind === "temperature_k" && device.color.supportsTemperature) {
        const min = device.color.temperatureMin ?? 2700;
        const max = device.color.temperatureMax ?? 6500;
        const current =
          this.tempCache.get(ev.action.id) ??
          device.color.current?.temperature_k ??
          4500;
        const next = Math.min(max, Math.max(min, current + ticks * 100));
        this.tempCache.set(ev.action.id, next);
        await setDeviceColorTemperature(token, deviceId, next);
        await this.paint(ev.action, device.name, `${Math.round(next)}K`, "Temp");
        return;
      }

      if (device.color.supportsHsv) {
        const current =
          this.hueCache.get(ev.action.id) ??
          device.color.current?.hsv?.h ??
          0;
        const next = ((current + ticks * 15) % 360 + 360) % 360;
        this.hueCache.set(ev.action.id, next);
        await setDeviceColorHsv(token, deviceId, { h: next, s: 100, v: 100 });
        await this.paint(ev.action, device.name, `${Math.round(next)}°`, "Hue");
      }
    } catch (error) {
      await this.paintError(ev.action, error);
    }
  }

  private async cycle(
    action: WillAppearEvent<ColorSettings>["action"],
    settings: ColorSettings,
  ): Promise<void> {
    try {
      const deviceId = settings.deviceId?.trim();
      if (!deviceId) throw new Error("Device is not selected.");
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const device = await fetchDevice(token, deviceId);
      if (!device.color) throw new Error("No color capability.");

      const kind =
        settings.cycleKind ??
        (device.color.supportsTemperature
          ? "temperature_k"
          : device.color.supportsHsv
            ? "hsv"
            : "scene");

      if (kind === "temperature_k" && device.color.supportsTemperature) {
        const min = device.color.temperatureMin ?? 2700;
        const max = device.color.temperatureMax ?? 6500;
        const presets = COLOR_TEMP_PRESETS.filter((k) => k >= min && k <= max);
        const current = device.color.current?.temperature_k;
        const next = nextInList(presets, current, (a, b) => a === b);
        await setDeviceColorTemperature(token, deviceId, next);
        this.tempCache.set(action.id, next);
        if (action.isKey()) {
          await flashSuccess(action, () => this.render(action, settings), this.flash);
        } else {
          await this.paint(action, device.name, `${next}K`, "Temp");
        }
        return;
      }

      if (kind === "hsv" && device.color.supportsHsv) {
        const currentH = device.color.current?.hsv?.h;
        const current = HSV_PRESETS.find((p) => currentH !== undefined && Math.abs(p.h - currentH) < 15);
        const next = nextInList(HSV_PRESETS, current, (a, b) => a.h === b.h);
        await setDeviceColorHsv(token, deviceId, { h: next.h, s: next.s, v: next.v });
        this.hueCache.set(action.id, next.h);
        if (action.isKey()) {
          await flashSuccess(action, () => this.render(action, settings), this.flash);
        } else {
          await this.paint(action, device.name, next.name, "Color");
        }
        return;
      }

      if (device.color.scenes.length) {
        const next = nextInList(
          device.color.scenes,
          device.color.current?.scene,
          (a, b) => a === b,
        );
        await setDeviceColorScene(token, deviceId, next);
        if (action.isKey()) {
          await flashSuccess(action, () => this.render(action, settings), this.flash);
        } else {
          await this.paint(action, device.name, next, "Scene");
        }
        return;
      }

      throw new Error("No color presets available.");
    } catch (error) {
      if (action.isKey()) {
        await action.setTitle(shortError(error));
        await action.showAlert();
      } else {
        await this.paintError(action, error);
      }
    }
  }

  private startPoll(
    id: string,
    action: WillAppearEvent<ColorSettings>["action"],
    settings: ColorSettings,
  ): void {
    this.stopPoll(id);
    const sec = Math.max(settings.pollIntervalSeconds ?? DEFAULT_POLL, 15);
    this.timers.set(
      id,
      setInterval(() => {
        void action.getSettings().then((s) => this.render(action, s));
      }, sec * 1000),
    );
  }

  private stopPoll(id: string): void {
    const t = this.timers.get(id);
    if (t) clearInterval(t);
    this.timers.delete(id);
  }

  private async render(
    action: WillAppearEvent<ColorSettings>["action"],
    settings: ColorSettings,
  ): Promise<void> {
    try {
      const deviceId = settings.deviceId?.trim();
      if (!deviceId) {
        if (action.isKey()) await action.setTitle("SETUP");
        else await this.paint(action, "SETUP", "—", "Color");
        return;
      }
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const device = await fetchDevice(token, deviceId);
      const cur = device.color?.current;
      let label = "COLOR";
      if (cur?.temperature_k) label = `${cur.temperature_k}K`;
      else if (cur?.hsv) label = `H${cur.hsv.h}`;
      else if (cur?.scene) label = cur.scene;
      if (action.isKey()) {
        await action.setImage("imgs/actions/color/key");
        await action.setTitle(`${truncateTitle(device.name, 10)}\n${label}`);
      } else {
        await this.paint(action, device.name, label, "Color");
      }
    } catch (error) {
      if (action.isKey()) await action.setTitle(shortError(error));
      else await this.paintError(action, error);
    }
  }

  private async paint(
    action: WillAppearEvent<ColorSettings>["action"],
    title: string,
    value: string,
    subtitle: string,
  ): Promise<void> {
    if (!action.isDial()) return;
    await action.setFeedback({
      title: truncateTitle(title, 16),
      value,
      subtitle,
      bar: 50,
      icon: "imgs/actions/color/key",
    });
  }

  private async paintError(
    action: WillAppearEvent<ColorSettings>["action"],
    error: unknown,
  ): Promise<void> {
    if (action.isDial()) {
      await action.setFeedback({
        title: "Error",
        value: shortError(error),
        subtitle: "Color",
        bar: 0,
        icon: "imgs/actions/color/key",
      });
    }
  }
}
