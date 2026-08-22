# Features

One folder per business module, matching the modules in the PRD / Scrum board.
Each feature owns its own slice of the app and stays self-contained:

```
features/<module>/
├── api/          # apiFetch calls + TanStack Query hooks for this module
├── components/   # components used only by this module
└── index.ts      # the module's public surface (what routes import)
```

Rules of thumb:

- Routes (`src/routes/`) stay thin — they compose feature components, nothing more.
- A feature may import from `src/components/ui`, `src/lib`, `src/hooks`, `src/types`.
- A feature should **not** import from another feature's internals. If two
  modules need the same thing, promote it to `src/components/ui` or `src/lib`.

Sprint 1 fills in `communities/` and `members/`.
