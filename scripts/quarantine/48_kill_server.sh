#!/usr/bin/env bash
set -e

echo "🚑 Liberando porta 3200..."

# Tenta encontrar o processo na porta 3200 e matá-lo
if command -v fuser &> /dev/null; then
    fuser -k 3200/tcp || true
    echo "✅ Processo morto via fuser."
elif command -v lsof &> /dev/null; then
    PID=$(lsof -t -i:3200 || true)
    if [ -n "$PID" ]; then
        kill -9 "$PID"
        echo "✅ Processo $PID morto via lsof."
    else
        echo "ℹ️ Nenhum processo encontrado na porta 3200."
    fi
else
    echo "⚠️ Não consegui detectar o processo automaticamente."
    echo "👉 Por favor, feche o terminal onde o 'pnpm start' está rodando."
fi

echo "👉 Agora o pipeline deve conseguir subir o servidor de teste."
