import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import {
  useCompletedCampaigns,
  useSubmittedEvaluations,
  useCampaignTemplate,
  useAIReports,
} from '@/hooks/use-results'
import { analyzeResults } from '@/lib/results-analyzer'
import type {
  AIReport,
  ReportType,
  SubscriptionPlan,
  Competency,
  CompetencyScore,
  Insight,
} from '@/types/database'
import { cn } from '@/lib/utils'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from '@react-pdf/renderer'

// UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Icons
import {
  FileText,
  Users,
  Building2,
  User,
  Download,
  Search,
  Lock,
  Loader2,
  X,
  CalendarDays,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  individual: 'Individual',
  team: 'Equipo',
  department: 'Departamento',
  company: 'Empresa',
  comparison: 'Comparación',
}

const REPORT_TYPE_BADGE: Record<ReportType, string> = {
  individual: 'secondary',
  team: 'active',
  department: 'completed',
  company: 'ai',
  comparison: 'default',
}

const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  starter: 0,
  growth: 1,
  business: 2,
  enterprise: 3,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function hasPlanAccess(current: SubscriptionPlan, required: SubscriptionPlan): boolean {
  return PLAN_HIERARCHY[current] >= PLAN_HIERARCHY[required]
}

function getScoreLevel(score: number): string {
  if (score >= 4.5) return 'Excelente'
  if (score >= 3.5) return 'Bueno'
  if (score >= 2.5) return 'Aceptable'
  if (score >= 1.5) return 'Bajo'
  return 'Crítico'
}

// ---------------------------------------------------------------------------
// PDF Styles
// ---------------------------------------------------------------------------

const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  orgName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  reportTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
    color: '#6b7280',
    fontSize: 9,
  },
  metaItem: {
    flexDirection: 'row',
    gap: 4,
  },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#6366f1',
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  overallScore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f5f3ff',
    borderRadius: 8,
  },
  overallScoreValue: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#6366f1',
  },
  overallScoreLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  // Table styles
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#6b7280',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  colCompetency: { width: '40%' },
  colScore: { width: '20%' },
  colLevel: { width: '20%' },
  colWeight: { width: '20%' },
  // Insights
  insightItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 8,
  },
  insightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
    marginTop: 3,
  },
  strengthBullet: { backgroundColor: '#22c55e' },
  riskBullet: { backgroundColor: '#ef4444' },
  opportunityBullet: { backgroundColor: '#f59e0b' },
  insightText: {
    fontSize: 9,
    color: '#374151',
    flex: 1,
  },
  // Comments
  commentBlock: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  commentQuestion: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginBottom: 2,
  },
  commentEvaluator: {
    fontSize: 8,
    color: '#9ca3af',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 9,
    color: '#4b5563',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    fontSize: 8,
    color: '#9ca3af',
  },
})

// ---------------------------------------------------------------------------
// PDF Document Component
// ---------------------------------------------------------------------------

interface EvalPDFDocumentProps {
  title: string
  reportType: ReportType
  orgName: string
  logoUrl: string | null
  date: string
  overallScore: number
  competencies: Competency[]
  competencyScores: Record<string, CompetencyScore>
  insights: Insight[]
  showInsights: boolean
  comments?: { question: string; evaluatorType: string; comment: string }[]
  employeeName?: string
  position?: string
}

