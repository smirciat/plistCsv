#!/usr/bin/env bash
set -euo pipefail

input=$(cat)

python3 - <<'PY' "$input"
import json, sys, re

data = json.loads(sys.argv[1])
file_path = data.get("file_path") or data.get("path") or ""

SENSITIVE_PATTERNS = [
    r"(^|/)server/config/local\.env\.js$",
    r"(^|/)server/config/environment/development\.js$",
    r"(^|/)server/firebase\.json$",
    r"(^|/)\.env$",
    r"\.sqlite$",
]

for pattern in SENSITIVE_PATTERNS:
    if re.search(pattern, file_path):
        print(json.dumps({
            "permission": "ask",
            "user_message": f"Sensitive file: {file_path}. Approve only if you intend to share or edit secrets.",
            "agent_message": "This path may contain credentials or local-only config. Prefer *.sample.js templates when possible."
        }))
        sys.exit(0)

print(json.dumps({"permission": "allow"}))
PY
