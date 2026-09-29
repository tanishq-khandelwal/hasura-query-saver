// Prints the next release version, computed from the latest v* git tag, for
// .github/workflows/release.yml. The release build injects it into the
// built manifest, so manifest.json is never bumped by hand.
//
//   node scripts/version.js [auto|patch|minor|major]
//
// "auto" (the default) bumps patch, unless a commit since the last tag
// contains #minor or #major.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function bumpLevel(messages, requested = "auto") {
  if (requested !== "auto") return requested;
  if (/#major\b/i.test(messages)) return "major";
  if (/#minor\b/i.test(messages)) return "minor";
  return "patch";
}

export function nextVersion(current, level) {
  const [major, minor, patch] = current.split(".").map(Number);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  if (level === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown bump level: ${level}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sh = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();
  let lastTag = null;
  try {
    lastTag = sh("git describe --tags --abbrev=0 --match 'v[0-9]*'");
  } catch {
    // No release tag yet: the first release ships manifest.json's version as-is.
  }
  if (!lastTag) {
    console.log(JSON.parse(readFileSync("manifest.json", "utf8")).version);
  } else {
    const messages = sh(`git log ${lastTag}..HEAD --format=%B`);
    console.log(nextVersion(lastTag.slice(1), bumpLevel(messages, process.argv[2] || "auto")));
  }
}
