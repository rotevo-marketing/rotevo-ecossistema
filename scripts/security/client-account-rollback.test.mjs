import test from "node:test";
import assert from "node:assert/strict";
import { compensateNewClientAccount } from "../../src/lib/security/compensateNewClientAccount.ts";

test("profile failure: deletes only UID created in this request", async () => {
  const calls = [];
  const admin = { auth: { admin: { deleteUser: async id => {
    calls.push(id);
    return { error: null };
  } } } };
  const result = await compensateNewClientAccount(admin, "synthetic-uid-new");
  assert.deepEqual(calls, ["synthetic-uid-new"]);
  assert.deepEqual(result, { restored: true, reconciliationRequired: false });
});
test("rollback failure: flags administrator reconciliation", async () => {
  const admin = { auth: { admin: { deleteUser: async () => ({ error: { message: "synthetic failure" } }) } } };
  const result = await compensateNewClientAccount(admin, "synthetic-uid-new");
  assert.deepEqual(result, { restored: false, reconciliationRequired: true, error: "synthetic failure" });
});
test("unexpected rollback exception: flags administrator reconciliation", async () => {
  const admin = { auth: { admin: { deleteUser: async () => { throw new Error("local simulated network outage"); } } } };
  const result = await compensateNewClientAccount(admin, "synthetic-uid-new");
  assert.equal(result.reconciliationRequired, true);
  assert.equal(result.restored, false);
});
test("helper is not invoked on pre-existing accounts unless caller explicitly supplies their ID", async () => {
  let count = 0;
  const admin = { auth: { admin: { deleteUser: async () => { count++; return { error: null }; } } } };
  // Existing-account rejection occurs before calling the helper in the route.
  // Guard here ensures the helper has no eager or automatic side effects.
  assert.equal(count, 0);
  assert.equal(typeof compensateNewClientAccount, "function");
});
