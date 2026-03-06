import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Employee, SeniorityLevel } from '@/types/database'

interface EmployeeFilters {
  departmentId?: string
  seniority?: SeniorityLevel
  isActive?: boolean
}

export function useEmployees(orgId: string | undefined, filters?: EmployeeFilters) {
  return useQuery({
    queryKey: ['employees', orgId, filters],
    queryFn: async () => {
      let query = (supabase.from('employees') as any)
        .select('*, departments(name)')
        .eq('organization_id', orgId)
        .order('full_name')

      if (filters?.departmentId) {
        query = query.eq('department_id', filters.departmentId)
      }
      if (filters?.seniority) {
        query = query.eq('seniority', filters.seniority)
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }

      const { data, error } = await query

      if (error) throw error
      return data as (Employee & { departments: { name: string } | null })[]
    },
    enabled: !!orgId,
  })
}

interface CreateEmployeeData {
  organization_id: string
  full_name: string
  email: string
  position: string
  department_id?: string | null
  seniority: SeniorityLevel
  hire_date?: string | null
  manager_id?: string | null
  is_active?: boolean
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (employee: CreateEmployeeData) => {
      const { data, error } = await (supabase.from('employees') as any)
        .insert({ ...employee, is_active: employee.is_active ?? true })
        .select('*, departments(name)')
        .single()

      if (error) throw error
      return data as Employee
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees', variables.organization_id] })
      toast.success('Empleado creado')
    },
    onError: (error: Error) => {
      toast.error('Error al crear empleado: ' + error.message)
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, orgId, ...updates }: {
      id: string
      orgId: string
      full_name?: string
      email?: string
      position?: string
      department_id?: string | null
      seniority?: SeniorityLevel
      hire_date?: string | null
      manager_id?: string | null
      is_active?: boolean
    }) => {
      const { data, error } = await (supabase.from('employees') as any)
        .update(updates)
        .eq('id', id)
        .select('*, departments(name)')
        .single()

      if (error) throw error
      return data as Employee
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees', variables.orgId] })
      toast.success('Empleado actualizado')
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar empleado: ' + error.message)
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const { error } = await (supabase.from('employees') as any)
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees', variables.orgId] })
      toast.success('Empleado eliminado')
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar empleado: ' + error.message)
    },
  })
}

interface CSVEmployee {
  full_name: string
  email: string
  position: string
  department_name?: string
  seniority?: SeniorityLevel
}

export function useImportEmployees() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orgId, employees, departmentMap }: {
      orgId: string
      employees: CSVEmployee[]
      departmentMap: Record<string, string>
    }) => {
      const rows = employees.map((emp) => ({
        organization_id: orgId,
        full_name: emp.full_name,
        email: emp.email,
        position: emp.position || 'Sin definir',
        department_id: emp.department_name ? departmentMap[emp.department_name] || null : null,
        seniority: emp.seniority || 'mid' as SeniorityLevel,
        is_active: true,
      }))

      const { data, error } = await (supabase.from('employees') as any)
        .insert(rows)
        .select()

      if (error) throw error
      return data as Employee[]
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees', variables.orgId] })
      toast.success(`${data.length} empleados importados`)
    },
    onError: (error: Error) => {
      toast.error('Error al importar empleados: ' + error.message)
    },
  })
}
