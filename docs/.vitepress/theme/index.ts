import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";

import CaptureMedia from "./components/CaptureMedia.vue";
import FeatureHeader from "./components/FeatureHeader.vue";
import FeatureIndex from "./components/FeatureIndex.vue";
import ThemePicture from "./components/ThemePicture.vue";
import "./ocean.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("CaptureMedia", CaptureMedia);
    app.component("FeatureHeader", FeatureHeader);
    app.component("FeatureIndex", FeatureIndex);
    app.component("ThemePicture", ThemePicture);
  },
} satisfies Theme;
