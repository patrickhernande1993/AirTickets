import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo atual.
  // O cast (process as any) evita erros de tipo no Node.js
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Tenta encontrar a chave em várias variações para máxima compatibilidade
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.API_KEY || '';

  // Log de diagnóstico durante o build (visível no terminal local ou logs do Vercel)
  if (!apiKey) {
    console.warn("⚠️  ALERTA DE BUILD: Nenhuma API Key do Gemini encontrada. A IA não funcionará. Verifique se 'VITE_GEMINI_API_KEY' está configurada.");
  } else {
    console.log("✅  SUCESSO: API Key do Gemini detectada durante o build (Iniciando com: " + apiKey.substring(0, 5) + "...)");
  }

  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    define: {
      // Injeta a chave globalmente. O JSON.stringify é crucial para que seja inserida como string.
      // Substitui qualquer ocorrência de 'process.env.API_KEY' no código fonte pelo valor da chave.
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});