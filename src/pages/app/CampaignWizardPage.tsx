import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import {
  useCreateCampaign,
  useLaunchCampaign,
  getAllowedEvaluatorTypes,
} from '@/hooks/use-campaigns'
import { useCreateEvaluations } from '@/hooks/use-evaluations'
import { useTemplates } from '@/hooks/use-templates'
import { useEmployees } from '@/hooks/use-employees'
import { useDepartments } from '@/hooks/use-departments'
import type {
  EvalTemplate,
  Employee,
  EvaluatorType,
  CampaignSettings,
} from '@/types/database'
import { cn } from '@/lib/utils'

// UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Icons
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Search,
  X,
  Rocket,
  Save,
  Users,
  Settings,
  UserCheck,
  ClipboardCheck,
  Plus,
  Trash2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmployeeWithDept = Employee & { departments: { name: string } | null }

interface ExternalEvaluator {
  name: string
  email: string
}

interface EvaluatorAssignment {
  employeeId: string
  self: boolean
  managerId: string | null
  peerIds: string[]
  externals: ExternalEvaluator[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVALUATOR_TYPE_LABELS: Record<EvaluatorType, string> = {
  self: 'Autoevaluación',
  manager: 'Manager',
  peer: 'Compañeros (peers)',
  subordinate: 'Subordinados',
  external: 'Evaluador externo',
}

const STEPS = [
  { id: 1, label: 'Configuración', icon: Settings },
  { id: 2, label: 'Empleados', icon: Users },
  { id: 3, label: 'Evaluadores', icon: UserCheck },
  { id: 4, label: 'Resumen', icon: ClipboardCheck },
]

// ---------------------------------------------------------------------------
// StepsIndicator
// ---------------------------------------------------------------------------

function StepsIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 animate-fade-up">
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id
        const isCurrent = currentStep === step.id
        const Icon = step.icon

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-[11px] whitespace-nowrap',
                  isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px w-10 mx-2 mb-5',
                  currentStep > step.id ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Configuration
// ---------------------------------------------------------------------------

interface Step1Props {
  name: string
  onNameChange: (v: string) => void
  templateId: string
  onTemplateIdChange: (v: string) => void
  templates: EvalTemplate[]
  startDate: string
  onStartDateChange: (v: string) => void
  endDate: string
  onEndDateChange: (v: string) => void
  evaluatorTypes: EvaluatorType[]
  onEvaluatorTypesChange: (types: EvaluatorType[]) => void
  allowedTypes: EvaluatorType[]
  anonymous: boolean
  onAnonymousChange: (v: boolean) => void
  reminders: boolean
  onRemindersChange: (v: boolean) => void
  reminderDays: number
  onReminderDaysChange: (v: number) => void
}

function Step1({
  name,
  onNameChange,
  templateId,
  onTemplateIdChange,
  templates,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  evaluatorTypes,
  onEvaluatorTypesChange,
  allowedTypes,
  anonymous,
  onAnonymousChange,
  reminders,
  onRemindersChange,
  reminderDays,
  onReminderDaysChange,
}: Step1Props) {
  const toggleType = (type: EvaluatorType) => {
    if (evaluatorTypes.includes(type)) {
      onEvaluatorTypesChange(evaluatorTypes.filter((t) => t !== type))
    } else {
      onEvaluatorTypesChange([...evaluatorTypes, type])
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la campaña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Nombre de la campaña *</Label>
            <Input
              id="campaign-name"
              placeholder="Ej: Evaluación trimestral Q1 2026"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Template de evaluación *</Label>
            <Select value={templateId} onValueChange={onTemplateIdChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Fecha de inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">Fecha de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipos de evaluadores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allowedTypes.map((type) => (
            <div key={type} className="flex items-center gap-3">
              <Checkbox
                id={`eval-type-${type}`}
                checked={evaluatorTypes.includes(type)}
                onCheckedChange={() => toggleType(type)}
              />
              <Label htmlFor={`eval-type-${type}`} className="cursor-pointer text-sm">
                {EVALUATOR_TYPE_LABELS[type]}
              </Label>
            </div>
          ))}
          {evaluatorTypes.length === 0 && (
            <p className="text-xs text-destructive">
              Selecciona al menos un tipo de evaluador
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Evaluaciones anónimas</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Los evaluadores no verán quién los evalúa
              </p>
            </div>
            <Switch checked={anonymous} onCheckedChange={onAnonymousChange} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Recordatorios automáticos</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enviar recordatorios a evaluadores pendientes
              </p>
            </div>
            <Switch checked={reminders} onCheckedChange={onRemindersChange} />
          </div>

          {reminders && (
            <div className="space-y-1.5 pl-4 border-l-2 border-primary/20">
              <Label htmlFor="reminder-days">Frecuencia (días)</Label>
              <Input
                id="reminder-days"
                type="number"
                min={1}
                max={30}
                value={reminderDays}
                onChange={(e) => onReminderDaysChange(Number(e.target.value))}
                className="w-24"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Employee Selection
// ---------------------------------------------------------------------------

interface Step2Props {
  employees: EmployeeWithDept[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  search: string
  onSearchChange: (v: string) => void
  departmentFilter: string
  onDepartmentFilterChange: (v: string) => void
  departments: { id: string; name: string }[]
}

function Step2({
  employees,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  search,
  onSearchChange,
  departmentFilter,
  onDepartmentFilterChange,
  departments,
}: Step2Props) {
  const filtered = useMemo(() => {
    let result = employees
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
      )
    }
    if (departmentFilter !== 'all') {
      result = result.filter((e) => e.department_id === departmentFilter)
    }
    return result
  }, [employees, search, departmentFilter])

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleado..."
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

        <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
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

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            Seleccionar todos
          </Button>
          <Button variant="outline" size="sm" onClick={onDeselectAll}>
            Deseleccionar
          </Button>
        </div>
      </div>

      {/* Selection count */}
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{selectedIds.size}</span>{' '}
        empleado{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
      </p>

      {/* Employee list */}
      <div className="rounded-md border max-h-96 overflow-y-auto divide-y">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron empleados
          </div>
        ) : (
          filtered.map((emp) => (
            <div
              key={emp.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
                selectedIds.has(emp.id) && 'bg-primary/5'
              )}
              onClick={() => onToggle(emp.id)}
            >
              <Checkbox
                checked={selectedIds.has(emp.id)}
                onCheckedChange={() => onToggle(emp.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{emp.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {emp.position} {emp.departments?.name ? `· ${emp.departments.name}` : ''}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Evaluator Matrix
// ---------------------------------------------------------------------------

interface Step3Props {
  employees: EmployeeWithDept[]
  selectedIds: Set<string>
  assignments: Map<string, EvaluatorAssignment>
  onAssignmentsChange: (assignments: Map<string, EvaluatorAssignment>) => void
  evaluatorTypes: EvaluatorType[]
}

function Step3({
  employees,
  selectedIds,
  assignments,
  onAssignmentsChange,
  evaluatorTypes,
}: Step3Props) {
  const selectedEmployees = employees.filter((e) => selectedIds.has(e.id))
  const hasSelf = evaluatorTypes.includes('self')
  const hasManager = evaluatorTypes.includes('manager')
  const hasPeer = evaluatorTypes.includes('peer')
  const hasExternal = evaluatorTypes.includes('external')

  const updateAssignment = (employeeId: string, partial: Partial<EvaluatorAssignment>) => {
    const next = new Map(assignments)
    const existing = next.get(employeeId) ?? {
      employeeId,
      self: hasSelf,
      managerId: null,
      peerIds: [],
      externals: [],
    }
    next.set(employeeId, { ...existing, ...partial })
    onAssignmentsChange(next)
  }

  const handleAutoAssign = () => {
    const next = new Map(assignments)
    for (const emp of selectedEmployees) {
      const existing = next.get(emp.id)
      next.set(emp.id, {
        employeeId: emp.id,
        self: hasSelf,
        managerId: emp.manager_id ?? existing?.managerId ?? null,
        peerIds: existing?.peerIds ?? [],
        externals: existing?.externals ?? [],
      })
    }
    onAssignmentsChange(next)
    toast.success('Managers auto-asignados desde datos de empleados')
  }

  const addExternal = (employeeId: string) => {
    const existing = assignments.get(employeeId)
    if (!existing) return
    updateAssignment(employeeId, {
      externals: [...existing.externals, { name: '', email: '' }],
    })
  }

  const updateExternal = (employeeId: string, index: number, field: 'name' | 'email', value: string) => {
    const existing = assignments.get(employeeId)
    if (!existing) return
    const updated = [...existing.externals]
    updated[index] = { ...updated[index], [field]: value }
    updateAssignment(employeeId, { externals: updated })
  }

  const removeExternal = (employeeId: string, index: number) => {
    const existing = assignments.get(employeeId)
    if (!existing) return
    updateAssignment(employeeId, {
      externals: existing.externals.filter((_, i) => i !== index),
    })
  }

  // Other employees for manager/peer selectors
  const otherEmployees = employees.filter((e) => e.is_active)

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configura quién evalúa a cada empleado
        </p>
        {hasManager && (
          <Button variant="outline" size="sm" onClick={handleAutoAssign}>
            Auto-asignar managers
          </Button>
        )}
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {selectedEmployees.map((emp) => {
          const assignment = assignments.get(emp.id) ?? {
            employeeId: emp.id,
            self: hasSelf,
            managerId: null,
            peerIds: [],
            externals: [],
          }

          return (
            <Card key={emp.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{emp.full_name}</p>
                  <span className="text-xs text-muted-foreground">{emp.position}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Self */}
                  {hasSelf && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={assignment.self}
                        onCheckedChange={(checked) =>
                          updateAssignment(emp.id, { self: !!checked })
                        }
                      />
                      <Label className="text-xs cursor-pointer">Autoevaluación</Label>
                    </div>
                  )}

                  {/* Manager */}
                  {hasManager && (
                    <div className="space-y-1">
                      <Label className="text-xs">Manager</Label>
                      <Select
                        value={assignment.managerId ?? 'none'}
                        onValueChange={(v) =>
                          updateAssignment(emp.id, {
                            managerId: v === 'none' ? null : v,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin manager</SelectItem>
                          {otherEmployees
                            .filter((o) => o.id !== emp.id)
                            .map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.full_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Peers */}
                {hasPeer && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Compañeros (peers)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {otherEmployees
                        .filter((o) => o.id !== emp.id)
                        .map((o) => {
                          const selected = assignment.peerIds.includes(o.id)
                          return (
                            <Badge
                              key={o.id}
                              variant={selected ? 'default' : 'outline'}
                              className="cursor-pointer text-xs"
                              onClick={() => {
                                const peerIds = selected
                                  ? assignment.peerIds.filter((p) => p !== o.id)
                                  : [...assignment.peerIds, o.id]
                                updateAssignment(emp.id, { peerIds })
                              }}
                            >
                              {o.full_name}
                            </Badge>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* Externals */}
                {hasExternal && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Evaluadores externos</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addExternal(emp.id)}
                      >
                        <Plus className="h-3 w-3" />
                        Añadir
                      </Button>
                    </div>
                    {assignment.externals.map((ext, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          placeholder="Nombre"
                          value={ext.name}
                          onChange={(e) => updateExternal(emp.id, i, 'name', e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                        <Input
                          placeholder="Email"
                          type="email"
                          value={ext.email}
                          onChange={(e) => updateExternal(emp.id, i, 'email', e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => removeExternal(emp.id, i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Summary
// ---------------------------------------------------------------------------

interface Step4Props {
  name: string
  templateName: string
  startDate: string
  endDate: string
  selectedCount: number
  evaluatorTypes: EvaluatorType[]
  totalEvaluations: number
  anonymous: boolean
  reminders: boolean
  reminderDays: number
}

function Step4({
  name,
  templateName,
  startDate,
  endDate,
  selectedCount,
  evaluatorTypes,
  totalEvaluations,
  anonymous,
  reminders,
  reminderDays,
}: Step4Props) {
  return (
    <div className="space-y-4 animate-fade-up">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de la campaña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Nombre</p>
              <p className="text-sm font-medium">{name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Template</p>
              <p className="text-sm font-medium">{templateName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha inicio</p>
              <p className="text-sm font-medium">{startDate || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha fin</p>
              <p className="text-sm font-medium">{endDate || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Empleados</p>
              <p className="text-sm font-medium">{selectedCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total evaluaciones</p>
              <p className="text-sm font-semibold text-primary">{totalEvaluations}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground mb-2">Tipos de evaluador</p>
            <div className="flex flex-wrap gap-1.5">
              {evaluatorTypes.map((t) => (
                <Badge key={t} variant="secondary">
                  {EVALUATOR_TYPE_LABELS[t]}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={anonymous ? 'text-primary' : 'text-muted-foreground'}>
                {anonymous ? '✓' : '✗'}
              </span>
              <span>Evaluaciones anónimas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={reminders ? 'text-primary' : 'text-muted-foreground'}>
                {reminders ? '✓' : '✗'}
              </span>
              <span>
                Recordatorios{reminders ? ` (cada ${reminderDays} días)` : ''}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CancelDialog
// ---------------------------------------------------------------------------

function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar campaña</DialogTitle>
          <DialogDescription>
            ¿Estás seguro? Se perderán todos los datos introducidos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Seguir editando
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Descartar y salir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// CampaignWizardPage (main)
// ---------------------------------------------------------------------------

export default function CampaignWizardPage() {
  const navigate = useNavigate()
  const { organization } = useAuthStore()
  const orgId = organization?.id
  const plan = organization?.subscription_plan ?? 'starter'
  const allowedTypes = getAllowedEvaluatorTypes(plan)

  // Queries
  const { data: templates = [] } = useTemplates(orgId)
  const { data: employees = [] } = useEmployees(orgId, { isActive: true })
  const { data: departments = [] } = useDepartments(orgId)

  // Mutations
  const createCampaign = useCreateCampaign()
  const launchCampaign = useLaunchCampaign()
  const createEvaluations = useCreateEvaluations()

  // Wizard state
  const [step, setStep] = useState(1)
  const [cancelOpen, setCancelOpen] = useState(false)

  // Step 1 state
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [evaluatorTypes, setEvaluatorTypes] = useState<EvaluatorType[]>(['self', 'manager'])
  const [anonymous, setAnonymous] = useState(false)
  const [reminders, setReminders] = useState(true)
  const [reminderDays, setReminderDays] = useState(3)

  // Step 2 state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())
  const [empSearch, setEmpSearch] = useState('')
  const [empDeptFilter, setEmpDeptFilter] = useState('all')

  // Step 3 state
  const [assignments, setAssignments] = useState<Map<string, EvaluatorAssignment>>(new Map())

  // Step 4 derived
  const selectedTemplate = templates.find((t) => t.id === templateId)

  const totalEvaluations = useMemo(() => {
    let count = 0
    for (const empId of selectedEmployeeIds) {
      const a = assignments.get(empId)
      if (!a) continue
      if (a.self) count++
      if (a.managerId) count++
      count += a.peerIds.length
      count += a.externals.filter((e) => e.email.trim()).length
    }
    return count
  }, [selectedEmployeeIds, assignments])

  const isSaving = createCampaign.isPending || launchCampaign.isPending || createEvaluations.isPending

  // Initialize assignments when moving to step 3
  const initializeAssignments = useCallback(() => {
    const hasSelf = evaluatorTypes.includes('self')
    const next = new Map(assignments)
    for (const empId of selectedEmployeeIds) {
      if (!next.has(empId)) {
        const emp = employees.find((e) => e.id === empId)
        next.set(empId, {
          employeeId: empId,
          self: hasSelf,
          managerId: emp?.manager_id ?? null,
          peerIds: [],
          externals: [],
        })
      }
    }
    // Remove assignments for deselected employees
    for (const key of next.keys()) {
      if (!selectedEmployeeIds.has(key)) {
        next.delete(key)
      }
    }
    setAssignments(next)
  }, [selectedEmployeeIds, evaluatorTypes, employees, assignments])

  // Validation per step
  const validateStep = (s: number): boolean => {
    switch (s) {
      case 1:
        if (!name.trim()) {
          toast.error('El nombre de la campaña es obligatorio')
          return false
        }
        if (!templateId) {
          toast.error('Selecciona un template de evaluación')
          return false
        }
        if (evaluatorTypes.length === 0) {
          toast.error('Selecciona al menos un tipo de evaluador')
          return false
        }
        return true
      case 2:
        if (selectedEmployeeIds.size === 0) {
          toast.error('Selecciona al menos un empleado')
          return false
        }
        return true
      case 3:
        return true
      default:
        return true
    }
  }

  const goNext = () => {
    if (!validateStep(step)) return
    if (step === 2) {
      initializeAssignments()
    }
    setStep((s) => Math.min(s + 1, 4))
  }

  const goPrev = () => {
    setStep((s) => Math.max(s - 1, 1))
  }

  // Employee toggle handlers
  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllEmployees = () => {
    setSelectedEmployeeIds(new Set(employees.map((e) => e.id)))
  }

  const deselectAllEmployees = () => {
    setSelectedEmployeeIds(new Set())
  }

  // Build evaluation records from assignments
  const buildEvaluationRecords = (campaignId: string) => {
    const records: Array<{
      campaign_id: string
      employee_id: string
      evaluator_type: string
      evaluator_name?: string | null
      evaluator_email?: string | null
      evaluator_employee_id?: string | null
    }> = []

    for (const empId of selectedEmployeeIds) {
      const a = assignments.get(empId)
      if (!a) continue

      if (a.self) {
        records.push({
          campaign_id: campaignId,
          employee_id: empId,
          evaluator_type: 'self',
          evaluator_employee_id: empId,
        })
      }

      if (a.managerId) {
        const mgr = employees.find((e) => e.id === a.managerId)
        records.push({
          campaign_id: campaignId,
          employee_id: empId,
          evaluator_type: 'manager',
          evaluator_employee_id: a.managerId,
          evaluator_name: mgr?.full_name ?? null,
          evaluator_email: mgr?.email ?? null,
        })
      }

      for (const peerId of a.peerIds) {
        const peer = employees.find((e) => e.id === peerId)
        records.push({
          campaign_id: campaignId,
          employee_id: empId,
          evaluator_type: 'peer',
          evaluator_employee_id: peerId,
          evaluator_name: peer?.full_name ?? null,
          evaluator_email: peer?.email ?? null,
        })
      }

      for (const ext of a.externals) {
        if (!ext.email.trim()) continue
        records.push({
          campaign_id: campaignId,
          employee_id: empId,
          evaluator_type: 'external',
          evaluator_name: ext.name.trim() || null,
          evaluator_email: ext.email.trim(),
        })
      }
    }

    return records
  }

  // Save as draft
  const handleSaveDraft = async () => {
    if (!name.trim()) {
      toast.error('El nombre de la campaña es obligatorio')
      return
    }

    const settings: CampaignSettings = {
      evaluator_types: evaluatorTypes,
      anonymous,
      reminders,
      ...(reminders ? { reminder_frequency_days: reminderDays } : {}),
    }

    try {
      await createCampaign.mutateAsync({
        name: name.trim(),
        template_id: templateId || (null as unknown as string),
        start_date: startDate || null,
        end_date: endDate || null,
        settings,
      })
      navigate('/app/campaigns')
    } catch {
      // Error handled by mutation
    }
  }

  // Launch campaign
  const handleLaunch = async () => {
    if (!validateStep(1) || !validateStep(2)) return

    const settings: CampaignSettings = {
      evaluator_types: evaluatorTypes,
      anonymous,
      reminders,
      ...(reminders ? { reminder_frequency_days: reminderDays } : {}),
    }

    try {
      // 1. Create campaign
      const campaign = await createCampaign.mutateAsync({
        name: name.trim(),
        template_id: templateId,
        start_date: startDate || null,
        end_date: endDate || null,
        settings,
      })

      // 2. Create evaluations
      const records = buildEvaluationRecords(campaign.id)
      if (records.length > 0) {
        await createEvaluations.mutateAsync(records)
      }

      // 3. Launch campaign
      await launchCampaign.mutateAsync(campaign.id)

      navigate(`/app/campaigns/${campaign.id}`)
    } catch {
      // Errors handled by mutations
    }
  }

  const handleCancel = () => {
    if (name || templateId || selectedEmployeeIds.size > 0) {
      setCancelOpen(true)
    } else {
      navigate('/app/campaigns')
    }
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-up">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva campaña</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Configura y lanza una campaña de evaluación
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <StepsIndicator currentStep={step} />

      {/* Step content */}
      {step === 1 && (
        <Step1
          name={name}
          onNameChange={setName}
          templateId={templateId}
          onTemplateIdChange={setTemplateId}
          templates={templates}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          evaluatorTypes={evaluatorTypes}
          onEvaluatorTypesChange={setEvaluatorTypes}
          allowedTypes={allowedTypes}
          anonymous={anonymous}
          onAnonymousChange={setAnonymous}
          reminders={reminders}
          onRemindersChange={setReminders}
          reminderDays={reminderDays}
          onReminderDaysChange={setReminderDays}
        />
      )}

      {step === 2 && (
        <Step2
          employees={employees}
          selectedIds={selectedEmployeeIds}
          onToggle={toggleEmployee}
          onSelectAll={selectAllEmployees}
          onDeselectAll={deselectAllEmployees}
          search={empSearch}
          onSearchChange={setEmpSearch}
          departmentFilter={empDeptFilter}
          onDepartmentFilterChange={setEmpDeptFilter}
          departments={departments}
        />
      )}

      {step === 3 && (
        <Step3
          employees={employees}
          selectedIds={selectedEmployeeIds}
          assignments={assignments}
          onAssignmentsChange={setAssignments}
          evaluatorTypes={evaluatorTypes}
        />
      )}

      {step === 4 && (
        <Step4
          name={name}
          templateName={selectedTemplate?.name ?? '—'}
          startDate={startDate}
          endDate={endDate}
          selectedCount={selectedEmployeeIds.size}
          evaluatorTypes={evaluatorTypes}
          totalEvaluations={totalEvaluations}
          anonymous={anonymous}
          reminders={reminders}
          reminderDays={reminderDays}
        />
      )}

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" onClick={handleCancel}>
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={goPrev}>
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
            )}

            {step < 4 ? (
              <Button onClick={goNext}>
                <span className="hidden sm:inline">Siguiente</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Guardar borrador</span>
                  <span className="sm:hidden">Borrador</span>
                </Button>
                <Button onClick={handleLaunch} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Lanzar campaña</span>
                  <span className="sm:hidden">Lanzar</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cancel dialog */}
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={() => navigate('/app/campaigns')}
      />
    </div>
  )
}
