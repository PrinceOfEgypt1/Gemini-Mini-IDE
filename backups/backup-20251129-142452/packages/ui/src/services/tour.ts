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
