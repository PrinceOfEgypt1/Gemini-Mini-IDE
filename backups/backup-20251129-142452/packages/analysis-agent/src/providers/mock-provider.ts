import { LLMProvider, LLMResponse } from './llm-provider.js';

export class MockProvider implements LLMProvider {
  async generate(prompt: string): Promise<LLMResponse> {
    let content = "{}";

    // Simula Router de Intenção
    if (prompt.includes("Classifique a intenção")) {
       if (prompt.includes("Como funciona") || prompt.includes("O que é")) {
         content = JSON.stringify({ type: "QUESTION", reasoning: "Pergunta do usuário" });
       } else {
         content = JSON.stringify({ type: "NEW_PROJECT", reasoning: "Novo projeto solicitado" });
       }
    }
    // Simula Passo 1: Análise
    else if (prompt.includes("Analista Sênior")) {
      content = JSON.stringify({
        summary: "App de Tarefas",
        complexity: "Média",
        assumptions: ["Usuário único", "Local storage"]
      });
    }
    // Simula Passo 2: Produto
    else if (prompt.includes("Product Owner")) {
      content = JSON.stringify({
        epics: [
          { title: "Gerenciamento de Tarefas", context: "CRUD básico", requirements: ["Criar", "Listar"] }
        ]
      });
    }
    // Simula Passo 3: Arquitetura
    else if (prompt.includes("Arquiteto Sênior")) {
      content = JSON.stringify({
        stack: "Node.js + React",
        manifest: [
          { path: "package.json", purpose: "Config", criticality: "Config" },
          { path: "src/index.ts", purpose: "Entry", criticality: "Core" }
        ]
      });
    }
    // Simula Passo 4: Fábrica de Código
    else if (prompt.includes("Dev Sênior")) {
      content = JSON.stringify({
        path: "src/index.ts",
        code: "console.log('Hello World');",
        explanation: "Ponto de entrada simples."
      });
    }
    // Simula Passo 5: HUs Detalhadas
    else if (prompt.includes("PO Técnico")) {
      content = JSON.stringify({
        userStories: [
          {
            id: "HU-001",
            title: "Criar Tarefa",
            priority: "P0",
            role: "Usuário",
            action: "criar tarefa",
            benefit: "organizar dia",
            acceptanceCriteria: ["Botão visível"],
            functionalRequirements: ["Persistir dados"],
            securityRequirements: ["Validar input"],
            businessContext: "Core feature"
          }
        ]
      });
    }
    // Resposta de Chat (Texto direto, mas o Router encapsula)
    else {
      // Fallback genérico para texto simples
      content = "Resposta do Chat simulada.";
    }

    return {
      content,
      usage: { inputTokens: 10, outputTokens: 20 }
    };
  }
}
