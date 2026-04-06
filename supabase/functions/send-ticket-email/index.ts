import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, ticketNumber, title, requesterName } = await req.json()

    // Chave do Resend vinda dos Secrets do Supabase
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      throw new Error('Configuração RESEND_API_KEY não encontrada nos Secrets do Supabase.')
    }

    console.log(`[LOG] Enviando e-mail via Resend para #${ticketNumber}`)

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AirService <onboarding@resend.dev>",
        to: [to],
        subject: `Chamado #${ticketNumber} Aberto com Sucesso`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 20px;">
            <h2 style="color: #0f172a; border-bottom: 2px solid #0078d4; padding-bottom: 10px;">Chamado Aberto - AirService</h2>
            <p>Olá <strong>${requesterName}</strong>,</p>
            <p>Seu chamado foi registrado com sucesso em nosso sistema.</p>
            <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0078d4; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">Número:</p>
              <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #1e293b;">#${ticketNumber}</p>
              <p style="margin: 15px 0 0 0; font-size: 14px; color: #64748b;">Assunto:</p>
              <p style="margin: 5px 0 0 0; font-size: 16px; color: #1e293b;">${title}</p>
            </div>
            <p>Nossa equipe técnica já foi notificada.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Enviado via Resend API.</p>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Erro no Resend: ${JSON.stringify(data)}`);
    }

    console.log(`[LOG] E-mail enviado com sucesso via Resend! ID: ${data.id}`)

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`[ERRO RESEND]: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
