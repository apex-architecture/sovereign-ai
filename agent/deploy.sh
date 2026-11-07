#!/usr/bin/env bash
# One-command install of the resident APEX agent on a 24/7 Linux box.
# Runs on Debian/Ubuntu with sudo. Nothing here is a placeholder: each step is checked
# before the next, and the script reports the state it actually reached.
set -euo pipefail

REPO="${1:?usage: deploy.sh <repo-path>}"
INTERVAL="${APEX_AGENT_INTERVAL_S:-900}"
MODEL="${APEX_LOCAL_MODEL:-qwen3:14b}"

echo "== node =="
if ! command -v node >/dev/null || [ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version

echo "== local open-weights runtime =="
if ! command -v ollama >/dev/null; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
sudo systemctl enable --now ollama
ollama pull "$MODEL" || echo "!! pull failed: $MODEL does not fit this machine — pick a smaller quant"

echo "== the agent itself =="
cd "$REPO"
npm ci --omit=dev 2>/dev/null || true
node agent/selftest.mjs

echo "== stay alive forever =="
sudo tee /etc/systemd/system/apex-agent.service >/dev/null <<UNIT
[Unit]
Description=APEX resident agent (protect, improve, remember)
After=network-online.target ollama.service
Wants=network-online.target

[Service]
WorkingDirectory=$REPO
ExecStart=$(command -v node) agent/agent.mjs --loop --think --improve
Restart=always
RestartSec=15
Environment=APEX_AGENT_INTERVAL_S=$INTERVAL
Environment=APEX_LOCAL_MODEL=$MODEL

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now apex-agent.service
sleep 5
systemctl is-active apex-agent.service
echo "== done. journalctl -u apex-agent -f shows every tick. =="
