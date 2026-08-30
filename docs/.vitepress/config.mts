import { defineConfig } from "vitepress";

import "./data/featureEvidence";
import { featuredFeatures, getFeature } from "./data/featureRegistry";

const featureLinks = featuredFeatures.map(({ title, pagePath }) => ({
  text: title,
  link: pagePath,
}));

const referenceLinks = [
  { text: "Feature availability", link: "/reference/feature-availability/" },
  { text: "lastcode-thread", link: "/reference/lastcode-thread/" },
];

export default defineConfig({
  lang: "en-US",
  title: "LastCode",
  description: "Public documentation for LastCode.",
  base: "/lastcode-docs/",
  cleanUrls: true,
  lastUpdated: true,
  transformPageData(pageData) {
    const featureId = pageData.frontmatter.featureId;

    if (typeof featureId !== "string") {
      return;
    }

    const feature = getFeature(featureId);

    return {
      title: feature.title,
      description: feature.readmeSummary,
    };
  },
  head: [
    ["link", { rel: "icon", href: "/lastcode-docs/brand/favicon.ico", sizes: "any" }],
    [
      "link",
      {
        rel: "icon",
        href: "/lastcode-docs/brand/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        href: "/lastcode-docs/brand/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    [
      "link",
      {
        rel: "apple-touch-icon",
        href: "/lastcode-docs/brand/apple-touch-icon-180.png",
        sizes: "180x180",
      },
    ],
  ],
  themeConfig: {
    siteTitle: false,
    logo: {
      light: "/brand/wordmark-light.svg",
      dark: "/brand/wordmark-dark.svg",
      alt: "LastCode",
    },
    nav: [
      { text: "Install", link: "/install/" },
      { text: "Features", items: featureLinks },
      { text: "Understand", link: "/explanation/local-nightlies/" },
      { text: "Reference", items: referenceLinks },
    ],
    sidebar: [
      {
        text: "Start",
        items: [
          { text: "Overview", link: "/" },
          { text: "Install LastCode", link: "/install/" },
        ],
      },
      { text: "Features", items: featureLinks },
      {
        text: "Understand",
        items: [{ text: "How local nightlies work", link: "/explanation/local-nightlies/" }],
      },
      { text: "Reference", items: referenceLinks },
    ],
    outline: { level: [2, 3], label: "On this page" },
    search: { provider: "local" },
    editLink: {
      pattern: "https://github.com/lastobelus/lastcode-docs/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
    lastUpdated: { text: "Updated" },
    socialLinks: [{ icon: "github", link: "https://github.com/lastobelus/lastcode-docs" }],
  },
});
