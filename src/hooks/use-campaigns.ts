import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import type { Campaign, CampaignStatus, CampaignSettings, EvaluatorType } from '@/types/database'

export function useCampaigns(orgId: string | undefined) {
  return useQuery({
    queryKey: ['campaigns', orgId],
    queryFn: async () => {
      if (!orgId) return []
      const { data, error } = await (supabase.from('campaigns') as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Campaign[]
    },
    enabled: !!orgId,
  })
}

export function useCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null
      const { data, error } = await (supabase.from('campaigns') as any)
        .select('*')
        .eq('id', campaignId)
        .single()

      if (error) throw error
      return data as Campaign
    },
    enabled: !!campaignId,
  })
}

interface CreateCampaignData {
  name: string
  description?: string | null
  template_id: string
  start_date?: string | null
  end_date?: string | null
  settings: CampaignSettings
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  const { organization, user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: CreateCampaignData) => {
      if (!organization) throw new Error('No hay organización')

      const { data: campaign, error } = await (supabase.from('campaigns') as any)
        .insert({
          ...data,
          organization_id: organization.id,
          created_by: user?.id ?? null,
          status: 'draft' as CampaignStatus,
          total_evaluations: 0,
          completed_evaluations: 0,
        })
        .select()
        .single()

      if (error) throw error
      return campaign as Campaign
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', organization?.id] })
      toast.success('Campaña creada correctamente')
    },
    onError: (error: Error) => {
      toast.error('Error al crear campaña: ' + error.message)
    },
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()
  const { organization } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await (supabase.from('campaigns') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Campaign
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', organization?.id] })
      queryClient.invalidateQueries({ queryKey: ['campaign', data.id] })
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar campaña: ' + error.message)
    },
  })
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient()
  const { organization } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('campaigns') as any)
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', organization?.id] })
      toast.success('Campaña eliminada')
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar: ' + error.message)
    },
  })
}

export function useLaunchCampaign() {
  const queryClient = useQueryClient()
  const { organization } = useAuthStore()

  return useMutation({
    mutationFn: async (campaignId: string) => {
      // Update campaign status to active
      const { data, error } = await (supabase.from('campaigns') as any)
        .update({
          status: 'active' as CampaignStatus,
          start_date: new Date().toISOString(),
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) throw error
      return data as Campaign
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', organization?.id] })
      queryClient.invalidateQueries({ queryKey: ['campaign', data.id] })
      toast.success('¡Campaña lanzada! Las invitaciones se enviarán a los evaluadores.')
    },
    onError: (error: Error) => {
      toast.error('Error al lanzar campaña: ' + error.message)
    },
  })
}

export function usePauseCampaign() {
  const queryClient = useQueryClient()
  const { organization } = useAuthStore()

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await (supabase.from('campaigns') as any)
        .update({ status: 'paused' as CampaignStatus })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) throw error
      return data as Campaign
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', organization?.id] })
      queryClient.invalidateQueries({ queryKey: ['campaign', data.id] })
      toast.success('Campaña pausada')
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message)
    },
  })
}

export function useCompleteCampaign() {
  const queryClient = useQueryClient()
  const { organization } = useAuthStore()

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await (supabase.from('campaigns') as any)
        .update({
          status: 'completed' as CampaignStatus,
          end_date: new Date().toISOString(),
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) throw error
      return data as Campaign
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', organization?.id] })
      queryClient.invalidateQueries({ queryKey: ['campaign', data.id] })
      toast.success('Campaña finalizada')
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message)
    },
  })
}

/** Helper: Allowed evaluator types by plan */
export function getAllowedEvaluatorTypes(plan: string): EvaluatorType[] {
  switch (plan) {
    case 'starter':
      return ['self', 'manager']
    case 'growth':
      return ['self', 'manager', 'peer']
    case 'business':
    case 'enterprise':
      return ['self', 'manager', 'peer', 'subordinate', 'external']
    default:
      return ['self', 'manager']
  }
}

/** Helper: Campaign limit check */
export function getCampaignLimit(plan: string): number | null {
  switch (plan) {
    case 'starter':
      return 2
    case 'growth':
    case 'business':
    case 'enterprise':
      return null // unlimited
    default:
      return 2
  }
}
