import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
} from "@elgato/streamdeck";

import { runScenario } from "../lib/api";
import { requireToken, shortError } from "../lib/auth";
import { scenarioKeyImage, successFlashImage, truncateTitle } from "../lib/key-art";
import type { GlobalSettings, ScenarioSettings } from "../lib/types";

const SUCCESS_MS = 520;

@action({ UUID: "com.hanokiru.yandex-alice.scenario" })
export class RunScenarioAction extends SingletonAction<ScenarioSettings> {
  private readonly flashTimers = new Map<string, ReturnType<typeof setTimeout>>();

  override async onWillAppear(ev: WillAppearEvent<ScenarioSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<ScenarioSettings>,
  ): Promise<void> {
    await this.render(ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<ScenarioSettings>): Promise<void> {
    try {
      const global = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const token = requireToken(global);
      const scenarioId = ev.payload.settings.scenarioId?.trim();
      if (!scenarioId) {
        throw new Error("Scenario is not selected.");
      }

      await runScenario(token, scenarioId);
      await this.flashSuccess(ev.action, ev.payload.settings);
    } catch (error) {
      await ev.action.setTitle(shortError(error));
      await ev.action.showAlert();
      streamDeck.logger.error(
        `[yandex-alice] scenario failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async render(
    action: WillAppearEvent<ScenarioSettings>["action"],
    settings: ScenarioSettings,
  ): Promise<void> {
    await action.setImage(scenarioKeyImage());
    const name = settings.scenarioName?.trim() || settings.scenarioId?.trim();
    if (!name) {
      await action.setTitle("SETUP");
      return;
    }
    await action.setTitle(truncateTitle(name, 14));
  }

  private async flashSuccess(
    action: KeyDownEvent<ScenarioSettings>["action"],
    settings: ScenarioSettings,
  ): Promise<void> {
    const existing = this.flashTimers.get(action.id);
    if (existing) clearTimeout(existing);

    await action.setImage(successFlashImage());
    await action.setTitle("");

    const timer = setTimeout(() => {
      this.flashTimers.delete(action.id);
      void this.render(action, settings);
    }, SUCCESS_MS);

    this.flashTimers.set(action.id, timer);
  }
}
