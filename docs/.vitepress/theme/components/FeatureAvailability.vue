<script setup lang="ts">
import { withBase } from "vitepress";

import manifest from "../../../../capture/media.json" with { type: "json" };
import { featuresWithEvidence } from "../../data/featureEvidence";

const clients = ["desktop", "web", "mobile"] as const;
const clientLabel = (client: (typeof clients)[number]) =>
  client === "web" ? "Web" : `${client[0].toUpperCase()}${client.slice(1)}`;

function availability(feature: (typeof featuresWithEvidence)[number], client: (typeof clients)[number]) {
  if (!feature.supportedClients.includes(client)) return "Not available";

  const evidence = feature.evidence.clients[client];
  if (!evidence || evidence.pageCoverage !== "documented") {
    return "Available and not documented here";
  }
  if (evidence.verificationMethod === "product-check") return "Available and verified";
  return "Available and not yet verified";
}

function demonstration(feature: (typeof featuresWithEvidence)[number]) {
  const recipes = feature.captureRecipeIds
    .map((captureId) => manifest.recipes.find(({ id }) => id === captureId))
    .filter((recipe) => recipe !== undefined);
  const recorded = recipes.some((recipe) => recipe.outputs.some((output) => output.record));
  return recorded ? "Recorded" : recipes.length > 0 ? "Planned" : "None";
}
</script>

<template>
  <div class="availability-key" aria-label="Availability status definitions">
    <p><strong>Available and verified</strong> means a product check covered this client.</p>
    <p><strong>Available and not yet verified</strong> means the guide exists without a product check.</p>
    <p><strong>Available and not documented here</strong> means the product supports the client, but this site does not cover it.</p>
    <p><strong>Not available</strong> means the product registry does not list support.</p>
  </div>

  <div class="availability-table-wrap">
    <table class="availability-table">
      <caption>LastCode feature status by client</caption>
      <thead>
        <tr>
          <th scope="col">Feature</th>
          <th v-for="client in clients" :key="client" scope="col">{{ clientLabel(client) }}</th>
          <th scope="col">Demonstration</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="feature in featuresWithEvidence" :key="feature.id">
          <th scope="row"><a :href="withBase(feature.pagePath)">{{ feature.title }}</a></th>
          <td v-for="client in clients" :key="client">{{ availability(feature, client) }}</td>
          <td>{{ demonstration(feature) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
