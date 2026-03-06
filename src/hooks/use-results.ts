import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AIReport, Campaign, Evaluation, EvalTemplate } from '@/types/database'

/** Fetch all completed campaigns for the org */
export function useCompletedCampaigns(orgId: string | undefined) {
  return useQuery({
    queryKey: ['completed-campaigns', orgId],
    queryFn: async () => {
      if (!orgId) return []
      const { data, error } = await (supabase.from('campaigns') as any)
        .select('*')
        .eq('organization_id', orgId)
        .in('status', ['completed', 'active'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Campaign[]
    },
    enabled: !!orgId,
  })
}

/** Fetch submitted evaluations for a campaign */
export function useSubmittedEvaluations(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['submitted-evaluations', campaignId],
    queryFn: async () => {
      if (!campaignId) return []
      const { data, error } = await (supabase.from('evaluations') as any)
        .select('*, employees:employee_id(id, full_name, email, position, department_id, seniority)')
        .eq('campaign_id', campaignId)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })

      if (error) throw error
      return data as (Evaluation & {
        employees: {
          id: string
          full_name: string
          email: string
          position: string
          department_id: string | null
          seniority: string
        } | null
      })[]
    },
    enabled: !!campaignId,
  })
}

/** Fetch template for a campaign */
export function useCampaignTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-template', templateId],
    queryFn: async () => {
      if (!templateId) return null
      const { data, error } = await (supabase.from('eval_templates') as any)
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) throw error
      return data as EvalTemplate
    },
    enabled: !!templateId,
  })
}

/** Fetch AI reports for a campaign */
export function useAIReports(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['ai-reports', campaignId],
    queryFn: async () => {
      if (!campaignId) return []
      const { data, error } = await (supabase.from('ai_reports') as any)
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as AIReport[]
    },
    enabled: !!campaignId,
  })
}

/** Fetch a single AI report */
export function useAIReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ['ai-report', reportId],
    queryFn: async () => {
      if (!reportId) return null
      const { data, error } = await (supabase.from('ai_reports') as any)
        .select('*')
        .eq('id', reportId)
        .single()

      if (error) throw error
      return data as AIReport
    },
    enabled: !!reportId,
  })
}
