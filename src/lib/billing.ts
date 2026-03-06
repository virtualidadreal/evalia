import type { SubscriptionPlan } from '@/types/database'

// ─── Plan Definitions ─────────────────────────────────────────────────────────

export interface PlanFeatures {
  name: string
  price: number // monthly in EUR
  priceAnnual: number // monthly price when billed annually
  maxEmployees: number
  maxAdmins: number
  maxCampaignsPerMonth: number
  aiEnabled: boolean
  evaluatorTypes: string[]
  reportTypes: string[]
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated'
  highlights: string[]
}

export const PLANS: Record<SubscriptionPlan, PlanFeatures> = {
  starter: {
    name: 'Starter',
    price: 0,
    priceAnnual: 0,
    maxEmployees: 10,
    maxAdmins: 1,
    maxCampaignsPerMonth: 2,
    aiEnabled: false,
    evaluatorTypes: ['self', 'manager'],
    reportTypes: ['individual'],
    supportLevel: 'community',
    highlights: [
      'Hasta 10 empleados',
      '2 campañas/mes',
      'Evaluación básica (auto + manager)',
      'Informes individuales',
    ],
  },
  growth: {
    name: 'Growth',
    price: 49,
    priceAnnual: 39,
    maxEmployees: 50,
    maxAdmins: 3,
    maxCampaignsPerMonth: 10,
    aiEnabled: true,
    evaluatorTypes: ['self', 'manager', 'peer'],
    reportTypes: ['individual', 'team'],
    supportLevel: 'email',
    highlights: [
      'Hasta 50 empleados',
      '10 campañas/mes',
      'Evaluación 360° (auto + manager + peers)',
      'Informes de equipo + IA',
      'Soporte por email',
    ],
  },
  business: {
    name: 'Business',
    price: 99,
    priceAnnual: 79,
    maxEmployees: 200,
    maxAdmins: 10,
    maxCampaignsPerMonth: 50,
    aiEnabled: true,
    evaluatorTypes: ['self', 'manager', 'peer', 'subordinate', 'external'],
    reportTypes: ['individual', 'team', 'department', 'company'],
    supportLevel: 'priority',
    highlights: [
      'Hasta 200 empleados',
      'Campañas ilimitadas',
      'Todos los tipos de evaluador',
      'Todos los informes + comparativas',
      'Soporte prioritario',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 249,
    priceAnnual: 199,
    maxEmployees: 9999,
    maxAdmins: 999,
    maxCampaignsPerMonth: 9999,
    aiEnabled: true,
    evaluatorTypes: ['self', 'manager', 'peer', 'subordinate', 'external'],
    reportTypes: ['individual', 'team', 'department', 'company', 'comparison'],
    supportLevel: 'dedicated',
    highlights: [
      'Empleados ilimitados',
      'Campañas ilimitadas',
      'Evaluación completa + benchmarking',
      'API de integración',
      'Soporte dedicado + SLA',
    ],
  },
}

export const PLAN_ORDER: SubscriptionPlan[] = ['starter', 'growth', 'business', 'enterprise']

export function getPlanIndex(plan: SubscriptionPlan): number {
  return PLAN_ORDER.indexOf(plan)
}

export function isUpgrade(from: SubscriptionPlan, to: SubscriptionPlan): boolean {
  return getPlanIndex(to) > getPlanIndex(from)
}

export function isDowngrade(from: SubscriptionPlan, to: SubscriptionPlan): boolean {
  return getPlanIndex(to) < getPlanIndex(from)
}

// ─── Mock Invoice Data ────────────────────────────────────────────────────────

export interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  plan: SubscriptionPlan
  pdfUrl: string | null
}

export function getMockInvoices(plan: SubscriptionPlan): Invoice[] {
  if (plan === 'starter') return []

  const planData = PLANS[plan]
  const now = new Date()
  const invoices: Invoice[] = []

  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    invoices.push({
      id: `inv_${Date.now()}_${i}`,
      date: date.toISOString(),
      amount: planData.price,
      status: i === 0 ? 'pending' : 'paid',
      plan,
      pdfUrl: null,
    })
  }

  return invoices
}

// ─── Mock Admin Stats ─────────────────────────────────────────────────────────

