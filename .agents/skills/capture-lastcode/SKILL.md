---
name: capture-lastcode
description: Create or update LastCode screenshots, posters, and short recordings from approved synthetic fixtures and deterministic recipes. Use for site media and the shared README panels. Do not use with live user data or for unapproved native capture.
---

# Capture LastCode

Create repeatable media against one named LastCode commit.

## Before capture

1. Read `AGENTS.md`.
2. Read and apply `../unslop/SKILL.md`.
3. Read and apply `../technical-writing/SKILL.md`.
4. For browser work, read `../playwright-cli/SKILL.md` and only the references needed for the task.
5. Read the recipe, the media manifest, and the docs evidence entry.

Use Playwright CLI through `npm exec -- playwright-cli` while authoring or debugging a recipe.
Do not install it globally.

## Data and environment

- Use the LastCode public-doc fixture command with an explicit product commit and a disposable output directory.
- Use only synthetic identities, paths, projects, threads, and events.
- Never read the live database, secrets, credentials, or pairing URLs.
- Use projections for a still image. Use normal product commands for a recording that changes state.
- Wait for explicit product signals. Do not use arbitrary sleeps.

The checked-in runner owns the disposable fixture and browser lifecycle:

```sh
npm run capture:install
npm run capture -- --lastcode-root /path/to/lastCode --commit <full-sha> --recipe <id> --appearance dark
npm run capture:validate
```

The named LastCode checkout must be clean and at `<full-sha>`. The recipe must be enabled in
`capture/media.json`. Run light separately only after that recipe enables it.

## Output

- Use Ocean. Dark output is required for the first release.
- Produce light output only when the recipe enables it.
- Keep locale, viewport, reduced motion, fonts, caret visibility, and fixture state deterministic.
- Write stable filenames. Replace the previous accepted output.
- Record the product commit, recipe hash, fixture version, tool versions, dimensions or duration, and content hash.
- Add alt text for an informative still. Give every recording a poster, controls, no autoplay, and a written sequence or transcript.
- Treat the media as a demonstration. Record verification separately.

Do not create mobile media until maintainer QA is available.

Use Cap only for an approved native recording. Ask before capture and before upload. Keep raw Cap projects out of Git.

## Keep it small

One machine runs captures. If a recipe or review process keeps finding coordination bugs, serialize the work or make the step manual. Do not add locks, queues, or a capture service.
