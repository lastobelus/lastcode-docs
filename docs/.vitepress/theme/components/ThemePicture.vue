<script setup lang="ts">
import { computed } from "vue";
import { useData, withBase } from "vitepress";

const props = defineProps<{
  alt: string;
  caption?: string;
  dark: string;
  height?: number;
  light?: string;
  width?: number;
}>();

const { isDark } = useData();
const source = computed(() => withBase(isDark.value ? props.dark : (props.light ?? props.dark)));
</script>

<template>
  <figure class="theme-picture">
    <img
      :src="source"
      :alt="alt"
      :width="width"
      :height="height"
      decoding="async"
      loading="lazy"
    />
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
