#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Removendo import não utilizado em packages/analysis-agent/src/index.ts..."

# Remove a linha que contém "import { AgentResult }"
sed -i '/import { AgentResult }/d' packages/analysis-agent/src/index.ts

echo "[SUCCESS] Import removido. Pipeline deve ficar verde."
