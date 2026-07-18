#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
}

const fileEnv = loadEnvFile(envPath);
const clientId = process.env.YANDEX_CLIENT_ID || fileEnv.YANDEX_CLIENT_ID;

if (!clientId) {
  console.error("Missing YANDEX_CLIENT_ID.");
  console.error("Set it in .env.local (see .env.example) or export YANDEX_CLIENT_ID=...");
  process.exit(1);
}

const url =
  `https://oauth.yandex.ru/authorize?response_type=token` +
  `&client_id=${encodeURIComponent(clientId)}`;

console.log("Open this URL in a browser, authorize, then copy access_token from the redirect URL:\n");
console.log(url);
console.log("\nPaste the token into Stream Deck action settings (OAuth token).");
console.log("Scopes required: iot:view + iot:control");
console.log("Client secret is NOT needed for response_type=token and must never be committed.");
