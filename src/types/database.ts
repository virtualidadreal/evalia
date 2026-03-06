// Enums
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+'
export type OrgRole = 'admin' | 'manager' | 'viewer'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
export type SubscriptionPlan = 'starter' | 'growth' | 'business' | 'enterprise'
export type EvalType = 'competencies' | 'performance' | 'potential' | 'integral' | '360'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'
export type EvaluationStatus = 'pending' | 'in_progress' | 'submitted' | 'expired'
export type EvaluatorType = 'self' | 'manager' | 'peer' | 'subordinate' | 'external'
export type ReportType = 'individual' | 'team' | 'department' | 'company' | 'comparison'
export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | 'c-level'

// Interfaces
export interface Organization {
  id: string
  name: string
  slug: string
  industry: string | null
  size: CompanySize
  logo_url: string | null
  stripe_customer_id: string | null
  subscription_status: SubscriptionStatus
  subscription_plan: SubscriptionPlan
  subscription_period_end: string | null
  trial_ends_at: string | null
  max_employees: number
  max_admins: number
  max_campaigns_per_month: number
  ai_enabled: boolean
  employee_count: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  organization_id: string
  user_id: string
  role: OrgRole
  invited_by: string | null
  invited_at: string
  joined_at: string
}

export interface Department {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  organization_id: string
  department_id: string | null
  full_name: string
  email: string
  position: string
  seniority: SeniorityLevel
  hire_date: string | null
  manager_id: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Competency {
  id: string
  name: string
  description: string
  weight: number
  indicators: Array<{
    id: string
    text: string
    level: number
  }>
}

export interface EvalQuestion {
  id: string
  competency_id: string
  text: string
  type: 'scale' | 'text' | 'choice'
  options?: string[]
  required: boolean
}

export interface Rubric {
  scale: {
    min: number
    max: number
    labels: Record<number, string>
  }
  weights: Record<string, number>
}

export interface EvalTemplate {
  id: string
  organization_id: string
  created_by: string | null
  name: string
  description: string | null
  eval_type: EvalType
  competencies: Competency[]
  questions: EvalQuestion[]
  rubric: Rubric
  ai_generated: boolean
  ai_prompt: string | null
  is_template: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export interface CampaignSettings {
  evaluator_types: EvaluatorType[]
  anonymous: boolean
  reminders: boolean
  reminder_frequency_days?: number
}

export interface Campaign {
  id: string
  organization_id: string
  template_id: string | null
  created_by: string | null
  name: string
  description: string | null
  status: CampaignStatus
  start_date: string | null
  end_date: string | null
  settings: CampaignSettings
  total_evaluations: number
  completed_evaluations: number
  created_at: string
  updated_at: string
}

export interface EvaluationResponse {
  value: number | string
  comment?: string
}

export interface Evaluation {
  id: string
  campaign_id: string
  employee_id: string
  evaluator_type: EvaluatorType
  evaluator_name: string | null
  evaluator_email: string | null
  evaluator_employee_id: string | null
  token: string
  status: EvaluationStatus
  responses: Record<string, EvaluationResponse>
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface Insight {
  type: 'strength' | 'risk' | 'opportunity'
  text: string
  severity: number
  competency_id?: string
}

export interface CompetencyScore {
  avg: number
  self?: number
  manager?: number
  peers?: number
}

export interface AIReport {
  id: string
  organization_id: string
  campaign_id: string
  employee_id: string | null
  report_type: ReportType
  title: string
  content: Record<string, unknown>
  insights: Insight[]
  scores: {
    overall: number
    by_competency: Record<string, CompetencyScore>
    by_evaluator: Record<string, number>
  }
  pdf_url: string | null
  created_at: string
}

// Supabase Database type
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Organization>
        Relationships: []
      }
      org_members: {
        Row: OrgMember
        Insert: Omit<OrgMember, 'id'> & { id?: string }
        Update: Partial<OrgMember>
        Relationships: []
      }
      departments: {
        Row: Department
        Insert: Omit<Department, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Department>
        Relationships: []
      }
      employees: {
        Row: Employee
        Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Employee>
        Relationships: []
      }
      eval_templates: {
        Row: EvalTemplate
        Insert: Omit<EvalTemplate, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<EvalTemplate>
        Relationships: []
      }
      campaigns: {
        Row: Campaign
        Insert: Omit<Campaign, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Campaign>
        Relationships: []
      }
      evaluations: {
        Row: Evaluation
        Insert: Omit<Evaluation, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Evaluation>
        Relationships: []
      }
      ai_reports: {
        Row: AIReport
        Insert: Omit<AIReport, 'id' | 'created_at'> & { id?: string }
        Update: Partial<AIReport>
        Relationships: []
      }
    }
    Views: Record<string, { Row: Record<string, unknown>; Relationships: never[] }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
