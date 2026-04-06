import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

serve(async (req) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, description } = await req.json()

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not set')
    }

    const prompt = `Você é um assistente de suporte técnico. Analise o chamado abaixo e retorne APENAS um objeto JSON válido (sem markdown ou blocos de código) com os seguintes campos:
- "category": uma destas opções: [ERP MEGA, Microgestão, Power BI, Acessos, Outro]
- "priority": uma destas opções: [LOW, MEDIUM, HIGH, CRITICAL]
- "summary": um resumo técnico de no máximo 2 linhas em Português.

Chamado:
Título: ${title}
Descrição: ${description}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    })

    const result = await response.json()
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    // Limpar possíveis marcações de markdown se o modelo retornar
    const cleanedJson = textResponse.replace(/```json|```/g, '').trim()
    const jsonResult = JSON.parse(cleanedJson)

    return new Response(JSON.stringify(jsonResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
