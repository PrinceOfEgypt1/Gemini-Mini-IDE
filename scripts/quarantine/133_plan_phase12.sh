#!/usr/bin/env bash
set -e

echo "📚 [Docs] Formalizando o Planejamento da Fase 12 (UX & Segurança)..."

# ==============================================================================
# 1. Atualizar BACKLOG.md com os Detalhes das HUs
# Adicionamos as especificações completas ao final do documento
# ==============================================================================
BACKLOG="docs/BACKLOG.md"
echo "📝 Adicionando especificações detalhadas ao $BACKLOG..."

cat >> "$BACKLOG" <<EOF

---

## Detalhamento da Fase 12: Experiência do Usuário & Segurança

### 14.1 HU-Sec-API-Key-Handling-001 - Segurança no Tráfego da API Key
**Identificação**
- **ID:** HU-Sec-API-Key-Handling-001
- **Épico:** E-Hardening
- **Prioridade:** P0 (Crítica)
- **Sprint:** 12.1

**História de Usuário**
Como usuário consciente de segurança
Quero que minha API Key seja enviada de forma segura ao backend
Para garantir que ela não vaze em logs ou interceptações indevidas.

**Critérios de Aceite**
- [ ] O Frontend deve enviar a chave no Header \`Authorization: Bearer sk-...\`.
- [ ] O Backend deve ler a chave do header e usá-la apenas para instanciar o cliente LLM.
- [ ] O Backend deve ter filtros de log configurados para **nunca** escrever o conteúdo do header Authorization no terminal ou arquivos de log.

### 14.2 HU-UI-QuickStart-Revamp-020 - Refatoração do Quick Start
**Identificação**
- **ID:** HU-UI-QuickStart-Revamp-020
- **Épico:** E-UI-Explore
- **Prioridade:** P1
- **Sprint:** 12.1

**História de Usuário**
Como usuário iniciante
Quero que o botão Quick Start abra um guia de exemplos ou templates (ex: "Criar API", "Criar Frontend")
Para que eu não precise começar do zero ou configurar pastas antes de saber o que quero.

**Critérios de Aceite**
- [ ] Remover o link direto do botão "Quick Start" para o modal "Novo Projeto".
- [ ] O botão deve abrir uma galeria de "Prompt Templates" ou iniciar o Tour Guiado.

### 14.3 HU-UI-Explore-Tour-019 - Tour Guiado (Onboarding)
**Identificação**
- **ID:** HU-UI-Explore-Tour-019
- **Épico:** E-UI-Explore
- **Prioridade:** P1
- **Sprint:** 12.1

**História de Usuário**
Como usuário novo na Mini-IDE
Quero um tour interativo que destaque as principais áreas (Chat, Abas, Settings)
Para entender o fluxo de trabalho sem precisar ler documentação externa imediatamente.

**Critérios de Aceite**
- [ ] Ao abrir a aplicação pela primeira vez, perguntar se deseja fazer o tour.
- [ ] O tour deve destacar sequencialmente: 1. Chat (onde tudo começa), 2. Abas de Contexto (onde o plano aparece), 3. Settings (onde configura a IA).
- [ ] Deve haver um botão visível "Reiniciar Tour" na área de ajuda ou settings.

### 14.4 HU-Gov-User-Manual-001 - Manual do Usuário Didático
**Identificação**
- **ID:** HU-Gov-User-Manual-001
- **Épico:** E-Governança
- **Prioridade:** P1
- **Sprint:** 12.1

**História de Usuário**
Como usuário da ferramenta
Quero acessar um manual didático integrado ("Como funciona")
Para saber exatamente o que a ferramenta pode fazer e o que não pode.

**Critérios de Aceite**
- [ ] Criar uma aba ou modal "Ajuda/Manual" na interface.
- [ ] Explicar visualmente o fluxo: Conversa -> Plano -> Aprovação -> Código.
- [ ] Seção clara de "Limitações" (ex: tamanho de contexto, linguagens suportadas).

### 14.5 HU-UI-Settings-Models-021 - Expansão de Modelos LLM
**Identificação**
- **ID:** HU-UI-Settings-Models-021
- **Épico:** E-UI-Settings
- **Prioridade:** P2
- **Sprint:** 12.1

**História de Usuário**
Como usuário avançado
Quero selecionar entre uma lista maior de modelos (Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro)
Para utilizar a inteligência que melhor se adapta ao meu custo/benefício.

**Critérios de Aceite**
- [ ] Dropdown de modelos deve incluir: DeepSeek-V3, GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro.
- [ ] Permitir inserção de "Base URL" customizada (para suportar Ollama/LocalAI).

EOF

# ==============================================================================
# 2. Atualizar DEVELOPMENT.md com o Roadmap da Fase 12
# ==============================================================================
DEV_DOC="DEVELOPMENT.md"
echo "📝 Atualizando Roadmap no $DEV_DOC..."

# Adicionar o bloco da Fase 12 no Roadmap
cat >> "$DEV_DOC" <<EOF

### 🚧 Fase 12: Experiência do Usuário & Segurança (Em Andamento)
**Objetivo:** Polir a usabilidade para novos usuários e garantir segurança no tráfego de credenciais.
- **Planejamento (Sprint 12.1):**
    - [ ] **14.1** Segurança de API Key (Headers vs LocalStorage).
    - [ ] **14.2** Novo fluxo de Quick Start (Templates).
    - [ ] **14.3** Tour Guiado (Driver.js ou similar).
    - [ ] **14.4** Manual do Usuário integrado.
    - [ ] **14.5** Suporte a múltiplos modelos LLM.
EOF

echo "✅ Documentação de planejamento da Fase 12 concluída."
