#!/usr/bin/env bash
set -e

echo "📚 [Docs] Gerando Dossiê do Projeto (Snapshot v0.15.0)..."

# Garante que a pasta docs existe
mkdir -p docs

# Escreve o arquivo DOSSIE-MINI-IDE.md
cat > docs/DOSSIE-MINI-IDE.md <<'EOF'
# 📂 Dossiê do Projeto: Mini-IDE (AI-Powered Software Engineer)

**Versão do Relatório:** 1.0  
**Data de Corte:** 24/11/2025 (Fim da Fase 14)  
**Status Global:** ~95% do Core Funcional / 85% da Visão Completa de Produto  
**Versão do Software:** v0.15.0

---

## 1. Contexto inicial e objetivo do projeto

### O Problema
O desenvolvimento de software moderno envolve muita configuração inicial (boilerplate), tradução de requisitos vagos em especificações técnicas e configuração de ambientes. Desenvolvedores perdem horas configurando *tooling* antes de escrever a primeira linha de lógica de negócio.

### Visão do Produto
A **Mini-IDE** é um "Agente de Engenharia de Software em uma Caixa".
*   **Missão:** Transformar uma ideia em linguagem natural (ex: "Quero uma calculadora") em um projeto de software completo, testado e documentado, pronto para download, em questão de segundos.
*   **Diferencial:** Não é apenas um chat que cospe código. É uma simulação de um time completo (Produto, Arquiteto, Dev, QA, DevOps) trabalhando em harmonia.

### Critérios de Sucesso
1.  O usuário descreve um projeto em uma frase.
2.  O sistema gera especificações (HUs), código, testes e documentação.
3.  O usuário consegue baixar um arquivo `.zip` funcional.
4.  Todo o processo ocorre sem quebras técnicas visíveis (Pipeline Verde).

---

## 2. Escopo e planejamento inicial

### Funcionalidades Previstas (Macro)
1.  **Motor de Inteligência:** Orquestração de Personas (Análise -> Código -> Teste).
2.  **Backend API:** Servidor para gerenciar requisições e processamento.
3.  **Interface Exploratória:** UI amigável para chat e visualização de planos.
4.  **Sistema de Consolidação:** Transformação de JSON em arquivos físicos.
5.  **Exportação:** Entrega do resultado em ZIP.

### Metodologia
Adotamos uma abordagem **Iterativa e Incremental (Fases)**, com governança rigorosa:
*   **Fases 1-10:** Infraestrutura e Lógica (Backend First).
*   **Fases 11-14:** Integração, UI e Segurança.
*   **Fases 15+:** Visualização e Persistência.

O trabalho foi guiado por **Histórias de Usuário (HUs)** estritas e um **Pipeline de CI Local** (`42_pipeline_checklist.sh`) que impede o avanço se houver qualquer erro.

---

## 3. Decisões de arquitetura e stack tecnológica

### Stack Tecnológica
*   **Monorepo (PNPM Workspaces):** Escolhido para gerenciar múltiplos pacotes (`ui`, `server`, `analysis-agent`, `shared`) em um único repositório, garantindo consistência de tipos.
*   **Backend:** Node.js + **Fastify**. Escolhido pela performance e tipagem superior ao Express.
*   **Frontend:** React + Vite + **Tailwind CSS**. Foco em velocidade de desenvolvimento e modernidade visual.
*   **IA:** OpenAI SDK (compatível com DeepSeek/Grok). Agnosticismo de provedor foi um requisito chave.
*   **Linguagem:** **TypeScript** (Strict Mode). Obrigatório para garantir contratos robustos entre as camadas.

### Decisões de Qualidade
*   **Zero Warnings Policy:** O projeto não compila se houver um único warning de Lint.
*   **Testes Automatizados:** Vitest para testes unitários rápidos.
*   **Zod:** Validação de schemas em tempo de execução (Input/Output da IA).
*   **Governança via Script:** O script `42_pipeline_checklist.sh` atua como um "Gatekeeper" implacável antes de qualquer commit.

---

## 4. Linha do tempo dos principais marcos

### Fase 1 a 4 – Bootstrapping e Fundações
*   Criação do Monorepo e configuração do TypeScript compartilhado.
*   Criação do "Cérebro" (Analysis Agent) rodando inicialmente com Mocks.
*   **Desafio:** Configuração inicial do ESLint em monorepo (conflitos de versão resolvidos com limpeza de dependências).

### Fase 5 a 9 – Construção do Core e UI
*   Implementação da UI baseada em wireframes.
*   Definição das 8 Personas de IA (Analista, Arquiteto, etc.).
*   Criação do sistema de "Discovery Notes" (Regex local) para entender intenções do usuário.

### Fase 10 – O "Inferno das Dependências" (Crise e Resolução)
*   Momento crítico onde a adição de bibliotecas quebrou o build do servidor.
*   **Solução:** Auditoria profunda, remoção de dependências conflitantes (Express vs Fastify) e padronização dos `package.json` usando `exports` modernos do Node.js.
*   Resultado: Recuperação total da integridade do ambiente.

