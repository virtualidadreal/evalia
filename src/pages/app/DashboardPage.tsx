import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useDepartments } from '@/hooks/use-departments'
import { SubscriptionBanner } from '@/components/organizations/SubscriptionBanner'
import { AIInsightCard } from '@/components/ai/AIInsightCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Users,
  Building2,
  Target,
  TrendingUp,
  ClipboardList,
  Upload,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Insight } from '@/types/database'

interface KPICardProps {
  label: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  index: number
}

function KPICard({ label, value, subtitle, icon: Icon, index }: KPICardProps) {
  return (
    <Card
      className="animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const placeholderInsights: Insight[] = [
  {
    type: 'strength',
    text: 'Completa tu primera evaluación para obtener insights personalizados',
    severity: 1,
  },
  {
    type: 'opportunity',
    text: 'Importa empleados desde CSV para configurar tu organización más rápido',
    severity: 1,
  },
  {
    type: 'risk',
    text: 'Configura departamentos para obtener análisis más detallados',
    severity: 1,
  },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DashboardPage() {
  const { organization, user } = useAuthStore()
  const { data: departments } = useDepartments(organization?.id)
  const navigate = useNavigate()

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? ''

  const employeeCount = organization?.employee_count ?? 0
  const maxEmployees = organization?.max_employees ?? 0
  const departmentCount = departments?.length ?? 0

  const kpis: Omit<KPICardProps, 'index'>[] = [
    {
      label: 'Empleados',
      value: employeeCount,
      subtitle: `de ${maxEmployees} disponibles`,
      icon: Users,
    },
    {
      label: 'Departamentos',
      value: departmentCount,
      icon: Building2,
    },
    {
      label: 'Campañas activas',
      value: 0,
      subtitle: 'Próximamente',
      icon: Target,
    },
    {
      label: 'Tasa completación',
      value: '—%',
      subtitle: 'Sin datos aún',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Trial banner */}
      {organization && (
        <SubscriptionBanner
          org={organization}
          onUpgrade={() => toast.info('Próximamente')}
        />
      )}

      {/* Page header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ''}. Aquí tienes un resumen de tu
          organización.
        </p>
      </div>

      {/* KPI cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <KPICard key={kpi.label} {...kpi} index={index} />
        ))}
      </div>

      {/* Main content: two columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Active campaigns (2/3) */}
        <div className="lg:col-span-2">
          <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Campañas activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Target}
                title="Sin campañas activas"
                description="Crea tu primera campaña de evaluación para empezar a evaluar a tu equipo"
                action={{
                  label: 'Nueva campaña',
                  onClick: () => navigate('/app/evaluations/new'),
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column: Quick actions + AI Insights (1/3) */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card className="animate-fade-up" style={{ animationDelay: '250ms' }}>
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                variant="premium"
                className="w-full justify-start"
                onClick={() => navigate('/app/evaluations/new')}
              >
                <ClipboardList className="h-4 w-4" />
                Nueva evaluación
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/app/employees')}
              >
                <Upload className="h-4 w-4" />
                Importar empleados
              </Button>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card className="animate-fade-up" style={{ animationDelay: '300ms' }}>
            <CardHeader className="bg-gradient-ai rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-ai" />
                Insights IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {placeholderInsights.map((insight, index) => (
                <AIInsightCard
                  key={insight.type}
                  insight={insight}
                  index={index}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
