#!/usr/bin/env bash
# Test script to simulate Hermes events relayed to Coucou Desktop HUD on http://127.0.0.1:4040

set -e

RELAY_URL="http://127.0.0.1:4040/api/hook"

echo "=== Coucou-Hermes Relay Test ==="
echo "Target: $RELAY_URL"
echo ""

echo "[1/5] Checking Relay Server Health..."
curl -s -f "http://127.0.0.1:4040/" || {
  echo "Error: Coucou HTTP relay is not running on port 4040."
  echo "Make sure coucou binary or 'npm run tauri dev' is running in windows."
  exit 1
}
echo " -> OK (Relay is active!)"
sleep 1

echo ""
echo "[2/5] Event: SessionStart (Hermes session initialized)"
curl -s -X POST "$RELAY_URL" \
  -H "Content-Type: application/json" \
  -d '{"hook_event_name": "SessionStart", "coucou_agent": "hermes", "cwd": "D:/KERJAAN/coucou-by-janfdev"}'
echo " -> Sent SessionStart"
sleep 1.5

echo ""
echo "[3/5] Event: UserPromptSubmit (Command from Telegram: 'Refactor tampilan header dan jalankan build')"
curl -s -X POST "$RELAY_URL" \
  -H "Content-Type: application/json" \
  -d '{"hook_event_name": "UserPromptSubmit", "coucou_agent": "hermes", "prompt": "Refactor tampilan header dan jalankan build"}'
echo " -> Sent UserPromptSubmit (Mochi enters thinking mode)"
sleep 2.5

echo ""
echo "[4/5] Event: PreToolUse (Hermes running terminal build tool)"
curl -s -X POST "$RELAY_URL" \
  -H "Content-Type: application/json" \
  -d '{"hook_event_name": "PreToolUse", "coucou_agent": "hermes", "tool_name": "Bash", "tool_input": {"command": "npm run build"}}'
echo " -> Sent PreToolUse (Mochi focuses on typing/working)"
sleep 3

echo ""
echo "[5/5] Event: Stop (Hermes finishes & sends completion notice)"
curl -s -X POST "$RELAY_URL" \
  -H "Content-Type: application/json" \
  -d '{"hook_event_name": "Stop", "coucou_agent": "hermes", "message": "Beres bro! Cek Telegram ya"}'
echo " -> Sent Stop (Mochi celebrates with heart eyes & speech bubble)"
echo ""
echo "=== Test Completed Successfully ==="
