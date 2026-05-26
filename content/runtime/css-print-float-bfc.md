---
title: "CSS print layout: floats, BFC, and image containment"
date: 2026-05-25
tags:
  - css
  - print
  - layout
  - browser
status: published
pinned: true
---

`@media print` breaks several assumptions that hold in screen layout. Three interact badly when you mix a floated sidebar with article images.

## Float instead of grid for variable-height sidebars

CSS Grid stretches both columns to the same height. In a two-column print layout where the sidebar is shorter than the article, the grid leaves a blank column on subsequent pages — the sidebar column reserves space even when empty.

`float: right` on the sidebar solves this. The sidebar occupies only as much vertical space as its content; once it ends, the article expands to full width.

```css
@media print {
  .layout { display: block; }
  .sidebar { float: right; width: 6.5cm; margin-left: 0.5cm; }
  .article { padding: 0.5cm 0.4cm 0.5cm 0; }
}
```

`clear: both` is required on any element that must start below the float — otherwise it wraps around the sidebar at its natural document position.

## DOM order matters for floats

Unlike Grid (where `grid-column` overrides source order), floats respect DOM position. A sidebar that appears after the article in the DOM floats to the right starting at the end of the article, not at the top.

The sidebar must precede the article in the DOM. For screen Grid, explicit `grid-column` / `grid-row` assignments restore the visual order:

```css
.sidebar { grid-column: 2; grid-row: 1; }
.article { grid-column: 1; grid-row: 1; }
```

## `overflow: hidden` on a float sibling creates a permanent BFC

The obvious fix for images overflowing into the sidebar column is to add `overflow: hidden` to the article element, which creates a Block Formatting Context that shrinks it to avoid the float. This works — but the BFC persists for the entire article, so every page is rendered as if the sidebar is still present. The narrow column follows the article onto page 2 and beyond.

The correct fix: don't create a BFC on the article. Instead, constrain images directly with an explicit `max-width` that fits within the article column at its narrowest point (alongside the sidebar):

```css
@media print {
  figure {
    max-width: 10.5cm; /* page width − sidebar − margins */
    break-inside: avoid;
  }
  figure img {
    width: 100%;
    max-height: 9cm;
    height: auto;
  }
}
```

Images are then constrained by the figure's box, not by the article's BFC. On page 2, the figure is narrower than the full page but the article itself is not — an acceptable tradeoff.

## `background` on pseudo-elements does not print

Lines drawn via `background` on `::before` / `::after` pseudo-elements (a common pattern for decorative rules between flex items) are suppressed by default in print — browsers treat them as background graphics, which users typically disable.

Use `border-top` with `height: 0` instead:

```css
/* won't print */
.rule::before { content: ''; flex: 1; height: 1px; background: black; }

/* prints reliably */
.rule::before { content: ''; flex: 1; height: 0; border-top: 1px solid black; }
```

## Grayscale images

```css
@media print {
  img { filter: grayscale(100%); }
}
```

One line. Color is preserved on screen; print output is monochrome. No build-time conversion needed.
