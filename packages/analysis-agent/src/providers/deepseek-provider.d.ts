import { LLMProvider, LLMResponse } from './llm-provider.js';
export declare class DeepSeekProvider implements LLMProvider {
    private apiKey;
    private apiUrl;
    constructor(apiKey: string);
    generate(prompt: string): Promise<LLMResponse>;
}
//# sourceMappingURL=deepseek-provider.d.ts.map