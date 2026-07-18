import type { GlobalSettings } from "./types";

export function requireToken(settings: GlobalSettings | undefined): string {
  const token = settings?.oauthToken?.trim();
  if (!token) {
    throw new Error("OAuth token is not set. Open plugin settings and paste your Yandex token.");
  }
  return token;
}

export function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message.includes("OAuth token is not set")) return "NO TOK";
  if (message.includes("401") || message.includes("403")) return "AUTH";
  if (message.includes("404")) return "404";
  if (message.includes("Network") || message.includes("fetch failed")) return "NET";
  if (message.includes("not selected") || message.includes("not set")) return "SETUP";

  return "ERR";
}
