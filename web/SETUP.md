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
