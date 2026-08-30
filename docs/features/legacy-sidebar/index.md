---
featureId: legacy-sidebar
pageClass: feature-page
---

<FeatureHeader />

<CaptureMedia capture-id="workspace-overview" caption="The compact legacy sidebar keeps project, thread, status, annotation, and worktree context together." />

## Why it exists

The legacy sidebar keeps projects and their threads in one compact hierarchy. LastCode adds local
controls for fitting more rows while retaining status and environment context.

## Turn on the legacy sidebar

Open **Settings → General → Legacy features** and enable **Sidebar (legacy)**. You can also bind the
`sidebar.mode.toggle` command in **Settings → Keybindings**.

## Adjust its appearance

Open **Settings → LastCode → Appearance**:

- Set **Scale legacy sidebar** from 50% to 100%. The 75% mark is the compact reference point.
- Enable **Compact status indicators** to show only the colored dot; the full state remains in its
  tooltip.
- Turn off **Show worktree indicators** to hide the dedicated-worktree icon.
- Enable **Rounded project icons** if you want source icons clipped to rounded corners.

Desktop **View → Actual Size**, **Zoom In**, and **Zoom Out** still zoom the whole app and compose
with the sidebar-only scale.

## Set environment context

In **Settings → LastCode → Environments**, choose a color for the primary machine and each saved
remote environment. **Show local icon** controls whether the primary machine's Monitor icon appears
in thread cards and legacy rows. Remote environments use a Server icon.

## Recover an unsent draft

Drafts with typed but unsent content appear above **Projects** in the legacy sidebar. Select a draft
to return to its composer with its project and thread settings intact. Discard it only when you no
longer need the typed prompt.

## Related pages

- [Thread annotations](/features/thread-annotations/)
- [Resumable project actions](/features/resumable-actions/)
