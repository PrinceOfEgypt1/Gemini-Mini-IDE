import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Button } from '../common/Button';
import type { GeneratedProject } from '../../hooks';

export interface ProjectWizardRefactoredProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectGenerated: (result: GeneratedProject) => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

/**
 * Project Wizard com animações cinematográficas de próxima geração.
 * 
 * Características:
 * - Transições suaves entre etapas
 * - Animações de entrada/saída de componentes
 * - Indicador de progresso animado
 * - Efeitos de parallax e spring physics
 */
export const ProjectWizardRefactored: React.FC<ProjectWizardRefactoredProps> = ({
  isOpen,
  onClose,
  onProjectGenerated,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao Assistente de Criação',
      description: 'Vamos criar um novo projeto de software com IA',
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">Crie seu Projeto</h3>
            <p className="text-[var(--text-muted)]">
              Este assistente guiará você através do processo de criação de um novo projeto.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['Web', 'Mobile', 'Backend'].map((type, idx) => (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 border border-[var(--border-main)] rounded-lg hover:border-[var(--brand-primary)] transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">
                    {type === 'Web' && '🌐'}
                    {type === 'Mobile' && '📱'}
                    {type === 'Backend' && '⚙️'}
                  </div>
                  <p className="font-medium">{type}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'details',
      title: 'Detalhes do Projeto',
      description: 'Forneça informações sobre seu projeto',
      component: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nome do Projeto</label>
            <motion.input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Meu Projeto Incrível"
              className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-app)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <motion.textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Descreva seu projeto..."
              rows={4}
              className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-app)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)] resize-none"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'template',
      title: 'Escolha um Template',
      description: 'Selecione um template para começar',
      component: (
        <div className="space-y-4">
          {['React + TypeScript', 'Vue + TypeScript', 'Next.js'].map((template, idx) => (
            <motion.div
              key={template}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedTemplate(template)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedTemplate === template
                  ? 'border-[var(--brand-primary)] bg-[var(--bg-panel-hover)]'
                  : 'border-[var(--border-main)] hover:border-[var(--brand-primary)]'
              }`}
            >
              <p className="font-medium">{template}</p>
              <p className="text-sm text-[var(--text-muted)]">Template padrão com configurações otimizadas</p>
            </motion.div>
          ))}
        </div>
      ),
    },
    {
      id: 'review',
      title: 'Revisar',
      description: 'Verifique as informações antes de criar',
      component: (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-panel-hover)]"
          >
            <p className="text-sm text-[var(--text-muted)]">Nome do Projeto</p>
            <p className="font-medium">{projectName || 'Não especificado'}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-panel-hover)]"
          >
            <p className="text-sm text-[var(--text-muted)]">Descrição</p>
            <p className="font-medium">{projectDescription || 'Não especificada'}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-panel-hover)]"
          >
            <p className="text-sm text-[var(--text-muted)]">Template</p>
            <p className="font-medium">{selectedTemplate || 'Não selecionado'}</p>
          </motion.div>
        </div>
      ),
    },
  ];

  const progressVariants = {
    hidden: { scaleX: 0 },
    visible: { scaleX: 1 },
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.2,
        ease: 'easeIn',
      },
    },
  };

  const contentVariants: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: {
        duration: 0.2,
        ease: 'easeIn',
      },
    },
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Simular criação do projeto
      onProjectGenerated({
        summary: `Projeto "${projectName}" criado com sucesso!`,
        engine: { files: [] },
        product: { userStories: [] },
      });
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  if (!currentStepData) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-[var(--bg-panel)] rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-[var(--border-main)]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-[var(--text-muted)] text-sm mt-1">{currentStepData.description}</p>
              </div>
              <motion.button
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                whileHover={{ rotate: 90 }}
              >
                ✕
              </motion.button>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-[var(--bg-app)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[var(--brand-primary)]"
                variants={progressVariants}
                initial="hidden"
                animate="visible"
                style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {currentStepData.component}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-[var(--border-main)] flex justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              Anterior
            </Button>

            <div className="flex gap-2">
              {steps.map((_, idx) => (
                <motion.div
                  key={idx}
                  className={`h-2 rounded-full ${
                    idx === currentStep
                      ? 'bg-[var(--brand-primary)] w-8'
                      : idx < currentStep
                      ? 'bg-[var(--brand-primary)] w-2'
                      : 'bg-[var(--border-main)] w-2'
                  }`}
                  layoutId={`step-${idx}`}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>

            <Button
              variant="primary"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? 'Criar Projeto' : 'Próximo'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
