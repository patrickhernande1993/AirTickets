
import { supabase } from './supabase';

interface SendTicketEmailParams {
  to: string;
  ticketNumber: number;
  title: string;
  requesterName: string;
}

export const sendTicketOpeningEmail = async ({ to, ticketNumber, title, requesterName }: SendTicketEmailParams) => {
  try {
    console.log('Invocando Edge Function para e-mail:', { to, ticketNumber, title });
    const { data, error } = await supabase.functions.invoke('send-ticket-email', {
      body: { to, ticketNumber, title, requesterName },
    });

    if (error) {
      console.error('Erro ao invocar Edge Function:', error);
      return { success: false, error };
    }

    console.log('Resposta da Edge Function:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Erro inesperado no serviço de e-mail (Edge Function):', err);
    return { success: false, error: err };
  }
};
