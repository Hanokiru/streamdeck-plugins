import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";

import { fetchDevice, setDevicePower } from "../lib/api";
import { requireToken, shortError } from "../lib/auth";
import {
  deviceKeyImage,
  resolveDeviceKind,
  successFlashImage,
  truncateTitle,
  type DeviceKind,
} from "../lib/key-art";
import type { DeviceSettings, GlobalSettings } from "../lib/types";

const DEFAULT_POLL_SECONDS = 60;
const MIN_POLL_SECONDS = 15;
const SUCCESS_MS = 520;

@action({ UUID: "com.hanokiru.yandex-alice.device" })
export class ToggleDeviceAction extends SingletonAction<DeviceSettings> {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly flashTimers = new Map<string, ReturnType<typeof setTimeout>>();

  override async onWillAppear(ev: WillAppearEvent<DeviceSettings>): Promise<void> {
    await this.refreshState(ev.action, ev.payload.settings);
    this.startPolling(ev.action.id, ev.action, ev.payload.settings);
  }

  override async onWillDisappear(ev: WillDisappearEvent<DeviceSettings>): Promise<void> {
    this.stopPolling(ev.action.id);
    this.clearFlash(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<DeviceSettings>): Promise<void> {
    await this.refreshState(ev.action, ev.payload.settings);
    this.startPolling(ev.action.id, ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<DeviceSettings>): Promise<void> {
    try {
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const deviceId = ev.payload.settings.deviceId?.trim();
      if (!deviceId) {
        throw new Error("Device is not selected.");
      }

      const current = await fetchDevice(token, deviceId);
      const nextOn = !(current.on ?? false);
      await setDevicePower(token, deviceId, nextOn);

      const kind = resolveDeviceKind(
        current.type || ev.payload.settings.deviceType,
        current.name || ev.payload.settings.deviceName,
      );

      // Persist discovered type for next paint.
      if (current.type && current.type !== ev.payload.settings.deviceType) {
        await ev.action.setSettings({
          ...ev.payload.settings,
          deviceType: current.type,
          deviceName: current.name,
        });
      }

      await this.flashSuccess(ev.action, kind, nextOn, current.name);
    } catch (error) {
      await ev.action.setTitle(shortError(error));
      await ev.action.showAlert();
      streamDeck.logger.error(
        `[yandex-alice] device toggle failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private startPolling(
    actionId: string,
    action: WillAppearEvent<DeviceSettings>["action"],
    settings: DeviceSettings,
  ): void {
    this.stopPolling(actionId);

    const seconds = Math.max(
      settings.pollIntervalSeconds ?? DEFAULT_POLL_SECONDS,
      MIN_POLL_SECONDS,
    );

    const timer = setInterval(() => {
      void action.getSettings().then((current) => this.refreshState(action, current));
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

  private clearFlash(actionId: string): void {
    const timer = this.flashTimers.get(actionId);
    if (timer) {
      clearTimeout(timer);
      this.flashTimers.delete(actionId);
    }
  }

  private async refreshState(
    action: WillAppearEvent<DeviceSettings>["action"],
    settings: DeviceSettings,
  ): Promise<void> {
    try {
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const deviceId = settings.deviceId?.trim();
      if (!deviceId) {
        await action.setTitle("SETUP");
        await action.setImage(deviceKeyImage("other", false));
        return;
      }

      const device = await fetchDevice(token, deviceId);
      const kind = resolveDeviceKind(device.type || settings.deviceType, device.name);
      await this.applyVisual(action, kind, device.on ?? false, device.name);
    } catch (error) {
      await action.setTitle(shortError(error));
    }
  }

  private async applyVisual(
    action: WillAppearEvent<DeviceSettings>["action"],
    kind: DeviceKind,
    on: boolean,
    name?: string,
  ): Promise<void> {
    await action.setState(on ? 1 : 0);
    await action.setImage(deviceKeyImage(kind, on));
    const label = name ? truncateTitle(name, 12) : "";
    await action.setTitle(label || (on ? "ON" : "OFF"));
  }

  /** Purple stylish flash instead of stock green showOk. */
  private async flashSuccess(
    action: KeyDownEvent<DeviceSettings>["action"],
    kind: DeviceKind,
    on: boolean,
    name?: string,
  ): Promise<void> {
    this.clearFlash(action.id);
    await action.setImage(successFlashImage());
    await action.setTitle("");

    const timer = setTimeout(() => {
      this.flashTimers.delete(action.id);
      void this.applyVisual(action, kind, on, name);
    }, SUCCESS_MS);

    this.flashTimers.set(action.id, timer);
  }
}
