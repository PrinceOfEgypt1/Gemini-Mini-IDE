#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/300_audit_last_run.sh
# Objetivo: Auditar a última geração para identificar a causa da falha (LLM vs Parser)
# Autor: Mini-IDE Agent
# ------------------------------------------------------------------------------

echo "🕵️  INICIANDO AUDITORIA FORENSE..."

# 1. Encontrar o bundle mais recente
LATEST_BUNDLE=$(find packages/server/bundles -name "*.json" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")

if [ -z "$LATEST_BUNDLE" ]; then
  echo "❌ Nenhum bundle encontrado. Certifique-se de ter gerado um projeto."
  exit 1
fi

echo "📂 Arquivo de Auditoria: $LATEST_BUNDLE"
echo "---------------------------------------------------"

# 2. Verificar arquivos extraídos (O que o sistema 'acha' que existe)
echo "📂 ARQUIVOS RECONHECIDOS PELO SISTEMA:"
jq -r '.engine.files[].path' "$LATEST_BUNDLE" || echo "❌ Falha ao ler lista de arquivos."

echo "---------------------------------------------------"

# 3. Verificar trecho da resposta bruta da Engine (O que a IA realmente disse)
# Vamos pegar os primeiros 2000 caracteres da resposta da persona Engine para ver se ela tentou gerar código
echo "🧠 RESPOSTA BRUTA DA PERSONA ENGINE (Trecho):"
jq -r '.personas.engine.content' "$LATEST_BUNDLE" | head -c 2000
echo "..."
echo "---------------------------------------------------"

# 4. Diagnóstico Automático
FILE_COUNT=$(jq '.engine.files | length' "$LATEST_BUNDLE")

if [ "$FILE_COUNT" -lt 3 ]; then
  echo "🚨 ALERTA CRÍTICO: Apenas $FILE_COUNT arquivos foram gerados."
  echo "   Hipótese A: O Parser regex falhou em identificar os blocos de código."
  echo "   Hipótese B: A IA gerou tudo em um único arquivo (ex: HTML com script embutido)."
  echo "   Hipótese C: A IA alucinou e não gerou código."
else
  echo "✅ Quantidade de arquivos parece normal ($FILE_COUNT). O problema pode ser no Frontend."
fi
