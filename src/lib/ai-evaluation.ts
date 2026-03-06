import type { Competency, EvalQuestion, Rubric, EvalType } from '@/types/database'

/**
 * Simulates AI evaluation generation.
 * In production this would call a Supabase Edge Function (`generate-evaluation`)
 * that uses OpenAI to generate competencies, questions, and rubric.
 */

interface AIGenerationResult {
  competencies: Competency[]
  questions: EvalQuestion[]
  rubric: Rubric
}

function generateId(): string {
  return crypto.randomUUID()
}

const DEFAULT_RUBRIC: Rubric = {
  scale: {
    min: 1,
    max: 5,
    labels: {
      1: 'Insuficiente',
      2: 'Mejorable',
      3: 'Adecuado',
      4: 'Bueno',
      5: 'Excelente',
    },
  },
  weights: {},
}

export async function generateEvaluation(
  prompt: string,
  evalType: EvalType
): Promise<AIGenerationResult> {
  // Simulate AI delay
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000))

  // Generate competencies based on prompt context
  const competencies = generateCompetencies(prompt, evalType)
  const questions = generateQuestions(competencies)
  const rubric: Rubric = {
    ...DEFAULT_RUBRIC,
    weights: Object.fromEntries(
      competencies.map((c) => [c.id, c.weight])
    ),
  }

  return { competencies, questions, rubric }
}

function generateCompetencies(prompt: string, evalType: EvalType): Competency[] {
  const promptLower = prompt.toLowerCase()

  // Base competencies by eval type
  const baseCompetencies: Record<string, { name: string; description: string }[]> = {
    competencies: [
      { name: 'Conocimiento técnico', description: 'Dominio de las habilidades y herramientas necesarias para el puesto' },
      { name: 'Resolución de problemas', description: 'Capacidad para identificar, analizar y resolver problemas de forma eficaz' },
      { name: 'Trabajo en equipo', description: 'Colaboración efectiva con compañeros y aportación al equipo' },
      { name: 'Comunicación', description: 'Claridad y eficacia en la comunicación oral y escrita' },
      { name: 'Orientación a resultados', description: 'Enfoque en lograr objetivos y cumplir plazos' },
    ],
    performance: [
      { name: 'Productividad', description: 'Volumen y calidad del trabajo producido en relación a los objetivos' },
      { name: 'Calidad del trabajo', description: 'Precisión, atención al detalle y estándares de calidad' },
      { name: 'Iniciativa', description: 'Proactividad para identificar y actuar sobre oportunidades de mejora' },
      { name: 'Gestión del tiempo', description: 'Organización eficiente del tiempo y priorización de tareas' },
      { name: 'Cumplimiento de objetivos', description: 'Grado de consecución de las metas establecidas' },
    ],
    potential: [
      { name: 'Capacidad de aprendizaje', description: 'Rapidez y eficacia para adquirir nuevos conocimientos' },
      { name: 'Adaptabilidad', description: 'Flexibilidad ante cambios y nuevas situaciones' },
      { name: 'Liderazgo emergente', description: 'Potencial para asumir roles de mayor responsabilidad' },
      { name: 'Visión estratégica', description: 'Capacidad para entender el contexto global y aportar ideas de mejora' },
      { name: 'Innovación', description: 'Creatividad y propuesta de soluciones novedosas' },
    ],
    integral: [
      { name: 'Competencia técnica', description: 'Nivel de dominio en las habilidades clave del puesto' },
      { name: 'Liderazgo y gestión', description: 'Capacidad para guiar, motivar e inspirar al equipo' },
      { name: 'Colaboración', description: 'Trabajo efectivo con otros equipos y departamentos' },
      { name: 'Comunicación', description: 'Eficacia comunicativa en todos los niveles de la organización' },
      { name: 'Desarrollo profesional', description: 'Compromiso con el crecimiento personal y profesional continuo' },
    ],
    '360': [
      { name: 'Liderazgo', description: 'Inspira y guía al equipo hacia los objetivos comunes' },
      { name: 'Comunicación interpersonal', description: 'Escucha activa y comunicación efectiva con todas las partes' },
      { name: 'Trabajo en equipo', description: 'Fomenta la colaboración y construye relaciones de confianza' },
      { name: 'Toma de decisiones', description: 'Capacidad para tomar decisiones informadas y oportunas' },
      { name: 'Gestión del conflicto', description: 'Manejo constructivo de desacuerdos y tensiones' },
    ],
  }

  // Get base or default
  let selected = baseCompetencies[evalType] ?? baseCompetencies.integral

  // Adjust based on prompt keywords
  if (promptLower.includes('técnico') || promptLower.includes('developer') || promptLower.includes('programador')) {
    selected = [
      { name: 'Liderazgo técnico', description: 'Capacidad para tomar decisiones técnicas acertadas y guiar al equipo' },
      { name: 'Calidad del código', description: 'Mantenibilidad, testing y buenas prácticas de desarrollo' },
      { name: 'Arquitectura y diseño', description: 'Capacidad para diseñar soluciones escalables y mantenibles' },
      { name: 'Colaboración técnica', description: 'Code reviews, pair programming y transferencia de conocimiento' },
      { name: 'Resolución de problemas', description: 'Debugging, análisis de incidencias y resolución eficaz' },
    ]
  } else if (promptLower.includes('ventas') || promptLower.includes('comercial') || promptLower.includes('sales')) {
    selected = [
      { name: 'Captación de clientes', description: 'Capacidad para identificar y convertir oportunidades de negocio' },
      { name: 'Negociación', description: 'Habilidad para cerrar acuerdos beneficiosos para ambas partes' },
      { name: 'Relación con el cliente', description: 'Construcción y mantenimiento de relaciones comerciales' },
      { name: 'Conocimiento del producto', description: 'Dominio de la oferta y capacidad de adaptarla al cliente' },
      { name: 'Cumplimiento de cuota', description: 'Grado de consecución de los objetivos de venta' },
    ]
  } else if (promptLower.includes('liderazgo') || promptLower.includes('manager') || promptLower.includes('gestión')) {
    selected = [
      { name: 'Liderazgo de equipos', description: 'Capacidad para motivar, desarrollar y gestionar personas' },
      { name: 'Delegación efectiva', description: 'Asignación inteligente de tareas y seguimiento adecuado' },
      { name: 'Visión estratégica', description: 'Alineación del equipo con los objetivos organizacionales' },
      { name: 'Gestión del cambio', description: 'Capacidad para liderar transformaciones y adaptaciones' },
      { name: 'Comunicación directiva', description: 'Claridad en la transmisión de expectativas y feedback' },
    ]
  }

  // Distribute weights evenly
  const count = selected.length
  const baseWeight = Math.floor(100 / count)
  const remainder = 100 - baseWeight * count

  return selected.map((comp, i) => ({
    id: generateId(),
    name: comp.name,
    description: comp.description,
    weight: baseWeight + (i < remainder ? 1 : 0),
    indicators: [
      { id: generateId(), text: `Demuestra ${comp.name.toLowerCase()} de forma consistente`, level: 5 },
      { id: generateId(), text: `Aplica ${comp.name.toLowerCase()} en la mayoría de situaciones`, level: 3 },
      { id: generateId(), text: `Necesita mejorar en ${comp.name.toLowerCase()}`, level: 1 },
    ],
  }))
}

