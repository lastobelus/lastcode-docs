---
title: Install LastCode
description: Build LastCode from source on Apple Silicon macOS and complete the first launch.
---

# Install LastCode

LastCode currently installs from source on Apple Silicon macOS. It does not publish ready-made
binaries. The app installs alongside T3 Code with separate application state and URL schemes.

## Before you start

You need:

- Git and a personal, writable GitHub fork of
  [`lastobelus/lastCode`](https://github.com/lastobelus/lastCode);
- an authenticated [GitHub CLI](https://cli.github.com/);
- [mise](https://mise.jdx.dev/), [Vite+](https://viteplus.dev/guide/), and
  [fzf](https://github.com/junegunn/fzf); and
- at least one provider CLI that is installed and authenticated on this Mac.

The writable fork matters. LastCode's local-nightly process pushes checkpoint and revision tags,
updates `lastcode/main`, and mirrors upstream `main`. Use an `origin` that this machine is allowed
to update.

## 1. Fork and clone LastCode

Fork the repository on GitHub. Clone your fork, switch to `lastcode/main`, and add T3 Code as the
upstream remote:

```sh
git clone git@github.com:YOUR_GITHUB_USER/LastCode.git ~/projects/lastCode
cd ~/projects/lastCode
git switch lastcode/main
git remote add upstream https://github.com/pingdotgg/t3code.git
```

## 2. Set up the local-nightly process

Run the guarded setup command from the checkout:

```sh
mise exec node@24.13.1 -- node scripts/lastcode-setup.mjs --enable-nightly-writes
```

The flag acknowledges the remote writes described above. Setup installs the workspace, creates a
separate automation checkout, starts the checkpoint process, and installs the `lastcode-*` helper
commands under `~/.local/bin`. Add that directory to `PATH` if needed.

To inspect the planned changes without applying them, add `--dry-run`.

## 3. Build and install the first app

Check that the checkpoint process has a ready revision:

```sh
lastcode-checkpoints --verbose
```

Then build and install it:

```sh
lastcode-build
lastcode-install
```

The build runs local CI and creates an ad-hoc-signed, non-notarized DMG. The installer validates
that DMG, installs `/Applications/LastCode.app`, and opens it. It does not replace T3 Code.

## 4. Complete the first launch

Open **Settings → LastCode**. You can import supported appearance, keyboard, and server settings
from T3 Code once; the two apps keep separate profiles afterwards.

Enable **Show and install local nightlies** if you want ready LastCode revisions to appear in the
update interface.

## If setup stops

Rerun the setup command after fixing the reported problem. A newly installed checkpoint service is
disabled if that setup run fails; an existing service is left alone.

The [complete setup guide](https://github.com/lastobelus/lastCode/blob/lastcode/main/docs/lastcode/setup.md)
covers service management, isolation details, and removal.

## Next steps

- [Run a resumable project action](/features/resumable-actions/)
- [Understand local nightlies](/explanation/local-nightlies/)
