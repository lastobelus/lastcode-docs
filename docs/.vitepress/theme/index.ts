import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";

import FeatureHeader from "./components/FeatureHeader.vue";
import ThemePicture from "./components/ThemePicture.vue";
import "./ocean.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("FeatureHeader", FeatureHeader);
    app.component("ThemePicture", ThemePicture);
  },
} satisfies Theme;
