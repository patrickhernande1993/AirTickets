import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de arquivos .env locais (se existirem)
  // Cast process as any to avoid type errors with cwd()
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Captura variáveis de ambiente do processo (Crucial para Vercel/Node)
  const processEnv = process.env;

  // Tenta encontrar a chave em todas as variações possíveis
  const apiKey = 
    env.VITE_GEMINI_API_KEY || 
    env.GEMINI_API_KEY || 
    env.API_KEY || 
    processEnv.VITE_GEMINI_API_KEY || 
    processEnv.GEMINI_API_KEY || 
    processEnv.API_KEY || 
    '';

  // Log de diagnóstico no Build (aparecerá nos logs do Vercel)
  if (!apiKey) {
    console.warn("⚠️  ALERTA DE BUILD: Nenhuma API Key do Gemini encontrada. A IA não funcionará.");
  } else {
    // Log seguro (mostra apenas os primeiros caracteres)
    console.log("✅  SUCESSO: API Key detectada no Build. Injetando no cliente...");
  }

  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    define: {
      // Injeta a chave como uma constante global no código do navegador
      // Isso evita erros de 'process is not defined' e garante acesso no Vercel
      'process.env.API_KEY': JSON.stringify(apiKey),
      '__APP_GEMINI_KEY__': JSON.stringify(apiKey)
    }
  };
});