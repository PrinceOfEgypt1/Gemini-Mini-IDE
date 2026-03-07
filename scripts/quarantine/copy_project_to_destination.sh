#!/bin/bash

# Caminho do diretório raiz do projeto
PROJECT_ROOT="$HOME/workspace/Gemini-Mini-IDE"

# Arquivo de destino
DESTINATION_FILE="$HOME/workspace/project_contents.txt"

# Limpa o arquivo de destino se já existir
> "$DESTINATION_FILE"

# Função para processar cada arquivo
process_file() {
    local file_path="$1"
    local relative_path="${file_path#$PROJECT_ROOT/}"

    # Adiciona o caminho do arquivo como primeira linha
    echo "=== Arquivo: $relative_path ===" >> "$DESTINATION_FILE"

    # Adiciona o conteúdo do arquivo
    cat "$file_path" >> "$DESTINATION_FILE"

    # Adiciona uma linha pontilhada para separar os arquivos
    echo -e "\n--------------------------------------------------\n" >> "$DESTINATION_FILE"
}

# Exporta a função para uso com find
export -f process_file
export PROJECT_ROOT
export DESTINATION_FILE

# Encontra todos os arquivos no projeto (excluindo pastas e extensões indesejadas)
find "$PROJECT_ROOT" -type f \
    # Exclui pastas específicas
    -not -path "$PROJECT_ROOT/.trash-*" \
    -not -path "$PROJECT_ROOT/node_modules/*" \
    -not -path "$PROJECT_ROOT/dist/*" \
    -not -path "$PROJECT_ROOT/.git/*" \
    -not -path "$PROJECT_ROOT/bundles/*" \
    -not -path "$PROJECT_ROOT/scripts/*" \
    -not -path "*backup*" \
    -not -path "$PROJECT_ROOT/*/backup/*" \
    -not -path "$PROJECT_ROOT/packages/*/node_modules/*" \
    -not -path "$PROJECT_ROOT/packages/*/dist/*" \
    -not -path "$PROJECT_ROOT/packages/*/.git/*" \
    -not -path "$PROJECT_ROOT/packages/*/bundles/*" \
    # Exclui arquivos específicos
    -not -name "*.lock" \
    -not -name "*.log" \
    -not -name "*.tmp" \
    -not -name "*.bak" \
    -not -name "*backup*" \
    -not -name "*.sh" \
    -not -name "*.yaml" \
    -not -name "*.pdf" \
    -not -name "*.md" \
    # Inclui apenas arquivos com extensões desejadas (opcional, descomente se necessário)
    # \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.html" \) \
    -exec bash -c 'process_file "$0"' {} \;

echo "Conteúdo do projeto foi copiado para: $DESTINATION_FILE"
