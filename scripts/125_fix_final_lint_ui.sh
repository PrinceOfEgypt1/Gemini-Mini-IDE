#!/usr/bin/env bash
set -e

echo "🧹 [Phase 11] Realizando polimento final de Lint na UI..."

# ==============================================================================
# 1. Corrigir App.tsx (Variável não usada no catch)
# De: } catch (error) {
# Para: } catch {
# ==============================================================================
APP_FILE="packages/ui/src/App.tsx"
echo "📝 Ajustando $APP_FILE..."
# Usa sed para remover '(error)' do catch
sed -i 's/catch (error)/catch/' "$APP_FILE"

# ==============================================================================
# 2. Corrigir api.ts (no-explicit-any)
# De: exportProjectZip: async (projectData: any) => {
# Para: exportProjectZip: async (projectData: unknown) => {
# ==============================================================================
API_FILE="packages/ui/src/services/api.ts"
echo "📝 Ajustando $API_FILE..."
# Substitui 'any' por 'unknown' (mais seguro e aceito pelo lint)
sed -i 's/projectData: any/projectData: unknown/' "$API_FILE"

# ==============================================================================
# 3. Validação Final
# ==============================================================================
echo "🛡️  Validando Lint da UI..."
pnpm --filter @mini-ide/ui lint

echo "✅ Código limpo e em conformidade."
