import { useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUpdateOrganization } from '@/hooks/use-organization'
import {
  useMembers,
  useUpdateMemberRole,
  useRemoveMember,
} from '@/hooks/use-members'
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/use-departments'
import { PLANS, PLAN_ORDER, isUpgrade, isDowngrade, getMockInvoices, type Invoice } from '@/lib/billing'
import type { SubscriptionPlan } from '@/types/database'
import { PlanLimitIndicator } from '@/components/organizations/PlanLimitIndicator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { OrgRole, CompanySize, Department } from '@/types/database'
import {
  Settings,
  Users,
  CreditCard,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Shield,
  Loader2,
  Upload,
  X,
  Sparkles,
  Receipt,
  Check,
  ArrowRight,
  AlertTriangle,
  Crown,
  Zap,
  Building,
  Rocket,
  Download,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

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
] as const

const COMPANY_SIZES: CompanySize[] = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
]

const ROLES: { value: OrgRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'viewer', label: 'Viewer' },
]

const ROLE_COLORS: Record<OrgRole, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  manager: 'secondary',
  viewer: 'outline',
}

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Período de prueba',
  active: 'Activa',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
  unpaid: 'Impagada',
}

const STATUS_VARIANTS: Record<string, 'active' | 'draft' | 'paused' | 'destructive'> = {
  trialing: 'paused',
  active: 'active',
  past_due: 'paused',
  canceled: 'destructive',
  unpaid: 'destructive',
}

const PLAN_ICONS: Record<SubscriptionPlan, typeof Rocket> = {
  starter: Rocket,
  growth: Zap,
  business: Building,
  enterprise: Crown,
}

const CANCEL_REASONS = [
  'El precio es demasiado alto',
  'No utilizo todas las funcionalidades',
  'Cambio a otra herramienta',
  'La empresa ya no necesita evaluaciones',
  'Problemas técnicos',
  'Otro',
] as const

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: 'Pagada',
  pending: 'Pendiente',
  failed: 'Fallida',
}

const INVOICE_STATUS_VARIANTS: Record<string, 'active' | 'paused' | 'destructive'> = {
  paid: 'active',
  pending: 'paused',
  failed: 'destructive',
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const orgSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  industry: z.string().optional(),
  size: z.string().min(1, 'Selecciona un tamaño'),
})

type OrgFormValues = z.infer<typeof orgSchema>

// ─── Tab 1: General ──────────────────────────────────────────────────────────

