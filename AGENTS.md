# Project instructions

- Never read, display, or search the contents of the user's environment files, including .env, .env.local, and other .env variants. Do not edit these files; the user manages credentials themselves.
- Give configuration instructions in SETUP.md or chat using placeholders. Do not ask the user to paste secrets into chat.
- Normal application runtime may consume environment configuration, but never log secrets or dump environment variables.
