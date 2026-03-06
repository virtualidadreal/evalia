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

    const { campaignId, employeeId, orgId } = await req.json()

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

    // Get campaign with template
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*, eval_templates(competencies, questions, rubric)')
      .eq('id', campaignId)
      .single()

    // Get submitted evaluations
    let evaluationsQuery = supabaseAdmin
      .from('evaluations')
      .select('*, employees(full_name, position)')
      .eq('campaign_id', campaignId)
      .eq('status', 'submitted')

    if (employeeId) {
      evaluationsQuery = evaluationsQuery.eq('employee_id', employeeId)
    }

    const { data: evaluations } = await evaluationsQuery

    if (!evaluations?.length) {
      return new Response(
        JSON.stringify({ error: 'No hay evaluaciones completadas para analizar.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate numerical scores
    const competencies = campaign.eval_templates?.competencies || []
    const scoresByCompetency: Record<string, { values: number[], byType: Record<string, number[]> }> = {}

    for (const comp of competencies) {
      scoresByCompetency[comp.id] = { values: [], byType: {} }
    }

    for (const evaluation of evaluations) {
      const responses = evaluation.responses || {}
      for (const [questionId, response] of Object.entries(responses)) {
        const question = campaign.eval_templates?.questions?.find((q: any) => q.id === questionId)
        if (question && typeof response.value === 'number') {
          const compId = question.competency_id
          if (scoresByCompetency[compId]) {
            scoresByCompetency[compId].values.push(response.value)
            const type = evaluation.evaluator_type
            if (!scoresByCompetency[compId].byType[type]) {
              scoresByCompetency[compId].byType[type] = []
            }
            scoresByCompetency[compId].byType[type].push(response.value)
          }
        }
      }
    }

    // Calculate averages
    const scores: Record<string, any> = { by_competency: {}, by_evaluator: {} }
    let overallSum = 0
    let overallCount = 0

    for (const [compId, data] of Object.entries(scoresByCompetency)) {
      const avg = data.values.length ? data.values.reduce((a, b) => a + b, 0) / data.values.length : 0
      const byType: Record<string, number> = {}
      for (const [type, vals] of Object.entries(data.byType)) {
        byType[type] = vals.reduce((a, b) => a + b, 0) / vals.length
      }
      scores.by_competency[compId] = { avg: Math.round(avg * 100) / 100, ...byType }
      overallSum += avg
      overallCount++
    }
    scores.overall = overallCount ? Math.round((overallSum / overallCount) * 100) / 100 : 0

    // Evaluator type averages
    const byEvaluator: Record<string, number[]> = {}
    for (const evaluation of evaluations) {
      if (!byEvaluator[evaluation.evaluator_type]) {
        byEvaluator[evaluation.evaluator_type] = []
      }
      const responses = evaluation.responses || {}
      for (const response of Object.values(responses)) {
        if (typeof response.value === 'number') {
          byEvaluator[evaluation.evaluator_type].push(response.value)
        }
      }
    }
    for (const [type, vals] of Object.entries(byEvaluator)) {
      scores.by_evaluator[type] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
    }

    // Generate AI insights
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un analista de talento experto. Analiza resultados de evaluaciones y genera insights accionables.
Responde en JSON con esta estructura:
{
  "insights": [
    {
      "type": "strength" | "risk" | "opportunity",
      "text": "Insight claro y accionable en espanol",
      "severity": 1-5,
      "competency_id": "comp_id opcional"
    }
  ],
  "summary": "Resumen ejecutivo de 2-3 frases"
}`
        },
        {
          role: 'user',
          content: `Analiza estos resultados de evaluacion:

Competencias: ${JSON.stringify(competencies.map((c: any) => ({ id: c.id, name: c.name })))}
Scores por competencia: ${JSON.stringify(scores.by_competency)}
Score general: ${scores.overall}
Scores por tipo de evaluador: ${JSON.stringify(scores.by_evaluator)}
Total evaluaciones: ${evaluations.length}
${employeeId ? `Empleado: ${evaluations[0]?.employees?.full_name} - ${evaluations[0]?.employees?.position}` : 'Analisis de equipo completo'}

Genera 3-5 insights relevantes.`
        }
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    })

    const aiResult = JSON.parse(completion.choices[0].message.content!)

    // Save report
    const reportType = employeeId ? 'individual' : 'team'
    const title = employeeId
      ? `Informe individual - ${evaluations[0]?.employees?.full_name}`
      : `Informe de equipo - ${campaign.name}`

    const { data: report } = await supabaseAdmin
      .from('ai_reports')
      .insert({
        organization_id: orgId,
        campaign_id: campaignId,
        employee_id: employeeId || null,
        report_type: reportType,
        title,
        content: { summary: aiResult.summary },
        insights: aiResult.insights,
        scores,
      })
      .select()
      .single()

    return new Response(JSON.stringify({ report, scores, insights: aiResult.insights, summary: aiResult.summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
