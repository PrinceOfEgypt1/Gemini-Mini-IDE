import { LLMProvider } from '../providers/llm-provider.js';
import { UserStory } from '@mini-ide/shared';

export class DiscoveryService {
  constructor(private provider: LLMProvider) {}

  async generateUserStories(context: string): Promise<UserStory[]> {
    const prompt = `
      Atue como um Product Owner.
      Com base neste pedido: "${context}"
      Gere uma lista de Histórias de Usuário (HUs) com critérios de aceite.
      Retorne APENAS um JSON no formato:
      [
        { "id": "HU-001", "title": "...", "description": "...", "acceptanceCriteria": ["..."] }
      ]
    `;

    const response = await this.provider.generate(prompt);
    
    try {
      const cleanJson = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch {
      // Falha silenciosa no parse, retorna erro estruturado
      return [{
        id: 'ERR-001',
        title: 'Erro na geração',
        description: 'Não foi possível processar a resposta da IA.',
        acceptanceCriteria: [],
        priority: 'P0'
      }];
    }
  }
}
