# UI Refresh Audit

## Main Weaknesses
- The marketing site relies on several similar bordered-card patterns, so the page reads flat instead of art-directed.
- Hero, sections, and CTAs are visually competent but not strongly separated in hierarchy; the important actions do not dominate enough.
- Spacing is inconsistent across sections, which makes the page feel assembled from good blocks instead of designed as one system.
- The public site and app shell use different visual languages, so the product feels split between "marketing site" and "dashboard".
- Interactive states are present, but hover, focus, and transition treatment is too subtle to make the interface feel polished.
- Buttons, badges, and cards are functional but lack a consistent premium finish: radius, shadow, and border treatment vary too much.

## Visual Directions
- Editorial control room: dark, warm, high-trust, restrained orange accents, crisp hierarchy, premium depth.
- Bright ivory SaaS: lighter, airy, more open, with polished white surfaces and a softer accent system.
- Neon lab: high-contrast and experimental, with more vivid color and stronger motion.

## Chosen Direction
- Editorial control room.
- Reason: it fits the trace-debugger product, keeps the experience credible, and allows bright orange accents without turning the UI noisy.

## Implementation Focus
- Unify site and app tokens around the same warm accent system.
- Increase section rhythm and simplify repeated card treatment.
- Upgrade CTA visibility, hover states, and panel depth.
- Keep the existing content and flows, but make the composition feel deliberate.
