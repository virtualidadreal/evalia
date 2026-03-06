import type {
  Evaluation,
  EvalTemplate,
  Competency,
  Insight,
  CompetencyScore,
} from '@/types/database'

/**
 * Client-side results analysis.
 * In production, this would be a Supabase Edge Function (`analyze-results`)
 * that uses OpenAI to generate insights and scores.
 */

interface EmployeeResult {
  employeeId: string
  employeeName: string
  position: string
  overallScore: number
  competencyScores: Record<string, CompetencyScore>
  insights: Insight[]
  comments: { question: string; evaluatorType: string; comment: string }[]
}

interface TeamResult {
  overallAvg: number
  competencyAverages: { competency: string; avg: number; self: number; manager: number; peers: number }[]
  heatmap: { employeeName: string; scores: Record<string, number> }[]
  insights: Insight[]
  employeeResults: EmployeeResult[]
}

/** Analyze results for a campaign */
export function analyzeResults(
  evaluations: Evaluation[],
  template: EvalTemplate
): TeamResult {
  const competencies = template.competencies
  const questions = template.questions

  // Group evaluations by employee
  const byEmployee = new Map<string, Evaluation[]>()
  for (const ev of evaluations) {
    const key = ev.employee_id
    if (!byEmployee.has(key)) byEmployee.set(key, [])
    byEmployee.get(key)!.push(ev)
  }

  const employeeResults: EmployeeResult[] = []

  for (const [employeeId, evals] of byEmployee) {
    const firstEval = evals[0] as Evaluation & {
      employees?: { full_name: string; position: string } | null
    }
    const employeeName = (firstEval as any).employees?.full_name ?? 'Empleado'
    const position = (firstEval as any).employees?.position ?? ''

    const competencyScores: Record<string, CompetencyScore> = {}
    const comments: { question: string; evaluatorType: string; comment: string }[] = []

    for (const comp of competencies) {
      const compQuestions = questions.filter(
        (q) => q.competency_id === comp.id && q.type === 'scale'
      )

      const selfScores: number[] = []
      const managerScores: number[] = []
      const peerScores: number[] = []

      for (const ev of evals) {
        for (const q of compQuestions) {
          const response = ev.responses[q.id]
          if (response && typeof response.value === 'number') {
            switch (ev.evaluator_type) {
              case 'self':
                selfScores.push(response.value)
                break
              case 'manager':
                managerScores.push(response.value)
                break
              case 'peer':
                peerScores.push(response.value)
                break
            }
          }
        }

        // Collect text comments
        for (const q of questions.filter((q) => q.type === 'text' && q.competency_id === comp.id)) {
          const response = ev.responses[q.id]
          if (response && typeof response.value === 'string' && response.value.trim()) {
            comments.push({
              question: q.text,
              evaluatorType: ev.evaluator_type,
              comment: response.value,
            })
          }
        }
      }

      const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

      const selfAvg = avg(selfScores)
      const managerAvg = avg(managerScores)
      const peersAvg = avg(peerScores)
      const allScores = [...selfScores, ...managerScores, ...peerScores]
      const overallAvg = avg(allScores)

      competencyScores[comp.id] = {
        avg: Math.round(overallAvg * 100) / 100,
        ...(selfScores.length > 0 ? { self: Math.round(selfAvg * 100) / 100 } : {}),
        ...(managerScores.length > 0 ? { manager: Math.round(managerAvg * 100) / 100 } : {}),
        ...(peerScores.length > 0 ? { peers: Math.round(peersAvg * 100) / 100 } : {}),
      }
    }

    // Calculate overall score
    let totalWeighted = 0
    let totalWeight = 0
    for (const comp of competencies) {
      const score = competencyScores[comp.id]
      if (score && score.avg > 0) {
        totalWeighted += score.avg * comp.weight
        totalWeight += comp.weight
      }
    }
    const overallScore = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) / 100 : 0

    // Generate insights for this employee
    const insights = generateEmployeeInsights(competencies, competencyScores, employeeName)

    employeeResults.push({
      employeeId,
      employeeName,
      position,
      overallScore,
      competencyScores,
      insights,
      comments,
    })
  }

  // Team-level aggregation
  const teamOverall = employeeResults.length > 0
    ? Math.round(
        (employeeResults.reduce((sum, r) => sum + r.overallScore, 0) / employeeResults.length) * 100
      ) / 100
    : 0

  const competencyAverages = competencies.map((comp) => {
    const scores = employeeResults.map((r) => r.competencyScores[comp.id]).filter(Boolean)
    const avgOf = (key: keyof CompetencyScore) => {
      const vals = scores.map((s) => s[key]).filter((v): v is number => v !== undefined && v > 0)
      return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0
    }

    return {
      competency: comp.name,
      avg: avgOf('avg'),
      self: avgOf('self'),
      manager: avgOf('manager'),
      peers: avgOf('peers'),
    }
  })

  const heatmap = employeeResults.map((r) => ({
    employeeName: r.employeeName,
    scores: Object.fromEntries(
      competencies.map((c) => [c.name, r.competencyScores[c.id]?.avg ?? 0])
    ),
  }))

  const teamInsights = generateTeamInsights(competencyAverages, employeeResults)

  return {
    overallAvg: teamOverall,
    competencyAverages,
    heatmap,
    insights: teamInsights,
    employeeResults,
  }
}

