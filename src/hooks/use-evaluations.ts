import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Evaluation, EvaluationStatus, EvaluationResponse } from '@/types/database'

export function useEvaluations(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['evaluations', campaignId],
    queryFn: async () => {
      if (!campaignId) return []
      const { data, error } = await (supabase.from('evaluations') as any)
        .select('*, employees:employee_id(full_name, email, position, department_id)')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as (Evaluation & {
        employees: { full_name: string; email: string; position: string; department_id: string | null } | null
      })[]
    },
    enabled: !!campaignId,
  })
}

export function useEvaluationByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['evaluation-token', token],
    queryFn: async () => {
      if (!token) return null

      // Get evaluation with campaign and template info
      const { data, error } = await (supabase.from('evaluations') as any)
        .select(`
          *,
          employees:employee_id(full_name, position),
          campaigns:campaign_id(
            name,
            description,
            status,
            settings,
            template_id,
            organizations:organization_id(name, logo_url)
          )
        `)
        .eq('token', token)
        .single()

      if (error) throw error

      // Get the template for questions
      if (data?.campaigns?.template_id) {
        const { data: template, error: tplErr } = await (supabase.from('eval_templates') as any)
          .select('competencies, questions, rubric')
          .eq('id', data.campaigns.template_id)
          .single()

        if (!tplErr && template) {
          data._template = template
        }
      }

      return data
    },
    enabled: !!token,
  })
}

export function useSubmitEvaluation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      responses,
    }: {
      id: string
      responses: Record<string, EvaluationResponse>
    }) => {
      const { data, error } = await (supabase.from('evaluations') as any)
        .update({
          responses,
          status: 'submitted' as EvaluationStatus,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Evaluation
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-token'] })
      queryClient.invalidateQueries({ queryKey: ['evaluations', data.campaign_id] })
    },
    onError: (error: Error) => {
      toast.error('Error al enviar evaluación: ' + error.message)
    },
  })
}

export function useSavePartialEvaluation() {
  return useMutation({
    mutationFn: async ({
      id,
      responses,
    }: {
      id: string
      responses: Record<string, EvaluationResponse>
    }) => {
      const { data, error } = await (supabase.from('evaluations') as any)
        .update({
          responses,
          status: 'in_progress' as EvaluationStatus,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Evaluation
    },
    onError: (error: Error) => {
      toast.error('Error al guardar progreso: ' + error.message)
    },
  })
}

export function useCreateEvaluations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      evaluations: Array<{
        campaign_id: string
        employee_id: string
        evaluator_type: string
        evaluator_name?: string | null
        evaluator_email?: string | null
        evaluator_employee_id?: string | null
      }>
    ) => {
      const records = evaluations.map((e) => ({
        ...e,
        token: crypto.randomUUID(),
        status: 'pending' as EvaluationStatus,
        responses: {},
      }))

      const { data, error } = await (supabase.from('evaluations') as any)
        .insert(records)
        .select()

      if (error) throw error
      return data as Evaluation[]
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['evaluations', data[0].campaign_id] })
      }
    },
    onError: (error: Error) => {
      toast.error('Error al crear evaluaciones: ' + error.message)
    },
  })
}