function generateQuestions(competencies: Competency[]): EvalQuestion[] {
  const questions: EvalQuestion[] = []

  for (const comp of competencies) {
    // Scale question per competency
    questions.push({
      id: generateId(),
      competency_id: comp.id,
      text: `¿Cómo valorarías la capacidad de ${comp.name.toLowerCase()} de esta persona?`,
      type: 'scale',
      required: true,
    })

    // Text question per competency
    questions.push({
      id: generateId(),
      competency_id: comp.id,
      text: `Describe un ejemplo concreto que demuestre la ${comp.name.toLowerCase()} de esta persona`,
      type: 'text',
      required: false,
    })
  }

  // Add general open question
  questions.push({
    id: generateId(),
    competency_id: competencies[0].id,
    text: '¿Qué áreas de mejora identificas para esta persona?',
    type: 'text',
    required: false,
  })

  questions.push({
    id: generateId(),
    competency_id: competencies[0].id,
    text: '¿Qué fortalezas destacarías de esta persona?',
    type: 'text',
    required: false,
  })

  return questions
}

// Predefined templates
export const PREDEFINED_TEMPLATES: Omit<
  import('@/types/database').EvalTemplate,
  'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at'
>[] = [
  {
    name: 'Evaluación de desempeño general',
    description: 'Template estándar para evaluar el desempeño general de cualquier empleado. Incluye competencias transversales aplicables a todos los roles.',
    eval_type: 'performance',
    competencies: generateCompetencies('desempeño general', 'performance'),
    questions: [],
    rubric: DEFAULT_RUBRIC,
    ai_generated: false,
    ai_prompt: null,
    is_template: true,
    tags: ['general', 'desempeño'],
  },
  {
    name: 'Evaluación 360° de liderazgo',
    description: 'Evaluación multidireccional para roles de gestión y liderazgo. Mide competencias directivas desde múltiples perspectivas.',
    eval_type: '360',
    competencies: generateCompetencies('liderazgo manager gestión', '360'),
    questions: [],
    rubric: DEFAULT_RUBRIC,
    ai_generated: false,
    ai_prompt: null,
    is_template: true,
    tags: ['liderazgo', '360', 'manager'],
  },
  {
    name: 'Evaluación técnica - Desarrollo',
    description: 'Diseñada para evaluar competencias técnicas de equipos de desarrollo de software. Incluye calidad de código, arquitectura y colaboración técnica.',
    eval_type: 'competencies',
    competencies: generateCompetencies('developer técnico programador', 'competencies'),
    questions: [],
    rubric: DEFAULT_RUBRIC,
    ai_generated: false,
    ai_prompt: null,
    is_template: true,
    tags: ['técnico', 'desarrollo', 'software'],
  },
  {
    name: 'Evaluación de potencial',
    description: 'Identifica empleados con alto potencial de crecimiento. Evalúa capacidad de aprendizaje, adaptabilidad, liderazgo emergente e innovación.',
    eval_type: 'potential',
    competencies: generateCompetencies('potencial crecimiento', 'potential'),
    questions: [],
    rubric: DEFAULT_RUBRIC,
    ai_generated: false,
    ai_prompt: null,
    is_template: true,
    tags: ['potencial', 'crecimiento', 'talento'],
  },
  {
    name: 'Evaluación integral de equipo comercial',
    description: 'Template completo para equipos de ventas y comerciales. Evalúa captación, negociación, relación con el cliente y cumplimiento de objetivos.',
    eval_type: 'integral',
    competencies: generateCompetencies('ventas comercial sales', 'integral'),
    questions: [],
    rubric: DEFAULT_RUBRIC,
    ai_generated: false,
    ai_prompt: null,
    is_template: true,
    tags: ['comercial', 'ventas', 'integral'],
  },
]

// Fill questions for predefined templates
PREDEFINED_TEMPLATES.forEach((t) => {
  t.questions = generateQuestions(t.competencies)
  t.rubric = {
    ...DEFAULT_RUBRIC,
    weights: Object.fromEntries(t.competencies.map((c) => [c.id, c.weight])),
  }
})
