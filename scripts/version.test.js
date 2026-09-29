import { test } from "node:test";
import assert from "node:assert/strict";
import { bumpLevel, nextVersion } from "./version.js";

test("bump level comes from the request, then #major/#minor markers, else patch", () => {
  assert.equal(bumpLevel("Fix search", "auto"), "patch");
  assert.equal(bumpLevel("Add tags #minor\nFix bug", "auto"), "minor");
  assert.equal(bumpLevel("New storage #MAJOR\nAdd x #minor"), "major");
  assert.equal(bumpLevel("whatever #major", "patch"), "patch");
});

test("nextVersion resets lower parts", () => {
  assert.equal(nextVersion("1.4.2", "patch"), "1.4.3");
  assert.equal(nextVersion("1.4.2", "minor"), "1.5.0");
  assert.equal(nextVersion("1.4.2", "major"), "2.0.0");
  assert.throws(() => nextVersion("1.0.0", "huge"));
});
