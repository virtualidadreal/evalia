import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { OrgMember, OrgRole } from '@/types/database'

interface MemberWithEmail extends OrgMember {
  email?: string
}

export function useMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ['members', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('org_members') as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('joined_at')

      if (error) throw error
      return data as MemberWithEmail[]
    },
    enabled: !!orgId,
  })
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, orgId: _orgId, role }: { id: string; orgId: string; role: OrgRole }) => {
      const { data, error } = await (supabase.from('org_members') as any)
        .update({ role })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as OrgMember
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.orgId] })
      toast.success('Rol actualizado')
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar rol: ' + error.message)
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, orgId: _orgId }: { id: string; orgId: string }) => {
      const { error } = await (supabase.from('org_members') as any)
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.orgId] })
      toast.success('Miembro eliminado')
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar miembro: ' + error.message)
    },
  })
}
