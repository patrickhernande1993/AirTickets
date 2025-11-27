import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo atual (development/production)
  // O terceiro argumento '' garante que carregue todas as variáveis do sistema (incluindo as do Vercel)
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Tenta encontrar a chave em várias variações
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.API_KEY || '';

  // Log para ajudar a debugar no Vercel (aparecerá nos Build Logs)
  if (!apiKey) {
    console.warn("⚠️  ALERTA DE BUILD: Nenhuma API Key do Gemini encontrada. A IA não funcionará. Verifique 'Environment Variables' no Vercel.");
  } else {
    console.log("✅  SUCESSO: API Key do Gemini detectada durante o build.");
  }

  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    define: {
      // Injeta a chave no código final para que o navegador possa usar
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});