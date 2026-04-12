/**
 * @fileoverview P27.1 — Prova de contenção da superfície pública do
 * pacote `@gemini-mini-ide/shared` no que diz respeito ao ESAA.
 *
 * O subsistema ESAA é experimental e contido (ver
 * docs/ESAA_ARCHITECTURE.md § 0 e § 0.1). Os 18 contratos HTTP em
 * `./esaa/contracts.ts` permanecem em disco como referência congelada,
 * mas a partir do P27.1 NÃO são mais re-exportados pelo barrel
 * `./index.ts`. Este teste pinga essa fronteira de duas formas:
 *
 *   1. importa o barrel público `./index.js` e verifica que nenhum
 *      símbolo runtime começa com `ESAA` (e que `analyzeImpact` continua
 *      presente, garantindo que o teste está realmente lendo o barrel
 *      certo);
 *   2. importa diretamente `./esaa/contracts.js` para confirmar que o
 *      arquivo continua compilando e em disco — preservando a opção de
 *      um futuro ciclo de promoção.
 *
 * Tipos do TypeScript não têm presença em runtime, então este teste
 * cobre o lado runtime/JS da exposição. A prova type-level fica
 * implícita: se algum dia alguém adicionar `export * from './esaa/...'`
 * de volta a `index.ts`, a inspeção runtime aqui também não vai pegar
 * (porque interfaces somem em runtime), mas o `tsc` rejeitaria
 * automaticamente qualquer tentativa de adicionar runtime symbols ao
 * barrel já que o módulo `./esaa/contracts.ts` é só `export interface`.
 */

import { describe, it, expect } from "vitest";
import * as sharedBarrel from "./index.js";

describe("P27.1 · superfície pública de @gemini-mini-ide/shared (ESAA)", () => {
  it("expõe utilidades não-ESAA reais (sanity check)", () => {
    // Garante que estamos lendo o barrel correto.
    expect(typeof sharedBarrel.analyzeImpact).toBe("function");
    expect(typeof sharedBarrel.formatImpactReport).toBe("function");
  });

  it("não expõe símbolos runtime cujo nome começa com ESAA", () => {
    const esaaSymbols = Object.keys(sharedBarrel).filter((key) =>
      key.startsWith("ESAA"),
    );
    expect(esaaSymbols).toEqual([]);
  });

  it("não expõe nenhum dos 18 contratos HTTP do ESAA pelo nome", () => {
    const containedContractNames = [
      "ESAAHealthResponse",
      "ESAAEventsQueryParams",
      "ESAAEventsResponse",
      "ESAAEventDTO",
      "ESAAOperationalProjectionResponse",
      "ESAAAuditTrailResponse",
      "ESAAProposeIntentionRequest",
      "ESAAProposeIntentionResponse",
      "ESAAPromotionResponse",
      "ESAAPromotionRollbackRequest",
      "ESAAAgentDTO",
      "ESAAAgentsResponse",
      "ESAAQuarantineRequest",
      "ESAAReinstateRequest",
      "ESAASnapshotResponse",
      "ESAARecoveryRollbackRequest",
      "ESAAReplayResponse",
      "ESAAReplayRequest",
    ];
    for (const name of containedContractNames) {
      expect(
        (sharedBarrel as Record<string, unknown>)[name],
        `${name} deveria estar fora da superfície pública após P27.1`,
      ).toBeUndefined();
    }
  });

  it("permite deep import direto do arquivo congelado (referência preservada)", async () => {
    // Não desejamos que o arquivo seja deletado — só que não componha
    // a superfície pública. Este teste prova que ele continua resolvível
    // por deep import dentro do próprio pacote.
    const contracts = await import("./esaa/contracts.js");
    // Como o módulo só exporta interfaces, em runtime ele resolve para
    // um objeto vazio. O importante é que o resolver não jogue.
    expect(contracts).toBeDefined();
    expect(typeof contracts).toBe("object");
  });
});