function generateEmployeeInsights(
  competencies: Competency[],
  scores: Record<string, CompetencyScore>,
  name: string
): Insight[] {
  const insights: Insight[] = []

  for (const comp of competencies) {
    const score = scores[comp.id]
    if (!score || score.avg === 0) continue

    // Strength
    if (score.avg >= 4.0) {
      insights.push({
        type: 'strength',
        text: `${name} destaca en ${comp.name} con una puntuación de ${score.avg.toFixed(1)}/5`,
        severity: score.avg >= 4.5 ? 3 : 2,
        competency_id: comp.id,
      })
    }

    // Risk
    if (score.avg < 2.5) {
      insights.push({
        type: 'risk',
        text: `${comp.name} necesita atención: ${score.avg.toFixed(1)}/5. Considerar plan de desarrollo.`,
        severity: score.avg < 2.0 ? 3 : 2,
        competency_id: comp.id,
      })
    }

    // Gap analysis: self vs external
    if (score.self !== undefined && (score.manager !== undefined || score.peers !== undefined)) {
      const external = score.manager !== undefined && score.peers !== undefined
        ? (score.manager + score.peers) / 2
        : score.manager ?? score.peers ?? 0
      const gap = score.self - external

      if (Math.abs(gap) >= 1.0) {
        insights.push({
          type: 'opportunity',
          text: gap > 0
            ? `Discrepancia en ${comp.name}: autoevaluación (${score.self.toFixed(1)}) significativamente mayor que evaluación externa (${external.toFixed(1)}). Revisar percepción.`
            : `${name} se infravalora en ${comp.name}: autoevaluación (${score.self.toFixed(1)}) menor que evaluación externa (${external.toFixed(1)}). Reforzar confianza.`,
          severity: Math.abs(gap) >= 1.5 ? 3 : 2,
          competency_id: comp.id,
        })
      }
    }
  }

  return insights.sort((a, b) => b.severity - a.severity)
}

function generateTeamInsights(
  competencyAvgs: { competency: string; avg: number; self: number; manager: number; peers: number }[],
  employeeResults: EmployeeResult[]
): Insight[] {
  const insights: Insight[] = []

  // Top competency
  const sorted = [...competencyAvgs].filter((c) => c.avg > 0).sort((a, b) => b.avg - a.avg)
  if (sorted.length > 0) {
    const best = sorted[0]
    insights.push({
      type: 'strength',
      text: `La competencia más fuerte del equipo es "${best.competency}" con ${best.avg.toFixed(1)}/5 de media`,
      severity: 3,
    })
  }

  // Weakest competency
  if (sorted.length > 1) {
    const worst = sorted[sorted.length - 1]
    if (worst.avg < 3.5) {
      insights.push({
        type: 'risk',
        text: `"${worst.competency}" es el área con mayor margen de mejora (${worst.avg.toFixed(1)}/5). Considerar formación específica.`,
        severity: worst.avg < 2.5 ? 3 : 2,
      })
    }
  }

  // Top performer
  const sortedEmployees = [...employeeResults].sort((a, b) => b.overallScore - a.overallScore)
  if (sortedEmployees.length > 0 && sortedEmployees[0].overallScore > 0) {
    insights.push({
      type: 'strength',
      text: `${sortedEmployees[0].employeeName} es el empleado con mejor valoración global (${sortedEmployees[0].overallScore.toFixed(1)}/5)`,
      severity: 2,
    })
  }

  // Employee needing attention
  if (sortedEmployees.length > 1) {
    const lowest = sortedEmployees[sortedEmployees.length - 1]
    if (lowest.overallScore < 3.0 && lowest.overallScore > 0) {
      insights.push({
        type: 'risk',
        text: `${lowest.employeeName} tiene la valoración más baja (${lowest.overallScore.toFixed(1)}/5). Programar reunión de seguimiento.`,
        severity: lowest.overallScore < 2.5 ? 3 : 2,
      })
    }
  }

  // General self-assessment gap
  const selfAvg = competencyAvgs.reduce((s, c) => s + c.self, 0) / (competencyAvgs.filter((c) => c.self > 0).length || 1)
  const mgrAvg = competencyAvgs.reduce((s, c) => s + c.manager, 0) / (competencyAvgs.filter((c) => c.manager > 0).length || 1)
  if (selfAvg > 0 && mgrAvg > 0 && Math.abs(selfAvg - mgrAvg) >= 0.8) {
    insights.push({
      type: 'opportunity',
      text: selfAvg > mgrAvg
        ? `El equipo tiende a autoevaluarse por encima (${selfAvg.toFixed(1)}) de la evaluación de managers (${mgrAvg.toFixed(1)}). Promover calibración.`
        : `Los managers valoran al equipo (${mgrAvg.toFixed(1)}) mejor que las autoevaluaciones (${selfAvg.toFixed(1)}). Buena señal de humildad.`,
      severity: 2,
    })
  }

  return insights.sort((a, b) => b.severity - a.severity)
}
