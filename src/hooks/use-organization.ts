import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import type { Organization, CompanySize } from '@/types/database'

export function useUpdateOrganization() {
  const { organization, membership, setOrganization } = useAuthStore()

  return useMutation({
    mutationFn: async (updates: {
      name?: string
      industry?: string | null
      size?: CompanySize
      logo_url?: string | null
    }) => {
      if (!organization) throw new Error('No organization found')

      const { data, error } = await (supabase.from('organizations') as any)
        .update(updates)
        .eq('id', organization.id)
        .select()
        .single()

      if (error) throw error
      return data as Organization
    },
    onSuccess: (data) => {
      setOrganization(data, membership)
      toast.success('Organización actualizada')
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar: ' + error.message)
    },
  })
}
