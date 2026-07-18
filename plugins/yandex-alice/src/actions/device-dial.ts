import streamDeck, {
  action,
  DialAction,
  DialDownEvent,
  DialRotateEvent,
  DidReceiveSettingsEvent,
  SingletonAction,
  TouchTapEvent,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";

import {
  clampRangeValue,
  fetchDevice,
  findRange,
  setDevicePower,
  setDeviceRange,
} from "../lib/api";
import { requireToken, shortError } from "../lib/auth";
import { dialInstanceIcon, truncateTitle } from "../lib/key-art";
import type {
  DialPressAction,
  DialSettings,
  GlobalSettings,
  RangeCapability,
  YandexDevice,
} from "../lib/types";

const DEFAULT_POLL_SECONDS = 30;
const MIN_POLL_SECONDS = 10;
const FLUSH_MS = 250;
/** Ignore stale API reads after we write — Yandex often lags. */
const HOLD_MS = 2800;
const DIAL_LAYOUT = "layouts/device-dial.json";
const DIAL_LAYOUT_FALLBACK = "$B1";

const INSTANCE_LABELS: Record<string, string> = {
  brightness: "Brightness",
  volume: "Volume",
  temperature: "Temp",
  humidity: "Humidity",
  open: "Open",
  channel: "Channel",
};

type DialCache = {
  deviceId: string;
  token: string;
  device: YandexDevice;
  range: RangeCapability;
  /** Authoritative UI value while interacting */
  value: number;
  /** Don't let polls overwrite until this time */
  holdUntil: number;
};

function instanceLabel(instance: string): string {
  return INSTANCE_LABELS[instance] ?? instance;
}

function formatValue(range: RangeCapability, value: number): string {
  const unit = range.unit ?? "";
  if (unit.includes("percent") || range.max === 100) {
    return `${Math.round(value)}%`;
  }
  if (unit.includes("celsius")) {
    return `${value}°`;
  }
  return String(value);
}

function barPercent(range: RangeCapability, value: number): number {
  if (range.max <= range.min) return 0;
  return Math.round(((value - range.min) / (range.max - range.min)) * 100);
}

function valuesClose(a: number, b: number, precision: number): boolean {
  return Math.abs(a - b) <= Math.max(precision, 0.01) * 1.01;
}

@action({ UUID: "com.hanokiru.yandex-alice.dial" })
export class DeviceDialAction extends SingletonAction<DialSettings> {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly flushTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly cache = new Map<string, DialCache>();
  /** Ticks received while cache is still loading */
  private readonly queuedTicks = new Map<string, number>();
  private readonly loading = new Set<string>();

  override async onWillAppear(ev: WillAppearEvent<DialSettings>): Promise<void> {
    if (!ev.action.isDial()) return;

    try {
      await ev.action.setFeedbackLayout(DIAL_LAYOUT);
    } catch {
      streamDeck.logger.warn(`[yandex-alice] dial layout failed, using ${DIAL_LAYOUT_FALLBACK}`);
      await ev.action.setFeedbackLayout(DIAL_LAYOUT_FALLBACK);
    }

    await ev.action.setTriggerDescription({
      rotate: "Adjust value",
      push: "Press action",
      touch: "Press action",
    });

    await this.refresh(ev.action, ev.payload.settings, { force: true });
    this.startPolling(ev.action.id, ev.action, ev.payload.settings);
  }

  override async onWillDisappear(ev: WillDisappearEvent<DialSettings>): Promise<void> {
    this.stopPolling(ev.action.id);
    this.clearFlush(ev.action.id);
    this.cache.delete(ev.action.id);
    this.queuedTicks.delete(ev.action.id);
    this.loading.delete(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<DialSettings>): Promise<void> {
    if (!ev.action.isDial()) return;
    this.cache.delete(ev.action.id);
    await this.refresh(ev.action, ev.payload.settings, { force: true });
    this.startPolling(ev.action.id, ev.action, ev.payload.settings);
  }

  override async onDialRotate(ev: DialRotateEvent<DialSettings>): Promise<void> {
    const settings = ev.payload.settings;
    const ticks = (settings.invertRotate ? -(ev.payload.ticks ?? 0) : (ev.payload.ticks ?? 0));
    if (ticks === 0) return;

    try {
      const cached = this.cache.get(ev.action.id);
      if (!cached) {
        this.queuedTicks.set(ev.action.id, (this.queuedTicks.get(ev.action.id) ?? 0) + ticks);
        void this.ensureCache(ev.action, settings).then(() => {
          const queued = this.queuedTicks.get(ev.action.id) ?? 0;
          this.queuedTicks.delete(ev.action.id);
          if (queued !== 0) {
            this.applyTicks(ev.action, settings, queued);
          }
        });
        return;
      }

      this.applyTicks(ev.action, settings, ticks);
    } catch (error) {
      await this.paintError(ev.action, error);
      streamDeck.logger.error(
        `[yandex-alice] dial rotate failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  override async onDialDown(ev: DialDownEvent<DialSettings>): Promise<void> {
    await this.runPress(ev.action, ev.payload.settings);
  }

  override async onTouchTap(ev: TouchTapEvent<DialSettings>): Promise<void> {
    await this.runPress(ev.action, ev.payload.settings);
  }

  /** Sync UI update — no network on the hot path. */
  private applyTicks(
    action: DialAction<DialSettings>,
    settings: DialSettings,
    ticks: number,
  ): void {
    const cached = this.cache.get(action.id);
    if (!cached) return;

    const step =
      (settings.step && settings.step > 0 ? settings.step : cached.range.precision) *
      Math.max(1, settings.stepMultiplier ?? 1);

    const next = clampRangeValue(cached.range, cached.value + ticks * step);
    cached.value = next;
    cached.range = { ...cached.range, value: next };
    cached.holdUntil = Date.now() + HOLD_MS;

    void this.paint(action, cached.device, cached.range, next);
    this.scheduleFlush(action.id, settings);
  }

  private async ensureCache(
    action: DialAction<DialSettings>,
    settings: DialSettings,
  ): Promise<DialCache | undefined> {
    const existing = this.cache.get(action.id);
    if (existing) return existing;
    if (this.loading.has(action.id)) return undefined;

    this.loading.add(action.id);
    try {
      await this.refresh(action, settings, { force: true });
      return this.cache.get(action.id);
    } finally {
      this.loading.delete(action.id);
    }
  }

  private async runPress(
    action: DialAction<DialSettings>,
    settings: DialSettings,
  ): Promise<void> {
    try {
      const deviceId = settings.deviceId?.trim();
      if (!deviceId) throw new Error("Device is not selected.");

      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const press: DialPressAction = settings.pressAction ?? "toggle";

      if (press === "refresh") {
        await this.refresh(action, settings, { force: true });
        return;
      }

      await this.ensureCache(action, settings);
      const cached = this.cache.get(action.id);
      if (!cached) throw new Error("No range capability on device.");

      if (press === "toggle") {
        if (!cached.device.hasOnOff) {
          await this.refresh(action, settings, { force: true });
          return;
        }
        const nextOn = !(cached.device.on ?? false);
        await setDevicePower(token, deviceId, nextOn);
        cached.device = { ...cached.device, on: nextOn };
        cached.holdUntil = Date.now() + HOLD_MS;
        await this.paint(action, cached.device, cached.range, cached.value);
        return;
      }

      let target = cached.value;
      if (press === "max") target = cached.range.max;
      if (press === "min") target = cached.range.min;
      if (press === "mid") target = (cached.range.min + cached.range.max) / 2;
      target = clampRangeValue(cached.range, target);

      cached.value = target;
      cached.range = { ...cached.range, value: target };
      cached.holdUntil = Date.now() + HOLD_MS;
      await this.paint(action, cached.device, cached.range, target);
      await setDeviceRange(token, deviceId, cached.range.instance, target);
    } catch (error) {
      await this.paintError(action, error);
      streamDeck.logger.error(
        `[yandex-alice] dial press failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private scheduleFlush(actionId: string, settings: DialSettings): void {
    this.clearFlush(actionId);
    const timer = setTimeout(() => {
      this.flushTimers.delete(actionId);
      void this.flush(actionId, settings);
    }, FLUSH_MS);
    this.flushTimers.set(actionId, timer);
  }

  private async flush(actionId: string, settings: DialSettings): Promise<void> {
    const cached = this.cache.get(actionId);
    if (!cached) return;

    const value = cached.value;
    const instance = settings.rangeInstance || cached.range.instance;

    try {
      await setDeviceRange(cached.token, cached.deviceId, instance, value);
      // Keep local value — do NOT re-fetch (API often returns stale state).
      cached.holdUntil = Date.now() + HOLD_MS;
      cached.range = { ...cached.range, value };
    } catch (error) {
      streamDeck.logger.error(
        `[yandex-alice] dial flush failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private clearFlush(actionId: string): void {
    const timer = this.flushTimers.get(actionId);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(actionId);
    }
  }

  private startPolling(
    actionId: string,
    action: DialAction<DialSettings>,
    settings: DialSettings,
  ): void {
    this.stopPolling(actionId);
    const seconds = Math.max(
      settings.pollIntervalSeconds ?? DEFAULT_POLL_SECONDS,
      MIN_POLL_SECONDS,
    );
    const timer = setInterval(() => {
      const cached = this.cache.get(actionId);
      if (cached && Date.now() < cached.holdUntil) return;
      if (this.flushTimers.has(actionId)) return;
      void action.getSettings().then((current) => this.refresh(action, current, { force: false }));
    }, seconds * 1000);
    this.timers.set(actionId, timer);
  }

  private stopPolling(actionId: string): void {
    const timer = this.timers.get(actionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(actionId);
    }
  }

  private async refresh(
    action: DialAction<DialSettings>,
    settings: DialSettings,
    opts: { force: boolean },
  ): Promise<void> {
    try {
      const existing = this.cache.get(action.id);
      if (!opts.force && existing && Date.now() < existing.holdUntil) {
        return;
      }
      if (!opts.force && this.flushTimers.has(action.id)) {
        return;
      }

      const deviceId = settings.deviceId?.trim();
      if (!deviceId) {
        this.cache.delete(action.id);
        await action.setFeedback({
          title: "SETUP",
          value: "—",
          subtitle: "Pick device",
          bar: 0,
          icon: dialInstanceIcon(),
        });
        return;
      }

      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const device = await fetchDevice(token, deviceId);
      const range = findRange(device, settings.rangeInstance);
      if (!range) {
        this.cache.delete(action.id);
        await action.setFeedback({
          title: truncateTitle(device.name, 16),
          value: "N/A",
          subtitle: "No range",
          bar: 0,
          icon: dialInstanceIcon(),
        });
        return;
      }

      if (!settings.rangeInstance) {
        await action.setSettings({
          ...settings,
          rangeInstance: range.instance,
          deviceName: device.name,
          deviceType: device.type,
        });
      }

      const remoteValue = range.value ?? range.min;
      let value = remoteValue;

      // During hold, keep local value unless remote caught up.
      if (existing && Date.now() < existing.holdUntil) {
        if (valuesClose(remoteValue, existing.value, range.precision)) {
          value = remoteValue;
        } else {
          value = existing.value;
        }
      }

      this.cache.set(action.id, {
        deviceId,
        token,
        device,
        range: { ...range, value },
        value,
        holdUntil: existing?.holdUntil ?? 0,
      });

      await this.paint(action, device, range, value);
    } catch (error) {
      await this.paintError(action, error);
    }
  }

  private async paint(
    action: DialAction<DialSettings>,
    device: YandexDevice,
    range: RangeCapability,
    value: number,
  ): Promise<void> {
    const power = device.hasOnOff ? (device.on ? "ON" : "OFF") : "";
    const painted = { ...range, value };
    await action.setFeedback({
      title: truncateTitle(device.name, 16),
      value: formatValue(painted, value),
      subtitle: [instanceLabel(range.instance), power].filter(Boolean).join(" · "),
      bar: barPercent(painted, value),
      icon: dialInstanceIcon(range.instance),
    });
  }

  private async paintError(action: DialAction<DialSettings>, error: unknown): Promise<void> {
    await action.setFeedback({
      title: "Error",
      value: shortError(error),
      subtitle: "Alice",
      bar: 0,
      icon: dialInstanceIcon(),
    });
  }
}
