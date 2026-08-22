Presentational, domain-agnostic building blocks — Button, Input, Card, Modal,
Table, Badge, etc.

These mirror the reusable components in the Figma design system (Hubert's
Sprint 0 deliverable). They must never import from `src/features/`, and they
must never hardcode a colour — read from the CSS variables in
`src/styles/tokens.css` so the palette can be dropped in later without
touching component code.
