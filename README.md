# PatchPilot

Find your next open-source mission, investigate it with evidence, and work toward a tested patch.

## Start the app

The application lives in `web/`. With Node.js 24 installed:

```sh
cd web
npm run install:ci
npm run dev
```

Open http://localhost:5173.

## Current milestone

Onboarding with repository examples, public GitHub profile import, personalized project discovery, live issue browsing, evidence briefs, and saved missions are implemented. See [web/README.md](web/README.md) for setup, validation, and current limitations.

AI code investigation and isolated patch execution are the next milestone. See [BUILD_BRIEF.md](BUILD_BRIEF.md) for the initial product direction.
