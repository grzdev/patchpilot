const ROOT = "https://api.github.com";
export class GitHubError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export async function github<T>(path: string): Promise<T> {
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
    if (response.status === 403 || response.status === 429)
      throw new GitHubError(
        "GitHub has limited these requests. Wait a little and retry, or configure a server-side GitHub token.",
        429,
      );
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
