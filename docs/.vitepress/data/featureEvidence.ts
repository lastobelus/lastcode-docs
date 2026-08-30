import evidence from "../../evidence.json" with { type: "json" };
import registry from "./lastcode-features.json" with { type: "json" };
import { LASTCODE_FEATURE_REGISTRY_COMMIT } from "./featureRegistry.ts";

type Client = "desktop" | "mobile" | "web";

interface ClientEvidence {
  pageCoverage: "documented" | "stub" | "withheld";
  verificationMethod: "not-verified" | "product-check" | "source-review";
  checkedCommit: string;
  captureIds: string[];
}

interface DocsEvidence {
  schemaVersion: number;
  registryCommit: string;
  features: Record<string, { clients: Partial<Record<Client, ClientEvidence>> }>;
}

interface FeatureRegistry {
  features: Array<{
    id: string;
    supportedClients: Client[];
    captureRecipeIds: string[];
  }>;
}

export function joinFeatureEvidence(
  featureRegistry: FeatureRegistry,
  docsEvidence: DocsEvidence,
  registryCommit: string,
) {
  if (docsEvidence.schemaVersion !== 1) throw new Error("Unsupported docs evidence version.");
  if (docsEvidence.registryCommit !== registryCommit) {
    throw new Error("Docs evidence does not match the pinned LastCode registry commit.");
  }

  const registryIds = new Set(featureRegistry.features.map(({ id }) => id));
  const evidenceIds = new Set(Object.keys(docsEvidence.features));
  if (
    registryIds.size !== evidenceIds.size ||
    [...registryIds].some((featureId) => !evidenceIds.has(featureId))
  ) {
    throw new Error("Docs evidence must cover every registry feature exactly once.");
  }

  return featureRegistry.features.map((feature) => {
    const featureEvidence = docsEvidence.features[feature.id];
    if (!featureEvidence) throw new Error(`Missing docs evidence for ${feature.id}.`);
    const supportedClients = new Set(feature.supportedClients);
    const evidenceClients = new Set(Object.keys(featureEvidence.clients) as Client[]);
    if (
      supportedClients.size !== evidenceClients.size ||
      [...supportedClients].some((client) => !evidenceClients.has(client))
    ) {
      throw new Error(`Docs evidence clients do not match registry support for ${feature.id}.`);
    }
    const allowedCaptureIds = new Set(feature.captureRecipeIds);
    for (const [client, clientEvidence] of Object.entries(featureEvidence.clients) as Array<
      [Client, ClientEvidence]
    >) {
      if (!(["documented", "stub", "withheld"] as const).includes(clientEvidence.pageCoverage)) {
        throw new Error(`Evidence for ${feature.id}/${client} has invalid page coverage.`);
      }
      if (
        !(["not-verified", "product-check", "source-review"] as const).includes(
          clientEvidence.verificationMethod,
        )
      ) {
        throw new Error(`Evidence for ${feature.id}/${client} has an invalid verification method.`);
      }
      if (!/^[0-9a-f]{40}$/u.test(clientEvidence.checkedCommit)) {
        throw new Error(`Evidence for ${feature.id}/${client} needs a full checked commit.`);
      }
      if (clientEvidence.captureIds.some((captureId) => !allowedCaptureIds.has(captureId))) {
        throw new Error(`Evidence for ${feature.id}/${client} names an unknown capture ID.`);
      }
      if (client === "mobile" && clientEvidence.pageCoverage !== "withheld") {
        throw new Error(`Mobile evidence for ${feature.id} must remain withheld until QA.`);
      }
      if (clientEvidence.pageCoverage === "withheld" && clientEvidence.captureIds.length > 0) {
        throw new Error(`Withheld evidence for ${feature.id}/${client} cannot name captures.`);
      }
    }
    return { ...feature, evidence: featureEvidence };
  });
}

export const featuresWithEvidence = joinFeatureEvidence(
  registry as FeatureRegistry,
  evidence as DocsEvidence,
  LASTCODE_FEATURE_REGISTRY_COMMIT,
);
