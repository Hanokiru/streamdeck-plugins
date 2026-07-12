#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(__dirname, "..", "com.hanokiru.cursor-usage.sdPlugin");
const assetsRoot = join(__dirname, "assets");

const PURPLE = {
  dark: "#4C1D95",
  primary: "#7C3AED",
  light: "#A78BFA",
  text: "#F5F3FF",
  accent: "#C4B5FD",
};

function gradientDefs(id = "bg") {
  return `<defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PURPLE.dark}"/>
      <stop offset="100%" stop-color="${PURPLE.primary}"/>
    </linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PURPLE.light}"/>
      <stop offset="100%" stop-color="${PURPLE.accent}"/>
    </linearGradient>
  </defs>`;
}

function marketplaceIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
    ${gradientDefs()}
    <rect width="144" height="144" rx="28" fill="url(#bg)"/>
    <circle cx="72" cy="72" r="46" fill="none" stroke="url(#ring)" stroke-width="8"/>
    <path d="M72 34v24" stroke="${PURPLE.text}" stroke-width="8" stroke-linecap="round"/>
    <path d="M72 76a18 18 0 1 1 0 36" fill="none" stroke="${PURPLE.text}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="72" cy="58" r="6" fill="${PURPLE.accent}"/>
    <rect x="34" y="112" width="76" height="10" rx="5" fill="${PURPLE.dark}" opacity="0.6"/>
    <rect x="34" y="112" width="52" height="10" rx="5" fill="${PURPLE.light}"/>
  </svg>`;
}

function categoryIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
    ${gradientDefs()}
    <rect width="144" height="144" rx="24" fill="url(#bg)"/>
    <rect x="28" y="88" width="88" height="12" rx="6" fill="${PURPLE.dark}" opacity="0.55"/>
    <rect x="28" y="88" width="60" height="12" rx="6" fill="${PURPLE.light}"/>
    <text x="72" y="72" text-anchor="middle" fill="${PURPLE.text}" font-size="42" font-family="Segoe UI, Arial, sans-serif" font-weight="700">C</text>
  </svg>`;
}

function actionIcon(symbol, subtitle = "usage") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
    ${gradientDefs()}
    <rect width="144" height="144" rx="22" fill="url(#bg)"/>
    <circle cx="72" cy="58" r="30" fill="${PURPLE.dark}" opacity="0.45"/>
    <text x="72" y="70" text-anchor="middle" fill="${PURPLE.text}" font-size="34" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${symbol}</text>
    <text x="72" y="112" text-anchor="middle" fill="${PURPLE.accent}" font-size="14" font-family="Segoe UI, Arial, sans-serif" font-weight="600">${subtitle}</text>
    <rect x="24" y="122" width="96" height="8" rx="4" fill="${PURPLE.dark}" opacity="0.5"/>
    <rect x="24" y="122" width="64" height="8" rx="4" fill="${PURPLE.light}"/>
  </svg>`;
}

const icons = [
  { name: "plugin/marketplace", svg: marketplaceIcon() },
  { name: "plugin/category-icon", svg: categoryIcon() },
  { name: "actions/usage/icon", svg: actionIcon("$", "CURSOR") },
  { name: "actions/usage/key", svg: actionIcon("◔", "USAGE") },
  { name: "actions/usage/total", svg: actionIcon("$", "TOTAL") },
  { name: "actions/usage/auto", svg: actionIcon("A", "AUTO") },
  { name: "actions/usage/api", svg: actionIcon("&lt;/&gt;", "API") },
  { name: "actions/usage/all", svg: actionIcon("%", "ALL") },
];

function renderPng(svgPath, pngPath, size) {
  execSync(`convert -background none -resize ${size}x${size} "${svgPath}" "${pngPath}"`, {
    stdio: "inherit",
  });
}

mkdirSync(assetsRoot, { recursive: true });

for (const icon of icons) {
  const svgPath = join(assetsRoot, `${icon.name}.svg`);
  const outDir = join(pluginRoot, "imgs", ...icon.name.split("/").slice(0, -1));
  const baseName = icon.name.split("/").at(-1);

  mkdirSync(dirname(svgPath), { recursive: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(svgPath, icon.svg, "utf8");

  renderPng(svgPath, join(outDir, `${baseName}.png`), 72);
  renderPng(svgPath, join(outDir, `${baseName}@2x.png`), 144);
}

console.log(`Generated ${icons.length} icon sets in ${join(pluginRoot, "imgs")}`);
