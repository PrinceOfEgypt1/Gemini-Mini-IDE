/**
 * @fileoverview P27.1 — Prova de contenção da superfície pública do
 * pacote `@gemini-mini-ide/analysis-agent` no que diz respeito ao ESAA.
 *
 * Antes do P27.1 o barrel `./index.ts` continha:
 *
 *     export * from "./esaa/index.js";
 *
 * o que expunha como API pública estável o conjunto inteiro de
 * primitivas internas do ESAA — EventStore, IntentionGateway,
 * WorkspaceExecutor, PromotionController, RecoveryController,
 * ProjectionEngine, PolicyEngine, InvariantEngine, e dois singletons
 * (`globalPolicyEngine`, `globalInvariantEngine`) — sem nenhum
 * consumidor de produção.
 *
 * O P27.1 reduz a superfície ao mínimo absoluto exigido pelos
 * consumidores reais, hoje só o pacote `@gemini-mini-ide/server`:
 *
 *   - `getGlobalESAAOrchestrator` (valor) — usado por
 *     `server/src/index.ts` dentro do gate `if (isESAAEnabled())`.
 *   - `ESAAOrchestrator` (tipo) e `ESAAEventType` (tipo) — usados por
 *     `server/src/routes/esaa.routes.ts`.
 *
 * Este teste pinga essa fronteira em tempo de execução. Tipos somem
 * em runtime, então a checagem é necessariamente sobre símbolos
 * runtime (valores e funções). Se algum dia alguém adicionar de volta
 * uma das primitivas internas ao barrel, a asserção `notExported`
 * falha.
 */

import { describe, it, expect } from "vitest";
import * as agentBarrel from "./index.js";

describe("P27.1 · superfície pública de @gemini-mini-ide/analysis-agent (ESAA)", () => {
  it("expõe getGlobalESAAOrchestrator (única função ESAA mantida no barrel)", () => {
    expect(typeof agentBarrel.getGlobalESAAOrchestrator).toBe("function");
  });

  it("expõe AnalysisAgent e os orchestrators principais (sanity check)", () => {
    // Garante que estamos lendo o barrel certo.
    expect(typeof agentBarrel.AnalysisAgent).toBe("function");
    expect(typeof agentBarrel.TransformativeOrchestrator).toBe("function");
    expect(typeof agentBarrel.InteractiveOrchestrator).toBe("function");
  });

  it("não expõe primitivas internas do ESAA pelo barrel público", () => {
    // Lista exaustiva dos símbolos runtime que o `export * from
    // "./esaa/index.js"` injetava antes do P27.1. Cada um deles deve
    // estar fora da superfície pública agora.
    const containedRuntimeSymbols = [
      "EventStore",
      "getGlobalEventStore",
      "closeGlobalEventStore",
      "resetGlobalEventStore",
      "ProjectionEngine",
      "IntentionGateway",
      "PolicyEngine",
      "globalPolicyEngine",
      "InvariantEngine",
      "globalInvariantEngine",
      "WorkspaceExecutor",
      "PromotionController",
      "RecoveryController",
      "ESAAOrchestrator",
      "closeGlobalESAAOrchestrator",
      "resetGlobalESAAOrchestrator",
    ];

    const barrel = agentBarrel as Record<string, unknown>;
    for (const name of containedRuntimeSymbols) {
      expect(
        barrel[name],
        `${name} deveria estar fora da superfície pública após P27.1`,
      ).toBeUndefined();
    }
  });

  it("não expõe nenhuma chave runtime cujo nome começa com Event, Projection, Intention, Policy, Invariant, Workspace, Promotion, ou Recovery vinda do ESAA", () => {
    // Heurística defensiva: pinga famílias inteiras de símbolos para
    // evitar que primitivas equivalentes sejam adicionadas com nomes
    // ligeiramente diferentes.
    const forbiddenPrefixes = [
      "EventStore",
      "ProjectionEngine",
      "IntentionGateway",
      "PolicyEngine",
      "InvariantEngine",
      "WorkspaceExecutor",
      "PromotionController",
      "RecoveryController",
    ];

    const exposed = Object.keys(agentBarrel);
    const violations = exposed.filter((name) =>
      forbiddenPrefixes.some((prefix) => name === prefix),
    );
    expect(violations).toEqual([]);
  });
});