### Fase 11 a 14 – Integração Real e Polimento (Aceleração)
*   **Fase 11:** Implementação do Consolidador e Exportação ZIP.
*   **Fase 12:** Refatoração completa de UX (Tour, Manual, Templates) e Segurança (API Key via Headers).
*   **Fase 13:** Implementação de Temas (Dark/Light) globais.
*   **Fase 14:** **"O Despertar"**. Remoção dos Mocks. Conexão real com GPT-4. O sistema passou a gerar código de verdade.
*   **Desafio Final:** Erros de CORS e Processos Zumbis (porta 3200 presa). Resolvido com configuração permissiva de CORS e scripts de *kill* robustos.

---

## 5. Status atual: ~95% do Core (Funcional)

### ✅ O que já está pronto (Done)
*   **Fluxo Completo:** Chat -> IA -> Geração de Código -> Download ZIP.
*   **Segurança:** API Keys trafegam criptografadas (HTTPS/Headers) e não são logadas.
*   **Integração IA:** Suporte a múltiplos modelos (OpenAI, DeepSeek, Ollama, etc.).
*   **UX Profissional:** Temas, Onboarding (Tour), Manual integrado, Galeria de Templates.
*   **Backend:** Robusto, com validação Zod e tratamento de erros.

### 🚧 O que está parcialmente pronto (WIP - Fase 15)
*   **Visualização na UI:** O código é gerado e baixado corretamente, mas a árvore de arquivos (`Sidebar`) e o conteúdo (`Tabs`) na tela ainda mostram dados estáticos ("Em breve"). O usuário precisa baixar o ZIP para ver o resultado.

### 📅 O que ainda falta (15% da Visão Completa)
*   **Persistência Real:** Banco de dados para salvar histórico de projetos (hoje é memória volátil).
*   **Deploy:** Dockerização para rodar em qualquer lugar.

---

## 6. Mudanças de escopo e replanejamento

*   **Refatoração do Épico 14:** Inicialmente um épico "cronológico", foi desmontado e suas HUs distribuídas por temas (Segurança, Backend, UI) para manter a organização semântica do Backlog.
*   **Inclusão de UX/Segurança:** A Fase 12 não existia no plano original. Foi inserida para resolver a falta de segurança no manuseio de chaves e a dificuldade de uso para iniciantes.
*   **Adoção do Fastify:** Inicialmente cogitou-se Express, mas migramos para Fastify por performance e modernidade, exigindo uma reescrita dos scripts de inicialização.

---

## 7. Qualidade, métricas e saúde do projeto

*   **Saúde do Pipeline:** 🟢 **100% Verde**.
    *   Lint: 0 Errors, 0 Warnings.
    *   Typecheck: Strict Mode on.
    *   Tests: Passando em todos os pacotes.
    *   Smoke Test: Servidor sobe e responde em < 2s.
*   **Cobertura:** Alta cobertura nos serviços críticos (`ConsolidatorService`, `AnalysisAgent`).
*   **Dívida Técnica:** Baixíssima. Código morto foi removido ativamente (ex: `useToast.ts` antigo).

---

## 8. Colaboração e organização do time

*   **Papéis:**
    *   **Usuário (Você):** PO exigente, QA rigoroso e Arquiteto Chefe.
    *   **Agente (IA):** Tech Lead, Desenvolvedor Full-Stack e DevOps.
*   **Dinâmica:** Ciclos curtos de feedback. Problema identificado -> Auditoria -> Script de Correção -> Validação.
*   **Ponto Forte:** A disciplina de **nunca avançar com o pipeline vermelho**. Isso evitou o acúmulo de erros.

---

## 9. Aprendizados ao longo do projeto

*   **O que deu certo:** A abordagem de **Scripts Bash Idempotentes** para correções. Em vez de pedir "mude a linha X", reescrever o arquivo inteiro via script garantiu consistência e reprodutibilidade.
*   **O que deu errado:** A gestão de dependências em Monorepo é complexa. Tivemos conflitos sérios entre versões de ESLint e configurações de TSConfig que consumiram tempo (Fase 10).
*   **Lição:** Em projetos Node modernos, **configurar corretamente o `package.json` (exports/types)** desde o dia 1 é vital para evitar dores de cabeça com *module resolution*.

---

## 10. Próximos passos (Roadmap Imediato)

O projeto está estável e funcional. O caminho para o "100%" é claro:

1.  **Iniciar Fase 15 (Visualização):** Conectar o JSON que já temos no frontend aos componentes visuais (Árvore de Arquivos e Visualizador de Código), eliminando a sensação de "placeholders".
2.  **Fase 16 (Persistência):** Implementar SQLite para que o usuário não perca o trabalho ao dar F5.
3.  **Release v1.0.0:** Empacotamento final.
EOF

echo "✅ Dossiê criado em docs/DOSSIE-MINI-IDE.md"
