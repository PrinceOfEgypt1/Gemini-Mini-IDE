import { useState, useEffect } from 'react';

/**
 * Hook para detectar a preferencia do usuario por movimento reduzido.
 * Respeita a configuracao de acessibilidade do sistema operacional.
 *
 * @returns true se o usuario prefere movimento reduzido, false caso contrario
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Verificacao inicial no lado do cliente
    if (typeof window === 'undefined') return false;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Listener para mudancas dinamicas na preferencia
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}
