import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Department } from '@/types/database'

export function useDepartments(orgId: string | undefined) {
  return useQuery({
    queryKey: ['departments', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('departments') as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('name')

      if (error) throw error
      return data as Department[]
    },
    enabled: !!orgId,
  })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dept: { organization_id: string; name: string; description?: string }) => {
      const { data, error } = await (supabase.from('departments') as any)
        .insert(dept)
        .select()
        .single()

      if (error) throw error
      return data as Department
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments', variables.organization_id] })
      toast.success('Departamento creado')
    },
    onError: (error: Error) => {
      toast.error('Error al crear departamento: ' + error.message)
    },
  })
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, orgId, ...updates }: { id: string; orgId: string; name?: string; description?: string | null }) => {
      const { data, error } = await (supabase.from('departments') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Department
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments', variables.orgId] })
      toast.success('Departamento actualizado')
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar departamento: ' + error.message)
    },
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const { error } = await (supabase.from('departments') as any)
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments', variables.orgId] })
      toast.success('Departamento eliminado')
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar departamento: ' + error.message)
    },
  })
}
