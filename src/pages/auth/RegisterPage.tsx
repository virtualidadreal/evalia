import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email no válido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterForm) {
    const { data: authData, error: signUpError } =
      await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { full_name: data.fullName } },
      })

    if (signUpError) {
      toast.error(signUpError.message)
      return
    }

    const user = authData.user
    if (!user) {
      toast.error('Error al crear la cuenta')
      return
    }

    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: `Empresa de ${data.fullName}`,
        slug: data.email.split('@')[0] + '-' + Date.now(),
        size: '1-10',
        subscription_status: 'trialing',
        subscription_plan: 'growth',
        trial_ends_at: trialEnd.toISOString(),
        max_employees: 100,
        max_admins: 3,
        max_campaigns_per_month: -1,
        ai_enabled: true,
        employee_count: 0,
        onboarding_completed: false,
      })
      .select()
      .single()

    if (orgError || !org) {
      toast.error('Error al crear la organización')
      return
    }

    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'admin',
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      toast.error('Error al configurar tu cuenta')
      return
    }

    navigate('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        <Card>
          <CardHeader className="text-center">
            <div className="flex flex-col items-center mb-2">
              <span className="text-2xl font-bold text-foreground">{BRAND_NAME}</span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">{BRAND_TAGLINE}</span>
            </div>
            <CardTitle className="text-xl">Crea tu cuenta gratis</CardTitle>
            <CardDescription>
              14 días de prueba gratuita, sin tarjeta de crédito
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Tu nombre"
                  autoComplete="name"
                  {...register('fullName')}
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  autoComplete="email"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    {...register('password')}
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    aria-invalid={!!errors.confirmPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="premium"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Crear cuenta
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Al registrarte, aceptas nuestros{' '}
                <Link to="#" className="text-primary hover:underline">
                  Términos
                </Link>{' '}
                y{' '}
                <Link to="#" className="text-primary hover:underline">
                  Política de Privacidad
                </Link>
              </p>

              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <Link
                  to="/login"
                  className="text-primary font-medium hover:underline"
                >
                  Inicia sesión
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
