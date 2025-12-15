import type { RichManifestItem } from "../types/rich-schemas.js";

export interface IntegrityResult {
  valid: boolean;
  manifestCount: number;
  deliveredCount: number;
  missingFiles: string[];
  extraFiles: string[];
  warnings: string[];
}

/**
 * Valida a integridade entre o manifest planejado e os arquivos realmente gerados.
 *
 * CRÍTICO: Garante que todos os arquivos prometidos no manifest sejam entregues ao usuário.
 * Se houver discrepâncias, isso indica um bug grave no sistema de geração.
 *
 * @param manifest - Lista de arquivos planejados na arquitetura
 * @param generatedFiles - Lista de arquivos realmente gerados
 * @returns Resultado da validação de integridade
 */
export function validateIntegrity(
  manifest: RichManifestItem[],
  generatedFiles: Array<{ path: string; content: string }>
): IntegrityResult {
  const manifestPaths = new Set(manifest.map(item => item.path));
  const generatedPaths = new Set(generatedFiles.map(file => file.path));

  const missingFiles: string[] = [];
  const extraFiles: string[] = [];
  const warnings: string[] = [];

  // Verifica arquivos do manifest que não foram gerados
  for (const manifestPath of manifestPaths) {
    if (!generatedPaths.has(manifestPath)) {
      missingFiles.push(manifestPath);
    }
  }

  // Verifica arquivos gerados que não estavam no manifest
  for (const generatedPath of generatedPaths) {
    if (!manifestPaths.has(generatedPath)) {
      extraFiles.push(generatedPath);
    }
  }

  // Gera warnings baseado nos problemas encontrados
  if (missingFiles.length > 0) {
    warnings.push(
      `⚠️ CRITICAL: ${missingFiles.length} arquivo(s) do manifest NÃO foram gerados: ${missingFiles.join(", ")}`
    );
  }

  if (extraFiles.length > 0) {
    warnings.push(
      `ℹ️ Info: ${extraFiles.length} arquivo(s) extras foram gerados (não estavam no manifest): ${extraFiles.join(", ")}`
    );
  }

  const valid = missingFiles.length === 0;

  return {
    valid,
    manifestCount: manifestPaths.size,
    deliveredCount: generatedPaths.size,
    missingFiles,
    extraFiles,
    warnings
  };
}

/**
 * Loga os resultados da validação de integridade de forma formatada.
 */
export function logIntegrityResults(result: IntegrityResult): void {
  // eslint-disable-next-line no-console
  console.log("\n" + "═".repeat(80));
  // eslint-disable-next-line no-console
  console.log("🔍 VALIDAÇÃO DE INTEGRIDADE - Manifest vs Arquivos Gerados");
  // eslint-disable-next-line no-console
  console.log("═".repeat(80));

  // eslint-disable-next-line no-console
  console.log(`📋 Arquivos no Manifest: ${result.manifestCount}`);
  // eslint-disable-next-line no-console
  console.log(`📦 Arquivos Gerados: ${result.deliveredCount}`);

  if (result.valid) {
    // eslint-disable-next-line no-console
    console.log("✅ INTEGRIDADE OK: Todos os arquivos do manifest foram gerados!");
  } else {
    // eslint-disable-next-line no-console
    console.log("❌ FALHA DE INTEGRIDADE: Arquivos faltando na entrega!");
  }

  if (result.warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.log("\n⚠️ AVISOS:");
    // eslint-disable-next-line no-console
    result.warnings.forEach(warning => console.log(`   ${warning}`));
  }

  if (result.missingFiles.length > 0) {
    // eslint-disable-next-line no-console
    console.log("\n❌ ARQUIVOS FALTANDO:");
    // eslint-disable-next-line no-console
    result.missingFiles.forEach(file => console.log(`   - ${file}`));
  }

  if (result.extraFiles.length > 0) {
    // eslint-disable-next-line no-console
    console.log("\nℹ️ ARQUIVOS EXTRAS:");
    // eslint-disable-next-line no-console
    result.extraFiles.forEach(file => console.log(`   - ${file}`));
  }

  // eslint-disable-next-line no-console
  console.log("═".repeat(80) + "\n");
}
