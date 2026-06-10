/**
 * Corrige texto com encoding corrompido (Latin-1 interpretado como UTF-8)
 * Ex: "orÃ§amento" → "orçamento"
 */
export function fixEncoding(str: string | undefined | null): string {
  if (!str) return str ?? '';
  try {
    // Tenta reverter o mojibake: bytes UTF-8 interpretados como Latin-1
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}
