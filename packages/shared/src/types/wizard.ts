/** Representa uma História de Usuário gerada. */
export interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

/** Configuração do projeto definida pelo usuário. */
export interface ProjectDefinition {
  name: string;
  path: string;
  stack: string;
  userStories: UserStory[];
}

/** Resposta da geração de scripts. */
export interface GeneratedScripts {
  setupScript: string;   // Conteúdo do setup.sh
  pipelineScript: string; // Conteúdo do pipeline_check.sh
  instructions: string;
}
