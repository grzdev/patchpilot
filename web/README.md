# PatchPilot web app

React + TypeScript, running on the Vinext / Cloudflare Workers starter.

## Run locally

Requires Node.js 22.13+ (Node 24 recommended).

```sh
npm run install:ci
npm run dev
```

Open http://localhost:5173. If the Windows npm launcher fails, invoke the installed npm-cli.js with Node directly.

## Available today

- Manual onboarding or public GitHub username import; suggested languages are editable.
- Repository examples on profile cards, with saved preferences in browser storage.
- Curated project recommendations ranked by interests and languages.
- Live GitHub issue browsing, search, labels, and preference-based ordering.
- Evidence briefs with discussion, linked PR checks, contribution-guide links, and retrieval timestamps.
- Mission briefs saved in localStorage on the same browser and origin.

No AI provider or GitHub OAuth setup is required for this slice. Public API limits apply. Copy `.env.example` to `.env.local` and configure a server-side `GITHUB_TOKEN` for higher limits; never expose tokens in client variables.

## Validation

```sh
npm test
npx tsc --noEmit
npm run build
```

## Boundaries

The repository catalog is curated, not a live trending ranking. Profile inference inspects up to 100 recent public repositories and counts primary languages of non-forks; it is not a complete contribution history. Issue browsing reads up to 100 issue/PR entries, then removes PRs. Investigation reads the first 100 comments and timeline events. A missing linked PR is not proof that no competing work exists. A contribution guide is located, not analyzed. No source-code reasoning, automated fixes, test execution, or PR publication is implemented yet.

Next: add a reasoning-provider adapter, source/test retrieval, durable investigation jobs, and an isolated patch execution worker.
