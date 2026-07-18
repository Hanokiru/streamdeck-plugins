#!/usr/bin/env node
/**
 * Install AI-rendered Mana icons into the plugin imgs/ folder.
 * Masters live in scripts/ai-icons/; do not regenerate with crude SVG.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const masters = join(__dirname, "ai-icons");
const pluginImgs = join(__dirname, "..", "com.hanokiru.yandex-alice.sdPlugin", "imgs");

if (!existsSync(masters) || readdirSync(masters).length === 0) {
  console.error("Missing scripts/ai-icons/*.png masters. Aborting.");
  process.exit(1);
}

function installPair(src, destBase) {
  mkdirSync(dirname(destBase), { recursive: true });
  execSync(
    `convert "${src}" -resize 72x72^ -gravity center -extent 72x72 -quality 95 "${destBase}.png"`,
    { stdio: "inherit" },
  );
  execSync(
    `convert "${src}" -resize 144x144^ -gravity center -extent 144x144 -quality 95 "${destBase}@2x.png"`,
    { stdio: "inherit" },
  );
}

const kinds = [
  "light",
  "strip",
  "purifier",
  "headphones",
  "speaker",
  "tv",
  "socket",
  "pc",
  "kettle",
  "vacuum",
  "climate",
  "humidifier",
  "curtain",
  "sensor",
  "other",
];

for (const kind of kinds) {
  installPair(
    join(masters, `kind-${kind}-on.png`),
    join(pluginImgs, "actions/device/kinds", `${kind}-on`),
  );
  installPair(
    join(masters, `kind-${kind}-off.png`),
    join(pluginImgs, "actions/device/kinds", `${kind}-off`),
  );
}

installPair(join(masters, "key-scenario.png"), join(pluginImgs, "actions/scenario/key"));
installPair(join(masters, "key-success.png"), join(pluginImgs, "actions/feedback/success"));
installPair(join(masters, "action-scenario-icon.png"), join(pluginImgs, "actions/scenario/icon"));
installPair(join(masters, "action-device-icon.png"), join(pluginImgs, "actions/device/icon"));
installPair(join(masters, "kind-other-on.png"), join(pluginImgs, "actions/device/on"));
installPair(join(masters, "kind-other-off.png"), join(pluginImgs, "actions/device/off"));
installPair(join(masters, "plugin-marketplace.png"), join(pluginImgs, "plugin/marketplace"));
installPair(join(masters, "plugin-category.png"), join(pluginImgs, "plugin/category-icon"));

installPair(join(masters, "action-dial-icon.png"), join(pluginImgs, "actions/dial/icon"));
installPair(join(masters, "action-dial-icon.png"), join(pluginImgs, "actions/dial/encoder"));
for (const dial of ["brightness", "volume", "temperature", "humidity", "generic", "open"]) {
  installPair(join(masters, `dial-${dial}.png`), join(pluginImgs, "actions/dial", dial));
}

for (const name of ["color", "mode", "room", "sensor", "preset"]) {
  installPair(join(masters, `action-${name}-icon.png`), join(pluginImgs, `actions/${name}/icon`));
  installPair(join(masters, `action-${name}-icon.png`), join(pluginImgs, `actions/${name}/key`));
}

console.log("Installed AI Mana icon set.");
