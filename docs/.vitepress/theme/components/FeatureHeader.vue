<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

import { featuresWithEvidence } from "../../data/featureEvidence";

const { frontmatter } = useData();
const feature = computed(() => {
  const match = featuresWithEvidence.find(({ id }) => id === frontmatter.value.featureId);
  if (!match) throw new Error(`Unknown feature ID: ${frontmatter.value.featureId}`);
  return match;
});

const clientLabel = (client: string) => (client === "web" ? "Web" : `${client[0]!.toUpperCase()}${client.slice(1)}`);
const supportedClients = computed(() => feature.value.supportedClients.map(clientLabel).join(", "));
const documentedClients = computed(() =>
  Object.entries(feature.value.evidence.clients)
    .filter(([, evidence]) => evidence.pageCoverage === "documented")
    .map(([client]) => clientLabel(client))
    .join(", "),
);
const verifiedClients = computed(() =>
  Object.entries(feature.value.evidence.clients)
    .filter(([, evidence]) => evidence.verificationMethod === "product-check")
    .map(([client]) => clientLabel(client))
    .join(", "),
);
const sourceReviewedClients = computed(() =>
  Object.entries(feature.value.evidence.clients)
    .filter(([, evidence]) => evidence.verificationMethod === "source-review")
    .map(([client]) => clientLabel(client))
    .join(", "),
);
const mobileWithheld = computed(
  () => feature.value.evidence.clients.mobile?.pageCoverage === "withheld",
);
</script>

<template>
  <h1>{{ feature.title }}</h1>
  <p class="feature-summary">{{ feature.readmeSummary }}</p>
  <aside class="availability-card" aria-label="Feature availability">
    <p><strong>Available:</strong> {{ supportedClients }}</p>
    <p><strong>Covered in this guide:</strong> {{ documentedClients || "Not yet documented" }}</p>
    <p>
      <strong>Verified for this release:</strong>
      {{ verifiedClients || "Not yet verified" }}
    </p>
    <p v-if="sourceReviewedClients">
      <strong>Checked against product source:</strong> {{ sourceReviewedClients }}
    </p>
    <p v-if="mobileWithheld" class="availability-note">
      Mobile instructions and media are withheld until maintainer QA is available.
    </p>
  </aside>
</template>
