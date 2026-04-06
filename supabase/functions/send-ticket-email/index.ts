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

    // Credenciais do Azure AD vinda dos Secrets
    const AZURE_TENANT_ID = Deno.env.get('AZURE_TENANT_ID')
    const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID')
    const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET')
    const USER_EMAIL = Deno.env.get('SMTP_USER') // E-mail que enviará o chamado

    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !USER_EMAIL) {
      throw new Error('Configurações do Azure (Tenant/Client/Secret/User) não encontradas nos Secrets.')
    }

    console.log(`[LOG] Iniciando fluxo Graph API para #${ticketNumber}`)

    // 1. Obter Token de Acesso via OAuth2
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) {
      throw new Error(`Erro ao obter token do Azure: ${JSON.stringify(tokenData)}`)
    }

    const accessToken = tokenData.access_token
    console.log('[LOG] Token obtido com sucesso.')

    // 2. Preparar e Enviar E-mail via Graph API
    const mailBody = {
      message: {
        subject: `Chamado #${ticketNumber} Aberto com Sucesso`,
        body: {
          contentType: 'HTML',
          content: `
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
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">Enviado via Microsoft Graph API.</p>
            </div>
          `,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
      saveToSentItems: 'true',
    }

    const sendResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${USER_EMAIL}/sendMail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailBody),
    })

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json()
      throw new Error(`Erro ao enviar via Graph API: ${JSON.stringify(errorData)}`)
    }

    console.log(`[LOG] E-mail enviado com sucesso via Graph API!`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`[ERRO GRAPH]: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
