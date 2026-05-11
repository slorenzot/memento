---
version: alpha
name: Memento
description: Persistent memory system for AI coding agents. Monocromatic Ollama-inspired design language.
colors:
  primary: "#262626"
  secondary: "#737373"
  tertiary: "#a3a3a3"
  neutral: "#f5f5f5"
  background: "#ffffff"
  surface: "#fafafa"
  surface-hover: "#f5f5f5"
  surface-active: "#e5e5e5"
  border: "#e5e5e5"
  border-strong: "#d4d4d4"
  text-primary: "#171717"
  text-secondary: "#525252"
  text-tertiary: "#a3a3a3"
  accent: "#262626"
  accent-hover: "#000000"
  dark-background: "#0a0a0a"
  dark-surface: "#171717"
  dark-surface-hover: "#262626"
  dark-border: "#262626"
  dark-text-primary: "#f5f5f5"
  dark-text-secondary: "#a3a3a3"
  dark-accent: "#ffffff"
  error: "#dc2626"
  error-surface: "#fef2f2"
  error-text: "#991b1b"
typography:
  headline-xl:
    fontFamily: system-ui
    fontSize: 36px
    fontWeight: "600"
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline-lg:
    fontFamily: system-ui
    fontSize: 24px
    fontWeight: "500"
    lineHeight: 1.3
    letterSpacing: 0em
  headline-md:
    fontFamily: system-ui
    fontSize: 20px
    fontWeight: "500"
    lineHeight: 1.4
    letterSpacing: 0em
  body-lg:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.6
    letterSpacing: 0em
  body-md:
    fontFamily: system-ui
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.6
    letterSpacing: 0em
  body-sm:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 1.5
    letterSpacing: 0em
  label-md:
    fontFamily: system-ui
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 1
    letterSpacing: 0em
  label-caps:
    fontFamily: system-ui
    fontSize: 11px
    fontWeight: "500"
    lineHeight: 1
    letterSpacing: "0.05em"
  mono:
    fontFamily: ui-monospace
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 1.5
    letterSpacing: 0em
rounded:
  none: 0px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  "2xl": 24px
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  "3xl": 64px
  gutter: 24px
  page-padding: 24px
  container-max: "896px"
  sidebar-expanded: 240px
  sidebar-collapsed: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-active}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.secondary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.text-primary}"
  button-danger:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error-text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.lg}"
  card-hover:
    backgroundColor: "{colors.background}"
  card-dark:
    backgroundColor: "{colors.dark-surface}"
  badge:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-active:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
  input-field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  input-field-focus:
    backgroundColor: "{colors.background}"
  search-bar:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  search-bar-focus:
    backgroundColor: "{colors.background}"
  sidebar:
    backgroundColor: "{colors.background}"
    width: "{spacing.sidebar-expanded}"
  sidebar-collapsed:
    width: "{spacing.sidebar-collapsed}"
  sidebar-item:
    rounded: "{rounded.xl}"
    padding: "8px 12px"
    textColor: "{colors.secondary}"
    typography: "{typography.body-md}"
  sidebar-item-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.text-primary}"
  sidebar-item-active:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.text-primary}"
  stat-card:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  stat-value:
    textColor: "{colors.text-primary}"
    typography: "{typography.headline-xl}"
  stat-label:
    textColor: "{colors.secondary}"
    typography: "{typography.body-sm}"
  observation-card:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  observation-card-hover:
    backgroundColor: "{colors.background}"
  empty-state:
    textColor: "{colors.secondary}"
    typography: "{typography.body-lg}"
  error-boundary:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error-text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.lg}"
---

## Overview

Memento's visual identity is inspired by Ollama.com: a strictly **monocromatic** design language where black, white, and neutral grays form the entire palette. There are no accent colors. The aesthetic is "premium restraint" -- every element earns its place through typography weight, spacing rhythm, and subtle border contrast rather than color differentiation.

The UI targets developers and AI agents who value clarity over decoration. It should feel like a well-typeset document: readable, calm, and purposeful. Whitespace is generous. Borders are whispers. Interaction is understated.

**Visual references:** Ollama.com, Linear, Notion's cleaner pages.

**Core tension:** Information density without visual noise. Memento displays observations, sessions, and search results -- data-heavy content that must remain scannable through hierarchy and spacing alone.

## Colors

The palette is entirely neutral. Every surface, text element, and interactive state uses shades of black and white.

