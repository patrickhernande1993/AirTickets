
import emailjs from 'emailjs-com';

// Credenciais do EmailJS fornecidas
const SERVICE_ID = 'service_ipcsn3q';
const TEMPLATE_ID = 'template_0zr9idu';
const PUBLIC_KEY = 'FkBLMMiBErUcUt4wM';

interface EmailParams {
  to_email: string;
  to_name: string;
  from_name: string;
  ticket_title: string;
  message?: string;
  new_status?: string;
  ticket_link?: string;
  priority?: string;
}

export const sendEmail = async (params: EmailParams) => {
  try {
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      params as unknown as Record<string, unknown>,
      PUBLIC_KEY
    );
    console.log('E-mail enviado com sucesso!', response.status, response.text);
    return true;
  } catch (err) {
    console.error('Falha ao enviar e-mail:', err);
    return false;
  }
};

export const sendNewTicketEmail = async (
  adminEmail: string,
  adminName: string,
  ticketTitle: string,
  requesterName: string,
  priority: string,
  description: string
) => {
  return sendEmail({
    to_email: adminEmail,
    to_name: adminName,
    from_name: "Sistema AirService",
    ticket_title: ticketTitle,
    message: `Novo chamado aberto por ${requesterName}.\nPrioridade: ${priority}\nDescrição: ${description}`,
    ticket_link: window.location.origin // Link para a home do app
  });
};

export const sendStatusUpdateEmail = async (
  userEmail: string,
  userName: string,
  ticketTitle: string,
  newStatus: string,
  updaterName: string
) => {
  const statusMap: Record<string, string> = {
      'OPEN': 'Aberto',
      'IN_PROGRESS': 'Em Progresso',
      'RESOLVED': 'Resolvido',
      'CLOSED': 'Fechado'
  };

  return sendEmail({
    to_email: userEmail,
    to_name: userName,
    from_name: "Suporte AirService",
    ticket_title: ticketTitle,
    new_status: statusMap[newStatus] || newStatus,
    message: `O status do seu chamado foi alterado para: ${statusMap[newStatus] || newStatus} por ${updaterName}.`,
    ticket_link: window.location.origin
  });
};
