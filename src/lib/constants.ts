export const APP_NAME = 'EvalIA'
export const BRAND_NAME = 'Carmen Rotter'
export const BRAND_TAGLINE = 'Consultoría en Gestión de Personas'

export const PLAN_LIMITS = {
  starter: {
    maxEmployees: 25,
    maxAdmins: 1,
    maxCampaignsPerMonth: 2,
    aiEnabled: false,
    eval360: false,
    pdfReports: false,
  },
  growth: {
    maxEmployees: 100,
    maxAdmins: 3,
    maxCampaignsPerMonth: -1,
    aiEnabled: true,
    eval360: false,
    pdfReports: true,
  },
  business: {
    maxEmployees: 500,
    maxAdmins: 10,
    maxCampaignsPerMonth: -1,
    aiEnabled: true,
    eval360: true,
    pdfReports: true,
  },
  enterprise: {
    maxEmployees: -1,
    maxAdmins: -1,
    maxCampaignsPerMonth: -1,
    aiEnabled: true,
    eval360: true,
    pdfReports: true,
  },
} as const

export const PRICING = [
  {
    name: 'Starter',
    plan: 'starter' as const,
    price: 49,
    description: 'Para equipos pequenos que empiezan con evaluaciones',
    features: [
      'Hasta 25 empleados',
      '1 administrador',
      '2 campanas al mes',
      'Templates predefinidos',
      'Resultados basicos',
    ],
  },
  {
    name: 'Growth',
    plan: 'growth' as const,
    price: 149,
    popular: true,
    description: 'Para empresas que quieren evaluaciones inteligentes',
    features: [
      'Hasta 100 empleados',
      '3 administradores',
      'Campanas ilimitadas',
      'Generacion IA de evaluaciones',
      'Analisis IA de resultados',
      'Informes PDF profesionales',
      'Evaluacion por pares',
    ],
  },
  {
    name: 'Business',
    plan: 'business' as const,
    price: 349,
    description: 'Para organizaciones grandes con evaluaciones 360',
    features: [
      'Hasta 500 empleados',
      '10 administradores',
      'Todo en Growth',
      'Evaluaciones 360 completas',
      'API de integraciones',
      'Soporte prioritario',
    ],
  },
] as const
