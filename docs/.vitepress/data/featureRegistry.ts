import registry from "./lastcode-features.json";

export const LASTCODE_FEATURE_REGISTRY_COMMIT =
  "ec892230127238e390b79d84636b622ac1f1af02";

export const features = registry.features;

export const featuredFeatures = registry.readme.featureIds.map((featureId) => {
  const feature = features.find(({ id }) => id === featureId);

  if (!feature) {
    throw new Error(`Unknown feature ID in the LastCode registry: ${featureId}`);
  }

  return feature;
});

export function getFeature(featureId: string) {
  const feature = features.find(({ id }) => id === featureId);

  if (!feature) {
    throw new Error(`Unknown LastCode feature ID: ${featureId}`);
  }

  return feature;
}
