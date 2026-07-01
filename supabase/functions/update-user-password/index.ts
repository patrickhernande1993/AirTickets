import { createClient } from '@supabase/supabase-js'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Usa-se a chave de Service Role para conseguir ignorar RLS e atualizar senhas no Auth Admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Pega o token JWT de quem fez a request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token de autenticação não fornecido.')
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Não autorizado.')
    }

    // 2. Verifica se o usuário que fez a requisição é um administrador
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'ADMIN') {
      throw new Error('Apenas administradores podem realizar esta ação.')
    }

    // 3. Executa a alteração de senha e/ou e-mail
    const { userId, newPassword, newEmail } = await req.json()

    if (!userId || (!newPassword && !newEmail)) {
      throw new Error('O ID do usuário e ao menos uma alteração (senha ou e-mail) são obrigatórios.')
    }

    const updates: any = {}
    if (newPassword) updates.password = newPassword
    if (newEmail) updates.email = newEmail

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updates
    )

    if (updateError) {
      console.error('Erro no Supabase Auth Admin:', updateError)
      throw new Error(`Falha ao atualizar usuário: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({
        message: 'Usuário atualizado com sucesso',
        userId: updatedUser.user.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Erro na Edge Function update-user-password:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
