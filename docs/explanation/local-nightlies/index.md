---
title: How local nightlies work
description: How LastCode follows T3 Code nightlies and produces local revisions.
---

# How local nightlies work

LastCode follows T3 Code nightlies without publishing a second set of binaries. It records source states
first and builds one only when you ask for it.

## A checkpoint follows an upstream nightly

Each T3 Code nightly can have one immutable LastCode checkpoint. The checkpoint contains that upstream
source plus the LastCode changes that still need to be carried downstream.

Checkpointing and packaging are separate. The local process can record every upstream nightly without
spending the time to build an app for each one.

## A revision records later LastCode work

LastCode can change before T3 Code publishes its next nightly. In that case, the process creates an ordered
revision of the current checkpoint. For example, revision `1072.1` comes after checkpoint `1072` and before
the next upstream nightly, `1073`.

This distinction lets the updater offer a LastCode fix as soon as its revision is ready. It does not need
to wait for another T3 Code nightly.

## The app builds the selected source locally

The checkpoint or revision identifies exact source. When you start an update, LastCode checks out that
source in an isolated build directory, runs local CI, and packages an ad-hoc-signed DMG. Completed output is
kept by version and source commit, so LastCode can reuse it without changing it.

The installer validates that exact DMG before it replaces the current app. No LastCode binary comes from a
hosted release channel.

## Release notes preserve both histories

The update panel separates LastCode changes from upstream T3 Code changes. Upstream work is grouped by the
nightly that introduced it. A later revision can therefore show new LastCode work even when the upstream
nightly number has not changed.

If the installed build lacks enough source metadata, the updater says that it cannot determine the LastCode
changes. It does not guess from commit titles.

## Related pages

- [Use local nightly updates](/features/local-nightly-updates/)
- [Install LastCode](/install/)
- [Feature availability](/reference/feature-availability/)
