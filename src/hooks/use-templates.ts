import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import type { EvalTemplate, EvalType, Competency, EvalQuestion, Rubric } from '@/types/database'

export function useTemplates(orgId: string | undefined) {
  return useQuery({
    queryKey: ['templates', orgId],
    queryFn: async () => {
      if (!orgId) return []
      const { data, error } = await (supabase.from('eval_templates') as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as EvalTemplate[]
    },
    enabled: !!orgId,
  })
}

export function useTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template', templateId],
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

interface CreateTemplateData {
  name: string
  description?: string | null
  eval_type: EvalType
  competencies: Competency[]
  questions: EvalQuestion[]
  rubric: Rubric
  ai_generated: boolean
  ai_prompt?: string | null
  is_template: boolean
  tags?: string[]
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  const { organization, user } = useAuthStore()

  return useMutation({
    mutationFn: async (templateData: CreateTemplateData) => {
      if (!organization) throw new Error('No hay organización')

      const { data, error } = await (supabase.from('eval_templates') as any)
        .insert({
          ...templateData,
          organization_id: organization.id,
          created_by: user?.id ?? null,
          tags: templateData.tags ?? [],
        })
        .select()
        .single()

      if (error) throw error
      return data as EvalTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', organization?.id] })
      toast.success('Evaluación guardada correctamente')
    },
    onError: (error: Error) => {
      toast.error('Error al guardar: ' + error.message)
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  const { organization } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CreateTemplateData> & { id: string }) => {
      const { data, error } = await (supabase.from('eval_templates') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as EvalTemplate
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates', organization?.id] })
      queryClient.invalidateQueries({ queryKey: ['template', data.id] })
      toast.success('Evaluación actualizada')
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar: ' + error.message)
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  const { organization } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('eval_templates') as any)
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', organization?.id] })
      toast.success('Evaluación eliminada')
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar: ' + error.message)
    },
  })
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient()
  const { organization, user } = useAuthStore()

  return useMutation({
    mutationFn: async (template: EvalTemplate) => {
      if (!organization) throw new Error('No hay organización')

      const { data, error } = await (supabase.from('eval_templates') as any)
        .insert({
          organization_id: organization.id,
          created_by: user?.id ?? null,
          name: `${template.name} (copia)`,
          description: template.description,
          eval_type: template.eval_type,
          competencies: template.competencies,
          questions: template.questions,
          rubric: template.rubric,
          ai_generated: false,
          ai_prompt: template.ai_prompt,
          is_template: template.is_template,
          tags: template.tags,
        })
        .select()
        .single()

      if (error) throw error
      return data as EvalTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', organization?.id] })
      toast.success('Evaluación duplicada')
    },
    onError: (error: Error) => {
      toast.error('Error al duplicar: ' + error.message)
    },
  })
}
