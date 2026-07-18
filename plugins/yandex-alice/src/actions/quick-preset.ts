import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
} from "@elgato/streamdeck";

import { runPresetSteps } from "../lib/api";
import { requireToken, shortError } from "../lib/auth";
import { flashSuccess } from "../lib/feedback";
import { truncateTitle } from "../lib/key-art";
import type { GlobalSettings, PresetSettings, PresetStep } from "../lib/types";

function parseSteps(json?: string): PresetStep[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((step) => step && typeof step === "object" && "type" in step) as PresetStep[];
  } catch {
    return [];
  }
}

@action({ UUID: "com.hanokiru.yandex-alice.preset" })
export class QuickPresetAction extends SingletonAction<PresetSettings> {
  private readonly flash = new Map<string, ReturnType<typeof setTimeout>>();

  override async onWillAppear(ev: WillAppearEvent<PresetSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PresetSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<PresetSettings>): Promise<void> {
    try {
      const steps = parseSteps(ev.payload.settings.stepsJson);
      if (!steps.length) throw new Error("Preset has no steps.");
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      await runPresetSteps(token, steps);
      await flashSuccess(
        ev.action,
        () => this.render(ev.action, ev.payload.settings),
        this.flash,
      );
      streamDeck.logger.info(
        `[yandex-alice] preset ran ${steps.length} steps: ${ev.payload.settings.presetName || "unnamed"}`,
      );
    } catch (error) {
      await ev.action.setTitle(shortError(error));
      await ev.action.showAlert();
      streamDeck.logger.error(
        `[yandex-alice] preset failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async render(
    action: WillAppearEvent<PresetSettings>["action"],
    settings: PresetSettings,
  ): Promise<void> {
    await action.setImage("imgs/actions/preset/key");
    const name = settings.presetName?.trim();
    const steps = parseSteps(settings.stepsJson);
    if (!name && !steps.length) {
      await action.setTitle("SETUP");
      return;
    }
    await action.setTitle(
      `${truncateTitle(name || "Preset", 12)}\n${steps.length} steps`,
    );
  }
}