function GeneralTab() {
  const { organization } = useAuthStore()
  const updateOrg = useUpdateOrganization()
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: organization?.name ?? '',
      industry: organization?.industry ?? '',
      size: organization?.size ?? '',
    },
  })

  const currentSize = watch('size')
  const currentIndustry = watch('industry')

  const onSubmit = async (data: OrgFormValues) => {
    await updateOrg.mutateAsync({
      name: data.name,
      industry: data.industry || null,
      size: data.size as CompanySize,
    })
  }

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!organization) return
      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten archivos de imagen')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('El archivo no puede superar 2MB')
        return
      }

      setUploading(true)
      try {
        const ext = file.name.split('.').pop() ?? 'png'
        const path = `${organization.id}/logo.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(path, file, { upsert: true })

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from('logos').getPublicUrl(path)

        await updateOrg.mutateAsync({ logo_url: `${publicUrl}?t=${Date.now()}` })
        toast.success('Logo actualizado')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        toast.error('Error al subir el logo: ' + message)
      } finally {
        setUploading(false)
      }
    },
    [organization, updateOrg]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload]
  )

  const handleRemoveLogo = async () => {
    await updateOrg.mutateAsync({ logo_url: null })
    toast.success('Logo eliminado')
  }

  if (!organization) return null

  return (
    <Card className="animate-fade-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Información de la organización
        </CardTitle>
        <CardDescription>
          Datos básicos de tu empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="h-16 w-16">
                {organization.logo_url ? (
                  <AvatarImage src={organization.logo_url} alt={organization.name} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {organization.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                    dragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  )}
                >
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Subiendo...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Arrastra una imagen o haz clic para seleccionar
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        PNG, JPG o SVG. Máximo 2MB.
                      </span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                      e.target.value = ''
                    }}
                  />
                </div>
                {organization.logo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-destructive hover:text-destructive"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Eliminar logo
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="org-name">Nombre</Label>
            <Input
              id="org-name"
              placeholder="Nombre de la organización"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label>Sector</Label>
            <Select
              value={currentIndustry ?? ''}
              onValueChange={(val) => setValue('industry', val, { shouldDirty: true })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un sector" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label>Tamaño de empresa</Label>
            <Select
              value={currentSize}
              onValueChange={(val) => setValue('size', val, { shouldDirty: true })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un tamaño" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size} empleados
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.size && (
              <p className="text-sm text-destructive">{errors.size.message}</p>
            )}
          </div>

          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Tab 2: Team ─────────────────────────────────────────────────────────────

function TeamTab() {
  const { organization, user, membership } = useAuthStore()
  const { data: members, isLoading: membersLoading } = useMembers(organization?.id)
  const { data: departments, isLoading: deptsLoading } = useDepartments(organization?.id)
  const updateRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment()
  const deleteDepartment = useDeleteDepartment()

  const isAdmin = membership?.role === 'admin'

  if (!organization) return null

  return (
    <div className="space-y-8">
      {/* Section A: Members */}
      <MembersSection
        orgId={organization.id}
        currentUserId={user?.id ?? ''}
        members={members ?? []}
        isLoading={membersLoading}
        isAdmin={isAdmin}
        onUpdateRole={(id, role) =>
          updateRole.mutateAsync({ id, orgId: organization.id, role })
        }
        onRemoveMember={(id) =>
          removeMember.mutateAsync({ id, orgId: organization.id })
        }
      />

      {/* Section B: Departments */}
      <DepartmentsSection
        orgId={organization.id}
        departments={departments ?? []}
        isLoading={deptsLoading}
        isAdmin={isAdmin}
        onCreateDepartment={(name, description) =>
          createDepartment.mutateAsync({
            organization_id: organization.id,
            name,
            description: description || undefined,
          })
        }
        onUpdateDepartment={(id, name, description) =>
          updateDepartment.mutateAsync({
            id,
            orgId: organization.id,
            name,
            description,
          })
        }
        onDeleteDepartment={(id) =>
          deleteDepartment.mutateAsync({ id, orgId: organization.id })
        }
      />
    </div>
  )
}

// ─── Members Section ─────────────────────────────────────────────────────────

interface MembersSectionProps {
  orgId: string
  currentUserId: string
  members: Array<{
    id: string
    user_id: string
    role: OrgRole
    joined_at: string
    email?: string
  }>
  isLoading: boolean
  isAdmin: boolean
  onUpdateRole: (id: string, role: OrgRole) => Promise<unknown>
  onRemoveMember: (id: string) => Promise<unknown>
}

function MembersSection({
  currentUserId,
  members,
  isLoading,
  isAdmin,
  onUpdateRole,
  onRemoveMember,
}: MembersSectionProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgRole>('viewer')

  const handleRemove = async () => {
    if (!removingId) return
    await onRemoveMember(removingId)
    setRemovingId(null)
  }

  const memberToRemove = members.find((m) => m.id === removingId)

  return (
    <>
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Miembros del equipo
          </CardTitle>
          <CardDescription>
            Gestiona los miembros y sus roles en tu organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay miembros en la organización
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha alta</TableHead>
                  {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isCurrentUser = member.user_id === currentUserId
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {member.email ?? member.user_id.slice(0, 8)}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">
                              Tú
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAdmin && !isCurrentUser ? (
                          <Select
                            value={member.role}
                            onValueChange={(val) =>
                              onUpdateRole(member.id, val as OrgRole)
                            }
                          >
                            <SelectTrigger className="w-[120px]" size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={ROLE_COLORS[member.role]}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(member.joined_at), "d 'de' MMM yyyy", {
                          locale: es,
                        })}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {!isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setRemovingId(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite member card */}
      {isAdmin && (
        <Card className="animate-fade-up" style={{ animationDelay: '50ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-primary" />
              Invitar miembro
            </CardTitle>
            <CardDescription>
              Envía una invitación por email para unirse a tu organización
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Select
                value={inviteRole}
                onValueChange={(val) => setInviteRole(val as OrgRole)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  toast.info('Próximamente')
                  setInviteEmail('')
                }}
                disabled={!inviteEmail}
              >
                <Plus className="h-4 w-4 mr-1" />
                Invitar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remove member confirmation dialog */}
      <Dialog open={!!removingId} onOpenChange={(open) => !open && setRemovingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar miembro</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a{' '}
              <span className="font-medium text-foreground">
                {memberToRemove?.email ?? memberToRemove?.user_id.slice(0, 8) ?? ''}
              </span>{' '}
              de la organización? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleRemove}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Departments Section ─────────────────────────────────────────────────────

interface DepartmentsSectionProps {
  orgId: string
  departments: Department[]
  isLoading: boolean
  isAdmin: boolean
  onCreateDepartment: (name: string, description: string) => Promise<unknown>
  onUpdateDepartment: (
    id: string,
    name: string,
    description: string | null
  ) => Promise<unknown>
  onDeleteDepartment: (id: string) => Promise<unknown>
}

function DepartmentsSection({
  departments,
  isLoading,
  isAdmin,
  onCreateDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
}: DepartmentsSectionProps) {
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await onCreateDepartment(newName.trim(), newDesc.trim())
      setNewName('')
      setNewDesc('')
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (dept: Department) => {
    setEditingDept(dept)
    setEditName(dept.name)
    setEditDesc(dept.description ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editingDept || !editName.trim()) return
    await onUpdateDepartment(editingDept.id, editName.trim(), editDesc.trim() || null)
    setEditingDept(null)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    await onDeleteDepartment(deletingId)
    setDeletingId(null)
  }

  const deptToDelete = departments.find((d) => d.id === deletingId)

  return (
    <>
      <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Departamentos
          </CardTitle>
          <CardDescription>
            Organiza tu equipo por áreas funcionales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add department form */}
          {isAdmin && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Nombre del departamento"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
              />
              <Input
                placeholder="Descripción (opcional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
              />
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Añadir
              </Button>
            </div>
          )}

          {/* Departments table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : departments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay departamentos creados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {dept.description ?? '—'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(dept)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingId(dept.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit department dialog */}
      <Dialog
        open={!!editingDept}
        onOpenChange={(open) => !open && setEditingDept(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar departamento</DialogTitle>
            <DialogDescription>
              Modifica el nombre y la descripción del departamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dept-name">Nombre</Label>
              <Input
                id="edit-dept-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dept-desc">Descripción</Label>
              <Input
                id="edit-dept-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descripción (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete department confirmation dialog */}
      <Dialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar departamento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar el departamento{' '}
              <span className="font-medium text-foreground">
                {deptToDelete?.name ?? ''}
              </span>
              ? Los empleados de este departamento quedarán sin departamento asignado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Tab 3: Subscription ─────────────────────────────────────────────────────

function SubscriptionTab() {
  const { organization } = useAuthStore()
  const { data: members } = useMembers(organization?.id)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [changePlanTarget, setChangePlanTarget] = useState<SubscriptionPlan | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  if (!organization) return null

  const currentPlan = organization.subscription_plan
  const adminCount = members?.filter((m) => m.role === 'admin').length ?? 0

  const trialDaysRemaining = organization.trial_ends_at
    ? Math.max(0, differenceInDays(new Date(organization.trial_ends_at), new Date()))
    : null

  const handleChangePlan = () => {
    toast.info('Próximamente: Integración con pasarela de pago')
    setChangePlanTarget(null)
  }

  const handleCancelSubscription = () => {
    toast.info('Próximamente')
    setShowCancelDialog(false)
    setCancelReason('')
  }

  return (
    <div className="space-y-6">
      {/* Current plan status */}
      <Card className="animate-fade-up">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Tu suscripción</CardTitle>
              <CardDescription>
                Gestiona tu plan y los límites de tu organización
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current plan info */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Plan actual</p>
              <Badge variant="default" className="text-sm">
                {PLANS[currentPlan].name}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge
                variant={STATUS_VARIANTS[organization.subscription_status] ?? 'secondary'}
              >
                {STATUS_LABELS[organization.subscription_status] ??
                  organization.subscription_status}
              </Badge>
            </div>
            {trialDaysRemaining !== null &&
              organization.subscription_status === 'trialing' && (
                <>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Periodo de prueba</p>
                    <p className="text-sm font-medium">
                      {trialDaysRemaining === 0
                        ? 'Finaliza hoy'
                        : `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'día' : 'días'} restantes`}
                    </p>
                  </div>
                </>
              )}
          </div>

          <Separator />

          {/* Plan limits */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Límites del plan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <PlanLimitIndicator
                label="Empleados"
                current={organization.employee_count}
                max={organization.max_employees}
                onUpgrade={() => toast.info('Próximamente')}
              />
              <PlanLimitIndicator
                label="Admins"
                current={adminCount}
                max={organization.max_admins}
                onUpgrade={() => toast.info('Próximamente')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing period toggle + Plan comparison cards */}
      <Card className="animate-fade-up" style={{ animationDelay: '50ms' }}>
        <CardHeader>
          <CardTitle>Planes disponibles</CardTitle>
          <CardDescription>
            Compara las funcionalidades y elige el plan que mejor se adapte a tu organización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Billing period toggle */}
          <div className="flex items-center justify-center gap-3">
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Mensual
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={billingPeriod === 'annual'}
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                billingPeriod === 'annual' ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform',
                  billingPeriod === 'annual' ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                billingPeriod === 'annual' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Anual
            </span>
            {billingPeriod === 'annual' && (
              <Badge variant="secondary" className="text-xs">
                Ahorra hasta un 20%
              </Badge>
            )}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_ORDER.map((planKey) => {
              const plan = PLANS[planKey]
              const isCurrent = planKey === currentPlan
              const PlanIcon = PLAN_ICONS[planKey]
              const price = billingPeriod === 'monthly' ? plan.price : plan.priceAnnual

              return (
                <div
                  key={planKey}
                  className={cn(
                    'relative rounded-xl border p-5 flex flex-col gap-4 transition-all',
                    isCurrent
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2.5 left-4 text-xs">
                      Plan actual
                    </Badge>
                  )}

                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center',
                      isCurrent ? 'bg-primary/15' : 'bg-muted'
                    )}>
                      <PlanIcon className={cn(
                        'h-4 w-4',
                        isCurrent ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <h3 className="font-semibold">{plan.name}</h3>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{price}€</span>
                      <span className="text-sm text-muted-foreground">/mes</span>
                    </div>
                    {billingPeriod === 'annual' && plan.price > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.priceAnnual * 12}€ facturado anualmente
                      </p>
                    )}
                  </div>

                  <Separator />

                  <ul className="space-y-2 flex-1">
                    {plan.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">
                      Plan actual
                    </Button>
                  ) : (
                    <Button
                      variant={isUpgrade(currentPlan, planKey) ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => setChangePlanTarget(planKey)}
                    >
                      {isUpgrade(currentPlan, planKey) ? 'Mejorar plan' : 'Cambiar plan'}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Cancel subscription link */}
          {currentPlan !== 'starter' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowCancelDialog(true)}
                className="text-sm text-muted-foreground hover:text-destructive transition-colors underline underline-offset-4"
              >
                Cancelar suscripción
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change plan confirmation dialog */}
      <Dialog
        open={!!changePlanTarget}
        onOpenChange={(open) => !open && setChangePlanTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {changePlanTarget && isUpgrade(currentPlan, changePlanTarget)
                ? 'Mejorar plan'
                : 'Cambiar plan'}
            </DialogTitle>
            <DialogDescription>
              {changePlanTarget && isUpgrade(currentPlan, changePlanTarget) ? (
                <>
                  Vas a mejorar de{' '}
                  <span className="font-medium text-foreground">{PLANS[currentPlan].name}</span>
                  {' '}a{' '}
                  <span className="font-medium text-foreground">{PLANS[changePlanTarget].name}</span>.
                  Tendrás acceso a más funcionalidades y límites ampliados.
                </>
              ) : changePlanTarget && isDowngrade(currentPlan, changePlanTarget) ? (
                <>
                  <span className="flex items-center gap-1.5 text-amber-600 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Estás a punto de reducir tu plan
                  </span>
                  Vas a cambiar de{' '}
                  <span className="font-medium text-foreground">{PLANS[currentPlan].name}</span>
                  {' '}a{' '}
                  <span className="font-medium text-foreground">{PLANS[changePlanTarget].name}</span>.
                  Es posible que pierdas acceso a algunas funcionalidades.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {changePlanTarget && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Nuevo precio</span>
                <span className="font-semibold">
                  {billingPeriod === 'monthly'
                    ? PLANS[changePlanTarget].price
                    : PLANS[changePlanTarget].priceAnnual}
                  €/mes
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Facturación</span>
                <span>{billingPeriod === 'monthly' ? 'Mensual' : 'Anual'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Máx. empleados</span>
                <span>{PLANS[changePlanTarget].maxEmployees === 9999 ? 'Ilimitados' : PLANS[changePlanTarget].maxEmployees}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleChangePlan}>
              Confirmar cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel subscription dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancelar suscripción
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres cancelar tu suscripción? Al final del
              período de facturación actual, tu plan volverá a Starter y perderás
              acceso a las funcionalidades premium.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>¿Por qué cancelas? (opcional)</Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Volver</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleCancelSubscription}>
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tab 4: Billing ──────────────────────────────────────────────────────────

function BillingTab() {
  const { organization } = useAuthStore()

  if (!organization) return null

  const currentPlan = organization.subscription_plan
  const invoices = getMockInvoices(currentPlan)

  return (
    <div className="space-y-6">
      {/* Payment method */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Método de pago
          </CardTitle>
          <CardDescription>
            Gestiona cómo pagas tu suscripción
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan === 'starter' ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No se requiere método de pago en el plan gratuito
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-14 rounded-md border bg-muted flex items-center justify-center">
                  <span className="text-xs font-bold text-muted-foreground">VISA</span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    •••• •••• •••• 4242
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expira 12/2028
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Próximamente')}
              >
                Cambiar método de pago
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice history */}
      <Card className="animate-fade-up" style={{ animationDelay: '50ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Historial de facturas
          </CardTitle>
          <CardDescription>
            Consulta y descarga tus facturas anteriores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay facturas en el plan gratuito
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Las facturas aparecerán aquí cuando mejores tu plan
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Descargar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice: Invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-sm">
                        {format(new Date(invoice.date), "d 'de' MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {PLANS[invoice.plan].name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {invoice.amount}€
                      </TableCell>
                      <TableCell>
                        <Badge variant={INVOICE_STATUS_VARIANTS[invoice.status] ?? 'secondary'}>
                          {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info('Próximamente')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu organización y equipo
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="animate-fade-up" style={{ animationDelay: '50ms' }}>
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-1.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-1.5" />
            Equipo
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-1.5" />
            Suscripción
          </TabsTrigger>
          <TabsTrigger value="billing">
            <Receipt className="h-4 w-4 mr-1.5" />
            Facturación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamTab />
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <SubscriptionTab />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
