import { useState, useMemo, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useImportEmployees,
} from '@/hooks/use-employees'
import { useDepartments } from '@/hooks/use-departments'
import type { Employee, SeniorityLevel } from '@/types/database'
import { cn } from '@/lib/utils'

// UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Icons
import {
  Users,
  Plus,
  Upload,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  FileUp,
  Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  manager: 'Manager',
  director: 'Director',
  'c-level': 'C-Level',
}

const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string }[] = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'c-level', label: 'C-Level' },
]

const SENIORITY_BADGE_VARIANT: Record<SeniorityLevel, string> = {
  junior: 'outline',
  mid: 'secondary',
  senior: 'default',
  lead: 'active',
  manager: 'active',
  director: 'ai',
  'c-level': 'ai',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
  ]
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Zod schema for employee form
// ---------------------------------------------------------------------------

const employeeSchema = z.object({
  full_name: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido'),
  position: z.string().min(1, 'El puesto es obligatorio'),
  department_id: z.string().optional(),
  seniority: z.string().min(1, 'Selecciona un nivel'),
  hire_date: z.string().optional(),
  manager_id: z.string().optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------

interface CSVRow {
  full_name: string
  email: string
  position: string
  department_name: string
  seniority: string
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const separator = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase())

  const nameIdx = headers.findIndex((h) => h === 'nombre' || h === 'full_name' || h === 'name')
  const emailIdx = headers.findIndex((h) => h === 'email' || h === 'correo')
  const posIdx = headers.findIndex((h) => h === 'puesto' || h === 'position' || h === 'cargo')
  const deptIdx = headers.findIndex((h) => h === 'departamento' || h === 'department')
  const senIdx = headers.findIndex((h) => h === 'seniority' || h === 'nivel')

  return lines.slice(1).reduce<CSVRow[]>((acc, line) => {
    const cols = line.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ''))
    if (!cols[nameIdx] || !cols[emailIdx]) return acc
    acc.push({
      full_name: cols[nameIdx] ?? '',
      email: cols[emailIdx] ?? '',
      position: cols[posIdx] ?? '',
      department_name: cols[deptIdx] ?? '',
      seniority: cols[senIdx] ?? '',
    })
    return acc
  }, [])
}

// ---------------------------------------------------------------------------
// PlanLimitBanner
// ---------------------------------------------------------------------------

