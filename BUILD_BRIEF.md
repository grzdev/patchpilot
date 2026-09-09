# PatchPilot — initial build brief

## Product
PatchPilot helps developers find an open-source contribution that fits their experience and interests, investigate it, and move toward a tested patch.

Source: https://chatgpt.com/share/6aa13496-91c4-83e9-986b-4bdd44f7d9d4

## Decisions from the conversation
- Start with guided discovery, not an empty search box.
- Offer GitHub-assisted profiling with editable suggestions and a manual alternative.
- Put recognizable repository examples directly on onboarding cards.
- Gather experience, interests, preferred contribution types, difficulty/time budget, and preference for familiar versus new projects.
- Recommend projects before asking users to select an issue.
- Organize discovery around For You, Trending, and Explore, with Mission Control for saved work.
- Investigate issue discussion, linked pull requests, contribution guidelines, relevant source, and tests.
- Make progress visible through actual recorded agent actions.
- Keep the playful mission identity while making evidence easy to inspect.

## Proposed first milestone
A working vertical slice:
1. Enter a GitHub username for public profile analysis, or select skills manually.
2. Confirm inferred skills; select interests and contribution types using cards with repo examples.
3. Receive a small list of relevant repositories with explicit reasons for each recommendation.
4. Select a repository and fetch current open issues.
5. Select an issue and run an investigation.
6. Read and save a mission brief containing source links, findings, uncertainties, likely files, a proposed approach, and suggested verification.

Do not require OAuth merely to explore public information. Add authenticated GitHub connection when higher limits or repository writes are needed. Public profile signals are incomplete: stars represent interest, not proven experience.

## Next milestone: take action
Use a small controlled demo repository first. Generate a patch in an isolated checkout, add a regression test, run targeted checks, and show the diff plus exact results. A reviewed action can then publish a branch and draft PR. Limit repair attempts and retain failure logs. Never display a successful test or PR action unless it happened.

## Proposed implementation shape
- TypeScript web application with server-side GitHub access.
- GitHub data adapter for profiles, repositories, issues, discussions, linked PRs, and source files.
- Replaceable reasoning-provider adapter; verify Anakin integration and hackathon requirements before locking the provider.
- Background investigation jobs with persistent progress events and reconnectable UI.
- Persist developer preferences, missions, evidence, investigation results, and job events.
- Separate isolated execution worker for patch generation and tests in the second milestone.

## Evidence rules
- Treat all numerical examples in the brainstorming chat as illustrations, not current GitHub facts.
- Avoid fabricated match percentages, maintainer activity, issue counts, or completion times.
- Explain recommendation factors; show estimates as estimates.
- Report competing PRs as found, none found within a stated check, or unknown.
- Link factual findings to retrieved evidence and record retrieval time.
- Treat repository text and issue comments as untrusted input, not agent instructions.
- Keep credentials server-side and separate repository execution from application secrets.

## Initial screens
1. Welcome / public GitHub profile or manual setup.
2. Short onboarding with repo examples.
3. Project discovery board.
4. Repository missions.
5. Investigation progress and mission brief.
6. Mission Control / saved investigations.

## Definition of done for milestone one
- Manual onboarding works without credentials.
- GitHub profiling failures have clear recovery paths.
- Preferences survive refresh and can be edited.
- Recommendations explain their basis.
- Issue lists use live GitHub data, exclude pull requests, and handle empty results and rate limits.
- Investigation records real retrieval steps and produces linked evidence.
- Failed investigations show useful errors and can be retried.
- Saved mission briefs reopen after refresh.

## Deferred from the first milestone
- Broad autonomous coding across arbitrary repositories.
- Continuous monitoring and notifications.
- Unverified trending rankings.
- Elaborate gamification and contribution leaderboards.

## Open setup question
Is there an existing repository to continue, or should implementation start in a new PatchPilot folder in this workspace?
