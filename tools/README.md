# Tool registry

1118 tools, every one with its own upstream link.

- open-source with a real repository: **889**
- with a driver wired in the studio: **23**
- still `no-driver` (named honestly, not hidden): **1095**
- licence read against the actual text by a human: **0**

Regenerate with `npm run tools:registry`. Source of truth is `src/lib/apex/catalog/`; this file
is generated so the website and the code can never disagree about how many tools exist.

A row is not cleared for commercial use until a human has read its licence text. That is a rule in
`src/lib/apex/schema.ts`, not a habit.
