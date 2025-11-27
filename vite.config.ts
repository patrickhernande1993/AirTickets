import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de arquivos .env locais
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // ACESSO DIRETO AO PROCESSO (Crucial para Vercel)
  // O loadEnv às vezes falha em pegar variáveis de sistema no Vercel se não houver arquivo .env
  const processEnv = process.env as any;

  // Tenta encontrar a chave em todas as fontes possíveis
  const apiKey = 
    env.VITE_GEMINI_API_KEY || 
    env.GEMINI_API_KEY || 
    env.API_KEY || 
    processEnv.VITE_GEMINI_API_KEY || 
    processEnv.GEMINI_API_KEY || 
    processEnv.API_KEY || 
    '';

  // Log de diagnóstico
  if (!apiKey) {
    console.warn("⚠️  ALERTA DE BUILD: Nenhuma API Key do Gemini encontrada. A IA não funcionará.");
  } else {
    console.log("✅  SUCESSO: API Key detectada no Build (Iniciando com: " + apiKey.substring(0, 5) + "...)");
  }

  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    define: {
      // Injeta a chave no código final
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});