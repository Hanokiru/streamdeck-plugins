import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";

import { fetchDevice, findMode, nextInList, setDeviceMode } from "../lib/api";
import { requireToken, shortError } from "../lib/auth";
import { flashSuccess } from "../lib/feedback";
import { truncateTitle } from "../lib/key-art";
import type { GlobalSettings, ModeSettings } from "../lib/types";

@action({ UUID: "com.hanokiru.yandex-alice.mode" })
export class DeviceModeAction extends SingletonAction<ModeSettings> {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly flash = new Map<string, ReturnType<typeof setTimeout>>();

  override async onWillAppear(ev: WillAppearEvent<ModeSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
    this.poll(ev.action.id, ev.action, ev.payload.settings);
  }

  override async onWillDisappear(ev: WillDisappearEvent<ModeSettings>): Promise<void> {
    const t = this.timers.get(ev.action.id);
    if (t) clearInterval(t);
    this.timers.delete(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ModeSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
    this.poll(ev.action.id, ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<ModeSettings>): Promise<void> {
    try {
      const deviceId = ev.payload.settings.deviceId?.trim();
      if (!deviceId) throw new Error("Device is not selected.");
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const device = await fetchDevice(token, deviceId);
      const mode = findMode(device, ev.payload.settings.modeInstance);
      if (!mode || !mode.modes.length) throw new Error("No modes on device.");

      const next = nextInList(mode.modes, mode.value, (a, b) => a === b);
      await setDeviceMode(token, deviceId, mode.instance, next);
      if (!ev.payload.settings.modeInstance) {
        await ev.action.setSettings({
          ...ev.payload.settings,
          modeInstance: mode.instance,
          deviceName: device.name,
          deviceType: device.type,
        });
      }
      await flashSuccess(
        ev.action,
        async () => {
          await ev.action.setImage("imgs/actions/mode/key");
          await ev.action.setTitle(`${truncateTitle(device.name, 10)}\n${next}`);
        },
        this.flash,
      );
    } catch (error) {
      await ev.action.setTitle(shortError(error));
      await ev.action.showAlert();
    }
  }

  private poll(
    id: string,
    action: WillAppearEvent<ModeSettings>["action"],
    settings: ModeSettings,
  ): void {
    const existing = this.timers.get(id);
    if (existing) clearInterval(existing);
    const sec = Math.max(settings.pollIntervalSeconds ?? 60, 15);
    this.timers.set(
      id,
      setInterval(() => {
        void action.getSettings().then((s) => this.render(action, s));
      }, sec * 1000),
    );
  }

  private async render(
    action: WillAppearEvent<ModeSettings>["action"],
    settings: ModeSettings,
  ): Promise<void> {
    try {
      const deviceId = settings.deviceId?.trim();
      if (!deviceId) {
        await action.setTitle("SETUP");
        return;
      }
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const device = await fetchDevice(token, deviceId);
      const mode = findMode(device, settings.modeInstance);
      await action.setImage("imgs/actions/mode/key");
      await action.setTitle(
        `${truncateTitle(device.name, 10)}\n${mode?.value ?? "MODE"}`,
      );
    } catch (error) {
      await action.setTitle(shortError(error));
    }
  }
}
