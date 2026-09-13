# PatchPilot Web App

The web frontend and API runtime for PatchPilot, built with React 19, TypeScript, Next.js, and Vinext.

For the full product overview, architecture diagram, feature guide, and screenshots, see the [Root README](../README.md).

---

## 🏃 Local Development

```sh
# Install dependencies
npm run install:ci

# Start development server on port 5173
npm run dev

# Run automated tests (40 tests passing)
npm test

# Build production bundle
npm run build
```

---

## 🔑 Environment Configuration

Create `web/.env.local` for local development. Never commit `.env` or `.env.local` files.

```dotenv
# Required for source code analysis
GROQ_API_KEY=your_groq_api_key

# Required for GitHub sign-in (OAuth with PKCE)
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret
AUTH_SESSION_SECRET=a_random_string_of_at_least_32_characters
GITHUB_CALLBACK_URL=http://localhost:5173/api/auth/github/callback

# Recommended: higher rate limit for GitHub API requests
GITHUB_TOKEN=your_personal_access_token

# Optional: research documentation and review fallback
ANAKIN_API_KEY=your_anakin_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

See [SETUP.md](SETUP.md) for detailed GitHub OAuth App and Anakin setup instructions.
