
import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials as provided by user request. 
const supabaseUrl = 'https://nhvuwtmlftrdtpdolstg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odnV3dG1sZnRyZHRwZG9sc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDYwNjksImV4cCI6MjA3ODkyMjA2OX0.R02jwfweyL6LD_ftB5m1DtnmH5TbUddqtXZxhLh8Ulg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Envia um alerta de e-mail via Resend API
 * @param ticket Dados do chamado para o corpo do e-mail
 */
export const sendEmailAlert = async (ticket: { 
  ticketNumber: number; 
  title: string; 
  requester: string; 
  priority: string;
  category: string;
}) => {
  // NOTA: Substitua 're_123456789' pela sua chave real do Resend.
  // Em um ambiente de produção real, esta chave deve ser armazenada como 
  // segredo em uma Supabase Edge Function por segurança.
  const RESEND_API_KEY = 're_your_api_key_here'; 

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'AirService <onboarding@resend.dev>', // Use um domínio verificado em produção
        to: ['ti@grupoairslaid.com.br'], // Endereço predefinido para administradores
        subject: `🚨 Novo Chamado #${ticket.ticketNumber}: ${ticket.title}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #e11d48; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Novo Chamado Recebido</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Um novo chamado de suporte foi aberto no sistema <strong>AirService</strong>.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; width: 120px;">ID do Chamado:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: bold;">#${ticket.ticketNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Solicitante:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px;">${ticket.requester}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Assunto:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px;">${ticket.title}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Categoria:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px;">${ticket.category}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Prioridade:</td>
                  <td style="padding: 10px 0; color: #e11d48; font-size: 14px; font-weight: bold;">${ticket.priority}</td>
                </tr>
              </table>

              <div style="margin-top: 30px; text-align: center;">
                <a href="https://nhvuwtmlftrdtpdolstg.supabase.co" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Acessar Painel AirService</a>
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">Este é um e-mail automático gerado pelo sistema de suporte TI.</p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro na API do Resend:', errorData);
    }
  } catch (err) {
    console.error('Falha ao conectar com o serviço de e-mail:', err);
  }
};
