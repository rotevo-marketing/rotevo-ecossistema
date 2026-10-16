import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const script = resolve(currentDir, "local-admin-api-negative.test.mjs");
const baseline = { ...process.env, ROTEVO_LOCAL_API_TESTS: "YES_LOCAL_ONLY" };

function checkBlocked(env) {
  const result = spawnSync(process.execPath, [script], {
    env: { ...baseline, ...env },
    encoding: "utf8",
    timeout: 5000,
  });
  assert.notEqual(result.status, 0, "guard should reject unsafe configuration");
  assert.match(result.stderr, /TEST BLOCKED/, "must fail before attempting HTTP");
}

test("rejects missing explicit opt-in", () => {
  checkBlocked({ ROTEVO_LOCAL_API_TESTS: "NO", ROTEVO_LOCAL_APP_URL: "http://127.0.0.1:3000/", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321/" });
});
test("rejects remote application even if Supabase is local", () => {
  checkBlocked({ ROTEVO_LOCAL_APP_URL: "https://app.rotevo.com.br/", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321/" });
});
test("rejects remote Supabase even if application is local", () => {
  checkBlocked({ ROTEVO_LOCAL_APP_URL: "http://127.0.0.1:3000/", NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co/" });
});
test("rejects local-looking hostname with a remote redirect-style suffix", () => {
  checkBlocked({ ROTEVO_LOCAL_APP_URL: "http://127.0.0.1.evil.invalid:3000/", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321/" });
});
test("rejects port not in approved local app list", () => {
  checkBlocked({ ROTEVO_LOCAL_APP_URL: "http://127.0.0.1:9999/", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321/" });
});
test("rejects remote URL with embedded local origin", () => {
  checkBlocked({ ROTEVO_LOCAL_APP_URL: "http://127.0.0.1:3000@evil.invalid/", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321/" });
});
