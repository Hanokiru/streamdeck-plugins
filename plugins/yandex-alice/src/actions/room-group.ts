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
  clampRangeValue,
  fetchHomeSnapshot,
  setDevicesPower,
  setDevicesRange,
  setGroupActions,
} from "../lib/api";
import { requireToken, shortError } from "../lib/auth";
import { flashSuccess } from "../lib/feedback";
import { truncateTitle } from "../lib/key-art";
import type { GlobalSettings, RoomSettings, YandexDevice } from "../lib/types";

@action({ UUID: "com.hanokiru.yandex-alice.room" })
export class RoomGroupAction extends SingletonAction<RoomSettings> {
  private readonly flash = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly brightness = new Map<string, number>();

  override async onWillAppear(ev: WillAppearEvent<RoomSettings>): Promise<void> {
    if (ev.action.isDial()) {
      try {
        await ev.action.setFeedbackLayout("layouts/device-dial.json");
      } catch {
        await ev.action.setFeedbackLayout("$B1");
      }
      await ev.action.setTriggerDescription({
        rotate: "Room brightness",
        push: "Toggle room / group",
        touch: "Toggle room / group",
      });
    }
    await this.render(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<RoomSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
  }

  override async onWillDisappear(ev: WillDisappearEvent<RoomSettings>): Promise<void> {
    const t = this.flash.get(ev.action.id);
    if (t) clearTimeout(t);
  }

  override async onKeyDown(ev: KeyDownEvent<RoomSettings>): Promise<void> {
    await this.press(ev.action, ev.payload.settings);
  }

  override async onDialDown(ev: DialDownEvent<RoomSettings>): Promise<void> {
    await this.press(ev.action, ev.payload.settings);
  }

  override async onTouchTap(ev: TouchTapEvent<RoomSettings>): Promise<void> {
    await this.press(ev.action, ev.payload.settings);
  }

  override async onDialRotate(ev: DialRotateEvent<RoomSettings>): Promise<void> {
    try {
      const settings = ev.payload.settings;
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const { devices } = await this.resolveTargets(token, settings);
      const lights = devices.filter((d) => d.ranges.some((r) => r.instance === "brightness"));
      if (!lights.length) throw new Error("No brightness devices.");

      const step = settings.brightnessStep && settings.brightnessStep > 0 ? settings.brightnessStep : 5;
      const sample = lights[0].ranges.find((r) => r.instance === "brightness")!;
      const current = this.brightness.get(ev.action.id) ?? sample.value ?? 50;
      const next = clampRangeValue(sample, current + (ev.payload.ticks ?? 0) * step);
      this.brightness.set(ev.action.id, next);

      const ids = lights.map((d) => d.id);
      if (settings.targetKind === "group" && settings.targetId) {
        await setGroupActions(token, settings.targetId, [
          {
            type: "devices.capabilities.range",
            state: { instance: "brightness", value: next },
          },
        ]);
      } else {
        await setDevicesRange(token, ids, "brightness", next);
      }

      if (ev.action.isDial()) {
        await ev.action.setFeedback({
          title: truncateTitle(settings.targetName || "Room", 16),
          value: `${Math.round(next)}%`,
          subtitle: "Brightness",
          bar: Math.round(next),
          icon: "imgs/actions/room/key",
        });
      }
    } catch (error) {
      if (ev.action.isDial()) {
        await ev.action.setFeedback({
          title: "Error",
          value: shortError(error),
          subtitle: "Room",
          bar: 0,
          icon: "imgs/actions/room/key",
        });
      }
    }
  }

  private async press(
    action: WillAppearEvent<RoomSettings>["action"],
    settings: RoomSettings,
  ): Promise<void> {
    try {
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const press = settings.pressAction ?? "toggle";
      const { devices, label } = await this.resolveTargets(token, settings);
      const switchable = devices.filter((d) => d.hasOnOff);
      if (!switchable.length) throw new Error("No on/off devices.");

      let on = true;
      if (press === "off") on = false;
      else if (press === "toggle") {
        const anyOn = switchable.some((d) => d.on === true);
        on = !anyOn;
      }

      if (settings.targetKind === "group" && settings.targetId) {
        await setGroupActions(token, settings.targetId, [
          {
            type: "devices.capabilities.on_off",
            state: { instance: "on", value: on },
          },
        ]);
      } else {
        await setDevicesPower(
          token,
          switchable.map((d) => d.id),
          on,
        );
      }

      if (action.isKey()) {
        await flashSuccess(
          action,
          async () => {
            await action.setImage("imgs/actions/room/key");
            await action.setTitle(`${truncateTitle(label, 10)}\n${on ? "ON" : "OFF"}`);
          },
          this.flash,
        );
      } else if (action.isDial()) {
        await action.setFeedback({
          title: truncateTitle(label, 16),
          value: on ? "ON" : "OFF",
          subtitle: "Room",
          bar: on ? 100 : 0,
          icon: "imgs/actions/room/key",
        });
      }
    } catch (error) {
      if (action.isKey()) {
        await action.setTitle(shortError(error));
        await action.showAlert();
      }
    }
  }

  private async resolveTargets(
    token: string,
    settings: RoomSettings,
  ): Promise<{ devices: YandexDevice[]; label: string }> {
    const targetId = settings.targetId?.trim();
    if (!targetId) throw new Error("Room / group is not selected.");
    const home = await fetchHomeSnapshot(token);
    const kind = settings.targetKind ?? "room";

    if (kind === "group") {
      const group = home.groups.find((g) => g.id === targetId);
      if (!group) throw new Error("Group not found.");
      const devices = home.devices.filter((d) => group.deviceIds.includes(d.id));
      return { devices, label: group.name };
    }

    const room =
      home.rooms.find((r) => r.id === targetId || r.name === targetId) ??
      home.rooms.find((r) => r.name === settings.targetName);
    if (room) {
      const devices = home.devices.filter(
        (d) => room.deviceIds.includes(d.id) || d.room === room.name || d.roomId === room.id,
      );
      return { devices, label: room.name };
    }

    // Fallback: match by room name on devices
    const devices = home.devices.filter((d) => d.room === targetId || d.room === settings.targetName);
    if (!devices.length) throw new Error("Room not found.");
    return { devices, label: settings.targetName || targetId };
  }

  private async render(
    action: WillAppearEvent<RoomSettings>["action"],
    settings: RoomSettings,
  ): Promise<void> {
    const label = settings.targetName || settings.targetId || "SETUP";
    if (action.isKey()) {
      await action.setImage("imgs/actions/room/key");
      await action.setTitle(truncateTitle(label, 12));
      return;
    }
    if (action.isDial()) {
      await action.setFeedback({
        title: truncateTitle(label, 16),
        value: "—",
        subtitle: settings.targetKind === "group" ? "Group" : "Room",
        bar: 0,
        icon: "imgs/actions/room/key",
      });
    }
  }
}
