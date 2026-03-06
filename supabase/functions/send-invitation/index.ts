import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabase-admin.ts'
import { sendEmail } from '../_shared/resend.ts'

const APP_URL = Deno.env.get('APP_URL') || 'https://evalia.app'

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

    const { evaluationIds, campaignId } = await req.json()

    // Get campaign info
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('name, end_date, organizations(name)')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return new Response(
        JSON.stringify({ error: 'Campana no encontrada.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get evaluations to send
    const { data: evaluations } = await supabaseAdmin
      .from('evaluations')
      .select('id, token, evaluator_name, evaluator_email, evaluator_type, employees(full_name)')
      .in('id', evaluationIds)
      .eq('status', 'pending')

    if (!evaluations?.length) {
      return new Response(
        JSON.stringify({ error: 'No hay evaluaciones pendientes de enviar.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const evaluation of evaluations) {
      if (!evaluation.evaluator_email) continue

      const evaluateUrl = `${APP_URL}/evaluate/${evaluation.token}`
      const employeeName = evaluation.employees?.full_name || 'un companero'
      const evaluatorName = evaluation.evaluator_name || 'Evaluador'
      const orgName = (campaign as any).organizations?.name || 'tu empresa'
      const deadline = campaign.end_date
        ? new Date(campaign.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'lo antes posible'

      const typeLabel: Record<string, string> = {
        self: 'autoevaluacion',
        manager: 'evaluacion como responsable',
        peer: 'evaluacion entre pares',
        subordinate: 'evaluacion ascendente',
        external: 'evaluacion externa',
      }

      try {
        await sendEmail({
          to: evaluation.evaluator_email,
          subject: `${orgName} - Evaluacion pendiente: ${campaign.name}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a2e3b;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #28536B; font-size: 26px; margin: 0; font-weight: 700;">Carmen Rotter</h1>
    <p style="color: #7c9991; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0 0 0;">Consultoria en Gestion de Personas</p>
  </div>

  <p>Hola ${evaluatorName},</p>

  <p>Has sido invitado a completar una <strong>${typeLabel[evaluation.evaluator_type] || 'evaluacion'}</strong> de <strong>${employeeName}</strong> dentro de la campana <em>"${campaign.name}"</em>.</p>

  <div style="background: #f5f4f5; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <p style="margin: 0 0 16px 0; color: #7c9991;">Haz clic en el boton para acceder al formulario:</p>
    <a href="${evaluateUrl}" style="display: inline-block; background: #28536B; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Completar evaluacion</a>
  </div>

  <p style="color: #7c9991; font-size: 14px;">
    Fecha limite: <strong>${deadline}</strong><br>
    No necesitas crear una cuenta. El enlace es personal e intransferible.
  </p>

  <hr style="border: none; border-top: 1px solid #e9e4dd; margin: 32px 0;">
  <p style="color: #b1967a; font-size: 12px; text-align: center;">
    Este email ha sido enviado por ${orgName} a traves de Carmen Rotter EvalIA.
  </p>
</body>
</html>`,
        })

        // Update evaluation status
        await supabaseAdmin
          .from('evaluations')
          .update({ status: 'pending' })
          .eq('id', evaluation.id)

        results.push({ id: evaluation.id, email: evaluation.evaluator_email, sent: true })
      } catch (emailError) {
        results.push({ id: evaluation.id, email: evaluation.evaluator_email, sent: false, error: emailError.message })
      }
    }

    const sentCount = results.filter(r => r.sent).length

    return new Response(
      JSON.stringify({ sent: sentCount, total: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
