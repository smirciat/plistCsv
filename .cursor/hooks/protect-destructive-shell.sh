#!/usr/bin/env bash
set -euo pipefail

input=$(cat)

python3 - <<'PY' "$input"
import json, sys, re

data = json.loads(sys.argv[1])
command = data.get("command") or ""

DENY_PATTERNS = [
    (r"git\s+push\s+.*--force", "Force push can overwrite remote history."),
    (r"git\s+reset\s+--hard", "Hard reset discards uncommitted work."),
    (r"git\s+clean\s+.*(-f|--force)", "git clean permanently deletes untracked files."),
    (r"rm\s+-rf\s+(/|\.\./|\*)", "Recursive delete of broad paths is blocked."),
    (r"drop\s+database", "DROP DATABASE is blocked."),
    (r"sequelize\.sync\s*\(\s*\{\s*force\s*:\s*true", "sequelize.sync({ force: true }) wipes tables."),
    (r"TRUNCATE\s+TABLE", "TRUNCATE TABLE is blocked."),
]

ASK_PATTERNS = [
    (r"git\s+push", "Pushing changes requires explicit approval."),
    (r"npm\s+publish", "Publishing packages requires explicit approval."),
]

for pattern, reason in DENY_PATTERNS:
    if re.search(pattern, command, re.IGNORECASE):
        print(json.dumps({
            "permission": "deny",
            "user_message": reason,
            "agent_message": f"Blocked destructive command: {command}"
        }))
        sys.exit(0)

for pattern, reason in ASK_PATTERNS:
    if re.search(pattern, command, re.IGNORECASE):
        print(json.dumps({
            "permission": "ask",
            "user_message": reason,
            "agent_message": f"Command needs approval: {command}"
        }))
        sys.exit(0)

print(json.dumps({"permission": "allow"}))
PY
