
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://nhvuwtmlftrdtpdolstg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odnV3dG1sZnRyZHRwZG9sc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDYwNjksImV4cCI6MjA3ODkyMjA2OX0.R02jwfweyL6LD_ftB5m1DtnmH5TbUddqtXZxhLh8Ulg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 💡 CONFIGURAÇÃO DE E-MAIL (RESEND):
 * O navegador bloqueia chamadas diretas para a API do Resend (Erro: Failed to fetch / CORS).
 * Estamos usando o 'corsproxy.io' para contornar isso neste ambiente de demonstração.
 * 
 * ATENÇÃO: Você PRECISA colocar sua API KEY real abaixo para o envio funcionar.
 */
const RESEND_API_KEY = 're_your_api_key_here'; 
const CORS_PROXY = 'https://corsproxy.io/?';
const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Envia um alerta de e-mail de criação de chamado
 */
export const sendEmailAlert = async (ticket: { 
  ticketNumber: number; 
  title: string; 
  requester: string; 
  priority: string;
  category: string;
}) => {
  if (RESEND_API_KEY === 're_your_api_key_here') {
      console.error('ERRO: Você ainda não configurou sua API KEY do Resend no arquivo services/supabase.ts');
      return false;
  }

  try {
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(RESEND_API_URL)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'AirService <onboarding@resend.dev>',
        to: ['ti@grupoairslaid.com.br'],
        subject: `🚨 Novo Chamado #${ticket.ticketNumber}: ${ticket.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #e11d48; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Novo Chamado Recebido</h1>
            </div>
            <div style="padding: 30px;">
              <p>O chamado <strong>#${ticket.ticketNumber}</strong> foi aberto por <strong>${ticket.requester}</strong>.</p>
              <p><strong>Assunto:</strong> ${ticket.title}</p>
              <p><strong>Prioridade:</strong> ${ticket.priority}</p>
            </div>
          </div>
        `,
      }),
    });
    
    return response.ok;
  } catch (err) {
    console.error('Erro de conexão no envio (CORS Proxy):', err);
    return false;
  }
};

/**
 * Envia um alerta de e-mail informando a mudança de status
 */
export const sendEmailStatusUpdateAlert = async (ticket: {
  ticketNumber: number;
  title: string;
  newStatus: string;
  recipientEmail: string;
}) => {
  if (RESEND_API_KEY === 're_your_api_key_here') return false;

  try {
    const statusLabels: Record<string, string> = {
      'OPEN': 'Aberto',
      'IN_PROGRESS': 'Em Progresso',
      'RESOLVED': 'Resolvido'
    };

    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(RESEND_API_URL)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'AirService <onboarding@resend.dev>',
        to: [ticket.recipientEmail],
        subject: `🔄 Atualização no Chamado #${ticket.ticketNumber}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Status Atualizado</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <p style="font-size: 16px; color: #1e293b;">Olá, seu chamado <strong>#${ticket.ticketNumber} - ${ticket.title}</strong> teve uma atualização de status.</p>
              
              <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; text-align: center;">
                <span style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Novo Status:</span>
                <span style="font-size: 18px; font-weight: bold; color: #2563eb;">${statusLabels[ticket.newStatus] || ticket.newStatus}</span>
              </div>

              <p style="font-size: 14px; color: #475569;">Você pode acompanhar os detalhes e interagir com o suporte através do nosso portal.</p>
            </div>
          </div>
        `,
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('Erro de conexão no envio de status (CORS Proxy):', err);
    return false;
  }
};
