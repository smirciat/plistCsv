#!/usr/bin/env bash
set -euo pipefail

input=$(cat)

python3 - <<'PY' "$input"
import json, sys, re

data = json.loads(sys.argv[1])
tool_input = data.get("tool_input") or {}
file_path = (
    tool_input.get("path")
    or tool_input.get("file_path")
    or tool_input.get("target_file")
    or ""
)

PROTECTED_PATTERNS = [
    (r"(^|/)server/config/local\.env\.js$", "local secrets file"),
    (r"(^|/)server/config/environment/development\.js$", "local development config"),
    (r"(^|/)server/firebase\.json$", "Firebase credentials"),
    (r"(^|/)\.env$", "environment secrets"),
    (r"(^|/)server/config/express\.js$", "Express bootstrap"),
    (r"(^|/)server/config/environment/production\.js$", "production config"),
    (r"\.sqlite$", "SQLite database file"),
    (r"(^|/)client/app/main/main\.controller\.js$", "CSV/PDF logbook logic"),
]

for pattern, label in PROTECTED_PATTERNS:
    if re.search(pattern, file_path):
        print(json.dumps({
            "permission": "ask",
            "user_message": f"Protected {label}: {file_path}. Confirm before allowing this edit.",
            "agent_message": f"Editing protected file ({label}). Keep changes minimal."
        }))
        sys.exit(0)

print(json.dumps({"permission": "allow"}))
PY
