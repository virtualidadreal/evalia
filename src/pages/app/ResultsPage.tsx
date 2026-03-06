import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  useCompletedCampaigns,
  useSubmittedEvaluations,
  useCampaignTemplate,
} from '@/hooks/use-results'
import { analyzeResults } from '@/lib/results-analyzer'
import { CompetencyRadar } from '@/components/results/CompetencyRadar'
import { AIInsightCard } from '@/components/ai/AIInsightCard'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Users,
  CheckCircle2,
  Trophy,
  Sparkles,
  Lock,
  User,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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

function scoreColorClass(score: number): string {
  if (score >= 4.0) return 'bg-success/20 text-success font-medium'
  if (score >= 3.0) return 'bg-warning/20 text-warning font-medium'
  if (score > 0) return 'bg-destructive/20 text-destructive font-medium'
  return 'bg-muted text-muted-foreground'
}

export default function ResultsPage() {
  const { organization } = useAuthStore()
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>()

  const { data: campaigns, isLoading: loadingCampaigns } =
    useCompletedCampaigns(organization?.id)

  const selectedCampaign = campaigns?.find((c) => c.id === selectedCampaignId)

  const { data: evaluations, isLoading: loadingEvaluations } =
    useSubmittedEvaluations(selectedCampaignId)

  const { data: template, isLoading: loadingTemplate } = useCampaignTemplate(
    selectedCampaign?.template_id ?? undefined
  )

  const results = useMemo(() => {
    if (!evaluations?.length || !template) return null
    return analyzeResults(evaluations, template)
  }, [evaluations, template])

  const selectedEmployee = useMemo(() => {
    if (!results || !selectedEmployeeId) return null
    return results.employeeResults.find(
      (r) => r.employeeId === selectedEmployeeId
    )
  }, [results, selectedEmployeeId])

  const competencyNames = useMemo(() => {
    if (!template) return []
    return template.competencies.map((c) => c.name)
  }, [template])

  const isLoading = loadingCampaigns || loadingEvaluations || loadingTemplate

  // No campaigns at all
  if (!loadingCampaigns && (!campaigns || campaigns.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold tracking-tight">Resultados</h1>
          <p className="text-muted-foreground mt-1">
            Analiza los resultados de las evaluaciones de tu equipo.
          </p>
        </div>
        <Card>
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="Sin resultados disponibles"
              description="Completa tu primera campaña de evaluación para ver los resultados aquí. Los datos se calculan automáticamente a partir de las evaluaciones enviadas."
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const strongestCompetency =
    results?.competencyAverages
      .filter((c) => c.avg > 0)
      .sort((a, b) => b.avg - a.avg)[0]?.competency ?? '—'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resultados</h1>
          <p className="text-muted-foreground mt-1">
            Analiza los resultados de las evaluaciones de tu equipo.
          </p>
        </div>

        {/* Campaign selector */}
        <Select
          value={selectedCampaignId ?? ''}
          onValueChange={(v) => {
            setSelectedCampaignId(v)
            setSelectedEmployeeId(undefined)
          }}
        >
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="Seleccionar campaña..." />
          </SelectTrigger>
          <SelectContent>
            {campaigns?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* No campaign selected */}
      {!selectedCampaignId && (
        <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="Selecciona una campaña"
              description="Elige una campaña del selector superior para ver sus resultados de evaluación."
            />
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {selectedCampaignId && isLoading && (
        <Card className="animate-fade-up">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Cargando resultados...</p>
          </CardContent>
        </Card>
      )}

      {/* No results for campaign */}
      {selectedCampaignId && !isLoading && !results && (
        <Card className="animate-fade-up">
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="Sin evaluaciones enviadas"
              description="Esta campaña aún no tiene evaluaciones completadas. Los resultados aparecerán cuando los evaluadores envíen sus respuestas."
            />
          </CardContent>
        </Card>
      )}

      {/* Results content */}
      {results && (
        <Tabs defaultValue="team" className="space-y-6">
          <TabsList className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <TabsTrigger value="team">
              <Users className="h-4 w-4" />
              Equipo
            </TabsTrigger>
            <TabsTrigger value="individual">
              <User className="h-4 w-4" />
              Individual
            </TabsTrigger>
          </TabsList>

          {/* ============= TEAM TAB ============= */}
          <TabsContent value="team" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                label="Score promedio equipo"
                value={results.overallAvg > 0 ? `${results.overallAvg.toFixed(1)}/5` : '—'}
                icon={BarChart3}
                index={0}
              />
              <KPICard
                label="Empleados evaluados"
                value={results.employeeResults.length}
                icon={Users}
                index={1}
              />
              <KPICard
                label="Evaluaciones completadas"
                value={evaluations?.length ?? 0}
                icon={CheckCircle2}
                index={2}
              />
              <KPICard
                label="Competencia más fuerte"
                value={strongestCompetency}
                icon={Trophy}
                index={3}
              />
            </div>

            {/* Radar chart */}
            <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Radar de competencias del equipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CompetencyRadar data={results.competencyAverages} />
              </CardContent>
            </Card>

            {/* Heatmap */}
            {results.heatmap.length > 0 && (
              <Card className="animate-fade-up" style={{ animationDelay: '250ms' }}>
                <CardHeader>
                  <CardTitle>Mapa de calor: competencias x empleados</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Empleado</TableHead>
                        {competencyNames.map((name) => (
                          <TableHead key={name} className="text-center min-w-[100px]">
                            {name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.heatmap.map((row) => (
                        <TableRow key={row.employeeName}>
                          <TableCell className="font-medium">
                            {row.employeeName}
                          </TableCell>
                          {competencyNames.map((name) => {
                            const score = row.scores[name] ?? 0
                            return (
                              <TableCell key={name} className="text-center">
                                <span
                                  className={cn(
                                    'inline-flex items-center justify-center rounded-md px-2 py-1 text-xs',
                                    scoreColorClass(score)
                                  )}
                                >
                                  {score > 0 ? score.toFixed(1) : '—'}
                                </span>
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* AI Insights */}
            <Card className="animate-fade-up" style={{ animationDelay: '300ms' }}>
              <CardHeader className={cn(organization?.ai_enabled && 'bg-gradient-ai rounded-t-lg')}>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-ai" />
                  Insights IA del equipo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {organization?.ai_enabled ? (
                  results.insights.length > 0 ? (
                    results.insights.map((insight, index) => (
                      <AIInsightCard
                        key={`${insight.type}-${index}`}
                        insight={insight}
                        index={index}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No se generaron insights para esta campaña.
                    </p>
                  )
                ) : (
                  <div className="flex items-center gap-3 py-6 px-4 rounded-lg bg-muted/50">
                    <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        Insights IA disponible en plan Growth+
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Actualiza tu plan para obtener análisis inteligentes automáticos de tu equipo.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employee ranking */}
            <Card className="animate-fade-up" style={{ animationDelay: '350ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Ranking de empleados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...results.employeeResults]
                    .sort((a, b) => b.overallScore - a.overallScore)
                    .map((emp, index) => (
                      <div
                        key={emp.employeeId}
                        className="flex items-center justify-between gap-4 py-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-medium text-muted-foreground w-6 text-right shrink-0">
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {emp.employeeName}
                            </p>
                            {emp.position && (
                              <p className="text-xs text-muted-foreground truncate">
                                {emp.position}
                              </p>
                            )}
                          </div>
                        </div>
                        <ScoreBadge score={emp.overallScore} />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============= INDIVIDUAL TAB ============= */}
          <TabsContent value="individual" className="space-y-6">
            {/* Employee selector */}
            <div className="animate-fade-up">
              <Select
                value={selectedEmployeeId ?? ''}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger className="w-full sm:w-[320px]">
                  <SelectValue placeholder="Seleccionar empleado..." />
                </SelectTrigger>
                <SelectContent>
                  {results.employeeResults.map((emp) => (
                    <SelectItem key={emp.employeeId} value={emp.employeeId}>
                      {emp.employeeName}
                      {emp.position ? ` — ${emp.position}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedEmployeeId && (
              <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
                <CardContent>
                  <EmptyState
                    icon={User}
                    title="Selecciona un empleado"
                    description="Elige un empleado del selector para ver su desglose individual de resultados."
                  />
                </CardContent>
              </Card>
            )}

            {selectedEmployee && (
              <>
                {/* Individual radar */}
                <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        {selectedEmployee.employeeName}
                      </CardTitle>
                      <ScoreBadge score={selectedEmployee.overallScore} />
                    </div>
                    {selectedEmployee.position && (
                      <p className="text-sm text-muted-foreground">
                        {selectedEmployee.position}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <CompetencyRadar
                      data={template!.competencies.map((comp) => {
                        const score = selectedEmployee.competencyScores[comp.id]
                        return {
                          competency: comp.name,
                          self: score?.self,
                          manager: score?.manager,
                          peers: score?.peers,
                        }
                      })}
                    />
                  </CardContent>
                </Card>

                {/* Competency breakdown */}
                <Card className="animate-fade-up" style={{ animationDelay: '150ms' }}>
                  <CardHeader>
                    <CardTitle>Desglose por competencia</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {template!.competencies.map((comp) => {
                      const score = selectedEmployee.competencyScores[comp.id]
                      if (!score || score.avg === 0) return null

                      return (
                        <div key={comp.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">{comp.name}</h4>
                            <ScoreBadge score={score.avg} />
                          </div>
                          <div className="space-y-2">
                            {score.self !== undefined && (
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-24 shrink-0">
                                  Autoevaluación
                                </span>
                                <Progress
                                  value={(score.self / 5) * 100}
                                  className="flex-1 h-2"
                                />
                                <span className="text-xs font-medium w-8 text-right">
                                  {score.self.toFixed(1)}
                                </span>
                              </div>
                            )}
                            {score.manager !== undefined && (
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-24 shrink-0">
                                  Manager
                                </span>
                                <Progress
                                  value={(score.manager / 5) * 100}
                                  className="flex-1 h-2"
                                />
                                <span className="text-xs font-medium w-8 text-right">
                                  {score.manager.toFixed(1)}
                                </span>
                              </div>
                            )}
                            {score.peers !== undefined && (
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-24 shrink-0">
                                  Pares
                                </span>
                                <Progress
                                  value={(score.peers / 5) * 100}
                                  className="flex-1 h-2"
                                />
                                <span className="text-xs font-medium w-8 text-right">
                                  {score.peers.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                          <Separator />
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {/* Gap analysis */}
                {(() => {
                  const gaps = template!.competencies
                    .map((comp) => {
                      const score = selectedEmployee.competencyScores[comp.id]
                      if (
                        !score ||
                        score.self === undefined ||
                        (score.manager === undefined && score.peers === undefined)
                      )
                        return null

                      const external =
                        score.manager !== undefined && score.peers !== undefined
                          ? (score.manager + score.peers) / 2
                          : score.manager ?? score.peers ?? 0
                      const gap = score.self - external

                      if (Math.abs(gap) < 1.0) return null

                      return { competency: comp.name, self: score.self, external, gap }
                    })
                    .filter(Boolean)

                  if (gaps.length === 0) return null

                  return (
                    <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                          Análisis de discrepancias
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {gaps.map((g) => (
                          <div
                            key={g!.competency}
                            className="flex items-center justify-between gap-4 rounded-lg border p-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {g!.competency}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Auto: {g!.self.toFixed(1)} vs Externa:{' '}
                                {g!.external.toFixed(1)}
                              </p>
                            </div>
                            <Badge
                              variant={g!.gap > 0 ? 'average' : 'ai'}
                            >
                              {g!.gap > 0 ? '+' : ''}
                              {g!.gap.toFixed(1)} gap
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Comments */}
                {selectedEmployee.comments.length > 0 && (
                  <Card className="animate-fade-up" style={{ animationDelay: '250ms' }}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Comentarios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(
                        selectedEmployee.comments.reduce<
                          Record<string, typeof selectedEmployee.comments>
                        >((acc, comment) => {
                          if (!acc[comment.question]) acc[comment.question] = []
                          acc[comment.question].push(comment)
                          return acc
                        }, {})
                      ).map(([question, comments]) => (
                        <div key={question} className="space-y-2">
                          <p className="text-sm font-medium">{question}</p>
                          {comments.map((c, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
                            >
                              <Badge variant="outline" className="shrink-0 mt-0.5">
                                {c.evaluatorType === 'self'
                                  ? 'Auto'
                                  : c.evaluatorType === 'manager'
                                    ? 'Manager'
                                    : c.evaluatorType === 'peer'
                                      ? 'Par'
                                      : c.evaluatorType}
                              </Badge>
                              <p className="text-sm text-foreground">{c.comment}</p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Individual AI Insights */}
                <Card className="animate-fade-up" style={{ animationDelay: '300ms' }}>
                  <CardHeader
                    className={cn(
                      organization?.ai_enabled && 'bg-gradient-ai rounded-t-lg'
                    )}
                  >
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-ai" />
                      Insights IA — {selectedEmployee.employeeName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {organization?.ai_enabled ? (
                      selectedEmployee.insights.length > 0 ? (
                        selectedEmployee.insights.map((insight, index) => (
                          <AIInsightCard
                            key={`${insight.type}-${index}`}
                            insight={insight}
                            index={index}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No se generaron insights para este empleado.
                        </p>
                      )
                    ) : (
                      <div className="flex items-center gap-3 py-6 px-4 rounded-lg bg-muted/50">
                        <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">
                            Insights IA disponible en plan Growth+
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Actualiza tu plan para obtener análisis inteligentes de cada empleado.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
