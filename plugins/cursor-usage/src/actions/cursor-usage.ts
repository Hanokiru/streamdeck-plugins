import streamDeck, {
  action,
  DialDownEvent,
  DialRotateEvent,
  DidReceiveSettingsEvent,
  KeyAction,
  KeyDownEvent,
  SingletonAction,
  TouchTapEvent,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import type { DialAction } from "@elgato/streamdeck";

import { fetchCursorUsageSnapshot } from "../lib/api";
import {
  buildDialFeedback,
  buildKeyErrorSvg,
  buildKeySvg,
  getMetric,
  isWarning,
  svgToDataUri,
} from "../lib/display";
import { assertCredentialsFresh, resolveCursorCredentials } from "../lib/auth";
import { DISPLAY_MODES, type DisplayMode } from "../lib/types";

type UsageSettings = {
  accessToken?: string;
  refreshToken?: string;
  displayMode?: DisplayMode;
  pollIntervalSeconds?: number;
  warningRemainingPercent?: number;
};

const DEFAULT_POLL_SECONDS = 300;
const MIN_POLL_SECONDS = 60;
const DIAL_LAYOUT = "layouts/usage-dial.json";
const DIAL_LAYOUT_FALLBACK = "$B2";

type ActionInstance = KeyAction<UsageSettings> | DialAction<UsageSettings>;

function shortErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message.includes("state database not found")) return "NO DB";
  if (message.includes("too large")) return "BIG DB";
  if (message.includes("token not found") || message.includes("logged into Cursor")) return "NO TOK";
  if (message.includes("session token expired")) return "EXPIRED";
  if (message.includes("session expired") || message.includes("token refresh failed")) return "LOGIN";
  if (message.includes("401") || message.includes("403")) return "AUTH";
  if (message.includes("API error") || message.includes("web API error")) return "API";
  if (message.includes("Network error") || message.includes("fetch failed")) return "NET";

  return "ERR";
}

function nextDisplayMode(current?: DisplayMode): DisplayMode {
  const mode = current ?? "total";
  const index = DISPLAY_MODES.indexOf(mode);
  return DISPLAY_MODES[(index + 1) % DISPLAY_MODES.length];
}

function isKeyAction(action: ActionInstance): action is KeyAction<UsageSettings> {
  return action.isKey();
}

function isDialAction(action: ActionInstance): action is DialAction<UsageSettings> {
  return action.isDial();
}

@action({ UUID: "com.hanokiru.cursor-usage.action" })
export class CursorUsageAction extends SingletonAction<UsageSettings> {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();

  override async onWillAppear(ev: WillAppearEvent<UsageSettings>): Promise<void> {
    if (isDialAction(ev.action)) {
      try {
        await ev.action.setFeedbackLayout(DIAL_LAYOUT);
      } catch (layoutError) {
        streamDeck.logger.warn(
          `[cursor-usage] custom dial layout failed, using ${DIAL_LAYOUT_FALLBACK}`,
        );
        await ev.action.setFeedbackLayout(DIAL_LAYOUT_FALLBACK);
      }

      await ev.action.setTriggerDescription({
        rotate: "Switch metric",
        push: "Refresh usage",
        touch: "Refresh usage",
      });
    }

    await this.refreshUsage(ev.action, ev.payload.settings);
    this.startPolling(ev.action.id, ev.payload.settings, ev.action);
  }

  override async onWillDisappear(ev: WillDisappearEvent<UsageSettings>): Promise<void> {
    this.stopPolling(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<UsageSettings>): Promise<void> {
    this.startPolling(ev.action.id, ev.payload.settings, ev.action);
    await this.refreshUsage(ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<UsageSettings>): Promise<void> {
    await this.refreshUsage(ev.action, ev.payload.settings);
  }

  override async onDialDown(ev: DialDownEvent<UsageSettings>): Promise<void> {
    streamDeck.logger.info("[cursor-usage] dial down");
    await this.refreshUsage(ev.action, ev.payload.settings);
  }

  override async onDialRotate(ev: DialRotateEvent<UsageSettings>): Promise<void> {
    const nextMode = nextDisplayMode(ev.payload.settings.displayMode);
    streamDeck.logger.info(`[cursor-usage] dial rotate -> ${nextMode}`);
    const settings = { ...ev.payload.settings, displayMode: nextMode };
    await ev.action.setSettings(settings);
    await this.refreshUsage(ev.action, settings);
  }

  override async onTouchTap(ev: TouchTapEvent<UsageSettings>): Promise<void> {
    streamDeck.logger.info("[cursor-usage] touch tap");
    await this.refreshUsage(ev.action, ev.payload.settings);
  }

  private startPolling(
    actionId: string,
    settings: UsageSettings,
    action: ActionInstance,
  ): void {
    this.stopPolling(actionId);

    const intervalSeconds = Math.max(
      settings.pollIntervalSeconds ?? DEFAULT_POLL_SECONDS,
      MIN_POLL_SECONDS,
    );

    const timer = setInterval(() => {
      void action.getSettings().then((currentSettings) => {
        void this.refreshUsage(action, currentSettings);
      });
    }, intervalSeconds * 1000);

    this.timers.set(actionId, timer);
  }

  private stopPolling(actionId: string): void {
    const timer = this.timers.get(actionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(actionId);
    }
  }

  private async refreshUsage(action: ActionInstance, settings: UsageSettings): Promise<void> {
    const warningThreshold = settings.warningRemainingPercent ?? 20;
    const displayMode = settings.displayMode ?? "total";

    try {
      const credentials = await resolveCursorCredentials(
        settings.accessToken,
        settings.refreshToken,
      );
      assertCredentialsFresh(credentials);

      const snapshot = await fetchCursorUsageSnapshot(
        credentials.accessToken,
        credentials.refreshToken,
        credentials.sessionCookie,
      );

      const metric = getMetric(snapshot, displayMode);
      const alert = isWarning(metric, warningThreshold);

      if (isDialAction(action)) {
        await action.setFeedback(buildDialFeedback(metric));
        if (alert) {
          await action.showAlert();
        }
      } else {
        await action.setImage(svgToDataUri(buildKeySvg(metric, warningThreshold)));
        await action.setTitle("");
      }

      if (isKeyAction(action)) {
        if (alert) {
          await action.showAlert();
        } else {
          await action.showOk();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      if (isDialAction(action)) {
        await action.setFeedback({
          title: "Cursor Usage",
          value: shortErrorMessage(error),
          subtitle: "Check token",
          bar: 0,
        });
      } else {
        await action.setImage(svgToDataUri(buildKeyErrorSvg(shortErrorMessage(error))));
        await action.setTitle("");
      }

      if (isDialAction(action)) {
        await action.showAlert();
      } else if (isKeyAction(action)) {
        await action.showAlert();
      }

      streamDeck.logger.error(`[cursor-usage] refresh failed: ${message}`);
    }
  }
}
