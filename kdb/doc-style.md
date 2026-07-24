# Doc style — house style for design & architecture docs

Write design docs that are **short, diagram-led, and in plain English**. Brief beats thorough.
If a sentence only repeats what a diagram already shows, cut it.

Any agent writing a design doc, architecture doc, RFC, technical plan, or ADR follows this.
(This file is the source of truth and is fully self-contained — no external skill required. It mirrors the `design-doc-style` house style where that skill happens to be installed.)

## Section order
1. **Context** — what exists now, why we're changing it, permanent non-goals.
2. **Current State** — built vs. missing; cite real files; one architecture diagram.
3. **Goal State** — the target in one diagram + a few sentences.
4. **Assumptions & Locked Decisions** — settled vs. deferred (flag deferred, don't resolve silently).
5. **High-Level Design** — topology + main flows, one diagram each, light prose.
6. **Low-Level Design** — only the load-bearing mechanics (security, contracts, tricky sequences).
7. **Milestones** — each a shippable outcome with one "Done when…" test + size (S/M/L); show an M0→M1→… dependency diagram.
8. **Risks & Open Questions** — one-liners, not paragraphs.
9. **Long-Term Vision** — bullets, marked "rough / not committed."
10. **Appendix** — compact file/endpoint reference.

Drop a section only if the doc genuinely doesn't need it.

## Writing rules
- Simple English, short sentences, ~1–2 sentences per point.
- Lean on diagrams; bullets for lists; no walls of text.
- State locked vs. deferred decisions explicitly; never quietly reopen a locked one.
- Cite real files/endpoints so the doc stays grounded and greppable.
- When revising an existing doc, make small reviewable diffs.

## Mermaid rules (prevent broken renders)
- Prefer `flowchart` / `sequenceDiagram`; one idea per diagram.
- No semicolons inside a diagram (use commas). No angle brackets/HTML in node labels.
- Quote every node label: `id["Label"]`; use `<br/>` for line breaks.
- Pipe-form edge labels: `A -->|label| B`.
- Sanity-check: balanced `[] {} ""`, even `|`, no `;`.

## Avoid
- Restating a diagram in prose. A "phases" list with no exit tests. Long risk/vision paragraphs.
- Ungrounded claims with no file reference. Silently resolving a decision left open.
