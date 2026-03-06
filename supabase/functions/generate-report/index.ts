import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabase-admin.ts'
import { openai } from '../_shared/openai.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { reportId, orgId } = await req.json()

    // Check AI enabled
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('ai_enabled')
      .eq('id', orgId)
      .single()

    if (!org?.ai_enabled) {
      return new Response(
        JSON.stringify({ error: 'AI no disponible en tu plan.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get existing report with scores and insights
    const { data: report } = await supabaseAdmin
      .from('ai_reports')
      .select('*')
      .eq('id', reportId)
      .eq('organization_id', orgId)
      .single()

    if (!report) {
      return new Response(
        JSON.stringify({ error: 'Informe no encontrado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get campaign template for competency names
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('name, eval_templates(competencies)')
      .eq('id', report.campaign_id)
      .single()

    const competencies = campaign?.eval_templates?.competencies || []

    // Get employee info if individual report
    let employeeName = 'Equipo'
    let employeePosition = ''
    if (report.employee_id) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('full_name, position')
        .eq('id', report.employee_id)
        .single()
      employeeName = employee?.full_name || 'Empleado'
      employeePosition = employee?.position || ''
    }

    // Generate narrative report with OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un consultor senior de RRHH redactando un informe de evaluacion profesional.
Escribe en espanol, tono profesional pero accesible. Usa datos concretos.
Estructura el informe en secciones claras con titulos.
Responde en JSON:
{
  "executive_summary": "Resumen ejecutivo (2-3 parrafos)",
  "competency_analysis": [
    {
      "competency_name": "Nombre",
      "score": 4.2,
      "analysis": "Analisis detallado (1-2 parrafos)",
      "recommendations": ["Recomendacion 1", "Recomendacion 2"]
    }
  ],
  "development_plan": {
    "short_term": ["Accion a 30 dias"],
    "medium_term": ["Accion a 90 dias"],
    "long_term": ["Accion a 6-12 meses"]
  },
  "overall_assessment": "Valoracion global (1 parrafo)"
}`
        },
        {
          role: 'user',
          content: `Genera un informe narrativo completo para:

${report.report_type === 'individual' ? `Empleado: ${employeeName} - ${employeePosition}` : `Equipo completo`}
Campana: ${campaign?.name}
Score general: ${report.scores?.overall}
Scores por competencia: ${JSON.stringify(
  Object.entries(report.scores?.by_competency || {}).map(([id, data]: [string, any]) => ({
    name: competencies.find((c: any) => c.id === id)?.name || id,
    score: data.avg,
  }))
)}
Insights previos: ${JSON.stringify(report.insights)}`
        }
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' },
    })

    const narrative = JSON.parse(completion.choices[0].message.content!)

    // Update report with narrative content
    await supabaseAdmin
      .from('ai_reports')
      .update({
        content: {
          ...report.content,
          narrative,
        },
      })
      .eq('id', reportId)

    return new Response(JSON.stringify({ narrative }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
