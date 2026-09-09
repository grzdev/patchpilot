export const categories = [
  {
    id: "tooling",
    name: "Developer tools",
    description: "Build tools, package managers, and better workflows.",
    examples: "vitejs/vite · pnpm/pnpm · eslint/eslint",
    icon: "⌘",
  },
  {
    id: "frontend",
    name: "Frontend",
    description: "Interfaces, rendering, routing, and state.",
    examples: "facebook/react · vuejs/core · remix-run/react-router",
    icon: "▣",
  },
  {
    id: "ai",
    name: "AI & agents",
    description: "Agent frameworks, inference, and model tooling.",
    examples: "ollama/ollama · huggingface/transformers",
    icon: "✳",
  },
  {
    id: "testing",
    name: "Testing",
    description: "Test runners, browser automation, and reliability.",
    examples: "vitest-dev/vitest · microsoft/playwright",
    icon: "✓",
  },
  {
    id: "backend",
    name: "Backend & data",
    description: "APIs, runtimes, databases, and developer SDKs.",
    examples: "fastify/fastify · prisma/prisma · supabase/supabase",
    icon: "≡",
  },
  {
    id: "infra",
    name: "Infrastructure",
    description: "Containers, networking, and cloud tooling.",
    examples: "docker/cli · kubernetes/kubernetes",
    icon: "◇",
  },
];
export const kinds = [
  {
    id: "bug",
    name: "Fix a bug",
    description: "Reproduce a problem and make it disappear.",
    examples: "Vite · React Router · Playwright",
    icon: "⊕",
  },
  {
    id: "docs",
    name: "Docs & examples",
    description: "Make the next developer’s first step easier.",
    examples: "Vite · Supabase · Fastify",
    icon: "▤",
  },
  {
    id: "test",
    name: "Improve tests",
    description: "Catch edge cases and strengthen coverage.",
    examples: "Vitest · Playwright · React",
    icon: "✓",
  },
  {
    id: "feature",
    name: "Build a feature",
    description: "Explore a new API, integration, or workflow.",
    examples: "pnpm · Prisma · Ollama",
    icon: "✧",
  },
];
export const projects = [
  {
    repo: "vitejs/vite",
    name: "Vite",
    category: "tooling",
    language: "TypeScript",
    description: "The build tool powering your next web project.",
    mark: "V",
    color: "#a78bfa",
  },
  {
    repo: "pnpm/pnpm",
    name: "pnpm",
    category: "tooling",
    language: "TypeScript",
    description: "Fast, disk space efficient package management.",
    mark: "P",
    color: "#fbbf24",
  },
  {
    repo: "eslint/eslint",
    name: "ESLint",
    category: "tooling",
    language: "JavaScript",
    description: "Help developers find and fix problems in their code.",
    mark: "E",
    color: "#a5b4fc",
  },
  {
    repo: "facebook/react",
    name: "React",
    category: "frontend",
    language: "JavaScript",
    description: "Build the foundations of interactive interfaces.",
    mark: "R",
    color: "#67e8f9",
  },
  {
    repo: "vuejs/core",
    name: "Vue",
    category: "frontend",
    language: "TypeScript",
    description: "An approachable framework for modern interfaces.",
    mark: "V",
    color: "#6ee7b7",
  },
  {
    repo: "remix-run/react-router",
    name: "React Router",
    category: "frontend",
    language: "TypeScript",
    description: "Routing and application workflows for the web.",
    mark: "R",
    color: "#fda4af",
  },
  {
    repo: "ollama/ollama",
    name: "Ollama",
    category: "ai",
    language: "Go",
    description: "Make working with open models more accessible.",
    mark: "O",
    color: "#e2e8f0",
  },
  {
    repo: "huggingface/transformers",
    name: "Transformers",
    category: "ai",
    language: "Python",
    description: "Model tooling for the machine learning community.",
    mark: "H",
    color: "#fde047",
  },
  {
    repo: "vitest-dev/vitest",
    name: "Vitest",
    category: "testing",
    language: "TypeScript",
    description: "A fast test runner built for the Vite ecosystem.",
    mark: "V",
    color: "#bef264",
  },
  {
    repo: "microsoft/playwright",
    name: "Playwright",
    category: "testing",
    language: "TypeScript",
    description: "Reliable browser testing across modern platforms.",
    mark: "P",
    color: "#86efac",
  },
  {
    repo: "fastify/fastify",
    name: "Fastify",
    category: "backend",
    language: "JavaScript",
    description: "A developer-friendly web framework for Node.js.",
    mark: "F",
    color: "#cbd5e1",
  },
  {
    repo: "prisma/prisma",
    name: "Prisma",
    category: "backend",
    language: "TypeScript",
    description: "Tools that bring application code and data together.",
    mark: "P",
    color: "#93c5fd",
  },
  {
    repo: "docker/cli",
    name: "Docker CLI",
    category: "infra",
    language: "Go",
    description: "Improve the everyday container development workflow.",
    mark: "D",
    color: "#7dd3fc",
  },
  {
    repo: "kubernetes/kubernetes",
    name: "Kubernetes",
    category: "infra",
    language: "Go",
    description: "Explore the machinery behind container orchestration.",
    mark: "K",
    color: "#93c5fd",
  },
];
export type Project = (typeof projects)[number];
export type Profile = {
  username: string;
  skills: string[];
  interests: string[];
  kinds: string[];
  pace: string;
  discovery: string;
};
export const initialProfile: Profile = {
  username: "",
  skills: [],
  interests: [],
  kinds: ["bug"],
  pace: "quick",
  discovery: "familiar",
};
export function rankProjects(profile: Profile) {
  return projects
    .map((project) => {
      const interest = profile.interests.includes(project.category);
      const skill = profile.skills.includes(project.language);
      const score =
        Number(interest) * 3 +
        Number(skill) * (profile.discovery === "new" ? -1 : 2);
      return {
        ...project,
        score,
        reason: interest
          ? `Matches your interest in ${categories.find((c) => c.id === project.category)?.name.toLowerCase()}`
          : skill
            ? `Uses ${project.language}, one of your selected skills`
            : "An ecosystem to explore beyond your current selections",
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function rankIssues<T extends { labels: { name: string }[] }>(
  issues: T[],
  profile: Profile,
): T[] {
  const words: Record<string, string[]> = {
    bug: ["bug", "defect"],
    docs: ["doc", "example"],
    test: ["test", "coverage"],
    feature: ["feature", "enhancement"],
  };
  const score = (issue: T) => {
    const labels = issue.labels.map((label) => label.name.toLowerCase());
    const kindScore = profile.kinds.reduce(
      (total, kind) =>
        total +
        Number(
          labels.some((label) =>
            (words[kind] || []).some((word) => label.includes(word)),
          ),
        ),
      0,
    );
    return (
      kindScore * 2 +
      Number(
        profile.pace === "quick" &&
          labels.some((label) => label.includes("good first issue")),
      )
    );
  };
  return [...issues].sort((a, b) => score(b) - score(a));
}
