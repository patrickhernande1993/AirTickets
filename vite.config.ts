import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo atual
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Substitui process.env.API_KEY pelo valor da string da chave ou uma string vazia.
      // Isso evita que o código quebre se a chave não existir.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
    },
    server: {
      port: 3000
    }
  };
});