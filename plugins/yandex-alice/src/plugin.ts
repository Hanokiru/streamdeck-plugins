import streamDeck, { JsonValue } from "@elgato/streamdeck";

import { ColorLightAction } from "./actions/color-light";
import { DeviceDialAction } from "./actions/device-dial";
import { DeviceModeAction } from "./actions/device-mode";
import { QuickPresetAction } from "./actions/quick-preset";
import { RoomGroupAction } from "./actions/room-group";
import { RunScenarioAction } from "./actions/run-scenario";
import { SensorDisplayAction } from "./actions/sensor-display";
import { ToggleDeviceAction } from "./actions/toggle-device";
import { fetchHomeSnapshot } from "./lib/api";
import { requireToken, shortError } from "./lib/auth";
import type { GlobalSettings } from "./lib/types";

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new RunScenarioAction());
streamDeck.actions.registerAction(new ToggleDeviceAction());
streamDeck.actions.registerAction(new DeviceDialAction());
streamDeck.actions.registerAction(new ColorLightAction());
streamDeck.actions.registerAction(new DeviceModeAction());
streamDeck.actions.registerAction(new RoomGroupAction());
streamDeck.actions.registerAction(new SensorDisplayAction());
streamDeck.actions.registerAction(new QuickPresetAction());

type PiMessage = {
  event?: string;
};

streamDeck.ui.onSendToPlugin(async (ev) => {
  const payload = (ev.payload ?? {}) as PiMessage;
  streamDeck.logger.info(`[yandex-alice] PI message: ${JSON.stringify(payload)}`);

  if (payload.event !== "refreshHome") {
    return;
  }

  await streamDeck.ui.sendToPropertyInspector({
    event: "homeLoading",
  } as unknown as JsonValue);

  try {
    const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const token = requireToken(global);
    const home = await fetchHomeSnapshot(token);
    const devices = home.devices.map((device) => ({
      id: device.id,
      name: device.name,
      room: device.room || "",
      type: device.type,
      on: device.on,
      hasOnOff: device.hasOnOff,
      ranges: device.ranges,
      modes: device.modes,
      color: device.color,
      properties: device.properties,
    }));
    const scenarios = home.scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
    }));
    const rooms = home.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      deviceIds: room.deviceIds,
    }));
    const groups = home.groups.map((group) => ({
      id: group.id,
      name: group.name,
      deviceIds: group.deviceIds,
    }));

    streamDeck.logger.info(
      `[yandex-alice] home loaded: ${devices.length} devices, ${scenarios.length} scenarios, ${rooms.length} rooms, ${groups.length} groups`,
    );

    await streamDeck.ui.sendToPropertyInspector({
      event: "homeData",
      devices,
      scenarios,
      rooms,
      groups,
    } as unknown as JsonValue);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    streamDeck.logger.error(`[yandex-alice] refreshHome failed: ${detail}`);
    await streamDeck.ui.sendToPropertyInspector({
      event: "homeError",
      message: shortError(error),
      detail,
    } as unknown as JsonValue);
  }
});

streamDeck.logger.info("[yandex-alice] plugin starting");
streamDeck.connect();
