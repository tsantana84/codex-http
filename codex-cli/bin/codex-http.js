#!/usr/bin/env node
// Entry point for the Codex HTTP Server CLI.

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the path to the compiled HTTP CLI bundle
const httpCliPath = path.resolve(__dirname, "../dist/http-cli.js");
const httpCliUrl = pathToFileURL(httpCliPath).href;

// Load and execute the HTTP CLI
(async () => {
  try {
    await import(httpCliUrl);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
})();