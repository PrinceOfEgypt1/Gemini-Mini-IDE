#!/bin/bash

set -euo pipefail

ROOT_DIR="${1:-.}"
OUTPUT_FILE="${2:-CODE_EXPORT.txt}"

echo "=== Iniciando exportação ==="
echo "Diretório: $ROOT_DIR"
echo "Arquivo destino: $OUTPUT_FILE"

# Limpa arquivo de destino
> "$OUTPUT_FILE"

# Header
cat >> "$OUTPUT_FILE" <<'EOF'
################################################################################
#                         EXPORTAÇÃO DE CÓDIGO
################################################################################

EOF

echo "Data: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

file_count=0

# Busca todos os arquivos relevantes
find "$ROOT_DIR" \
    -type d \( -name "node_modules" -o -name "dist" -o -name "build" -o -name "bundles" -o -name "logs" -o -name ".git" -o -name ".pnpm" -o -name "coverage" \) -prune \
    -o -type f \( \
        -name "*.ts" -o \
        -name "*.tsx" -o \
        -name "*.js" -o \
        -name "*.jsx" -o \
        -name "*.mjs" -o \
        -name "*.json" -o \
        -name "*.yaml" -o \
        -name "*.yml" -o \
        -name "*.html" -o \
        -name "*.css" -o \
        -name "*.scss" \
    \) -print | sort | while IFS= read -r file; do
    
    # Calcula caminho relativo
    rel_path="${file#$ROOT_DIR/}"
    
    # Escreve separador e nome do arquivo
    echo "" >> "$OUTPUT_FILE"
    echo "################################################################################" >> "$OUTPUT_FILE"
    echo "# ARQUIVO: $rel_path" >> "$OUTPUT_FILE"
    echo "################################################################################" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    # Copia conteúdo do arquivo
    if [ -r "$file" ]; then
        cat "$file" >> "$OUTPUT_FILE"
    else
        echo "[ERRO: Arquivo não legível]" >> "$OUTPUT_FILE"
    fi
    
    echo "" >> "$OUTPUT_FILE"
    
    file_count=$((file_count + 1))
    
    # Progress
    if [ $((file_count % 10)) -eq 0 ]; then
        echo "Processados: $file_count arquivos..."
    fi
done

# Footer
cat >> "$OUTPUT_FILE" <<EOF


################################################################################
#                           FIM DA EXPORTAÇÃO
################################################################################
Total de arquivos: $file_count
Data: $(date)
################################################################################
EOF

echo "=== Exportação concluída ==="
echo "Total de arquivos: $file_count"
echo "Arquivo gerado: $OUTPUT_FILE"
echo "Tamanho: $(du -h "$OUTPUT_FILE" | cut -f1)"
