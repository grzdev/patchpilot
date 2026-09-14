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

test("disconnect clears identity and OAuth cookies and rejects cross-origin requests", async () => {
  const {disconnectIdentity}=await import("../lib/oauth.ts");
  const response=disconnectIdentity(new Request("https://patchpilot.test/api/auth/github/session",{method:"DELETE",headers:{origin:"https://patchpilot.test"}}));
  assert.equal(response.status,200);
  const cookies=response.headers.getSetCookie();
  assert.equal(cookies.length,2);
  for(const name of ["pp_identity","pp_oauth"]) assert.ok(cookies.some(cookie=>cookie.startsWith(name+"=") && /Max-Age=0/.test(cookie) && /HttpOnly/.test(cookie) && /Secure/.test(cookie)));
  assert.equal(disconnectIdentity(new Request("https://patchpilot.test/api/auth/github/session",{method:"DELETE",headers:{origin:"https://other.test"}})).status,403);
  assert.equal(disconnectIdentity(new Request("http://127.0.0.1:8888/api/auth/github/session",{method:"DELETE",headers:{origin:"https://patchpilot.netlify.app","x-forwarded-host":"patchpilot.netlify.app","x-forwarded-proto":"https"}})).status,200);
});

test("repository quota failure does not invalidate successful GitHub sign-in", async()=>{
  const started=await startOAuth();
  const state=new URL(started.headers.get("location")).searchParams.get("state");
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return calls===1 ? Response.json({access_token:"TEST"}) : calls===2 ? Response.json({login:"tester"}) : Response.json({}, {status:429});};
  try {
    const response=await finishOAuth(new Request(`http://localhost:5173/api/auth/github/callback?code=fake&state=${state}`,{headers:{cookie:started.headers.get("set-cookie").split(";")[0]}}));
    assert.ok(response.headers.get("location").endsWith("auth=connected"));
    const identity=response.headers.getSetCookie().find(c=>c.startsWith("pp_identity="));
    const session=await getIdentity(new Request("http://localhost:5173/api/auth/github/session",{headers:{cookie:identity.split(";")[0]}})).json();
    assert.deepEqual(session.profile,{username:"tester",languages:[]});
  } finally {globalThis.fetch=original;}
});
