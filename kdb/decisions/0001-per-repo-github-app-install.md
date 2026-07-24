# 0001 — Each user's app can only touch their own repo

- **Status:** Accepted · 2026-07-24 · Tech Lead
- **Area:** cross-cutting
- **Context:** We're putting ~10 people on one shared website, each with their own private
  data in their own repo. Every request must read and write only that person's repo — never
  anyone else's. An earlier setup once accidentally gave one person access to another's data.
- **Decision:** Each user installs our GitHub App on just their own repo, and every request
  uses that user's own login — never one shared master key for everyone.
- **Why:** This makes it impossible, by design, for one user to reach another's data — so we
  never have to police it in code.
- **Rejected:** One shared master token → it can touch everyone's data, too risky. Matching
  users by app name only → caused the earlier leak; we now also match on the account.
