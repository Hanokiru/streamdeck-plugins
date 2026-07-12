import { exec } from "node:child_process";
import { copyFileSync } from "node:fs";
import * as esbuild from "esbuild";

const sdPlugin = "com.hanokiru.cursor-usage";
const sdPluginFolder = `${sdPlugin}.sdPlugin`;
const isWatch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: ["src/plugin.ts"],
  outfile: `${sdPluginFolder}/bin/plugin.js`,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  sourcemap: isWatch,
  minify: !isWatch,
  logLevel: "info",
  banner: {
    js: [
      "import { createRequire } from 'module';",
      "import { fileURLToPath } from 'url';",
      "import { dirname } from 'path';",
      "const require = createRequire(import.meta.url);",
      "const __filename = fileURLToPath(import.meta.url);",
      "const __dirname = dirname(__filename);",
    ].join(" "),
  },
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");

  const restart = () => {
    exec(`streamdeck restart ${sdPlugin}`, (error, stdout, stderr) => {
      if (stdout) console.log(stdout.trim());
      if (stderr) console.error(stderr.trim());
      if (error) console.error("Failed to restart Stream Deck:", error.message);
    });
  };

  restart();
} else {
  await esbuild.build(buildOptions);
  copyFileSync(
    "node_modules/sql.js/dist/sql-wasm.wasm",
    `${sdPluginFolder}/bin/sql-wasm.wasm`,
  );
  console.log("Build complete.");
}
