#!/usr/bin/env bash
set -e

echo "💄 [Phase 12] Refinando UX do Tour (Tradução, Correção de Bug e Estilo)..."

UI_DIR="packages/ui"

# ==============================================================================
# 1. Atualizar Lógica do Tour (tour.ts)
# - Corrige seletor do passo 4 (Bug do travamento)
# - Traduz o contador de passos
# ==============================================================================
echo "📝 Atualizando packages/ui/src/services/tour.ts..."

cat > $UI_DIR/src/services/tour.ts <<EOF
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startOnboardingTour = () => {
  const tourDriver = driver({
    showProgress: true,
    animate: true,
    // Tradução completa
    nextBtnText: 'Próximo →',
    prevBtnText: '← Anterior',
    doneBtnText: 'Concluir',
    progressText: '{{current}} de {{total}}', // "3 de 5"
    
    steps: [
      { 
        element: '#btnQuickStart', 
        popover: { 
          title: 'Comece por aqui', 
          description: 'Use o Quick Start para acessar templates prontos ou rever este tour a qualquer momento.', 
          side: 'bottom', 
          align: 'end' 
        } 
      },
      { 
        element: 'footer textarea', 
        popover: { 
          title: 'Descreva sua ideia', 
          description: 'Digite o que você quer criar em linguagem natural. O Agente vai analisar e propor um plano.', 
          side: 'top', 
          align: 'start' 
        } 
      },
      { 
        element: '.tabs', 
        popover: { 
          title: 'Acompanhe o progresso', 
          description: 'Navegue pelas abas para ver as Histórias de Usuário, Documentação e o Código gerado.', 
          side: 'bottom', 
          align: 'start' 
        } 
      },
      { 
        // FIX CRÍTICO: Uso de ID direto em vez de seletor complexo
        element: '#btnPreferences', 
        popover: { 
          title: 'Configure sua IA', 
          description: 'Não esqueça de configurar sua API Key (DeepSeek/OpenAI) nas Preferências antes de começar.', 
          side: 'left', 
          align: 'end' 
        } 
      },
      { 
        element: '#btnExportZIP', 
        popover: { 
          title: 'Exporte o resultado', 
          description: 'Ao final, baixe todo o projeto gerado em um arquivo .zip pronto para uso.', 
          side: 'top', 
          align: 'end' 
        } 
      }
    ],
    onDestroyStarted: () => {
      localStorage.setItem('mini-ide-tour-seen', 'true');
      tourDriver.destroy();
    },
  });

  tourDriver.drive();
};
EOF

# ==============================================================================
# 2. Atualizar CSS Global (index.css)
# - Adiciona tema escuro ao popover
# - Adiciona a borda rosa solicitada
# ==============================================================================
echo "🎨 Injetando estilos personalizados no packages/ui/src/index.css..."

# Adiciona ao final do arquivo existente
cat >> $UI_DIR/src/index.css <<EOF

/* === Customização do Driver.js (Tour) === */

/* Container principal do Popover */
.driver-popover {
  background-color: #141b2b !important; /* Fundo escuro igual aos painéis */
  border: 2px solid #ec4899 !important;  /* Borda ROSA (Pink-500) */
  border-radius: 12px !important;
  box-shadow: 0 0 20px rgba(236, 72, 153, 0.3) !important; /* Glow rosa suave */
  color: #e6ecff !important;
  padding: 16px !important;
  font-family: 'Inter', sans-serif !important;
}

/* Título */
.driver-popover-title {
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  margin-bottom: 8px !important;
}

/* Descrição */
.driver-popover-description {
  font-size: 14px !important;
  line-height: 1.5 !important;
  color: #9fb0d3 !important; /* Cor muted do nosso tema */
  margin-bottom: 16px !important;
}

/* Texto de Progresso (3 de 5) */
.driver-popover-progress-text {
  color: #64748b !important;
  font-size: 12px !important;
}

/* Botões de Navegação */
.driver-popover-footer button {
  background-color: #222b40 !important;
  color: #e6ecff !important;
  border: 1px solid #24304a !important;
  border-radius: 6px !important;
  padding: 6px 12px !important;
  font-size: 12px !important;
  text-shadow: none !important;
  transition: all 0.2s !important;
}

.driver-popover-footer button:hover {
  background-color: #ec4899 !important; /* Hover rosa */
  color: white !important;
  border-color: #ec4899 !important;
}

/* Seta do Popover (triângulo) */
.driver-popover-arrow {
  border-color: #141b2b !important; /* Combina com o fundo */
}
/* Borda da seta (hack para simular border rosa na seta seria complexo, 
   então deixamos neutro ou removemos a seta visualmente se preferir) */
.driver-popover-arrow-side-left.driver-popover-arrow {
  border-left-color: #ec4899 !important;
}
.driver-popover-arrow-side-right.driver-popover-arrow {
  border-right-color: #ec4899 !important;
}
.driver-popover-arrow-side-top.driver-popover-arrow {
  border-top-color: #ec4899 !important;
}
.driver-popover-arrow-side-bottom.driver-popover-arrow {
  border-bottom-color: #ec4899 !important;
}
EOF

# ==============================================================================
# 3. Validação
# ==============================================================================
echo "🛡️  Validando Build da UI..."
pnpm --filter @mini-ide/ui build

echo "✅ Tour consertado e estilizado com sucesso!"
