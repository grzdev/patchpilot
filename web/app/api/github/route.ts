import {
  github,
  repoPath,
  failure,
  GitHubError,
  type Issue,
} from "@/lib/github";
type User = { login: string; name: string | null };
type Repo = { language: string | null; fork: boolean };
type Comment = { body: string; html_url: string; user: { login: string } };
type Event = { source?: { issue?: Issue } };
type Community = { files?: { contributing?: { html_url: string } } };
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const action = params.get("action");
    if (action === "profile") {
      const username = params.get("username")?.trim();
      if (!username || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(username))
        throw new GitHubError(
          "Enter a GitHub username, not a profile URL.",
          400,
        );
      const [user, repos] = await Promise.all([
        github<User>(`/users/${username}`),
        github<Repo[]>(
          `/users/${username}/repos?per_page=100&sort=updated&type=owner`,
        ),
      ]);
      const languages: Record<string, number> = {};
      for (const repo of repos)
        if (repo.language && !repo.fork)
          languages[repo.language] = (languages[repo.language] || 0) + 1;
      return Response.json({
        username: user.login,
        name: user.name,
        languages: Object.entries(languages)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name]) => name),
        sample: repos.length,
      });
    }
    const repo = repoPath(params.get("repo"));
    if (action === "issues") {
      const [meta, items] = await Promise.all([
        github<{ description: string; stargazers_count: number }>(
          `/repos/${repo}`,
        ),
        github<Issue[]>(
          `/repos/${repo}/issues?state=open&sort=updated&per_page=100`,
        ),
      ]);
      return Response.json({
        repo,
        description: meta.description,
        stars: meta.stargazers_count,
        issues: items.filter((i: Issue) => !i.pull_request),
        fetchedAt: new Date().toISOString(),
        sampleLimit: 100,
      });
    }
    if (action === "brief") {
      const number = params.get("number");
      if (!number || !/^\d+$/.test(number))
        throw new GitHubError("Choose a valid issue number.", 400);
      const issue: Issue = await github<Issue>(
        `/repos/${repo}/issues/${number}`,
      );
      if (issue.pull_request)
        throw new GitHubError(
          "Select an issue rather than a pull request.",
          400,
        );
      const evidence: { label: string; url: string; detail: string }[] = [
        {
          label: `Issue #${number}`,
          url: issue.html_url,
          detail: `${issue.state}; ${issue.comments} comments; updated ${issue.updated_at}`,
        },
      ];
      const warnings: string[] = [];
      const [commentsResult, eventsResult, guideResult] =
        await Promise.allSettled([
          github<Comment[]>(
            `/repos/${repo}/issues/${number}/comments?per_page=100`,
          ),
          github<Event[]>(
            `/repos/${repo}/issues/${number}/timeline?per_page=100`,
          ),
          github<Community>(`/repos/${repo}/community/profile`),
        ]);
      const comments =
        commentsResult.status === "fulfilled" ? commentsResult.value : [];
      if (commentsResult.status === "rejected")
        warnings.push("Discussion could not be loaded.");
      else
        evidence.push({
          label: "Issue discussion",
          url: `${issue.html_url}#issuecomment`,
          detail: `Read ${comments.length} comments (first 100 maximum).`,
        });
      const events =
        eventsResult.status === "fulfilled" ? eventsResult.value : [];
      const linked = events
        .filter(
          (event: { source?: { issue?: Issue } }) =>
            event.source?.issue?.pull_request,
        )
        .map((event) => ({
          title: event.source!.issue!.title,
          url: event.source!.issue!.html_url,
          state: event.source!.issue!.state,
        }));
      if (eventsResult.status === "rejected")
        warnings.push("Linked PR check failed. Competition is unknown.");
      else
        evidence.push({
          label: "Issue timeline",
          url: issue.html_url,
          detail: `Checked ${events.length} timeline events (first 100 maximum). Linked PRs may not be complete.`,
        });
      const guide =
        guideResult.status === "fulfilled"
          ? guideResult.value.files?.contributing
          : null;
      if (guide)
        evidence.push({
          label: "Contribution guide",
          url: guide.html_url,
          detail: "Guide located; read it before preparing a patch.",
        });
      else
        warnings.push(
          "A contribution guide was not located through GitHub’s community profile.",
        );
      return Response.json({
        repo,
        issue,
        linked,
        guide: guide?.html_url || null,
        evidence,
        warnings,
        comments: comments
          .slice(-5)
          .map(
            (c: {
              body: string;
              html_url: string;
              user: { login: string };
            }) => ({ body: c.body, url: c.html_url, author: c.user.login }),
          ),
        fetchedAt: new Date().toISOString(),
        competition:
          eventsResult.status === "rejected"
            ? "unknown"
            : linked.length
              ? "linked PRs found"
              : "none found in checked timeline",
      });
    }
    throw new GitHubError("Unknown request.", 400);
  } catch (error) {
    return failure(error);
  }
}
