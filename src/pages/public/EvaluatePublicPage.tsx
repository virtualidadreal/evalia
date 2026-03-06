import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  LinkIcon,
  Save,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useEvaluationByToken,
  useSubmitEvaluation,
  useSavePartialEvaluation,
} from '@/hooks/use-evaluations'
import type {
  EvaluationResponse,
  EvalQuestion,
  Competency,
  Rubric,
  EvaluatorType,
} from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const AUTOSAVE_INTERVAL = 30_000

const evaluatorTypeLabels: Record<EvaluatorType, string> = {
  self: 'Autoevaluación',
  manager: 'Manager',
  peer: 'Compañero/a',
  subordinate: 'Subordinado/a',
  external: 'Externo',
}

export default function EvaluatePublicPage() {
  const { token } = useParams<{ token: string }>()
  const { data: evaluation, isLoading, isError } = useEvaluationByToken(token)
  const submitMutation = useSubmitEvaluation()
  const saveMutation = useSavePartialEvaluation()

  const [responses, setResponses] = useState<Record<string, EvaluationResponse>>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const responsesRef = useRef(responses)
  const hasInitialized = useRef(false)

  // Keep ref in sync
  responsesRef.current = responses

  // Load existing responses once
  useEffect(() => {
    if (evaluation && !hasInitialized.current) {
      const existing = evaluation.responses as Record<string, EvaluationResponse> | null
      if (existing && Object.keys(existing).length > 0) {
        setResponses(existing)
      }
      hasInitialized.current = true
    }
  }, [evaluation])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!evaluation || evaluation.status === 'submitted' || submitted) return

    const interval = setInterval(() => {
      const current = responsesRef.current
      if (Object.keys(current).length > 0) {
        saveMutation.mutate({ id: evaluation.id, responses: current })
      }
    }, AUTOSAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [evaluation, submitted, saveMutation])

  const template = evaluation?._template as {
    competencies: Competency[]
    questions: EvalQuestion[]
    rubric: Rubric
  } | null

  const questions = template?.questions ?? []
  const competencies = template?.competencies ?? []
  const rubric = template?.rubric ?? null

  // Group questions by competency
  const questionsByCompetency = useMemo(() => {
    const map = new Map<string, EvalQuestion[]>()
    for (const q of questions) {
      const existing = map.get(q.competency_id) ?? []
      existing.push(q)
      map.set(q.competency_id, existing)
    }
    return map
  }, [questions])

  // Progress
  const requiredQuestions = questions.filter((q) => q.required)
  const totalAnswered = questions.filter((q) => responses[q.id]?.value != null && responses[q.id]?.value !== '').length
  const progressPercent = questions.length > 0 ? Math.round((totalAnswered / questions.length) * 100) : 0

  const setResponse = useCallback((questionId: string, value: number | string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], value },
    }))
  }, [])

  const handleSaveProgress = useCallback(() => {
    if (!evaluation) return
    saveMutation.mutate(
      { id: evaluation.id, responses: responsesRef.current },
      { onSuccess: () => toast.success('Progreso guardado') },
    )
  }, [evaluation, saveMutation])

  const handleSubmit = useCallback(() => {
    if (!evaluation) return

    // Validate required
    const missing = requiredQuestions.filter(
      (q) => responses[q.id]?.value == null || responses[q.id]?.value === '',
    )
    if (missing.length > 0) {
      toast.error(`Faltan ${missing.length} pregunta${missing.length > 1 ? 's' : ''} obligatoria${missing.length > 1 ? 's' : ''} por responder`)
      setShowConfirmDialog(false)
      return
    }

    submitMutation.mutate(
      { id: evaluation.id, responses },
      {
        onSuccess: () => {
          setSubmitted(true)
          setShowConfirmDialog(false)
        },
      },
    )
  }, [evaluation, requiredQuestions, responses, submitMutation])

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
            tt
          </div>
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando evaluación...</p>
        </div>
      </div>
    )
  }

  // --- Error / invalid token ---
  if (isError || !evaluation) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-up">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <LinkIcon className="size-6 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Enlace no válido</h2>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Este enlace de evaluación no es válido o ha expirado. Contacta con tu
              empresa si crees que es un error.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const campaign = evaluation.campaigns as {
    name: string
    description: string | null
    status: string
    settings: { evaluator_types: string[]; anonymous: boolean }
    template_id: string
    organizations: { name: string; logo_url: string | null }
  } | null

  const employee = evaluation.employees as {
    full_name: string
    position: string
  } | null

  // --- Campaign not active ---
  if (campaign && campaign.status !== 'active') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-up">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="h-14 w-14 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="size-6 text-warning" />
            </div>
            <h2 className="text-xl font-semibold">Evaluación no disponible</h2>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Esta evaluación ya no está activa. Si tienes dudas, contacta con tu
              organización.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Already submitted ---
  if (evaluation.status === 'submitted' && !submitted) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-up">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="size-6 text-success" />
            </div>
            <h2 className="text-xl font-semibold">Evaluación completada</h2>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Ya has completado esta evaluación. Tus respuestas han sido registradas.
            </p>
            {campaign?.organizations?.name && (
              <p className="text-xs text-muted-foreground">
                {campaign.organizations.name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Thank you screen after submission ---
  if (submitted) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-up">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="size-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold">¡Gracias por tu evaluación!</h2>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Tu feedback ha sido registrado correctamente.
            </p>
            {campaign?.organizations?.name && (
              <p className="text-sm font-medium text-muted-foreground mt-2">
                {campaign.organizations.name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Main evaluation form ---
  return (
    <div className="min-h-screen bg-muted">
      <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="animate-fade-up space-y-4 mb-6">
          <div className="flex items-center gap-3">
            {campaign?.organizations?.logo_url ? (
              <img
                src={campaign.organizations.logo_url}
                alt={campaign.organizations.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-base font-bold text-primary-foreground">
                tt
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">
                {campaign?.organizations?.name ?? 'Evaluación'}
              </p>
              <p className="text-sm text-muted-foreground">
                {campaign?.name}
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Evaluación de:{' '}
                  <span className="font-medium text-foreground">
                    {employee?.full_name ?? 'Empleado'}
                  </span>
                </p>
                <Badge variant="secondary">
                  {evaluatorTypeLabels[evaluation.evaluator_type as EvaluatorType] ?? evaluation.evaluator_type}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{totalAnswered} de {questions.length} respondidas</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questions grouped by competency */}
        <div className="space-y-6">
          {competencies.map((comp, compIdx) => {
            const compQuestions = questionsByCompetency.get(comp.id) ?? []
            if (compQuestions.length === 0) return null

            return (
              <Card key={comp.id} className="animate-fade-up" style={{ animationDelay: `${compIdx * 50}ms` }}>
                <CardHeader>
                  <CardTitle className="text-base">{comp.name}</CardTitle>
                  {comp.description && (
                    <CardDescription>{comp.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {compQuestions.map((question, qIdx) => (
                    <div key={question.id}>
                      {qIdx > 0 && <Separator className="mb-6" />}
                      <QuestionField
                        question={question}
                        rubric={rubric}
                        value={responses[question.id]?.value}
                        onChange={(val) => setResponse(question.id, val)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="mt-8 mb-12 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleSaveProgress}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar progreso
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              const missing = requiredQuestions.filter(
                (q) => responses[q.id]?.value == null || responses[q.id]?.value === '',
              )
              if (missing.length > 0) {
                toast.error(`Faltan ${missing.length} pregunta${missing.length > 1 ? 's' : ''} obligatoria${missing.length > 1 ? 's' : ''} por responder`)
                return
              }
              setShowConfirmDialog(true)
            }}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Enviar evaluación
          </Button>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar envío</DialogTitle>
            <DialogDescription>
              ¿Estás seguro? Una vez enviada no podrás modificar tus respuestas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar envío
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Question field component ---

function QuestionField({
  question,
  rubric,
  value,
  onChange,
}: {
  question: EvalQuestion
  rubric: Rubric | null
  value: number | string | undefined
  onChange: (val: number | string) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {question.text}
        {question.required && <span className="text-destructive ml-1">*</span>}
      </p>

      {question.type === 'scale' && (
        <ScaleInput
          rubric={rubric}
          value={typeof value === 'number' ? value : undefined}
          onChange={onChange}
        />
      )}

      {question.type === 'text' && (
        <Textarea
          placeholder="Escribe tu respuesta..."
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-24 resize-y"
        />
      )}

      {question.type === 'choice' && question.options && (
        <RadioGroup
          value={typeof value === 'string' ? value : ''}
          onValueChange={onChange}
        >
          {question.options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem value={option} />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </RadioGroup>
      )}
    </div>
  )
}

// --- Scale input (1-5 buttons) ---

function ScaleInput({
  rubric,
  value,
  onChange,
}: {
  rubric: Rubric | null
  value: number | undefined
  onChange: (val: number) => void
}) {
  const min = rubric?.scale?.min ?? 1
  const max = rubric?.scale?.max ?? 5
  const labels = rubric?.scale?.labels ?? {}
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(step)}
            className={cn(
              'flex-1 min-h-11 min-w-11 rounded-lg border text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              value === step
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {step}
          </button>
        ))}
      </div>
      {Object.keys(labels).length > 0 && (
        <div className="flex justify-between text-[11px] text-muted-foreground px-1">
          <span>{labels[min] ?? ''}</span>
          <span>{labels[max] ?? ''}</span>
        </div>
      )}
    </div>
  )
}
