#!/usr/bin/env bash
set -e

echo "🚑 Sprint 10.6: Restaurando camada visual (CSS Global e Entry Point)..."

# 1. Restaurar global.css (Versão Completa e Limpa)
# -----------------------------------------------------
echo "🎨 Reescrevendo packages/ui/src/styles/global.css..."
mkdir -p packages/ui/src/styles

cat > packages/ui/src/styles/global.css <<EOF
:root {
  /* Paleta de Cores (Dark Mode Default) */
  --bg: #0f1420;
  --panel: #141b2b;
  --panel-2: #101727;
  --panel-3: #0c1323;
  --text: #e6ecff;
  --muted: #9fb0d3;
  --brand: #4ba3ff;
  --brand-2: #6ad3ff;
  --accent: #00c2a8;
  --danger: #ff5c7a;
  --ok: #47e6a1;
  --chip: #222b40;
  --border: #24304a;
  --shadow: 0 8px 24px rgba(0,0,0,0.35);
  --radius: 14px;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

/* Reset Básico */
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; padding: 0; }

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

#root { 
  height: 100vh; 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; /* Previne scroll na página inteira */
}

/* Layout Grid Principal */
.app-grid {
  display: grid;
  grid-template-rows: 56px 1fr 126px; /* Header, Content, Footer */
  height: 100%;
  width: 100%;
}

.main-area {
  display: grid;
  grid-template-columns: 280px 1fr 360px; /* Sidebar, Tabs, Notes */
  gap: 14px;
  padding: 14px;
  overflow: hidden;
  height: 100%;
  background-color: var(--bg);
}

/* Componentes de UI */
.panel {
  background-color: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
}

/* Botões */
.btn {
  background-color: var(--panel-2);
  border: 1px solid var(--border);
  color: var(--text);
  height: 32px;
  padding: 0 12px;
  border-radius: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  font-size: 13px;
  transition: all 0.2s ease;
}

.btn:hover:not(:disabled) {
  border-color: var(--brand);
  background-color: var(--panel-3);
}

.btn:active:not(:disabled) {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: linear-gradient(180deg, var(--brand-2), var(--brand));
  color: white;
  border: none;
  font-weight: 500;
}

.btn.primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

/* Badges e Pills */
.pill {
  padding: 4px 10px;
  border-radius: 999px;
  background-color: var(--chip);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
}

.pill.ok {
  color: var(--ok);
  background-color: rgba(71, 230, 161, 0.15);
  border-color: rgba(71, 230, 161, 0.4);
}

.muted {
  color: var(--muted);
}

/* Scrollbar Customizada */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }

/* Animações */
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.toast {
  animation: slideIn 0.3s ease-out;
}
EOF

# 2. Restaurar main.tsx (Garantir importação do CSS)
# -----------------------------------------------------
echo "⚛️ Restaurando packages/ui/src/main.tsx..."
cat > packages/ui/src/main.tsx <<EOF
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css'; // OBRIGATÓRIO: Importa o CSS que acabamos de criar

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
EOF

# 3. Limpar Cache do Vite
# -----------------------------------------------------
echo "🧹 Limpando cache do Vite..."
rm -rf packages/ui/node_modules/.vite

echo "✅ Restauração Visual Concluída."
echo "👉 Por favor:"
echo "   1. Pare o processo do frontend (Ctrl+C no Terminal 2)."
echo "   2. Rode 'pnpm --filter @mini-ide/ui dev' novamente."
echo "   3. Recarregue a página no navegador (F5)."
