# Knowledge Base (kdb)

Everything an agent needs beyond the code, in one place. Two layers, kept small on purpose
(fat context files make agents worse — ETH Zurich, 2026).

- **Orientation** lives at the repo root in `AGENTS.md` (+ `CLAUDE.md`, which imports it) and
  the per-area role docs in `.github/agents/`. Root files stay at root so agents discover them.
- **Decisions** live here in `kdb/decisions/` — ADRs: durable, hard-to-reverse choices and why.

Rules of the road: read your area's ADRs on entry, don't re-litigate them, and record a new
ADR when you make an architectural decision. See `kdb/decisions/README.md`.
