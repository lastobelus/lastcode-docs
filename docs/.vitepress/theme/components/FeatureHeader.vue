<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

import { getFeature } from "../../data/featureRegistry";

const { frontmatter } = useData();
const feature = computed(() => getFeature(frontmatter.value.featureId));
</script>

<template>
  <h1>{{ feature.title }}</h1>
  <p class="feature-summary">{{ feature.readmeSummary }}</p>
</template>
