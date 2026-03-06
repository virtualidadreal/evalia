import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Building2,
  Users,
  ClipboardList,
  Sparkles,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  BarChart3,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { CompanySize } from '@/types/database'

// --- Schemas & Types ---

const companySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  industry: z.string().min(1, 'Selecciona un sector'),
  size: z.string().min(1, 'Selecciona un tamaño'),
})

type CompanyForm = z.infer<typeof companySchema>

interface EmployeeEntry {
  name: string
  email: string
  position: string
  department: string
}

const INDUSTRIES = [
  'Tecnología',
  'Marketing y Ventas',
  'Educación',
  'Salud',
  'Finanzas',
  'Legal',
  'Construcción',
  'Hostelería',
  'Otro',
]

const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
  { value: '1-10', label: '1-10 empleados' },
  { value: '11-50', label: '11-50 empleados' },
  { value: '51-200', label: '51-200 empleados' },
  { value: '201-500', label: '201-500 empleados' },
  { value: '500+', label: '500+ empleados' },
]

const SUGGESTED_DEPARTMENTS = [
  'Tecnología',
  'Marketing',
  'Ventas',
  'RRHH',
  'Finanzas',
  'Operaciones',
]

const STEP_LABELS = ['Tu empresa', 'Tu equipo', 'Tu primera evaluación']

const TEMPLATES = [
  {
    id: 'competencies',
    icon: ClipboardList,
    title: 'Competencias Generales',
    description: 'Evaluación estándar de competencias profesionales',
  },
  {
    id: '360',
    icon: Users,
    title: '360 Básico',
    description: 'Evaluación multi-evaluador: auto + jefe + pares',
  },
  {
    id: 'quarterly',
    icon: BarChart3,
    title: 'Desempeño Trimestral',
    description: 'Revisión de objetivos y rendimiento del trimestre',
  },
]

