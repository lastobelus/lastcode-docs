# LastCode documentation

This repository owns the public LastCode site, its capture recipes, and its published media. Product code and maintainer documentation remain in `lastobelus/lastCode`.

## Required writing skills

Before any work in this repository, read and apply:

- `.agents/skills/unslop/SKILL.md`
- `.agents/skills/technical-writing/SKILL.md`

Every delegated agent must read both files before it writes, reviews, or changes anything. Include that requirement in the delegated task.

For public documentation, also read `.agents/skills/document-lastcode/SKILL.md`.

Use `.agents/skills/lastcode-docs-pr/SKILL.md` when you open, babysit, or merge a pull request for this repository.

For screenshots or recordings, also read:

- `.agents/skills/capture-lastcode/SKILL.md`
- `.agents/skills/playwright-cli/SKILL.md` when a browser is involved

## Repository boundaries

- Read product facts from the LastCode commit named by the current docs work.
- Treat `docs/lastcode/features.json` in LastCode as the source for feature titles, summaries, routes, supported clients, source paths, and capture IDs.
- Keep contributor, architecture, and operator documentation in LastCode.
- Do not add these skills or these instructions to a LastCode branch or a global agent directory.
- Keep product changes and docs changes in separate commits and repositories.

## Media

- Use only synthetic fixtures. Never capture a live database, credential, pairing URL, maintainer path, or real identity.
- Use the Ocean theme. Dark is required for the first release. Add light output only when the recipe enables it.
- Do not produce mobile media or mobile-specific instructions until maintainer QA is available.
- Treat a capture as a demonstration. It does not prove that a client was tested.
- Commit accepted PNG, WebM, and approved MP4 files. Do not commit raw Cap projects or generated site output.
- Use Cap only for a maintainer-approved native recording.

Run the project-local browser command as `npm exec -- playwright-cli`. Do not install Playwright CLI globally. The vendored Playwright skill describes the CLI, but this repository instruction overrides its global-install fallback.

The CLI and its skill have separate reviewed pins. Do not run `playwright-cli install --skills`, even if the CLI prints a version notice. Update the CLI through `package.json`. Update the skill through `npm run skills:update`.

## Keep the process small

One maintainer and one machine run this workflow. The project makes no uptime, reliability, or security guarantee.

When pull-request review repeatedly finds races or edge cases, remove state or automation before adding locks, queues, background services, or distributed coordination.

## Licenses

Read `LICENSE.md` before adding or moving content. Original site code uses MIT. Original public prose and media use CC BY 4.0. Copied assets and vendored skills keep their source licenses and notices.