function EvalPDFDocument({
  title,
  reportType,
  orgName,
  logoUrl,
  date,
  overallScore,
  competencies,
  competencyScores,
  insights,
  showInsights,
  comments = [],
  employeeName,
  position,
}: EvalPDFDocumentProps) {
  const evaluatorTypeLabels: Record<string, string> = {
    self: 'Autoevaluación',
    manager: 'Manager',
    peer: 'Par',
    subordinate: 'Subordinado',
    external: 'Externo',
  }

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View style={pdfStyles.headerLeft}>
            {logoUrl && <Image src={logoUrl} style={pdfStyles.logo} />}
            <Text style={pdfStyles.orgName}>{orgName}</Text>
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={{ fontSize: 8, color: '#9ca3af' }}>
              {REPORT_TYPE_LABELS[reportType]}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={pdfStyles.reportTitle}>{title}</Text>

        {/* Meta */}
        <View style={pdfStyles.reportMeta}>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Fecha: </Text>
            <Text>{date}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Tipo: </Text>
            <Text>{REPORT_TYPE_LABELS[reportType]}</Text>
          </View>
          {employeeName && (
            <View style={pdfStyles.metaItem}>
              <Text style={pdfStyles.metaLabel}>Empleado: </Text>
              <Text>{employeeName}{position ? ` (${position})` : ''}</Text>
            </View>
          )}
        </View>

        {/* Overall Score */}
        <View style={pdfStyles.overallScore}>
          <Text style={pdfStyles.overallScoreValue}>
            {overallScore.toFixed(1)}
          </Text>
          <Text style={pdfStyles.overallScoreLabel}>/5 - Puntuación global</Text>
        </View>

        {/* Scores Table */}
        <Text style={pdfStyles.sectionTitle}>Puntuaciones por competencia</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colCompetency]}>
              Competencia
            </Text>
            <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colScore]}>
              Puntuación
            </Text>
            <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colLevel]}>
              Nivel
            </Text>
            <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colWeight]}>
              Peso
            </Text>
          </View>
          {competencies.map((comp) => {
            const score = competencyScores[comp.id]
            const avg = score?.avg ?? 0
            return (
              <View style={pdfStyles.tableRow} key={comp.id}>
                <Text style={[pdfStyles.tableCell, pdfStyles.colCompetency]}>
                  {comp.name}
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.colScore]}>
                  {avg > 0 ? avg.toFixed(1) : '-'}
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.colLevel]}>
                  {avg > 0 ? getScoreLevel(avg) : '-'}
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.colWeight]}>
                  {(comp.weight * 100).toFixed(0)}%
                </Text>
              </View>
            )
          })}
        </View>

        {/* Insights */}
        {showInsights && insights.length > 0 && (
          <>
            <Text style={pdfStyles.sectionTitle}>Análisis e insights</Text>
            {insights.map((insight, i) => (
              <View style={pdfStyles.insightItem} key={i}>
                <View
                  style={[
                    pdfStyles.insightBullet,
                    insight.type === 'strength' ? pdfStyles.strengthBullet : {},
                    insight.type === 'risk' ? pdfStyles.riskBullet : {},
                    insight.type === 'opportunity' ? pdfStyles.opportunityBullet : {},
                  ]}
                />
                <Text style={pdfStyles.insightText}>{insight.text}</Text>
              </View>
            ))}
          </>
        )}

        {/* Comments */}
        {comments.length > 0 && (
          <>
            <Text style={pdfStyles.sectionTitle}>Comentarios</Text>
            {comments.slice(0, 10).map((c, i) => (
              <View style={pdfStyles.commentBlock} key={i}>
                <Text style={pdfStyles.commentQuestion}>{c.question}</Text>
                <Text style={pdfStyles.commentEvaluator}>
                  {evaluatorTypeLabels[c.evaluatorType] ?? c.evaluatorType}
                </Text>
                <Text style={pdfStyles.commentText}>{c.comment}</Text>
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text>Generado por EvalIA</Text>
          <Text>{date}</Text>
        </View>
      </Page>
    </Document>
  )
}

// ---------------------------------------------------------------------------
// Report Type Cards
// ---------------------------------------------------------------------------

interface ReportTypeCardProps {
  icon: typeof FileText
  title: string
  description: string
  badge?: string
  locked: boolean
  loading: boolean
  onClick: () => void
  index: number
}

function ReportTypeCard({
  icon: Icon,
  title,
  description,
  badge,
  locked,
  loading,
  onClick,
  index,
}: ReportTypeCardProps) {
  return (
    <Card
      className={cn(
        'animate-fade-up transition-shadow',
        locked ? 'opacity-60' : 'hover:shadow-md cursor-pointer',
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
              locked ? 'bg-muted' : 'bg-primary/10',
            )}
          >
            {locked ? (
              <Lock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Icon className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold">{title}</h3>
              {badge && (
                <Badge variant="ai" className="text-[10px]">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">{description}</p>
            <Button
              size="sm"
              variant={locked ? 'outline' : 'default'}
              onClick={onClick}
              disabled={locked || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : locked ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  Actualizar plan
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Generar informe
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Employee Select Dialog
// ---------------------------------------------------------------------------

interface EmployeeSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: { id: string; full_name: string; position: string }[]
  onSelect: (employeeId: string) => void
  loading: boolean
}

function EmployeeSelectDialog({
  open,
  onOpenChange,
  employees,
  onSelect,
  loading,
}: EmployeeSelectDialogProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q),
    )
  }, [employees, search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar empleado</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Employee list */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No se encontraron empleados
            </p>
          ) : (
            filtered.map((emp) => (
              <button
                key={emp.id}
                onClick={() => onSelect(emp.id)}
                disabled={loading}
                className="w-full flex items-center gap-3 rounded-lg p-3 text-left hover:bg-accent transition-colors disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {emp.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emp.position}
                  </p>
                </div>
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// ReportsPage (main)
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { organization } = useAuthStore()
  const orgId = organization?.id
  const plan = organization?.subscription_plan ?? 'starter'

  // State
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false)
  const [generatingType, setGeneratingType] = useState<ReportType | null>(null)

  // Queries
  const { data: campaigns = [], isLoading: loadingCampaigns } =
    useCompletedCampaigns(orgId)

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  )

  const { data: evaluations = [] } = useSubmittedEvaluations(
    selectedCampaignId || undefined,
  )

  const { data: template } = useCampaignTemplate(
    selectedCampaign?.template_id ?? undefined,
  )

  const { data: reports = [], isLoading: loadingReports } = useAIReports(
    selectedCampaignId || undefined,
  )

  // Derived: unique employees from evaluations
  const employees = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string; position: string }>()
    for (const ev of evaluations) {
      const emp = (ev as any).employees
      if (emp && !map.has(emp.id)) {
        map.set(emp.id, {
          id: emp.id,
          full_name: emp.full_name,
          position: emp.position,
        })
      }
    }
    return Array.from(map.values())
  }, [evaluations])

  // PDF generation
  const generatePDF = useCallback(
    async (reportType: ReportType, employeeId?: string) => {
      if (!template || evaluations.length === 0 || !organization) {
        toast.error('No hay datos suficientes para generar el informe')
        return
      }

      setGeneratingType(reportType)

      try {
        const results = analyzeResults(evaluations, template)
        const showInsights = organization.ai_enabled
        const now = new Date().toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })

        let pdfTitle: string
        let overallScore: number
        let competencyScores: Record<string, CompetencyScore>
        let insights: Insight[]
        let comments: { question: string; evaluatorType: string; comment: string }[] = []
        let employeeName: string | undefined
        let position: string | undefined

        if (reportType === 'individual' && employeeId) {
          const empResult = results.employeeResults.find(
            (r) => r.employeeId === employeeId,
          )
          if (!empResult) {
            toast.error('No se encontraron resultados para este empleado')
            setGeneratingType(null)
            return
          }
          pdfTitle = `Informe individual - ${empResult.employeeName}`
          overallScore = empResult.overallScore
          competencyScores = empResult.competencyScores
          insights = empResult.insights
          comments = empResult.comments
          employeeName = empResult.employeeName
          position = empResult.position
        } else if (reportType === 'team') {
          pdfTitle = `Informe de equipo - ${selectedCampaign?.name ?? 'Campaña'}`
          overallScore = results.overallAvg
          competencyScores = Object.fromEntries(
            results.competencyAverages.map((ca) => {
              const comp = template.competencies.find(
                (c) => c.name === ca.competency,
              )
              return [
                comp?.id ?? ca.competency,
                { avg: ca.avg, self: ca.self, manager: ca.manager, peers: ca.peers },
              ]
            }),
          )
          insights = results.insights
        } else {
          // company
          pdfTitle = `Informe ejecutivo - ${organization.name}`
          overallScore = results.overallAvg
          competencyScores = Object.fromEntries(
            results.competencyAverages.map((ca) => {
              const comp = template.competencies.find(
                (c) => c.name === ca.competency,
              )
              return [
                comp?.id ?? ca.competency,
                { avg: ca.avg, self: ca.self, manager: ca.manager, peers: ca.peers },
              ]
            }),
          )
          insights = results.insights
        }

        const blob = await pdf(
          <EvalPDFDocument
            title={pdfTitle}
            reportType={reportType}
            orgName={organization.name}
            logoUrl={organization.logo_url}
            date={now}
            overallScore={overallScore}
            competencies={template.competencies}
            competencyScores={competencyScores}
            insights={insights}
            showInsights={showInsights}
            comments={comments}
            employeeName={employeeName}
            position={position}
          />,
        ).toBlob()

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${pdfTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success('Informe descargado correctamente')
      } catch (err) {
        console.error('Error generating PDF:', err)
        toast.error('Error al generar el informe')
      } finally {
        setGeneratingType(null)
        setEmployeeDialogOpen(false)
      }
    },
    [template, evaluations, organization, selectedCampaign],
  )

  const handleIndividualClick = useCallback(() => {
    if (employees.length === 0) {
      toast.error('No hay empleados evaluados en esta campaña')
      return
    }
    setEmployeeDialogOpen(true)
  }, [employees])

  const handleEmployeeSelect = useCallback(
    (employeeId: string) => {
      generatePDF('individual', employeeId)
    },
    [generatePDF],
  )

  const handleTeamClick = useCallback(() => {
    if (!hasPlanAccess(plan, 'growth')) {
      toast.info('Actualiza a Growth para generar informes de equipo')
      return
    }
    generatePDF('team')
  }, [plan, generatePDF])

  const handleCompanyClick = useCallback(() => {
    if (!hasPlanAccess(plan, 'business')) {
      toast.info('Actualiza a Business para generar informes ejecutivos')
      return
    }
    generatePDF('company')
  }, [plan, generatePDF])

  // Re-download from history
  const handleRedownload = useCallback(
    (report: AIReport) => {
      if (!template || !organization) return

      const evaluationsForReport =
        report.employee_id
          ? evaluations.filter(
              (ev) => ev.employee_id === report.employee_id,
            )
          : evaluations

      if (evaluationsForReport.length === 0) {
        toast.error('No se encontraron evaluaciones para regenerar el informe')
        return
      }

      generatePDF(
        report.report_type,
        report.employee_id ?? undefined,
      )
    },
    [template, organization, evaluations, generatePDF],
  )

  // Loading state
  if (loadingCampaigns) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // No campaigns
  if (campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold tracking-tight">Informes</h1>
          <p className="text-muted-foreground mt-1">
            Genera y descarga informes PDF profesionales
          </p>
        </div>
        <EmptyState
          icon={FileText}
          title="Sin campañas completadas"
          description="Necesitas al menos una campaña con evaluaciones completadas para generar informes"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight">Informes</h1>
        <p className="text-muted-foreground mt-1">
          Genera y descarga informes PDF profesionales
        </p>
      </div>

      {/* Campaign selector */}
      <div className="animate-fade-up" style={{ animationDelay: '50ms' }}>
        <label className="text-sm font-medium mb-2 block">
          Seleccionar campaña
        </label>
        <Select
          value={selectedCampaignId}
          onValueChange={setSelectedCampaignId}
        >
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder="Elige una campaña..." />
          </SelectTrigger>
          <SelectContent>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Report types (only show when campaign selected) */}
      {selectedCampaignId && (
        <>
          {/* Report type cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReportTypeCard
              icon={User}
              title="Informe individual"
              description="Genera un informe detallado para un empleado específico con sus puntuaciones, fortalezas y áreas de mejora"
              locked={false}
              loading={generatingType === 'individual'}
              onClick={handleIndividualClick}
              index={0}
            />
            <ReportTypeCard
              icon={Users}
              title="Informe de equipo"
              description="Resumen comparativo del equipo con promedios por competencia y análisis de tendencias"
              badge={!hasPlanAccess(plan, 'growth') ? 'Growth+' : undefined}
              locked={!hasPlanAccess(plan, 'growth')}
              loading={generatingType === 'team'}
              onClick={handleTeamClick}
              index={1}
            />
            <ReportTypeCard
              icon={Building2}
              title="Informe ejecutivo"
              description="Visión global de la organización con KPIs clave, insights estratégicos y recomendaciones"
              badge={!hasPlanAccess(plan, 'business') ? 'Business+' : undefined}
              locked={!hasPlanAccess(plan, 'business')}
              loading={generatingType === 'company'}
              onClick={handleCompanyClick}
              index={2}
            />
          </div>

          {/* Reports history */}
          <div className="animate-fade-up" style={{ animationDelay: '150ms' }}>
            <h2 className="text-lg font-semibold mb-3">
              Historial de informes
            </h2>

            {loadingReports ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Aún no se han generado informes para esta campaña
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-12 gap-3 bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  <div className="col-span-4">Título</div>
                  <div className="col-span-2">Tipo</div>
                  <div className="col-span-3">Empleado</div>
                  <div className="col-span-2">Fecha</div>
                  <div className="col-span-1">Acciones</div>
                </div>

                {/* Table rows */}
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 px-4 py-3 border-t items-center hover:bg-accent/50 transition-colors"
                  >
                    {/* Title */}
                    <div className="sm:col-span-4">
                      <p className="text-sm font-medium truncate">
                        {report.title}
                      </p>
                    </div>

                    {/* Type badge */}
                    <div className="sm:col-span-2">
                      <Badge
                        variant={
                          REPORT_TYPE_BADGE[report.report_type] as
                            | 'secondary'
                            | 'active'
                            | 'completed'
                            | 'ai'
                            | 'default'
                        }
                      >
                        {REPORT_TYPE_LABELS[report.report_type]}
                      </Badge>
                    </div>

                    {/* Employee */}
                    <div className="sm:col-span-3">
                      <p className="text-sm text-muted-foreground truncate">
                        {report.employee_id
                          ? employees.find((e) => e.id === report.employee_id)
                              ?.full_name ?? '-'
                          : '-'}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(report.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="sm:col-span-1 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRedownload(report)}
                        title="Descargar PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Employee select dialog */}
      <EmployeeSelectDialog
        open={employeeDialogOpen}
        onOpenChange={setEmployeeDialogOpen}
        employees={employees}
        onSelect={handleEmployeeSelect}
        loading={generatingType === 'individual'}
      />
    </div>
  )
}
