const ROOT = "https://api.github.com";
export class GitHubError extends Error {
  constructor(
    message: string,
    public status = 502,
    public source = "GitHub",
    public retryAfterSeconds?: number,
  ) {
    super(message);
  }
}
const githubCache = new Map<string,{value:unknown;expires:number}>();
const githubPending = new Map<string,Promise<unknown>>();
export async function github<T>(path:string, ttl=0): Promise<T> {
  if(!ttl) return requestGitHub<T>(path);
  const cached=githubCache.get(path);
  if(cached && cached.expires>Date.now()) return structuredClone(cached.value) as T;
  const pending=githubPending.get(path);
  if(pending) return structuredClone(await pending) as T;
  const request=requestGitHub<T>(path).then(value=>{
    if(githubCache.size>=200) githubCache.delete(githubCache.keys().next().value!);
    githubCache.set(path,{value,expires:Date.now()+ttl});return value;
  }).finally(()=>githubPending.delete(path));
  githubPending.set(path,request);
  return structuredClone(await request);
}
async function requestGitHub<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "PatchPilot",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN)
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let response: Response;
  try {
    response = await fetch(ROOT + path, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new GitHubError("GitHub could not be reached. Please try again.");
  }
  if (!response.ok) {
    if (response.status === 404)
      throw new GitHubError(
        "This GitHub resource was not found or is not public.",
        404,
      );
    if (response.status === 403 || response.status === 429) {
      const reset = Number(response.headers.get("x-ratelimit-reset"));
      const retry = Number(response.headers.get("retry-after"));
      const limited = response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0" || retry > 0;
      if (limited) throw new GitHubError(
        "GitHub is temporarily limiting repository access. Your previous results are safe. Please retry after the countdown.",
        429, "GitHub", retry > 0 ? Math.ceil(retry) : reset > Date.now()/1000 ? Math.ceil(reset-Date.now()/1000) : undefined,
      );
      throw new GitHubError("GitHub denied this request. Check repository access or server token permissions.",403,"GitHub");
    }
    throw new GitHubError(
      `GitHub returned an error (${response.status}). Please retry.`,
    );
  }
  return response.json() as Promise<T>;
}
export function repoPath(value: string | null) {
  if (!value || !/^[\w.-]+\/[\w.-]+$/.test(value))
    throw new GitHubError("Choose a valid owner/repository.", 400);
  return value;
}
export function failure(error: unknown) {
  return Response.json(
    {
      source: error instanceof GitHubError ? error.source : "PatchPilot",
      retryAfterSeconds: error instanceof GitHubError ? error.retryAfterSeconds : undefined,
      error:
        error instanceof Error ? error.message : "Unexpected request failure.",
    },
    { status: error instanceof GitHubError ? error.status : 500 },
  );
}
export type Issue = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  updated_at: string;
  comments: number;
  state: string;
  labels: { name: string }[];
  pull_request?: unknown;
  user: { login: string };
  assignees: { login: string }[];
};