function PlanLimitBanner({
  employeeCount,
  maxEmployees,
}: {
  employeeCount: number
  maxEmployees: number
}) {
  const pct = maxEmployees > 0 ? Math.round((employeeCount / maxEmployees) * 100) : 0
  if (pct < 80) return null

  const atLimit = employeeCount >= maxEmployees

  return (
    <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 animate-fade-up">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        <span className="text-sm font-medium">
          {atLimit
            ? 'Has alcanzado el límite de tu plan'
            : `Estás al ${pct}% del límite de empleados de tu plan`}
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={() => toast.info('Próximamente')}>
        Ampliar plan
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FiltersBar
// ---------------------------------------------------------------------------

interface FiltersBarProps {
  search: string
  onSearchChange: (v: string) => void
  departmentId: string
  onDepartmentChange: (v: string) => void
  seniority: string
  onSeniorityChange: (v: string) => void
  showInactive: boolean
  onShowInactiveChange: (v: boolean) => void
  departments: { id: string; name: string }[]
}

function FiltersBar({
  search,
  onSearchChange,
  departmentId,
  onDepartmentChange,
  seniority,
  onSeniorityChange,
  showInactive,
  onShowInactiveChange,
  departments,
}: FiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fade-up">
      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Department filter */}
      <Select value={departmentId} onValueChange={onDepartmentChange}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Departamento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Seniority filter */}
      <Select value={seniority} onValueChange={onSeniorityChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Seniority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {SENIORITY_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active toggle */}
      <div className="flex items-center gap-2 ml-auto">
        <Switch
          checked={showInactive}
          onCheckedChange={onShowInactiveChange}
          size="sm"
        />
        <Label className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
          Mostrar inactivos
        </Label>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmployeeFormDialog (Add / Edit)
// ---------------------------------------------------------------------------

type EmployeeWithDept = Employee & { departments: { name: string } | null }

interface EmployeeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingEmployee: EmployeeWithDept | null
  orgId: string
  departments: { id: string; name: string }[]
  employees: EmployeeWithDept[]
  onSubmitCreate: (data: EmployeeFormData) => Promise<void>
  onSubmitUpdate: (id: string, data: EmployeeFormData) => Promise<void>
  isSubmitting: boolean
}

function EmployeeFormDialog({
  open,
  onOpenChange,
  editingEmployee,
  orgId,
  departments,
  employees,
  onSubmitCreate,
  onSubmitUpdate,
  isSubmitting,
}: EmployeeFormDialogProps) {
  const isEdit = !!editingEmployee

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: editingEmployee
      ? {
          full_name: editingEmployee.full_name,
          email: editingEmployee.email,
          position: editingEmployee.position,
          department_id: editingEmployee.department_id ?? undefined,
          seniority: editingEmployee.seniority,
          hire_date: editingEmployee.hire_date ?? undefined,
          manager_id: editingEmployee.manager_id ?? undefined,
        }
      : {
          full_name: '',
          email: '',
          position: '',
          department_id: undefined,
          seniority: '',
          hire_date: undefined,
          manager_id: undefined,
        },
  })

  const seniorityValue = watch('seniority')
  const departmentValue = watch('department_id')
  const managerValue = watch('manager_id')

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      if (isEdit && editingEmployee) {
        await onSubmitUpdate(editingEmployee.id, data)
      } else {
        await onSubmitCreate(data)
      }
      reset()
      onOpenChange(false)
    } catch {
      // Error already handled by mutation
    }
  }

  const managerOptions = employees.filter(
    (e) => e.id !== editingEmployee?.id && e.is_active
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar empleado' : 'Añadir empleado'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los datos del empleado.'
              : 'Completa los datos para registrar un nuevo empleado.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* full_name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nombre completo *</Label>
            <Input id="full_name" placeholder="Ej: María García López" {...register('full_name')} />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          {/* email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" placeholder="maria@empresa.com" {...register('email')} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* position */}
          <div className="space-y-1.5">
            <Label htmlFor="position">Puesto *</Label>
            <Input id="position" placeholder="Ej: Diseñadora UX" {...register('position')} />
            {errors.position && (
              <p className="text-xs text-destructive">{errors.position.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* department */}
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Select
                value={departmentValue ?? ''}
                onValueChange={(v) => setValue('department_id', v === 'none' ? undefined : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin departamento</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* seniority */}
            <div className="space-y-1.5">
              <Label>Seniority *</Label>
              <Select
                value={seniorityValue ?? ''}
                onValueChange={(v) => setValue('seniority', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {SENIORITY_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.seniority && (
                <p className="text-xs text-destructive">{errors.seniority.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* hire_date */}
            <div className="space-y-1.5">
              <Label htmlFor="hire_date">Fecha de alta</Label>
              <Input id="hire_date" type="date" {...register('hire_date')} />
            </div>

            {/* manager */}
            <div className="space-y-1.5">
              <Label>Manager</Label>
              <Select
                value={managerValue ?? ''}
                onValueChange={(v) => setValue('manager_id', v === 'none' ? undefined : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin manager</SelectItem>
                  {managerOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear empleado'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// DeleteConfirmDialog
// ---------------------------------------------------------------------------

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  onConfirm: () => void
  isDeleting: boolean
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  employeeName,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar empleado</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar a <strong>{employeeName}</strong>? Esta acción no
            se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// CSVImportDialog
// ---------------------------------------------------------------------------

interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  departments: { id: string; name: string }[]
  onImport: (rows: CSVRow[]) => Promise<void>
  isImporting: boolean
}

function CSVImportDialog({
  open,
  onOpenChange,
  orgId,
  departments,
  onImport,
  isImporting,
}: CSVImportDialogProps) {
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [parseError, setParseError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParseError('')
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const rows = parseCSV(text)
        if (rows.length === 0) {
          setParseError('No se encontraron filas válidas. Asegúrate de que el CSV tenga columnas: nombre, email, puesto, departamento, seniority')
          setParsedRows([])
          return
        }
        setParsedRows(rows)
      } catch {
        setParseError('Error al leer el archivo CSV')
        setParsedRows([])
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    await onImport(parsedRows)
    setParsedRows([])
    setFileName('')
    onOpenChange(false)
  }

  const handleClose = (val: boolean) => {
    if (!val) {
      setParsedRows([])
      setFileName('')
      setParseError('')
    }
    onOpenChange(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar empleados desde CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV con las columnas: nombre, email, puesto, departamento, seniority
          </DialogDescription>
        </DialogHeader>

        {/* Upload area */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            'hover:border-primary/50 hover:bg-primary/5',
            fileName ? 'border-primary/30 bg-primary/5' : 'border-border'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          {fileName ? (
            <p className="text-sm font-medium">{fileName}</p>
          ) : (
            <>
              <p className="text-sm font-medium">Haz clic para seleccionar un archivo CSV</p>
              <p className="text-xs text-muted-foreground mt-1">
                Separado por comas o punto y coma
              </p>
            </>
          )}
        </div>

        {parseError && (
          <p className="text-sm text-destructive">{parseError}</p>
        )}

        {/* Preview table */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Vista previa ({parsedRows.length} empleado{parsedRows.length !== 1 ? 's' : ''})
            </p>
            <div className="rounded-md border max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Seniority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 20).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.full_name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.position || '—'}</TableCell>
                      <TableCell>{row.department_name || '—'}</TableCell>
                      <TableCell>{row.seniority || 'mid'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedRows.length > 20 && (
              <p className="text-xs text-muted-foreground">
                Mostrando 20 de {parsedRows.length} filas
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedRows.length === 0 || isImporting}
          >
            {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
            Importar {parsedRows.length > 0 ? `(${parsedRows.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// EmployeesPage (main)
// ---------------------------------------------------------------------------

export default function EmployeesPage() {
  const { organization } = useAuthStore()
  const orgId = organization?.id

  // State
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [seniorityFilter, setSeniorityFilter] = useState('all')
  const [showInactive, setShowInactive] = useState(false)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithDept | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeWithDept | null>(null)
  const [showCSVDialog, setShowCSVDialog] = useState(false)

  // Build filters for the query (server-side)
  const queryFilters = useMemo(() => {
    const filters: {
      departmentId?: string
      seniority?: SeniorityLevel
      isActive?: boolean
    } = {}
    if (departmentFilter !== 'all') filters.departmentId = departmentFilter
    if (seniorityFilter !== 'all') filters.seniority = seniorityFilter as SeniorityLevel
    if (!showInactive) filters.isActive = true
    return filters
  }, [departmentFilter, seniorityFilter, showInactive])

  // Queries
  const { data: employees = [], isLoading } = useEmployees(orgId, queryFilters)
  const { data: departments = [] } = useDepartments(orgId)

  // Mutations
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const deleteEmployee = useDeleteEmployee()
  const importEmployees = useImportEmployees()

  // Client-side search filter
  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
    )
  }, [employees, search])

  // Plan limits
  const employeeCount = organization?.employee_count ?? 0
  const maxEmployees = organization?.max_employees ?? 0
  const atPlanLimit = employeeCount >= maxEmployees

  // Handlers
  const handleCreate = useCallback(
    async (data: EmployeeFormData) => {
      if (!orgId) return
      await createEmployee.mutateAsync({
        organization_id: orgId,
        full_name: data.full_name,
        email: data.email,
        position: data.position,
        department_id: data.department_id && data.department_id !== 'none' ? data.department_id : null,
        seniority: data.seniority as SeniorityLevel,
        hire_date: data.hire_date || null,
        manager_id: data.manager_id && data.manager_id !== 'none' ? data.manager_id : null,
      })
    },
    [orgId, createEmployee]
  )

  const handleUpdate = useCallback(
    async (id: string, data: EmployeeFormData) => {
      if (!orgId) return
      await updateEmployee.mutateAsync({
        id,
        orgId,
        full_name: data.full_name,
        email: data.email,
        position: data.position,
        department_id: data.department_id && data.department_id !== 'none' ? data.department_id : null,
        seniority: data.seniority as SeniorityLevel,
        hire_date: data.hire_date || null,
        manager_id: data.manager_id && data.manager_id !== 'none' ? data.manager_id : null,
      })
    },
    [orgId, updateEmployee]
  )

  const handleDelete = useCallback(async () => {
    if (!orgId || !deletingEmployee) return
    await deleteEmployee.mutateAsync({ id: deletingEmployee.id, orgId })
    setDeletingEmployee(null)
  }, [orgId, deletingEmployee, deleteEmployee])

  const handleCSVImport = useCallback(
    async (rows: CSVRow[]) => {
      if (!orgId) return
      const departmentMap: Record<string, string> = {}
      departments.forEach((d) => {
        departmentMap[d.name.toLowerCase()] = d.id
        departmentMap[d.name] = d.id
      })

      await importEmployees.mutateAsync({
        orgId,
        employees: rows.map((r) => ({
          full_name: r.full_name,
          email: r.email,
          position: r.position,
          department_name: r.department_name,
          seniority: (SENIORITY_OPTIONS.find(
            (s) => s.value === r.seniority.toLowerCase() || s.label.toLowerCase() === r.seniority.toLowerCase()
          )?.value ?? 'mid') as SeniorityLevel,
        })),
        departmentMap,
      })
    },
    [orgId, departments, importEmployees]
  )

  const handleEditClick = (employee: EmployeeWithDept) => {
    setEditingEmployee(employee)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Plan limit banner */}
      <PlanLimitBanner employeeCount={employeeCount} maxEmployees={maxEmployees} />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empleados</h1>
          <p className="text-muted-foreground mt-1">
            {employeeCount} empleado{employeeCount !== 1 ? 's' : ''} en tu organización
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCSVDialog(true)}
            disabled={atPlanLimit}
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            disabled={atPlanLimit}
          >
            <Plus className="h-4 w-4" />
            Añadir empleado
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        departmentId={departmentFilter}
        onDepartmentChange={setDepartmentFilter}
        seniority={seniorityFilter}
        onSeniorityChange={setSeniorityFilter}
        showInactive={showInactive}
        onShowInactiveChange={setShowInactive}
        departments={departments}
      />

      {/* Data table or empty state */}
      {filteredEmployees.length === 0 ? (
        employees.length === 0 && !search ? (
          <EmptyState
            icon={Users}
            title="Sin empleados"
            description="Añade empleados para empezar a evaluarlos"
            action={{
              label: 'Añadir empleado',
              onClick: () => setShowAddDialog(true),
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-up">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-sm font-medium text-foreground">Sin resultados</p>
            <p className="text-sm text-muted-foreground mt-1">
              No se encontraron empleados con los filtros actuales
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearch('')
                setDepartmentFilter('all')
                setSeniorityFilter('all')
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )
      ) : (
        <div className="rounded-md border animate-fade-up">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Nombre</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Seniority</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[60px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  {/* Name + avatar */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0',
                          getAvatarColor(employee.full_name)
                        )}
                      >
                        {getInitials(employee.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {employee.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {employee.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Position */}
                  <TableCell>
                    <span className="text-sm">{employee.position}</span>
                  </TableCell>

                  {/* Department */}
                  <TableCell>
                    <span className="text-sm">
                      {employee.departments?.name ?? 'Sin departamento'}
                    </span>
                  </TableCell>

                  {/* Seniority */}
                  <TableCell>
                    <Badge
                      variant={
                        SENIORITY_BADGE_VARIANT[employee.seniority] as
                          | 'outline'
                          | 'secondary'
                          | 'default'
                          | 'active'
                          | 'ai'
                      }
                    >
                      {SENIORITY_LABELS[employee.seniority]}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          employee.is_active ? 'bg-emerald-500' : 'bg-red-500'
                        )}
                      />
                      <span className="text-sm">
                        {employee.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditClick(employee)}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingEmployee(employee)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add employee dialog */}
      {showAddDialog && (
        <EmployeeFormDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          editingEmployee={null}
          orgId={orgId ?? ''}
          departments={departments}
          employees={employees}
          onSubmitCreate={handleCreate}
          onSubmitUpdate={handleUpdate}
          isSubmitting={createEmployee.isPending}
        />
      )}

      {/* Edit employee dialog */}
      {editingEmployee && (
        <EmployeeFormDialog
          key={editingEmployee.id}
          open={!!editingEmployee}
          onOpenChange={(open) => {
            if (!open) setEditingEmployee(null)
          }}
          editingEmployee={editingEmployee}
          orgId={orgId ?? ''}
          departments={departments}
          employees={employees}
          onSubmitCreate={handleCreate}
          onSubmitUpdate={handleUpdate}
          isSubmitting={updateEmployee.isPending}
        />
      )}

      {/* Delete confirm dialog */}
      {deletingEmployee && (
        <DeleteConfirmDialog
          open={!!deletingEmployee}
          onOpenChange={(open) => {
            if (!open) setDeletingEmployee(null)
          }}
          employeeName={deletingEmployee.full_name}
          onConfirm={handleDelete}
          isDeleting={deleteEmployee.isPending}
        />
      )}

      {/* CSV import dialog */}
      {showCSVDialog && (
        <CSVImportDialog
          open={showCSVDialog}
          onOpenChange={setShowCSVDialog}
          orgId={orgId ?? ''}
          departments={departments}
          onImport={handleCSVImport}
          isImporting={importEmployees.isPending}
        />
      )}
    </div>
  )
}
