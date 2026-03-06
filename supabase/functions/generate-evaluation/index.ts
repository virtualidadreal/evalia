import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabase-admin.ts'
import { openai } from '../_shared/openai.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { prompt, evalType, orgId } = await req.json()

    // Check AI is enabled for this org
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('ai_enabled, subscription_plan')
      .eq('id', orgId)
      .single()

    if (!org?.ai_enabled) {
      return new Response(
        JSON.stringify({ error: 'AI no disponible en tu plan. Actualiza a Growth.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en evaluacion de talento y RRHH con 20 anos de experiencia.
Genera frameworks de evaluacion profesionales, accionables y adaptados al contexto.
Responde SIEMPRE en JSON valido con la siguiente estructura:
{
  "competencies": [
    {
      "id": "comp_1",
      "name": "Nombre competencia",
      "description": "Descripcion breve",
      "weight": 0.2,
      "indicators": [
        { "id": "ind_1", "text": "Indicador observable", "level": 1 },
        { "id": "ind_2", "text": "Indicador observable", "level": 2 },
        { "id": "ind_3", "text": "Indicador observable", "level": 3 }
      ]
    }
  ],
  "questions": [
    {
      "id": "q_1",
      "competency_id": "comp_1",
      "text": "Pregunta de evaluacion",
      "type": "scale",
      "required": true
    }
  ],
  "rubric": {
    "scale": { "min": 1, "max": 5, "labels": { "1": "Necesita mejora", "2": "En desarrollo", "3": "Competente", "4": "Avanzado", "5": "Excepcional" } },
    "weights": {}
  }
}
Genera 4-6 competencias con 3 indicadores cada una y 2-3 preguntas por competencia.
Los pesos (weights) deben sumar 1.0.`
        },
        {
          role: 'user',
          content: `Genera una evaluacion tipo "${evalType}" para: ${prompt}`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content!)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
