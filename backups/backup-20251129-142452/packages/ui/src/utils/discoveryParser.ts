export interface DiscoveryData {
  intent: string[];
  reqs: string[];
  constraints: string[];
}

export const parseDiscoveryMessage = (text: string, currentData: DiscoveryData): DiscoveryData => {
  const newData = { ...currentData };
  const lower = text.toLowerCase();

  // Definição de palavras-chave
  const keywords = {
    intent: ['quero', 'gostaria', 'crie', 'preciso', 'desejo', 'criar'],
    reqs: ['deve', 'tem que', 'terá', 'precisa', 'com ', 'incluir', 'apresentar'],
    constraints: ['não', 'sem ', 'exceto', 'jamais', 'nunca', 'proibido']
  };

  // Função auxiliar para limpar texto
  const clean = (str: string) => {
    return str.trim().replace(/^[-*•]\s*/, '').replace(/[.;]$/, '');
  };

  // 1. Intenção
  if (keywords.intent.some(k => lower.includes(k))) {
    // Se a frase for curta (< 100 chars) e for a primeira, assume como intenção principal
    if (text.length < 100 && newData.intent.length === 0) {
      newData.intent.push(clean(text));
    } else if (!newData.intent.includes(clean(text))) {
      // Caso contrário, adiciona à lista se tiver a keyword explícita no início
      const parts = text.split(/[.!?]\s+/);
      parts.forEach(part => {
        if (keywords.intent.some(k => part.toLowerCase().startsWith(k))) {
           const c = clean(part);
           if (!newData.intent.includes(c)) newData.intent.push(c);
        }
      });
    }
  }

  // 2. Requisitos (Quebra por pontuação ou conjunções fortes)
  const reqParts = text.split(/[,.!?;]|\s+e\s+(?=ela|ele|o|a|que)/i);
  
  reqParts.forEach(part => {
    const pLower = part.toLowerCase();
    // Verifica se tem alguma das keywords de requisitos
    if (keywords.reqs.some(k => pLower.includes(k))) {
      // Evita adicionar se for uma restrição (ex: "não deve")
      if (!keywords.constraints.some(k => pLower.includes(k))) {
        const val = clean(part);
        if (val.length > 5 && !newData.reqs.includes(val)) {
          newData.reqs.push(val);
        }
      }
    }
  });

  // 3. Restrições
  const constParts = text.split(/[,.!?;]|\s+e\s+/);
  
  constParts.forEach(part => {
    const pLower = part.toLowerCase();
    if (keywords.constraints.some(k => pLower.includes(k))) {
      const val = clean(part);
      if (val.length > 4 && !newData.constraints.includes(val)) {
        newData.constraints.push(val);
      }
    }
  });

  return newData;
};
