#!/usr/bin/env bash
#===============================================================================
# 🔪 KILL ZOMBIE & DIAGNOSE
# Mata QUALQUER coisa na porta 5173 e diagnostica o problema
#===============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔍 DIAGNÓSTICO COMPLETO${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

#===============================================================================
# FASE 1: Descobrir O QUE está na porta 5173
#===============================================================================
echo -e "\n${YELLOW}▶ FASE 1: O que está rodando na porta 5173?${NC}"

echo -e "\n${BLUE}[lsof -i :5173]${NC}"
lsof -i :5173 2>/dev/null || echo "Nada encontrado com lsof"

echo -e "\n${BLUE}[netstat -tlnp | grep 5173]${NC}"
netstat -tlnp 2>/dev/null | grep 5173 || echo "Nada encontrado com netstat"

echo -e "\n${BLUE}[ss -tlnp | grep 5173]${NC}"
ss -tlnp 2>/dev/null | grep 5173 || echo "Nada encontrado com ss"

#===============================================================================
# FASE 2: Listar TODOS os processos Node/Vite
#===============================================================================
echo -e "\n${YELLOW}▶ FASE 2: Processos Node/Vite ativos${NC}"

echo -e "\n${BLUE}[Processos Node]${NC}"
ps aux | grep -E "node|vite|esbuild" | grep -v grep || echo "Nenhum processo Node encontrado"

#===============================================================================
# FASE 3: MATAR TUDO relacionado a Node/Vite na porta 5173
#===============================================================================
echo -e "\n${YELLOW}▶ FASE 3: Exterminando processos${NC}"

# Método 1: lsof
echo -e "${BLUE}Método 1: lsof...${NC}"
PIDS=$(lsof -ti:5173 2>/dev/null || true)
if [[ -n "$PIDS" ]]; then
    echo -e "PIDs encontrados: $PIDS"
    echo "$PIDS" | xargs -r kill -9 2>/dev/null || true
    echo -e "${GREEN}Mortos via lsof${NC}"
else
    echo "Nenhum PID via lsof"
fi

# Método 2: fuser
echo -e "${BLUE}Método 2: fuser...${NC}"
fuser -k 5173/tcp 2>/dev/null || echo "fuser não encontrou nada"

# Método 3: pkill agressivo
echo -e "${BLUE}Método 3: pkill...${NC}"
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "node.*5173" 2>/dev/null || true
pkill -9 -f "esbuild" 2>/dev/null || true

# Aguardar
sleep 3

# Verificar se limpou
echo -e "\n${BLUE}Verificando se porta está livre...${NC}"
if lsof -ti:5173 &>/dev/null; then
    echo -e "${RED}⚠️  PORTA AINDA OCUPADA!${NC}"
    lsof -i :5173
    
    echo -e "\n${YELLOW}Tentando força bruta com SIGKILL...${NC}"
    lsof -ti:5173 | xargs -r kill -9 2>/dev/null || true
    sleep 2
else
    echo -e "${GREEN}✓ Porta 5173 está LIVRE${NC}"
fi

#===============================================================================
# FASE 4: Verificar ONDE está o App.tsx e qual versão
#===============================================================================
echo -e "\n${YELLOW}▶ FASE 4: Verificando arquivos App.tsx${NC}"

# Encontrar TODOS os App.tsx no projeto
echo -e "\n${BLUE}Todos os App.tsx no projeto:${NC}"
find ~/workspace/Gemini-Mini-IDE -name "App.tsx" -type f 2>/dev/null | while read -r file; do
    echo -e "\n${CYAN}📄 $file${NC}"
    # Mostrar a linha com versão
    grep -n "v[0-9]\." "$file" 2>/dev/null | head -3 || echo "  (sem versão encontrada)"
    # Mostrar primeiras linhas
    echo "  Primeiras linhas:"
    head -5 "$file" | sed 's/^/    /'
done

# Verificar o App.tsx principal
MAIN_APP="$HOME/workspace/Gemini-Mini-IDE/packages/ui/src/App.tsx"
echo -e "\n${BLUE}Conteúdo do App.tsx principal ($MAIN_APP):${NC}"
if [[ -f "$MAIN_APP" ]]; then
    echo "--- Linhas 1-30 ---"
    head -30 "$MAIN_APP"
    echo ""
    echo "--- Busca por versão ---"
    grep -n "v[0-9]" "$MAIN_APP" || echo "Nenhuma versão encontrada"
else
    echo -e "${RED}ARQUIVO NÃO EXISTE!${NC}"
fi

#===============================================================================
# FASE 5: Verificar se há múltiplos index.html
#===============================================================================
echo -e "\n${YELLOW}▶ FASE 5: Verificando index.html${NC}"

find ~/workspace/Gemini-Mini-IDE/packages/ui -name "index.html" -type f 2>/dev/null | while read -r file; do
    echo -e "\n${CYAN}📄 $file${NC}"
    cat "$file"
done

#===============================================================================
# RESULTADO
#===============================================================================
echo -e "\n${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Diagnóstico completo.${NC}"
echo -e ""
echo -e "Agora execute:"
echo -e "  ${YELLOW}cd ~/workspace/Gemini-Mini-IDE/packages/ui${NC}"
echo -e "  ${YELLOW}pnpm dev${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
