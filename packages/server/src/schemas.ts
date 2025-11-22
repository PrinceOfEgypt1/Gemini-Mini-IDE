export const AnalyzeRequestSchema = {
  type: 'object',
  required: ['text'],
  properties: {
    text: { type: 'string', description: 'Código ou texto para analisar', example: 'Crie um CRUD em React' },
    maxLen: { type: 'number', description: 'Tamanho máximo do resumo', default: 100 }
  }
};

export const AnalyzeResponseSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    inputLength: { type: 'number' },
    outputLength: { type: 'number' },
    requestId: { type: 'string', format: 'uuid' },
    timestamp: { type: 'string', format: 'date-time' },
    budgetUsed: { type: 'number' },
    budgetRemaining: { type: 'number' }
  }
};