export interface AdminKPIs {
  totalOrgs: number
  activeOrgs: number
  trialingOrgs: number
  totalEmployees: number
  mrr: number
  churnRate: number
  avgEmployeesPerOrg: number
}

export interface AdminOrgRow {
  id: string
  name: string
  plan: SubscriptionPlan
  status: string
  employeeCount: number
  maxEmployees: number
  campaignsCreated: number
  createdAt: string
  trialEndsAt: string | null
  industry: string | null
}

export function getMockAdminKPIs(): AdminKPIs {
  return {
    totalOrgs: 47,
    activeOrgs: 32,
    trialingOrgs: 12,
    totalEmployees: 1284,
    mrr: 4_730,
    churnRate: 3.2,
    avgEmployeesPerOrg: 27.3,
  }
}

export function getMockAdminOrgs(): AdminOrgRow[] {
  const orgs: AdminOrgRow[] = [
    { id: '1', name: 'TechCorp SL', plan: 'business', status: 'active', employeeCount: 145, maxEmployees: 200, campaignsCreated: 23, createdAt: '2025-09-15T00:00:00Z', trialEndsAt: null, industry: 'Tecnología' },
    { id: '2', name: 'Marketing Pro', plan: 'growth', status: 'active', employeeCount: 34, maxEmployees: 50, campaignsCreated: 12, createdAt: '2025-11-01T00:00:00Z', trialEndsAt: null, industry: 'Marketing y Ventas' },
    { id: '3', name: 'EduLearn', plan: 'starter', status: 'trialing', employeeCount: 8, maxEmployees: 10, campaignsCreated: 2, createdAt: '2026-02-01T00:00:00Z', trialEndsAt: '2026-02-15T00:00:00Z', industry: 'Educación' },
    { id: '4', name: 'Clínica Salud+', plan: 'growth', status: 'active', employeeCount: 42, maxEmployees: 50, campaignsCreated: 8, createdAt: '2025-10-20T00:00:00Z', trialEndsAt: null, industry: 'Salud' },
    { id: '5', name: 'FinanzasYa', plan: 'enterprise', status: 'active', employeeCount: 520, maxEmployees: 9999, campaignsCreated: 45, createdAt: '2025-06-10T00:00:00Z', trialEndsAt: null, industry: 'Finanzas' },
    { id: '6', name: 'Constructora Albacete', plan: 'starter', status: 'trialing', employeeCount: 5, maxEmployees: 10, campaignsCreated: 1, createdAt: '2026-02-10T00:00:00Z', trialEndsAt: '2026-02-24T00:00:00Z', industry: 'Construcción' },
    { id: '7', name: 'LegalTech Partners', plan: 'business', status: 'active', employeeCount: 78, maxEmployees: 200, campaignsCreated: 15, createdAt: '2025-08-05T00:00:00Z', trialEndsAt: null, industry: 'Legal' },
    { id: '8', name: 'Hotel Mediterráneo', plan: 'growth', status: 'past_due', employeeCount: 28, maxEmployees: 50, campaignsCreated: 6, createdAt: '2025-12-01T00:00:00Z', trialEndsAt: null, industry: 'Hostelería' },
    { id: '9', name: 'StartupX', plan: 'starter', status: 'canceled', employeeCount: 3, maxEmployees: 10, campaignsCreated: 1, createdAt: '2025-11-15T00:00:00Z', trialEndsAt: null, industry: 'Tecnología' },
    { id: '10', name: 'Consulting Group', plan: 'business', status: 'active', employeeCount: 112, maxEmployees: 200, campaignsCreated: 31, createdAt: '2025-07-20T00:00:00Z', trialEndsAt: null, industry: 'Otro' },
  ]
  return orgs
}

export function getMockRevenueData(): { month: string; mrr: number; newOrgs: number }[] {
  return [
    { month: 'Sep', mrr: 1200, newOrgs: 5 },
    { month: 'Oct', mrr: 1800, newOrgs: 7 },
    { month: 'Nov', mrr: 2400, newOrgs: 8 },
    { month: 'Dic', mrr: 3100, newOrgs: 6 },
    { month: 'Ene', mrr: 3900, newOrgs: 9 },
    { month: 'Feb', mrr: 4730, newOrgs: 12 },
  ]
}
