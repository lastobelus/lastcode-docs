<script setup lang="ts">
import { withBase } from "vitepress";

import { features } from "../../data/featureRegistry";
</script>

<template>
  <div class="feature-index">
    <a v-for="feature in features" :key="feature.id" :href="withBase(feature.pagePath)">
      <strong>{{ feature.title }}</strong>
      <span>{{ feature.readmeSummary }}</span>
    </a>
  </div>
</template>
