import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  getMockAdminKPIs,
  getMockAdminOrgs,
  getMockRevenueData,
  PLANS,
} from '@/lib/billing'
import type { AdminOrgRow } from '@/lib/billing'
import type { SubscriptionPlan } from '@/types/database'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  Building2,
  TrendingUp,
  Clock,
  AlertTriangle,
  Users,
  Search,
  ArrowLeft,
  CreditCard,
  Calendar,
  BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const planBadgeVariant: Record<
  SubscriptionPlan,
  'outline' | 'secondary' | 'default'
> = {
  starter: 'outline',
  growth: 'secondary',
  business: 'default',
  enterprise: 'default',
}

const statusBadgeVariant: Record<string, 'active' | 'paused' | 'destructive'> =
  {
    active: 'active',
    trialing: 'paused',
    past_due: 'paused',
    canceled: 'destructive',
  }

const statusLabel: Record<string, string> = {
  active: 'Activo',
  trialing: 'En prueba',
  past_due: 'Pago pendiente',
  canceled: 'Cancelado',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "d MMM yyyy", { locale: es })
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({
  title,
  value,
  icon: Icon,
  description,
  className,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
  className?: string
}) {
  return (
    <Card className={cn('animate-fade-up', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Org Detail Sheet ────────────────────────────────────────────────────────

function OrgDetailSheet({
  org,
  open,
  onOpenChange,
}: {
  org: AdminOrgRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!org) return null

  const plan = PLANS[org.plan]
  const employeePercent = Math.min(
    Math.round((org.employeeCount / org.maxEmployees) * 100),
    100
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {org.name}
          </SheetTitle>
          <SheetDescription>
            Detalles de la organización
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {/* Status & Plan */}
          <div className="flex items-center gap-2">
            <Badge variant={planBadgeVariant[org.plan]}>
              {plan.name}
            </Badge>
            <Badge variant={statusBadgeVariant[org.status] ?? 'outline'}>
              {statusLabel[org.status] ?? org.status}
            </Badge>
          </div>

          <Separator />

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Industria</p>
              <p className="font-medium">{org.industry ?? 'Sin especificar'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fecha de alta</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(org.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Empleados</p>
              <p className="font-medium flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {org.employeeCount} / {org.maxEmployees === 9999 ? '∞' : org.maxEmployees}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Campañas creadas</p>
              <p className="font-medium flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                {org.campaignsCreated}
              </p>
            </div>
            {org.trialEndsAt && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Fin de prueba</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(org.trialEndsAt)}
                </p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Precio mensual</p>
              <p className="font-medium flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                {plan.price === 0 ? 'Gratis' : formatCurrency(plan.price) + '/mes'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Plan Limits */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Uso del plan</h4>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Empleados</span>
                <span className="font-medium">
                  {org.employeeCount} / {org.maxEmployees === 9999 ? '∞' : org.maxEmployees}
                </span>
              </div>
              <Progress value={org.maxEmployees === 9999 ? 5 : employeePercent} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Campañas/mes</span>
                <span className="font-medium">
                  {org.campaignsCreated} / {plan.maxCampaignsPerMonth === 9999 ? '∞' : plan.maxCampaignsPerMonth}
                </span>
              </div>
              <Progress
                value={
                  plan.maxCampaignsPerMonth === 9999
                    ? 5
                    : Math.min(
                        Math.round(
                          (org.campaignsCreated / plan.maxCampaignsPerMonth) * 100
                        ),
                        100
                      )
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Administradores</span>
                <span className="font-medium">
                  1 / {plan.maxAdmins === 999 ? '∞' : plan.maxAdmins}
                </span>
              </div>
              <Progress
                value={
                  plan.maxAdmins === 999
                    ? 5
                    : Math.round((1 / plan.maxAdmins) * 100)
                }
              />
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => toast.info('Próximamente')}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Cambiar plan
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => toast.info('Próximamente')}
            >
              Desactivar organización
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const kpis = getMockAdminKPIs()
  const orgs = getMockAdminOrgs()
  const revenueData = getMockRevenueData()

  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrg, setSelectedOrg] = useState<AdminOrgRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const filteredOrgs = useMemo(() => {
    return orgs.filter((org) => {
      const matchesSearch = org.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesPlan = planFilter === 'all' || org.plan === planFilter
      const matchesStatus =
        statusFilter === 'all' || org.status === statusFilter
      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [orgs, searchQuery, planFilter, statusFilter])

  function handleRowClick(org: AdminOrgRow) {
    setSelectedOrg(org)
    setSheetOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          to="/app"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </Link>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8 animate-fade-up">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Panel de Administración
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestión de la plataforma EvalIA
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <KPICard
            title="Organizaciones totales"
            value={kpis.totalOrgs}
            icon={Building2}
          />
          <KPICard
            title="MRR"
            value={formatCurrency(kpis.mrr)}
            icon={TrendingUp}
          />
          <KPICard
            title="Trials activos"
            value={kpis.trialingOrgs}
            icon={Clock}
          />
          <KPICard
            title="Tasa de churn"
            value={`${kpis.churnRate}%`}
            icon={AlertTriangle}
            className={cn(
              kpis.churnRate < 5
                ? '[&_[data-slot=card-content]>.text-2xl]:text-success'
                : kpis.churnRate <= 10
                  ? '[&_[data-slot=card-content]>.text-2xl]:text-warning'
                  : '[&_[data-slot=card-content]>.text-2xl]:text-destructive'
            )}
          />
          <KPICard
            title="Empleados totales"
            value={kpis.totalEmployees.toLocaleString('es-ES')}
            icon={Users}
          />
        </div>

        {/* Revenue Chart */}
        <Card className="mb-8 animate-fade-up">
          <CardHeader>
            <CardTitle>Evolución de ingresos</CardTitle>
            <CardDescription>
              MRR y nuevas organizaciones por mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="mrr"
                  name="MRR (€)"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="newOrgs"
                  name="Nuevas orgs"
                  fill="hsl(var(--primary) / 0.3)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <Card className="animate-fade-up">
            <CardContent className="flex items-center gap-3 pt-6">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Media empleados/org
                </p>
                <p className="text-lg font-semibold">{kpis.avgEmployeesPerOrg}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-fade-up">
            <CardContent className="flex items-center gap-3 pt-6">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Organizaciones activas
                </p>
                <p className="text-lg font-semibold">{kpis.activeOrgs}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organizations Table */}
        <Card className="animate-fade-up">
          <CardHeader>
            <CardTitle>Organizaciones</CardTitle>
            <CardDescription>
              {filteredOrgs.length} de {orgs.length} organizaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar organización..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los planes</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="trialing">En prueba</SelectItem>
                  <SelectItem value="past_due">Pago pendiente</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Empleados</TableHead>
                    <TableHead className="text-right">Campañas</TableHead>
                    <TableHead>Fecha alta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No se encontraron organizaciones
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrgs.map((org) => (
                      <TableRow
                        key={org.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(org)}
                      >
                        <TableCell className="font-medium">
                          {org.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={planBadgeVariant[org.plan]}
                            className={cn(
                              org.plan === 'enterprise' &&
                                'bg-gradient-to-r from-primary to-primary/70 text-primary-foreground'
                            )}
                          >
                            {PLANS[org.plan].name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              statusBadgeVariant[org.status] ?? 'outline'
                            }
                          >
                            {statusLabel[org.status] ?? org.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {org.employeeCount} /{' '}
                          {org.maxEmployees === 9999
                            ? '∞'
                            : org.maxEmployees}
                        </TableCell>
                        <TableCell className="text-right">
                          {org.campaignsCreated}
                        </TableCell>
                        <TableCell>{formatDate(org.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Org Detail Sheet */}
        <OrgDetailSheet
          org={selectedOrg}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </div>
    </div>
  )
}
