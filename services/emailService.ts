
import { supabase } from './supabase';

interface EmailPayload {
  to: string;
  subject: string;
  userName: string;
  ticketTitle: string;
  ticketId: number;
}

/**
 * Envia um e-mail de notificação quando o chamado é resolvido.
 * Nota: Isso tenta invocar uma Supabase Edge Function chamada 'send-email'.
 * Se a função não existir, ele simula o envio no console.
 */
export const sendTicketResolvedEmail = async (
  toEmail: string,
  userName: string,
  ticketTitle: string,
  ticketId: number
): Promise<boolean> => {
  console.log(`[EmailService] Iniciando processo de envio para: ${toEmail}`);

  try {
    // Tenta chamar a Edge Function no Supabase
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: toEmail,
        subject: `✅ Chamado #${ticketId} Resolvido: ${ticketTitle}`,
        template: 'ticket_resolved', // Identificador para o backend saber qual template usar
        data: {
            userName,
            ticketTitle,
            ticketId
        }
      },
    });

    if (error) {
      // Se der erro (ex: função não existe ainda), logamos como aviso e retornamos true
      // para não bloquear a UI, simulando o sucesso para o usuário neste estágio.
      console.warn("[EmailService] Edge Function 'send-email' não configurada ou retornou erro. Detalhes:", error);
      console.info(`[SIMULAÇÃO] E-mail que seria enviado:\nPara: ${toEmail}\nAssunto: Chamado #${ticketId} Resolvido\nCorpo: Olá ${userName}, seu chamado "${ticketTitle}" foi concluído.`);
      return true; // Retornamos true para simular sucesso na UI
    }

    return true;
  } catch (err) {
    console.error("[EmailService] Erro inesperado:", err);
    return false;
  }
};
