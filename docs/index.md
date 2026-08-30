---
title: LastCode
description: Install LastCode and learn the features it adds for long-running agent work.
---

<script setup lang="ts">
import { readmeIntro } from "./.vitepress/data/featureRegistry";
</script>

# LastCode

<p>{{ readmeIntro }}</p>

LastCode is currently a source-build workflow for Apple Silicon macOS, not a public binary
release. Its added features are experimental and have not received the same review as the smaller
upstream surface.

## What LastCode adds

<FeatureIndex />

## Start here

- [Install LastCode](/install/) from a writable GitHub fork, then open the app for the first time.
- [Run a resumable project action](/features/resumable-actions/) without spending agent turns
  checking whether its command has finished.
- Check [feature availability](/reference/feature-availability/) before relying on a particular
  client surface.

For the smaller upstream feature set and its supported release path, use
[T3 Code](https://github.com/pingdotgg/t3code).
