export class MockProvider {
    async generate(prompt) {
        console.log('[MockProvider] Recebido prompt de ' + prompt.length + ' chars');
        // Simula latência de "pensamento"
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            content: JSON.stringify({
                summary: "Análise Mockada das 8 Personas",
                personas: {
                    product: { hus: ["HU-001: Exemplo"] },
                    architect: { stack: "Node.js + React" },
                    engine: { files: ["src/index.ts"] }
                }
            }, null, 2),
            usage: { inputTokens: 50, outputTokens: 120 }
        };
    }
}
//# sourceMappingURL=mock-provider.js.map