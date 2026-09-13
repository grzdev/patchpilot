# PatchPilot integration setup

## Your environment files

Keep keys private. The assistant must never read your environment files. No environment file was inspected or edited for this update. Place values yourself in `web/.env.local` for local development, then restart the development server. Local environment files do not configure the hosted preview; add the same variables through the host secret settings for deployment.

## GitHub sign-in

Create a GitHub OAuth App under Settings > Developer settings > OAuth Apps. The implementation uses authorization code + PKCE and an empty scope (public identity only). It does not request repository write permissions. GitHub access tokens are used transiently to read the public profile and are not persisted; a signed public identity cookie lasts 24 hours. This is profile authentication, not full persistent repository authorization.

Configure these variables yourself:

```dotenv
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret
AUTH_SESSION_SECRET=a_random_secret_of_at_least_32_characters
GITHUB_CALLBACK_URL=http://localhost:5173/api/auth/github/callback
```

For the hosted app, use this callback instead:

`https://patchpilot-grzdev.damilolaoyeniyi13.chatgpt.site/api/auth/github/callback`

Register the callback URLs you intend to use with GitHub. Use your matching local or hosted origin as the homepage URL. Generate the session secret locally, for example with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`; do not paste it into chat. The sign-in button shows a setup message until configuration is available.

GitHub documentation: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app and https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps

## Anakin: correct service for this competition

The Anakin Forge competition is hosted on **anakin.io**, not the similarly named anakin.ai service referenced in the original brainstorm.

- Competition: https://anakin.io/hackathon/anakin-forge
- Setup: https://anakin.io/docs/documentation/getting-started
- API example: https://anakin.io/docs/documentation/getting-started/curl
- Agentic Search: https://anakin.io/docs/api-reference/agentic-search

From your Anakin.io dashboard, obtain an API key (documented prefix `ak-`) and check which endpoints your credits enable. Add it privately:

```dotenv
ANAKIN_API_KEY=your_anakin_io_key
```

The documented API base is `https://api.anakin.io/v1`, authenticated server-side with `X-API-Key`. No Anakin.ai app ID or workflow ID is needed for these Anakin.io endpoints.

Proposed integration: Search / Agentic Search discovers related reports and ecosystem context; URL Scraper retrieves documentation; GitHub APIs verify issue and PR state; PatchPilot combines evidence into a personalized mission brief. A separate code-capable reasoning provider and isolated execution worker are still needed for reliable source-code diagnosis, patch generation, and tests. Anakin's documented research API is not a drop-in coding-model API.

This update does not call Anakin or consume credits. Adding the key alone does not activate AI reasoning; the adapter and workflow are the next implementation step. Do not share the key in chat. A public dashboard URL or redacted endpoint information is sufficient to clarify account setup.

## What changed in this iteration

- Six focused onboarding questions, one visible at a time, with exit/entry transitions and reduced-motion support.
- GitHub sign-in implementation alongside username import and manual setup.
- Fun & delightful UX ecosystem and fun & polish work preference.
- Explicit available-work-time question, with no claim of verified duration.
- Collapsible desktop sidebar and mobile drawer with reopen controls.
- Expanded project catalog, repository search, ecosystem/language filters, and profile-match toggle.
- Issue shortlist screens stale, assigned, unrelated, and known competing work. It checks up to eight candidates against at most 100 timeline entries each; failed checks are clearly marked. This is heuristic evidence screening, not AI source-code analysis.


## Source scanner prototype

Server configuration: `GEMINI_API_KEY` and `ANAKIN_API_KEY`. Optional `GEMINI_MODEL` overrides the default `gemini-2.5-flash`; choose a model available to your API project. Restart the dev server after changing configuration. Never expose these as NEXT_PUBLIC variables. The application consumes configuration normally; do not display environment files.

Sign in with GitHub, choose a repository, optionally enter a folder prefix, then click **Scan source code**. Scans retrieve public GitHub blobs at a pinned commit (up to 12 source + 4 test files, each <=14 KB, total <=75 KB). Gemini proposes candidates; exact source excerpts and output structure are validated. Existing issues/PRs are searched only afterwards for possible duplicates. Anakin supplies research references for the first candidate, not proof of correctness. No repository code runs. Empty results are valid. Copy a brief into Codex with the repository open for reproduction and implementation. Saved source investigations use a new browser storage key; legacy saved issue briefs remain in storage but are not shown in this source workflow.

The endpoint requires a signed GitHub session and same-origin POST. A process-local one-minute cooldown and in-flight guard limit accidental repeated calls; this is not a distributed production quota. Before public deployment, add persistent per-account budgets and a job queue for long scans. Current partial alphabetical file sampling is not whole-repository analysis. Free Gemini quota/model access may differ by project; provider errors are reported without exposing raw upstream responses or keys.


### Scan progress and request limits

