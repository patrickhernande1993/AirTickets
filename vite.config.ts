import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo atual
  const env = loadEnv(mode, process.cwd(), '');
  
  // Tenta pegar GEMINI_API_KEY, se não existir pega API_KEY, se não, vazio.
  const apiKey = env.GEMINI_API_KEY || env.API_KEY || "";

  return {
    plugins: [react()],
    define: {
      // Injeta a chave diretamente como uma string no código final.
      // Isso remove qualquer dependência de process.env ou import.meta.env no navegador.
      '__APP_GEMINI_KEY__': JSON.stringify(apiKey),
    },
    server: {
      port: 3000
    }
  };
});