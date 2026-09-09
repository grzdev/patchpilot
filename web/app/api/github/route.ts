import { screenIssue } from "@/lib/screening";
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
    if (action === "projects") {
      const topicMap: Record<string, string> = {
        tooling: "developer-tools",
        frontend: "frontend",
        ai: "machine-learning",
        testing: "testing",
        backend: "database",
        infra: "devops",
        fun: "creative-coding",
      };
      const category = params.get("category") || "all",
        language = params.get("language") || "all";
      const page = Number(params.get("page") || 1);
      if (!Number.isInteger(page) || page < 1 || page > 5)
        throw new GitHubError("Choose a search page from 1 to 5.", 400);
      const phrase = (params.get("query") || "").trim().slice(0, 100);
      if (language !== "all" && !/^[A-Za-z0-9+# .-]{1,30}$/.test(language))
        throw new GitHubError("Invalid language filter.", 400);
      const q = [
        phrase || "stars:>25",
        "archived:false",
        "fork:false",
        topicMap[category] ? `topic:${topicMap[category]}` : "",
        language !== "all" ? `language:"${language}"` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const result = await github<{
        total_count: number;
        items: {
          full_name: string;
          name: string;
          language: string | null;
          description: string | null;
          topics: string[];
        }[];
      }>(
        `/search/repositories?${new URLSearchParams({ q, per_page: "30", page: String(page), sort: "updated" })}`,
      );
      return Response.json({
        projects: result.items.map((item) => ({
          repo: item.full_name,
          name: item.name,
          language: item.language || "Other",
          description:
            item.description || "Explore this public GitHub repository.",
          category:
            category !== "all"
              ? category
              : Object.entries(topicMap).find(([, topic]) =>
                  item.topics?.includes(topic),
                )?.[0] || "other",
          mark: item.name[0].toUpperCase(),
          color: "#93c5fd",
        })),
        more:
          result.items.length === 30 &&
          page < 5 &&
          result.total_count > page * 30,
      });
    }
    const repo = repoPath(params.get("repo"));
    if (action === "shortlist") {
      const kinds = (params.get("kinds") || "bug")
        .split(",")
        .filter((k) =>
          ["bug", "docs", "test", "feature", "polish"].includes(k),
        );
      const pace = params.get("pace") || "quick";
      const since = new Date(Date.now() - 180 * 86400000)
        .toISOString()
        .slice(0, 10);
      const found = await github<{ items: Issue[] }>(
        `/search/issues?${new URLSearchParams({ q: `repo:${repo} is:issue is:open no:assignee updated:>=${since}`, sort: "updated", order: "desc", per_page: "60" })}`,
      );
      const entries = found.items;
      const candidates = entries
        .map((issue) => ({
          issue,
          assessment: screenIssue(issue, { kinds, pace }),
        }))
        .filter((c) => c.assessment.eligible)
        .sort((a, b) => b.assessment.score - a.assessment.score)
        .slice(0, 8);
      const checks = await Promise.all(
        candidates.map(async ({ issue, assessment }) => {
          try {
            const timeline = await github<Event[]>(
              `/repos/${repo}/issues/${issue.number}/timeline?per_page=100`,
            );
            if (
              timeline.some(
                (e) =>
                  e.source?.issue?.pull_request &&
                  e.source.issue.state === "open",
              )
            )
              return null;
            return {
              ...issue,
              signals: [
                ...assessment.signals,
                "Unassigned; no open linked PR found in the checked timeline.",
              ],
              cautions: [
                ...assessment.cautions,
                "PR check covers up to 100 timeline events and may miss unlinked work.",
              ],
            };
          } catch {
            return {
              ...issue,
              signals: assessment.signals,
              cautions: [
                ...assessment.cautions,
                "Linked-PR check unavailable. Competition is unknown.",
              ],
            };
          }
        }),
      );
      return Response.json({
        issues: checks.filter(Boolean),
        screened: entries.length,
        fetchedAt: new Date().toISOString(),
      });
    }
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
