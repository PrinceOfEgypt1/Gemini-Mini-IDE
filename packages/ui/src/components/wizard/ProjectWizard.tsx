import React, { useState } from 'react';
import axios from 'axios';
import { X, ChevronRight, Check, Download, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { UserStory, ProjectDefinition, GeneratedScripts } from '@mini-ide/shared';

interface ProjectWizardProps {
  onClose: () => void;
}

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ onClose }) => {
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Estado do Fluxo
  const [intention, setIntention] = useState('');
  const [hus, setHus] = useState<UserStory[]>([]);
  const [config, setConfig] = useState({ name: '', path: '', stack: 'react' });
  const [scripts, setScripts] = useState<GeneratedScripts | null>(null);

  // Passo 1 -> 2: Gerar HUs
  const handleDiscovery = async () => {
    if (!intention.trim()) return addToast('Descreva o que você quer construir.', 'warning');
    
    setLoading(true);
    try {
      const res = await axios.post('/api/discovery/hus', { intention });
      setHus(res.data.userStories);
      setStep(2);
    } catch {
        addToast('Erro ao gerar HUs. Verifique o backend.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Passo 2 -> 3: Confirmar Configuração
  const handleConfirmConfig = () => {
    if (!config.name || !config.path) return addToast('Preencha todos os campos.', 'warning');
    setStep(3);
    handleGenerateScripts(); // Auto dispara geração ao entrar no passo 3
  };

  // Passo 3: Gerar Scripts Finais
  const handleGenerateScripts = async () => {
    setLoading(true);
    const projectDef: ProjectDefinition = {
      name: config.name,
      path: config.path,
      stack: config.stack,
      userStories: hus
    };

    try {
      const res = await axios.post('/api/wizard/generate', projectDef);
      setScripts(res.data);
    } catch {
        addToast('Erro ao gerar scripts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadScript = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addToast(`Download de ${filename} iniciado.`, 'success');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="panel" style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--panel)' }}>
        
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Novo Projeto (Passo {step}/3)</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}><X /></button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {/* PASSO 1: INTENÇÃO */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label>O que você deseja construir?</label>
              <textarea 
                value={intention}
                onChange={e => setIntention(e.target.value)}
                placeholder="Ex: Quero uma API em Node.js para gerenciar tarefas..."
                style={{ 
                  width: '100%', height: '120px', padding: '12px', 
                  background: 'var(--panel-2)', border: '1px solid var(--border)', 
                  color: 'var(--text)', borderRadius: '8px' 
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={handleDiscovery} isLoading={loading}>
                  Analisar e Gerar HUs <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* PASSO 2: REVISÃO E CONFIG */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--panel-2)', padding: '16px', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0 }}>Histórias de Usuário Propostas ({hus.length})</h4>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--muted)' }}>
                  {hus.map(hu => (
                    <li key={hu.id}><strong>{hu.id}:</strong> {hu.title}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Nome do Projeto</label>
                  <input 
                    value={config.name}
                    onChange={e => setConfig({...config, name: e.target.value})}
                    style={{ width: '100%', padding: '8px', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Stack</label>
                  <select 
                    value={config.stack}
                    onChange={e => setConfig({...config, stack: e.target.value})}
                    style={{ width: '100%', padding: '8px', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px' }}
                  >
                    <option value="react">React + Vite</option>
                    <option value="node">Node.js API</option>
                    <option value="python">Python Script</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px' }}>Caminho Local (Onde criar)</label>
                <input 
                  value={config.path}
                  placeholder="/home/user/projects/meu-app"
                  onChange={e => setConfig({...config, path: e.target.value})}
                  style={{ width: '100%', padding: '8px', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                 <Button onClick={() => setStep(1)}>Voltar</Button>
                 <Button variant="primary" onClick={handleConfirmConfig}>Gerar Scripts <Check size={16}/></Button>
              </div>
            </div>
          )}

          {/* PASSO 3: DOWNLOAD */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              {loading ? (
                <div style={{ padding: '40px' }}><Loader2 className="animate-spin" size={32} /> <p>Gerando engenharia...</p></div>
              ) : scripts ? (
                <>
                  <div style={{ background: 'rgba(71, 230, 161, 0.1)', color: 'var(--ok)', padding: '16px', borderRadius: '8px' }}>
                    <h4>Tudo pronto!</h4>
                    <p>Os scripts de criação foram gerados.</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    <Button onClick={() => downloadScript('setup.sh', scripts.setupScript)}>
                      <Download size={16}/> Baixar setup.sh
                    </Button>
                    <Button onClick={() => downloadScript('pipeline.sh', scripts.pipelineScript)}>
                      <Download size={16}/> Baixar pipeline.sh
                    </Button>
                  </div>

                  <div style={{ textAlign: 'left', background: 'var(--panel-2)', padding: '16px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
                    <p style={{ color: 'var(--muted)' }}># Instruções:</p>
                    <p>{scripts.instructions}</p>
                  </div>
                  
                  <Button onClick={onClose} style={{ marginTop: '20px' }}>Fechar</Button>
                </>
              ) : (
                <p>Erro na geração.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
