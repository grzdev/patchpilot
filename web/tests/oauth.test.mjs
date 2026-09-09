import test from "node:test";
import assert from "node:assert/strict";
import {
  signPayload,
  verifyPayload,
  startOAuth,
  finishOAuth,
  getIdentity,
} from "../lib/oauth.ts";
const secret = "test-only-session-secret-at-least-32-characters";
process.env.GITHUB_CLIENT_ID = "test-client";
process.env.GITHUB_CLIENT_SECRET = "test-secret";
process.env.AUTH_SESSION_SECRET = secret;
process.env.GITHUB_CALLBACK_URL =
  "http://localhost:5173/api/auth/github/callback";
test("identity signatures reject tampering and expiry", () => {
  const signed = signPayload(
    { username: "tester", exp: Date.now() + 10000 },
    secret,
  );
  assert.equal(verifyPayload(signed, secret).username, "tester");
  assert.equal(verifyPayload(signed + "tamper", secret), null);
  assert.equal(
    verifyPayload(signPayload({ exp: Date.now() - 1 }, secret), secret),
    null,
  );
});
test("OAuth uses state and PKCE without requesting repository scopes", async () => {
  const response = await startOAuth();
  const target = new URL(response.headers.get("location"));
  assert.equal(target.origin, "https://github.com");
  assert.equal(target.searchParams.get("scope"), "");
  assert.equal(target.searchParams.get("code_challenge_method"), "S256");
  assert.equal(target.searchParams.get("code_challenge").length, 43);
  assert.ok(response.headers.get("set-cookie").includes("HttpOnly"));
  const bad = await finishOAuth(
    new Request(
      "http://localhost:5173/api/auth/github/callback?code=fake&state=wrong",
    ),
  );
  assert.ok(bad.headers.get("location").endsWith("auth=failed"));
});
test("successful callback stores only public identity, never the GitHub access token", async () => {
  const started = await startOAuth();
  const state = new URL(started.headers.get("location")).searchParams.get(
    "state",
  );
  const flowCookie = started.headers.get("set-cookie").split(";")[0];
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () =>
    Response.json(
      [
        { access_token: "TEST_TOKEN_NOT_REAL" },
        { login: "tester" },
        [{ language: "TypeScript", fork: false }],
      ][calls++],
    );
  try {
    const response = await finishOAuth(
      new Request(
        `http://localhost:5173/api/auth/github/callback?code=fake&state=${state}`,
        { headers: { cookie: flowCookie } },
      ),
    );
    assert.equal(calls, 3);
    assert.ok(response.headers.get("location").endsWith("auth=connected"));
    const identityCookie = response.headers
      .getSetCookie()
      .find((c) => c.startsWith("pp_identity="));
    assert.ok(!identityCookie.includes("TEST_TOKEN_NOT_REAL"));
    const session = await getIdentity(
      new Request("http://localhost:5173/api/auth/github/session", {
        headers: { cookie: identityCookie.split(";")[0] },
      }),
    ).json();
    assert.deepEqual(session.profile, {
      username: "tester",
      languages: ["TypeScript"],
    });
  } finally {
    globalThis.fetch = original;
  }
});