- **Primary (#262626):** Deep charcoal for primary buttons and active navigation. The "action" color.
- **Secondary (#737373):** Mid-gray for metadata, inactive states, and secondary text.
- **Tertiary (#a3a3a3):** Light gray for disabled elements and placeholders.
- **Neutral (#f5f5f5):** The subtle surface for badges, secondary buttons, and recessed areas. Functions as `bg-black/5` translucency in solid form.
- **Background (#ffffff):** Pure white page foundation. Never tinted.
- **Surface (#fafafa):** Raised areas like sidebar background, subtle containers.
- **Surface hover (#f5f5f5):** Hover states for interactive surfaces. Barely perceptible.
- **Surface active (#e5e5e5):** Active/pressed states. The darkest neutral surface.
- **Border (#e5e5e5):** Default borders. Subtle, never dominant.
- **Border strong (#d4d4d4):** Hover or focus borders. Slightly more visible.
- **Text primary (#171717):** Headlines, body text, key information. Near-black.
- **Text secondary (#525252):** Metadata, timestamps, secondary labels. Slightly darker than secondary for WCAG AA compliance.
- **Accent hover (#000000):** Button hover state. Pure black.
- **Error (#dc2626):** The single exception to monocromatic. Used only for destructive actions and validation errors. Never decorative.

**Dark mode** inverts the hierarchy: dark surfaces (#0a0a0a, #171717) become the foundation with light text (#f5f5f5, #a3a3a3) and white accent buttons.

**Observation type badges** are always gray. The 10 types (decision, bug, discovery, note, summary, learning, pattern, architecture, config, preference) are distinguished by text label only. No type gets a unique color.

## Typography

The type system uses a single font family -- the **system font stack** (`system-ui`) -- at four weight levels. This ensures zero font-loading overhead and native feel across all platforms.

- **Headlines (headline-xl, headline-lg, headline-md):** Medium weight (500-600) with tight letter-spacing at large sizes (-0.02em at 36px). Used for page titles and section headers. Communicates hierarchy through size alone.
- **Body (body-lg, body-md, body-sm):** Regular weight (400) with generous line-height (1.5-1.6). Readable at any length. The workhorse of the interface.
- **Labels (label-md, label-caps):** Medium weight (500) at small sizes. Used for badges, metadata keys, and UI controls. `label-caps` adds letter-spacing (0.05em) for uppercase contexts.
- **Mono:** `ui-monospace` for IDs, code snippets, and technical data. The only non-system font family.

Typographic hierarchy follows a strict rule: **no more than two font weights visible on any single screen**. Size and color (gray shade) carry the hierarchy.

## Layout & Spacing

The layout uses a **collapsible sidebar + main content** model with a centered header search bar.

- **Sidebar:** Expanded at 240px (icon + text) on desktop, collapses to 64px (icon only) via toggle. On mobile, it becomes an overlay.
- **Header:** Spans the main content area. Contains the page title (left), centered search bar (middle), and theme toggle (right). Height ~56px with a bottom border.
- **Main content:** Constrained to `max-width: 896px` with `24px` padding. Centered within the available space.
- **Responsive:** Desktop (>1024px) sidebar expanded. Tablet (768-1024px) sidebar collapsed. Mobile (<768px) sidebar overlay.

The spacing scale is a **strict 8px base unit** with a 4px half-step (`xs`) for micro-adjustments. Generous external spacing (`2xl: 48px`, `3xl: 64px`) between major sections. Tight internal spacing (`sm: 8px`, `md: 16px`) within components and groups.

Pages flow vertically. No horizontal scrolling. Cards and lists fill the content width. Stats use a 4-column grid on desktop, 2-column on tablet, single column on mobile.

## Elevation & Depth

Memento is **flat**. There are no drop shadows, no blur effects, no layered planes.

Visual hierarchy is achieved exclusively through:

1. **Border visibility:** Default borders are barely visible (#e5e5e5). Hover states darken slightly (#d4d4d4). This whisper-contrast creates "lift" without shadow.
2. **Background tint:** The sidebar uses `surface` (#fafafa) vs the main area's `background` (#ffffff). This subtle tonal shift separates zones.
3. **Typography weight:** Bold text "elevates" visually against regular-weight surroundings.

The only exception is the search bar, which uses a translucent `overlay` background (black at 5%) to recess it slightly from the page.

## Shapes

The shape language is **fully rounded**. Following Ollama.com, interactive elements use generous border radii:

- **Buttons and badges:** `rounded-full` (9999px). Pill-shaped.
- **Cards:** `rounded-2xl` (24px). Soft but not circular.
- **Input fields:** `rounded-xl` (16px). Approachable and modern.
- **Sidebar items:** `rounded-xl` (16px). Matches the card language.
- **Code blocks:** `rounded-lg` (12px). Slightly less rounded for technical content.

There are no sharp corners in the interface. The overall impression is soft, approachable, and polished.

## Components

### Buttons

Three button variants following the Ollama pattern:

- **Primary:** Solid charcoal background (#262626) with white text. Pill-shaped (`rounded-full`). Hover goes to pure black. Used for the single most important action per context (e.g., "New observation", "Save").
- **Secondary:** Translucent black background (5% opacity) with dark text. Pill-shaped. Hover increases to 10% opacity. Used for secondary actions (e.g., "Cancel", "Filter").
- **Ghost:** Transparent background, gray text. Rounded rectangle (`rounded-md`). Hover shows surface background. Used for tertiary actions, icon buttons, and navigation.

A **Danger** variant uses red-50 background with red-700 text for destructive actions (delete, purge). Never used for anything else.

### Cards

Cards are the primary content container. White background, subtle border (#e5e5e5), generous border-radius (24px), and 24px padding. On hover, the border darkens slightly -- the only interaction indicator.

**Observation cards** use a denser layout: 16px padding, showing the title (medium weight), a meta row (type badge + project + relative time), and a 2-line content preview in secondary gray.

**Stat cards** use larger padding (20px) with the value in headline-xl and the label in body-sm gray.

### Badges

All badges are monocromatic. Gray background (#f5f5f5), gray text (#737373), pill-shaped (`rounded-full`), small padding (2px 10px). The active/selected state inverts to charcoal background with white text.

Observation type badges (decision, bug, discovery, note, summary, learning, pattern, architecture, config, preference) all use the same gray style. Differentiation is text-only.

### Sidebar

Fixed left panel. White background with a right border. Contains:

1. **Logo area** at the top: Memento name or icon.
2. **Navigation items:** Dashboard, Observations, Search, Timeline, Sessions. Each with a lucide-react icon. Active item shows surface-hover background.
3. **Collapse toggle** at the bottom.

Expanded state shows icon + text label. Collapsed state shows icon only with a tooltip on hover.

### Search Bar

Centered in the header. Pill-shaped (`rounded-full`), translucent background (black at 5%), subtle border. The placeholder reads "Search observations...". Focus clears the background to white and strengthens the border.

Keyboard shortcut: `Cmd+K` (or `Ctrl+K`) focuses the search bar. `Enter` navigates to `/search?q=...`.

### Inputs

Text inputs, textareas, and selects share a common style: white background, neutral border (#e5e5e5), rounded-xl (16px), 10px vertical / 16px horizontal padding. Focus state strengthens the border. Error state switches to red border with red helper text.

The **type selector** for creating observations is a horizontal row of badges. Clicking one toggles it to the active state (charcoal bg, white text).

### Loading States

Skeleton loaders use `animated-pulse` with neutral-200 background (light mode) or neutral-700 (dark mode). Each skeleton mimics the shape of the content it replaces: stat cards get rectangular blocks, observation cards get multi-line blocks.

### Empty States

Centered text with secondary gray color. A heading ("No observations yet") and a subtitle ("Create your first observation to get started"). A primary button below to take action. No illustrations or icons.

### Error Boundaries

A centered card with the error message and a "Try again" secondary button. Minimal and text-driven.

## Do's and Don'ts

- **Do** use the system font stack exclusively. No custom web fonts.
- **Do** rely on typography weight and spacing for hierarchy, never color.
- **Do** keep all badges monocromatic. The 10 observation types are text-differentiated only.
- **Do** use `rounded-full` for all buttons and badges. This is the Ollama signature.
- **Do** maintain generous whitespace between sections (minimum 32px).
- **Do** use translucent backgrounds (`overlay`) for recessed elements like the search bar.
- **Do** follow the 8px spacing scale. All spacing values should be multiples of 4px.
- **Don't** add color accents for decoration. Red is only for destructive actions and errors.
- **Don't** use drop shadows or blur effects. The design is flat.
- **Don't** mix rounded and sharp corners. Everything uses rounded radii.
- **Don't** display more than two font weights on a single screen.
- **Don't** use colored badges for observation types. All types are gray.
- **Don't** exceed `max-width: 896px` for main content. Lines must stay readable.
- **Don't** use illustrations or decorative images in empty states. Text only.
