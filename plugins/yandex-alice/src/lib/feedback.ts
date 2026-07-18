import type { DialAction, KeyAction } from "@elgato/streamdeck";

import { successFlashImage } from "./key-art";

const SUCCESS_MS = 480;

export async function flashSuccess(
  action: KeyAction,
  restore: () => Promise<void>,
  timers: Map<string, ReturnType<typeof setTimeout>>,
): Promise<void> {
  const existing = timers.get(action.id);
  if (existing) clearTimeout(existing);
  await action.setImage(successFlashImage());
  await action.setTitle("");
  const timer = setTimeout(() => {
    timers.delete(action.id);
    void restore();
  }, SUCCESS_MS);
  timers.set(action.id, timer);
}

export function isDial(
  action: KeyAction | DialAction,
): action is DialAction {
  return action.isDial();
}
