import test from "node:test";
import assert from "node:assert/strict";

// Fail closed: tests must never target a public or remote deployment.
const enabled = process.env.ROTEVO_LOCAL_API_TESTS === "YES_LOCAL_ONLY";
const appUrl = process.env.ROTEVO_LOCAL_APP_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
function localUrl(value, ports) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      ports.includes(Number(url.port)) &&
      !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
  } catch { return false; }
}
if (!enabled || !localUrl(appUrl, [3000, 3001, 3100]) ||
    !localUrl(supabaseUrl, [54321])) {
  throw new Error("TEST BLOCKED: explicitly enable local tests and use local Next.js (3000/3001/3100) plus local Supabase (54321). Never use a remote project.");
}
const origin = new URL(appUrl).origin;
async function post(path, body, headers = {}) {
  const response = await fetch(origin + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
    redirect: "error"
  });
  assert.equal(new URL(response.url).origin, origin, "unexpected redirect/origin");
  return response;
}

// These requests contain NO bearer token: no admin method should be reached.
test("client access refuses request without bearer token", async () => {
  const response = await post("/api/admin/create-client-access", {
    email: "never-created@rotevo.invalid",
    password: "not-a-real-password-test",
    fullName: "Teste Sem Token",
    clientId: "00000000-0000-4000-8000-000000000001"
  });
  assert.equal(response.status, 401);
});
test("client access refuses incomplete payload", async () => {
  const response = await post("/api/admin/create-client-access", {});
  assert.equal(response.status, 400);
});
test("team invitation refuses request without bearer token", async () => {
  const response = await post("/api/team/invite", {
    email: "never-invited@rotevo.invalid",
    displayName: "Teste Sem Token",
    role: "producer"
  });
  // Missing local service-role env may fail closed with 503, never success.
  assert.ok([401, 503].includes(response.status), `expected 401/503, got ${response.status}`);
});
test("team invitation refuses invalid role", async () => {
  const response = await post("/api/team/invite", {
    email: "never-invited@rotevo.invalid",
    displayName: "Teste Sem Token",
    role: "super_admin"
  });
  assert.ok([400, 503].includes(response.status), `expected 400/503, got ${response.status}`);
});
