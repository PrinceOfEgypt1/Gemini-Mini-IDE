import axios from 'axios';
export class DeepSeekProvider {
    apiKey;
    apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async generate(prompt) {
        try {
            const response = await axios.post(this.apiUrl, {
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are a specialized software engineering agent." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = response.data;
            return {
                content: data.choices[0].message.content,
                usage: {
                    inputTokens: data.usage.prompt_tokens,
                    outputTokens: data.usage.completion_tokens
                }
            };
        }
        catch (error) {
            console.error('Erro na chamada DeepSeek:', error.response?.data || error.message);
            throw new Error('Falha na geração do LLM');
        }
    }
}
//# sourceMappingURL=deepseek-provider.js.map