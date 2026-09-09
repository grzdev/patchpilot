export const categories = [
  {
    id: "fun",
    name: "Fun & delightful UX",
    description:
      "Playful tools, creative canvases, and small details that make people smile.",
    examples: "Excalidraw · tldraw · Penpot · Bubble Tea",
    icon: "✺",
  },
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
    id: "polish",
    name: "Fun & polish",
    description:
      "A little whimsy with real UX value: shortcuts, empty states, motion, and delightful details.",
    examples: "Excalidraw · Hoppscotch · tldraw",
    icon: "✺",
  },
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
    repo: "excalidraw/excalidraw",
    name: "Excalidraw",
    category: "fun",
    language: "TypeScript",
    description: "A hand-drawn canvas for ideas and delightful interactions.",
    mark: "E",
    color: "#c2f970",
  },
  {
    repo: "tldraw/tldraw",
    name: "tldraw",
    category: "fun",
    language: "TypeScript",
    description:
      "An infinite canvas with plenty of interaction details to explore.",
    mark: "t",
    color: "#c2f970",
  },
  {
    repo: "penpot/penpot",
    name: "Penpot",
    category: "fun",
    language: "Clojure",
    description: "Open design tools for designers and developers.",
    mark: "P",
    color: "#c2f970",
  },
  {
    repo: "charmbracelet/bubbletea",
    name: "Bubble Tea",
    category: "fun",
    language: "Go",
    description: "Playful terminal interfaces with a practical purpose.",
    mark: "B",
    color: "#c2f970",
  },
  {
    repo: "hoppscotch/hoppscotch",
    name: "Hoppscotch",
    category: "fun",
    language: "TypeScript",
    description: "Make everyday API exploration feel smoother.",
    mark: "H",
    color: "#c2f970",
  },
  {
    repo: "xyflow/xyflow",
    name: "XYFlow",
    category: "fun",
    language: "TypeScript",
    description: "Node-based interfaces and interactive diagrams.",
    mark: "X",
    color: "#c2f970",
  },
  {
    repo: "pmndrs/react-three-fiber",
    name: "React Three Fiber",
    category: "fun",
    language: "TypeScript",
    description: "Build expressive 3D experiences with React.",
    mark: "R",
    color: "#c2f970",
  },
  {
    repo: "p5js/p5.js",
    name: "p5.js",
    category: "fun",
    language: "JavaScript",
    description: "Creative coding, playful sketches, and visual experiments.",
    mark: "p",
    color: "#c2f970",
  },
  {
    repo: "godotengine/godot",
    name: "Godot",
    category: "fun",
    language: "C++",
    description: "An open game engine with editor and usability work.",
    mark: "G",
    color: "#c2f970",
  },
  {
    repo: "shadcn-ui/ui",
    name: "shadcn/ui",
    category: "frontend",
    language: "TypeScript",
    description: "Practical interface components and accessible interactions.",
    mark: "s",
    color: "#93c5fd",
  },
  {
    repo: "radix-ui/primitives",
    name: "Radix Primitives",
    category: "frontend",
    language: "TypeScript",
    description: "Accessible foundations for polished interfaces.",
    mark: "R",
    color: "#93c5fd",
  },
  {
    repo: "sveltejs/svelte",
    name: "Svelte",
    category: "frontend",
    language: "TypeScript",
    description: "A different approach to building reactive interfaces.",
    mark: "S",
    color: "#93c5fd",
  },
  {
    repo: "withastro/astro",
    name: "Astro",
    category: "frontend",
    language: "TypeScript",
    description: "Content-focused sites and developer experience.",
    mark: "A",
    color: "#93c5fd",
  },
  {
    repo: "TanStack/query",
    name: "TanStack Query",
    category: "frontend",
    language: "TypeScript",
    description: "Async state, caching, and data-driven interfaces.",
    mark: "T",
    color: "#93c5fd",
  },
  {
    repo: "storybookjs/storybook",
    name: "Storybook",
    category: "frontend",
    language: "TypeScript",
    description: "Build and document interface components in isolation.",
    mark: "S",
    color: "#93c5fd",
  },
  {
    repo: "prettier/prettier",
    name: "Prettier",
    category: "tooling",
    language: "JavaScript",
    description: "Code formatting and consistent developer workflows.",
    mark: "P",
    color: "#93c5fd",
  },
  {
    repo: "biomejs/biome",
    name: "Biome",
    category: "tooling",
    language: "Rust",
    description: "Fast formatting and linting tools.",
    mark: "B",
    color: "#93c5fd",
  },
  {
    repo: "microsoft/vscode",
    name: "VS Code",
    category: "tooling",
    language: "TypeScript",
    description: "Editor workflows, accessibility, and interaction polish.",
    mark: "V",
    color: "#93c5fd",
  },
  {
    repo: "astral-sh/ruff",
    name: "Ruff",
    category: "tooling",
    language: "Rust",
    description: "Fast Python linting and formatting.",
    mark: "R",
    color: "#93c5fd",
  },
  {
    repo: "langchain-ai/langchain",
    name: "LangChain",
    category: "ai",
    language: "Python",
    description: "Language-model applications and integrations.",
    mark: "L",
    color: "#93c5fd",
  },
  {
    repo: "openai/openai-agents-python",
    name: "Agents SDK",
    category: "ai",
    language: "Python",
    description: "Agent tools, handoffs, and execution workflows.",
    mark: "A",
    color: "#93c5fd",
  },
  {
    repo: "testing-library/react-testing-library",
    name: "Testing Library",
    category: "testing",
    language: "JavaScript",
    description: "Test interfaces through the way people use them.",
    mark: "T",
    color: "#93c5fd",
  },
  {
    repo: "cypress-io/cypress",
    name: "Cypress",
    category: "testing",
    language: "TypeScript",
    description: "Browser tests and developer-friendly debugging.",
    mark: "C",
    color: "#93c5fd",
  },
  {
    repo: "supabase/supabase",
    name: "Supabase",
    category: "backend",
    language: "TypeScript",
    description: "Open application backend tools.",
    mark: "S",
    color: "#93c5fd",
  },
  {
    repo: "duckdb/duckdb",
    name: "DuckDB",
    category: "backend",
    language: "C++",
    description: "An analytical database with local-first workflows.",
    mark: "D",
    color: "#93c5fd",
  },
  {
    repo: "expressjs/express",
    name: "Express",
    category: "backend",
    language: "JavaScript",
    description: "Minimal web application building blocks.",
    mark: "E",
    color: "#93c5fd",
  },
  {
    repo: "traefik/traefik",
    name: "Traefik",
    category: "infra",
    language: "Go",
    description: "Routing and networking for services.",
    mark: "T",
    color: "#93c5fd",
  },
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
export function rankProjects(profile: Profile, catalog: Project[] = projects) {
  return catalog
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
