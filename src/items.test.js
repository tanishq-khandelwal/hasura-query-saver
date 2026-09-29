import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesSearch, normalizeItem, operationInfo, toExport } from "./items.js";

test("normalizeItem survives malformed imports", () => {
  const rec = normalizeItem(
    { headers: [{ value: "no key" }, null, "junk", { key: "x-hasura-role", value: 1, enabled: false }], variables: { a: 1 } },
    5
  );
  assert.deepEqual(rec.headers, [{ key: "x-hasura-role", value: "1", enabled: false }]);
  assert.equal(rec.name, "Imported query");
  assert.equal(rec.variables, '{\n  "a": 1\n}');
  assert.deepEqual(normalizeItem({ headers: "nope" }).headers, []);
  assert.equal(matchesSearch(rec, "role"), true);
});

test("operationInfo reads type and name", () => {
  assert.deepEqual(operationInfo("# c\nmutation AddUser { x }"), { type: "mutation", name: "AddUser" });
  assert.deepEqual(operationInfo("{ users { id } }"), { type: "query", name: "" });
});

test("toExport blanks header values unless asked", () => {
  const items = [{ id: 1, name: "a", headers: [{ key: "k", value: "secret", enabled: true }] }];
  assert.equal(toExport(items, false)[0].headers[0].value, "");
  assert.equal(toExport(items, false)[0].id, undefined);
  assert.equal(toExport(items, true)[0].headers[0].value, "secret");
});
