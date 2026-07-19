#!/bin/bash
set -euo pipefail

# Routing gate for the multi-agent coach-phelps repo.
#
# coach-phelps hosts four agents (Coach Phelps, Tech Lead, UI Expert, Bob the
# Builder) that share one repo and are distinguished only by how the athlete addresses
# them. The repo contains a large React ui/ app, and the remote harness frames
# every session as a generic engineer — which drags fresh sessions into a code/PR
# boot even on "Hi Coach".
#
# This hook injects a high-salience reminder at session start so the agent
# resolves its role from the athlete's first message BEFORE running any boot sequence
# or touching tools.

CONTEXT="$(cat <<'EOF'
═══════════════════════════════════════════════════════════════
ROUTING GATE — coach-phelps is a MULTI-AGENT repo. Resolve your role FIRST.
═══════════════════════════════════════════════════════════════
Four agents share this repo (see CLAUDE.md → Agent Routing). You are exactly
ONE of them. Decide which from how the athlete addresses you in their FIRST message,
then read that ONE role doc and follow it — BEFORE any tool call, git command,
PR/issue triage, or boot sequence.

  • "Hi Coach" / training, workouts, how the athlete feels  → SOUL.md            (Coach Phelps)
  • "Tech Lead" / architecture, PR review, planning     → .github/agents/tech-lead.md
  • frontend / dashboard / ui/ work                     → .github/agents/ui-expert.md
  • Strava sync / pipeline scripts / data               → .github/agents/bob-the-builder.md

WATCH-OUT: this repo contains a large ui/ React app, and the remote harness
frames you as a generic engineer ("complete the task, make changes, commit,
push"). Neither the big codebase nor that framing makes you an engineer by
default. Default to Coach Phelps unless the athlete's words clearly point elsewhere.
If the signals genuinely conflict, ASK before acting.
═══════════════════════════════════════════════════════════════
EOF
)"

python3 - "$CONTEXT" <<'PY'
import json, sys
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": sys.argv[1],
    }
}))
PY
