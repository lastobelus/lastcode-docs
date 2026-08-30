<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";

import manifest from "../../../../capture/media.json" with { type: "json" };
import ThemePicture from "./ThemePicture.vue";

const props = defineProps<{ captureId: string; caption: string }>();
const recipe = computed(() => {
  const match = manifest.recipes.find(({ id }) => id === props.captureId);
  if (!match) throw new Error(`Unknown capture ID: ${props.captureId}`);
  return match;
});
const still = computed(() => recipe.value.outputs.find(({ type }) => type === "png"));
const poster = computed(() => recipe.value.outputs.find(({ type }) => type === "poster"));
const video = computed(() =>
  recipe.value.outputs.find(({ type }) => type === "webm" || type === "mp4"),
);
const mediaPath = (path: string) => withBase(path.replace(/^docs\/public/u, ""));
</script>

<template>
  <ThemePicture
    v-if="still?.record"
    :alt="still.alt ?? ''"
    :caption="caption"
    :dark="mediaPath(still.path)"
  />
  <figure v-else-if="video?.record && poster?.record" class="theme-picture">
    <video controls preload="metadata" :poster="mediaPath(poster.path)">
      <source :src="mediaPath(video.path)" :type="`video/${video.type}`" />
    </video>
    <figcaption>{{ caption }} {{ video.transcript }}</figcaption>
  </figure>
  <aside v-else class="capture-placeholder">
    <strong>Demonstration planned</strong>
    <span>{{ still?.alt ?? poster?.alt ?? caption }}</span>
  </aside>
</template>