// --- Step Indicator ---

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((label, index) => (
        <div key={label} className="flex items-center">
          {index > 0 && (
            <div
              className={cn(
                'w-12 sm:w-20 h-0.5 transition-smooth',
                index <= currentStep ? 'bg-primary' : 'bg-border'
              )}
            />
          )}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                'size-8 rounded-full flex items-center justify-center text-sm font-medium transition-smooth border-2',
                index < currentStep
                  ? 'bg-primary border-primary text-primary-foreground'
                  : index === currentStep
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-border text-muted-foreground'
              )}
            >
              {index < currentStep ? (
                <Check className="size-4" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'text-xs font-medium whitespace-nowrap hidden sm:block',
                index <= currentStep
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Step 1: Company ---

function StepCompany({
  onNext,
  defaultValues,
}: {
  onNext: (data: CompanyForm) => void
  defaultValues?: Partial<CompanyForm>
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      industry: defaultValues?.industry ?? '',
      size: defaultValues?.size ?? '',
    },
  })

  const industry = watch('industry')
  const size = watch('size')

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div className="text-center mb-2">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="size-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Cuéntanos sobre tu empresa</CardTitle>
        <CardDescription className="mt-1">
          Esta información nos ayuda a personalizar tu experiencia
        </CardDescription>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-name">Nombre de empresa</Label>
          <Input
            id="company-name"
            placeholder="Mi empresa S.L."
            {...register('name')}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Sector</Label>
          <Select
            value={industry}
            onValueChange={(val) => setValue('industry', val, { shouldValidate: true })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un sector" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.industry && (
            <p className="text-sm text-destructive">{errors.industry.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Tamaño</Label>
          <Select
            value={size}
            onValueChange={(val) => setValue('size', val, { shouldValidate: true })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un tamaño" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.size && (
            <p className="text-sm text-destructive">{errors.size.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Siguiente
        <ArrowRight className="size-4" />
      </Button>
    </form>
  )
}

// --- Step 2: Team ---

function StepTeam({
  onNext,
  onBack,
  onSkip,
  departments: initialDepartments,
  employees: initialEmployees,
}: {
  onNext: (departments: string[], employees: EmployeeEntry[]) => void
  onBack: () => void
  onSkip: () => void
  departments: string[]
  employees: EmployeeEntry[]
}) {
  const [departments, setDepartments] = useState<string[]>(initialDepartments)
  const [deptInput, setDeptInput] = useState('')
  const [employees, setEmployees] = useState<EmployeeEntry[]>(initialEmployees)
  const [empForm, setEmpForm] = useState<EmployeeEntry>({
    name: '',
    email: '',
    position: '',
    department: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  function addDepartment(name: string) {
    const trimmed = name.trim()
    if (!trimmed || departments.includes(trimmed)) return
    setDepartments((prev) => [...prev, trimmed])
    setDeptInput('')
  }

  function removeDepartment(name: string) {
    setDepartments((prev) => prev.filter((d) => d !== name))
    setEmployees((prev) => prev.filter((e) => e.department !== name))
  }

  function addEmployee() {
    if (!empForm.name.trim() || !empForm.email.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    setEmployees((prev) => [...prev, { ...empForm }])
    setEmpForm({ name: '', email: '', position: '', department: '' })
  }

  function removeEmployee(index: number) {
    setEmployees((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleNext() {
    setIsSubmitting(true)
    try {
      await onNext(departments, employees)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <Users className="size-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Organiza tu equipo</CardTitle>
        <CardDescription className="mt-1">
          Puedes completar esto después si lo prefieres
        </CardDescription>
      </div>

      {/* Departments */}
      <div className="space-y-3">
        <Label>Departamentos</Label>
        <p className="text-sm text-muted-foreground">
          Añade los departamentos de tu empresa
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Nombre del departamento"
            value={deptInput}
            onChange={(e) => setDeptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addDepartment(deptInput)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => addDepartment(deptInput)}
          >
            <Plus className="size-4" />
            Añadir
          </Button>
        </div>

        {/* Suggested chips */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_DEPARTMENTS.filter((d) => !departments.includes(d)).map(
            (dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => addDepartment(dept)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-smooth cursor-pointer"
              >
                <Plus className="size-3" />
                {dept}
              </button>
            )
          )}
        </div>

        {/* Added departments */}
        {departments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {departments.map((dept) => (
              <Badge key={dept} variant="secondary" className="gap-1 pl-3 pr-1 py-1">
                {dept}
                <button
                  type="button"
                  onClick={() => removeDepartment(dept)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted transition-smooth"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Employees */}
      <div className="space-y-3">
        <Label>Empleados</Label>
        <p className="text-sm text-muted-foreground">
          Añade algunos empleados
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Nombre"
            value={empForm.name}
            onChange={(e) =>
              setEmpForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <Input
            placeholder="Email"
            type="email"
            value={empForm.email}
            onChange={(e) =>
              setEmpForm((prev) => ({ ...prev, email: e.target.value }))
            }
          />
          <Input
            placeholder="Puesto"
            value={empForm.position}
            onChange={(e) =>
              setEmpForm((prev) => ({ ...prev, position: e.target.value }))
            }
          />
          <div className="flex gap-2">
            <Select
              value={empForm.department}
              onValueChange={(val) =>
                setEmpForm((prev) => ({ ...prev, department: val }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={addEmployee}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Puedes importar CSV después
        </p>

        {/* Employee list */}
        {employees.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Nombre
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">
                    Puesto
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-3 py-2 text-foreground">{emp.name}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                      {emp.email}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                      {emp.position}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeEmployee(i)}
                        className="text-muted-foreground hover:text-destructive transition-smooth"
                      >
                        <X className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Anterior
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground"
          >
            Saltar
          </Button>
          <Button type="button" onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Siguiente
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Step 3: First Evaluation ---

function StepEvaluation({
  onBack,
  onFinish,
  selectedTemplate,
  onSelectTemplate,
}: {
  onBack: () => void
  onFinish: () => void
  selectedTemplate: string | null
  onSelectTemplate: (id: string) => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleFinish() {
    setIsSubmitting(true)
    try {
      await onFinish()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-ai-subtle">
          <Sparkles className="size-6 text-ai" />
        </div>
        <CardTitle className="text-xl">Crea tu primera evaluación</CardTitle>
        <CardDescription className="mt-1">
          Usa IA o escoge un template para empezar rápido
        </CardDescription>
      </div>

      {/* AI Section */}
      <div className="space-y-3">
        <Label>Describe qué quieres evaluar</Label>
        <Textarea
          placeholder="Evaluación integral del equipo de tecnología con foco en liderazgo y colaboración"
          rows={3}
        />
        <Button
          type="button"
          variant="ai"
          className="w-full"
          onClick={() => toast.info('Disponible próximamente')}
          disabled
        >
          <Sparkles className="size-4" />
          Generar evaluación con IA
        </Button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">
            ...o escoge un template predefinido
          </span>
        </div>
      </div>

      {/* Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TEMPLATES.map((template) => {
          const Icon = template.icon
          const isSelected = selectedTemplate === template.id
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                onSelectTemplate(template.id)
                toast.success('Template seleccionado')
              }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-smooth cursor-pointer',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-lg transition-smooth',
                  isSelected ? 'bg-primary/10' : 'bg-muted'
                )}
              >
                <Icon
                  className={cn(
                    'size-5 transition-smooth',
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </div>
              <span className="text-sm font-medium text-foreground">
                {template.title}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                {template.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Anterior
        </Button>
        <Button
          type="button"
          variant="premium"
          onClick={handleFinish}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Ir al dashboard
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// --- Main Onboarding Page ---

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { organization, setOrganization, membership } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(0)

  // Step data
  const [companyData, setCompanyData] = useState<CompanyForm | null>(null)
  const [departments, setDepartments] = useState<string[]>([])
  const [employees, setEmployees] = useState<EmployeeEntry[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const handleCompanyNext = useCallback(
    async (data: CompanyForm) => {
      if (!organization) {
        toast.error('No se encontró la organización')
        return
      }

      const { error } = await (supabase
        .from('organizations') as any)
        .update({
          name: data.name,
          industry: data.industry,
          size: data.size as CompanySize,
        })
        .eq('id', organization.id)

      if (error) {
        toast.error('Error al guardar: ' + error.message)
        return
      }

      setCompanyData(data)
      setOrganization(
        { ...organization, name: data.name, industry: data.industry, size: data.size as CompanySize },
        membership
      )
      setCurrentStep(1)
    },
    [organization, membership, setOrganization]
  )

  const handleTeamNext = useCallback(
    async (depts: string[], emps: EmployeeEntry[]) => {
      if (!organization) return

      // Save state first
      setDepartments(depts)
      setEmployees(emps)

      // Insert departments
      const deptIdMap: Record<string, string> = {}
      for (const deptName of depts) {
        const { data, error } = await (supabase
          .from('departments') as any)
          .insert({
            organization_id: organization.id,
            name: deptName,
          })
          .select('id')
          .single()

        if (error) {
          toast.error(`Error al crear departamento "${deptName}": ${error.message}`)
          return
        }
        if (data) {
          deptIdMap[deptName] = data.id
        }
      }

      // Insert employees
      for (const emp of emps) {
        const { error } = await (supabase.from('employees') as any).insert({
          organization_id: organization.id,
          department_id: emp.department ? deptIdMap[emp.department] || null : null,
          full_name: emp.name,
          email: emp.email,
          position: emp.position || 'Sin definir',
          seniority: 'mid',
          is_active: true,
        })

        if (error) {
          toast.error(`Error al crear empleado "${emp.name}": ${error.message}`)
          return
        }
      }

      setCurrentStep(2)
    },
    [organization]
  )

  const handleTeamSkip = useCallback(() => {
    setCurrentStep(2)
  }, [])

  const handleFinish = useCallback(async () => {
    if (!organization) return

    const { error } = await (supabase
      .from('organizations') as any)
      .update({ onboarding_completed: true })
      .eq('id', organization.id)

    if (error) {
      toast.error('Error al completar onboarding: ' + error.message)
      return
    }

    setOrganization(
      { ...organization, onboarding_completed: true },
      membership
    )

    navigate('/app')
  }, [organization, membership, setOrganization, navigate])

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <StepIndicator currentStep={currentStep} />

        <Card className="animate-fade-up">
          <CardHeader className="pb-0" />
          <CardContent>
            <div key={currentStep} className="animate-fade-up">
              {currentStep === 0 && (
                <StepCompany
                  onNext={handleCompanyNext}
                  defaultValues={companyData ?? undefined}
                />
              )}
              {currentStep === 1 && (
                <StepTeam
                  onNext={handleTeamNext}
                  onBack={() => setCurrentStep(0)}
                  onSkip={handleTeamSkip}
                  departments={departments}
                  employees={employees}
                />
              )}
              {currentStep === 2 && (
                <StepEvaluation
                  onBack={() => setCurrentStep(1)}
                  onFinish={handleFinish}
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={setSelectedTemplate}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
