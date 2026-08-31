---
featureId: local-nightly-updates
pageClass: feature-page
---

<FeatureHeader />

<CaptureMedia
  capture-id="local-nightly-updates"
  caption="The desktop update panel shows the selected revision, grouped changes, and local build progress."
/>

## Before you start

Use a packaged LastCode desktop app on Apple Silicon macOS. Complete the [source installation](/install/)
first, including its local-nightly setup and initial build.

## Turn on local nightlies

1. Open **Settings → LastCode**.
2. Enable **Show and install local nightlies**.
3. Return to the sidebar.

LastCode now checks the local repository for a newer checkpoint or revision. This setting is separate
from the T3 Code stable and nightly update tracks. Turning it off stops future checks and hides the local
updater. It does not delete builds or Git tags.

## Inspect and build an update

1. Select the update button in the sidebar when it shows a newer version.
2. Read **LastCode changes** and the grouped T3 Code nightly changes in the hover card.
3. Start the build.

The desktop runs local CI before it packages the selected revision. The sidebar shows the current phase
and an estimated percentage. You can leave the build running and return later. A macOS Keychain prompt
can pause the process until you answer it.

The build produces an ad-hoc-signed, non-notarized DMG on your Mac. LastCode does not download a hosted
LastCode binary.

## Install the completed build

1. Select the install state in the sidebar.
2. Confirm the replacement.

LastCode validates the selected DMG, prepares the replacement, and then quits the current app. The
installer replaces `/Applications/LastCode.app` and opens the requested version. If the final replacement
fails, the installer restores the previous app.

## Retry a failed update

A failed build leaves the installed app unchanged and turns the sidebar update state red. Open that state
to see the failed phase and error.

- Use **Copy details** for a short diagnostic summary.
- Read `~/.lastcode/local-updates/build.log` for complete build output.
- Read `~/.lastcode/local-updates/install.log` for installer output.
- Start the update again after you fix the reported problem.

The retained build files remain available for inspection. See the product repository's
[local-nightly operations guide](https://github.com/lastobelus/lastCode/blob/lastcode/main/docs/lastcode/local-nightly-updates.md)
for helper commands and service recovery.

## Limits

- The in-app workflow covers packaged Apple Silicon macOS builds.
- Builds run locally, one at a time, after you select an update.
- Public releases, notarized builds, Intel builds, remote builders, and automatic installation are outside
  this workflow.

## Related pages

- [How local nightlies work](/explanation/local-nightlies/)
- [Feature availability](/reference/feature-availability/)
