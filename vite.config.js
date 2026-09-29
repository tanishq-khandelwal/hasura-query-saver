import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

// Release builds pass EXT_VERSION (computed from git tags by scripts/version.js);
// local builds keep manifest.json's version.
const version = process.env.EXT_VERSION || manifest.version;

export default defineConfig({
  plugins: [react(), crx({ manifest: { ...manifest, version } })],
});
