---
name: document-lastcode
description: Write or update public LastCode pages and README copy from the product registry and docs evidence. Use for installation, feature, usage, explanation, and reference content in lastcode-docs. Do not use for contributor or operator documentation in the LastCode product repository.
---

# Document LastCode

Write public documentation that matches one named LastCode commit.

## Before writing

1. Read `AGENTS.md`.
2. Read and apply `../unslop/SKILL.md`.
3. Read and apply `../technical-writing/SKILL.md`.
4. Read the LastCode feature registry at the commit named by the task.
5. Read only the product guides and source paths linked to the affected feature.

Choose one documentation mode for each page. Use a how-to for a task, reference for lookup facts, and explanation for a bounded design question.

## Product claims

- Generate titles, summaries, routes, and supported clients from the product registry.
- Do not copy registry-owned facts into authored prose.
- Join product support with the docs evidence file for availability wording.
- Say that a supported client is not yet verified when its docs evidence has no verification.
- Treat a screenshot or recording as a demonstration, not a test result.
- Do not infer support for another provider or client from shared code.
- Do not add mobile instructions or media until maintainer QA is available.

## Page content

Lead with what the feature lets the reader do. Keep limits next to the claim they qualify.

Use the approved page structure:

1. a short purpose statement;
2. availability generated from the registry and docs evidence;
3. the task or behavior;
4. one useful demonstration when the page needs one;
5. limits and recovery;
6. related pages.

Link to contributor or operator material in LastCode when a reader needs it. Do not copy that material into the public site.

## Finish

Run the repository checks that apply to the changed pages. Read the final page once for unsupported claims, stale client wording, broken links, and duplicated registry facts.