The scan POST streams newline-delimited JSON: progress events, then one result or error. The UI displays actual retrieval, model review, citation validation, duplicate search and research stages. It never estimates model completion percentages. Failures identify PatchPilot, GitHub or Gemini and preserve safe retry hints. A failed scan releases the local guard immediately; successful scans have a 60-second cooldown. Active scans return 409 rather than being misreported as quota exhaustion. A provider 429 cannot be bypassed by this change: check the named provider's quota. The UI does not automatically repeat billable requests. After streaming starts, provider failures are error events inside the 200 response; preflight failures retain their HTTP status.


## Multiple code reviewers

Configure keys privately using `ORCA_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, or the existing `GEMINI_API_KEY`. Restart the development server after configuration changes. No extra dependencies are needed. The UI now selects a reviewer or compares up to three configured providers on identical source. Default order: Orca, Groq, OpenRouter, Gemini. Comparison prefers the first three. There is no silent cross-provider retry.

Orca uses explicit free IDs: `deepseek/deepseek-v4-flash-free`, `tencent/hy3-free`, `z-ai/glm-5.3-flash-free`. OpenRouter uses `openrouter/free` with zero prompt/completion price ceilings; returned model identity is shown when available. Orca's difficulty-based router is not used for the fixed-model comparison. Groq uses `openai/gpt-oss-120b`; Gemini respects `GEMINI_MODEL` (default `gemini-3.5-flash-lite`). Groq/Gemini billing depends on the account plan; keep their projects on free tiers. This application cannot turn a paid account into a free one.

When Groq participates, the complete-file sample has a 10,000-character cap to leave room within its token rate limit, with 2,048 maximum output tokens. Tokenization varies, so quotas can still reject a request. Other selections retain the 75,000-character cap. Comparisons show response time, citation-valid versus proposed findings and failures, not an unmeasured intelligence score. Overlapping candidates remain separately attributed. No results are marked reproduced. Provider integrations are verified with mocked responses; real account/model access still needs a signed-in scan.

References: https://docs.orcarouter.ai/introduction ; https://console.groq.com/docs/openai ; https://openrouter.ai/docs/quickstart


### AI response diagnostics

Every model/Anakin response handled by the provider adapter is recorded in `.logs/ai-responses.jsonl` relative to the server working directory (normally `web`). Includes request ID, provider/model, output allowance, HTTP status, duration and sanitized response body, including usage and finish reasons. Network failures are recorded too. Request prompts and headers are not recorded. Active request credentials and recognizable token patterns are redacted; returned source excerpts may remain. Logs are gitignored and rotate at 10 MB; rotated files remain local until manually removed. Hosted environments without writable files use server console output instead. Historical responses before this change cannot be recovered.

Non-Groq chat reviewers now have an 8,192-token allowance and retry once with 16,384 only on `finish_reason=length`. Groq retains its smaller budget. No paid-model switch occurs. Empty answers, filtering and malformed envelopes receive distinct errors; reasoning text is never substituted for a final answer.


## Current workflow: Groq and focused investigations

This section supersedes the earlier multi-provider setup. Only Groq is enabled for code review; Orca, OpenRouter, Gemini and comparison are rejected by the scan endpoint. Existing credentials are left untouched. Anakin remains a reference search provider.

Select an actual repository folder from the dropdown or type an exact file/folder path. Leading/trailing slashes are normalized and folder boundaries are respected. Markdown/MDX documentation is eligible. The scan remains a complete-file sample of at most 10,000 characters; root package.json can be included as framework context when small enough. Coverage separates selected-area files from supporting context. A full tree listing is metadata, not a full code review.

Findings display as collapsed cards. Expanded content includes code evidence, a verification plan, related-work checks, and deterministic PR title/description drafts derived from the finding. Drafts explicitly state implementation and tests are pending. No extra model request is used for PR text. Completed progress and model comparisons are hidden. Save appears after the results. Anakin cards display source title and domain, not raw scraped snippets; obvious error pages are omitted. Links remain unverified background context for the first finding.


### Review reliability update
Groq remains the primary reviewer. When `OPENROUTER_API_KEY` is configured,
a quota (429), network timeout, or upstream 5xx failure can move the same batch
to `openrouter/free`, with prompt/completion price capped at zero. Authentication,
invalid model configuration, and malformed responses do not trigger fallback.
Orca and Gemini are not automatically used. OpenRouter availability is established
by the actual request; having a key does not guarantee remaining quota.
See https://openrouter.ai/docs/guides/routing/routers/free-router.

The review queue runs one batch at a time with one waiting slot per server process.
Additional callers receive a retry hint. The cache lasts 15 minutes in memory.
Neither is shared across Worker instances or retained through restarts: a public
multi-instance launch still needs durable shared coordination (for example a
Durable Object). These changes do not remove provider quotas or guarantee latency.
Continuation pins the commit, folder and preferences and retains existing results
on failure. Save investigations before leaving the page; active progress is not
yet persisted across refreshes. Files over 10,000 bytes are excluded explicitly.
