type Candidate = {
  title: string;
  body: string | null;
  labels: { name: string }[];
  updated_at: string;
  assignees: { login: string }[];
  state: string;
  pull_request?: unknown;
};
type Preferences = { kinds: string[]; pace: string };
const keywords: Record<string, string[]> = {
  bug: ["bug", "defect", "crash", "incorrect"],
  docs: ["documentation", "docs", "example", "guide"],
  test: ["test", "coverage", "flaky"],
  feature: ["feature", "enhancement", "support"],
  polish: [
    "animation",
    "transition",
    "empty state",
    "shortcut",
    "keyboard",
    "tooltip",
    "microcopy",
    "theme",
    "color",
    "colour",
    "delight",
    "visual",
    "polish",
    "ux",
    "usability",
    "accessibility",
  ],
};
export function screenIssue(
  issue: Candidate,
  profile: Preferences,
  now = Date.now(),
) {
  const signals: string[] = [],
    cautions: string[] = [];
  const updated = Date.parse(issue.updated_at);
  if (
    issue.pull_request ||
    issue.state !== "open" ||
    issue.assignees.length ||
    !Number.isFinite(updated) ||
    now - updated > 180 * 86400000
  )
    return { eligible: false, score: 0, signals, cautions };
  const text =
    `${issue.title} ${issue.labels.map((l) => l.name).join(" ")} ${issue.body || ""}`.toLowerCase();
  const matched = profile.kinds.filter((kind) =>
    (keywords[kind] || []).some((word) =>
      new RegExp("\\b" + word + "\\b", "i").test(text),
    ),
  );
  if (!matched.length) return { eligible: false, score: 0, signals, cautions };
  signals.push(
    `Matches your ${matched.map((k) => (k === "polish" ? "fun & polish" : k)).join(" / ")} preference through issue text or labels.`,
  );
  let score = matched.length * 3;
  const beginner = issue.labels.some((l) =>
    /good first issue|beginner|easy/i.test(l.name),
  );
  if (beginner) {
    score += profile.pace === "quick" ? 4 : 1;
    signals.push("Explicitly labeled as beginner-friendly by the repository.");
  } else if (profile.pace === "quick")
    cautions.push("No beginner label; a short-session fit is unconfirmed.");
  if (now - updated <= 30 * 86400000) {
    score += 2;
    signals.push("Issue updated within the last 30 days.");
  }
  if (
    /steps to reproduce|reproduction|expected behavior|expected behaviour/i.test(
      issue.body || "",
    )
  ) {
    score++;
    signals.push(
      "Description includes a reproduction or expected-behavior section.",
    );
  }
  cautions.push("Source-code scope and time estimate have not been verified.");
  return { eligible: true, score, signals, cautions };
}
