import {
  createHmac,
  randomBytes,
  createHash,
  timingSafeEqual,
} from "node:crypto";
type Identity = { username: string; languages: string[]; exp: number };
function config() {
  const id = process.env.GITHUB_CLIENT_ID;
  const secret = process.env.GITHUB_CLIENT_SECRET;
  const session = process.env.AUTH_SESSION_SECRET;
  const callback = process.env.GITHUB_CALLBACK_URL;
  if (!id || !secret || !session || session.length < 32 || !callback)
    return null;
  try {
    const url = new URL(callback);
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      return null;
    if (url.pathname !== "/api/auth/github/callback") return null;
    return {
      id,
      secret,
      session,
      callback,
      origin: url.origin,
      secure: url.protocol === "https:",
    };
  } catch {
    return null;
  }
}
export function signPayload(payload: unknown, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return (
    body + "." + createHmac("sha256", secret).update(body).digest("base64url")
  );
}
export function verifyPayload<T extends { exp: number }>(
  value: string,
  secret: string,
): T | null {
  try {
    const [body, signature, ...rest] = value.split(".");
    if (!body || !signature || rest.length) return null;
    const expected = createHmac("sha256", secret).update(body).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
function readCookie(request: Request, name: string) {
  const value = (request.headers.get("cookie") || "")
    .split(";")
    .find((p) => p.trim().startsWith(name + "="));
  return value ? value.trim().slice(name.length + 1) : "";
}
function cookie(name: string, value: string, secure: boolean, maxAge: number) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
function redirect(url: string, cookies: string[] = []) {
  const headers = new Headers({
    Location: url,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
  cookies.forEach((c) => headers.append("Set-Cookie", c));
  return new Response(null, { status: 302, headers });
}
export async function startOAuth() {
  const c = config();
  if (!c) return redirect("/?auth=unavailable");
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(32).toString("base64url");
  const params = new URLSearchParams({
    client_id: c.id,
    redirect_uri: c.callback,
    state,
    scope: "",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  return redirect("https://github.com/login/oauth/authorize?" + params, [
    cookie(
      "pp_oauth",
      signPayload({ state, verifier, exp: Date.now() + 600000 }, c.session),
      c.secure,
      600,
    ),
  ]);
}
export async function finishOAuth(request: Request) {
  const c = config();
  if (!c) return redirect("/?auth=unavailable");
  const clear = cookie("pp_oauth", "", c.secure, 0);
  const params = new URL(request.url).searchParams;
  const flow = verifyPayload<{ state: string; verifier: string; exp: number }>(
    readCookie(request, "pp_oauth"),
    c.session,
  );
  if (
    !flow ||
    !params.get("code") ||
    params.get("state") !== flow.state ||
    params.has("error")
  )
    return redirect(c.origin + "/?auth=failed", [clear]);
  try {
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: c.id,
          client_secret: c.secret,
          code: params.get("code"),
          redirect_uri: c.callback,
          code_verifier: flow.verifier,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const token = (await response.json()) as { access_token?: string };
    if (!response.ok || !token.access_token) throw new Error("exchange");
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": "PatchPilot",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const userResponse = await fetch("https://api.github.com/user", {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!userResponse.ok) throw new Error("identity");
    const user = (await userResponse.json()) as { login: string };
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(user.login)) throw new Error("identity");
    const reposResponse = await fetch(
      `https://api.github.com/users/${user.login}/repos?per_page=100&sort=updated&type=owner`,
      { headers, signal: AbortSignal.timeout(15000) },
    );
    if (!reposResponse.ok) throw new Error("profile");
    const repos = (await reposResponse.json()) as {
      language: string | null;
      fork: boolean;
    }[];
    const languages: Record<string, number> = {};
    for (const repo of repos)
      if (repo.language && !repo.fork)
        languages[repo.language] = (languages[repo.language] || 0) + 1;
    const identity: Identity = {
      username: user.login,
      languages: Object.entries(languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([language]) => language),
      exp: Date.now() + 86400000,
    };
    // Only a signed public identity is persisted. The GitHub token is never sent to the browser or stored.
    return redirect(c.origin + "/?auth=connected", [
      clear,
      cookie("pp_identity", signPayload(identity, c.session), c.secure, 86400),
    ]);
  } catch {
    return redirect(c.origin + "/?auth=failed", [clear]);
  }
}
export function getIdentity(request: Request) {
  const c = config();
  const identity = c
    ? verifyPayload<Identity>(readCookie(request, "pp_identity"), c.session)
    : null;
  return Response.json(
    {
      configured: !!c,
      profile: identity
        ? { username: identity.username, languages: identity.languages }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
