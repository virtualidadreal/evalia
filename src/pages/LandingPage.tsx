import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Sparkles,
  BarChart3,
  Users,
  FileText,
  LayoutDashboard,
  ClipboardList,
  ArrowRight,
  Menu,
  Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { PricingCard } from '@/components/landing/PricingCard'
import { PRICING, APP_NAME, BRAND_NAME, BRAND_TAGLINE } from '@/lib/constants'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Precios', href: '#pricing' },
]

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Evaluaciones con IA',
    description:
      'Describe tu equipo y la IA genera competencias, preguntas y rúbricas automáticamente.',
  },
  {
    icon: BarChart3,
    title: 'Análisis automático',
    description:
      'Resultados procesados con IA: insights, fortalezas, riesgos y oportunidades.',
  },
  {
    icon: Users,
    title: 'Multi-evaluador',
    description:
      'Autoevaluación, jefe directo, pares y subordinados. Evaluaciones 360 completas.',
  },
  {
    icon: FileText,
    title: 'Informes PDF',
    description:
      'Genera informes profesionales con narrativa IA, gráficos y recomendaciones.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard en tiempo real',
    description:
      'Monitoriza campañas activas, tasas de completación e insights clave.',
  },
  {
    icon: ClipboardList,
    title: 'Templates inteligentes',
    description:
      'Biblioteca de plantillas predefinidas o genera las tuyas con IA.',
  },
] as const

const STEPS = [
  {
    number: 1,
    title: 'Describe tu equipo',
    description: 'Indica el sector, puestos y qué quieres evaluar.',
  },
  {
    number: 2,
    title: 'La IA genera tu evaluación',
    description:
      'Competencias, preguntas y rúbricas personalizadas en segundos.',
  },
  {
    number: 3,
    title: 'Lanza y recibe insights',
    description:
      'Envía evaluaciones a tu equipo y recibe análisis automáticos.',
  },
] as const

const TESTIMONIALS = [
  {
    quote:
      'En 15 minutos tenía la evaluación lista. Antes me llevaba dos semanas.',
    name: 'Laura García',
    role: 'HR Manager, TechCorp',
    initials: 'LG',
  },
  {
    quote:
      'Los insights de IA me ayudaron a detectar problemas que no veía.',
    name: 'Carlos Rodríguez',
    role: 'Director de Operaciones, RetailCo',
    initials: 'CR',
  },
  {
    quote:
      'El equipo lo adoptó al instante. La interfaz es increíblemente intuitiva.',
    name: 'Ana Martínez',
    role: 'CEO, StartupX',
    initials: 'AM',
  },
] as const

const FOOTER_COLUMNS = [
  {
    title: 'Producto',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Demo', href: '#' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre nosotros', href: '#' },
      { label: 'Contacto', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidad', href: '#' },
      { label: 'Términos', href: '#' },
    ],
  },
] as const

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */

function Navbar() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground leading-tight">{BRAND_NAME}</span>
            <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">{BRAND_TAGLINE}</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login')}
            className="ml-2"
          >
            Iniciar sesión
          </Button>
          <Button
            variant="premium"
            size="sm"
            onClick={() => navigate('/register')}
            className="ml-1"
          >
            Empezar gratis
          </Button>
        </nav>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex flex-col gap-6 pt-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-base font-medium text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-border" />
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false)
                  navigate('/login')
                }}
              >
                Iniciar sesión
              </Button>
              <Button
                variant="premium"
                onClick={() => {
                  setOpen(false)
                  navigate('/register')
                }}
              >
                Empezar gratis
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  const navigate = useNavigate()

  return (
    <section className="bg-gradient-hero">
      <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <h1
          className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          style={{ animationDelay: '0ms' }}
        >
          Evaluación de talento{' '}
          <span className="text-gradient">inteligente.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          La plataforma de {BRAND_NAME} para crear evaluaciones integrales en minutos.
          La IA diseña, analiza y genera insights automáticamente.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            variant="premium"
            size="xl"
            onClick={() => navigate('/register')}
          >
            Empezar gratis — 14 días
            <ArrowRight className="size-4" />
          </Button>
          <Button variant="outline" size="xl" asChild>
            <a href="#features">Ver cómo funciona</a>
          </Button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Sin tarjeta de crédito · Setup en 5 minutos · Cancela cuando quieras
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Features                                                           */
/* ------------------------------------------------------------------ */

function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Todo lo que necesitas para evaluar mejor
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.title}
                className="transition-smooth hover:shadow-card-hover hover:-translate-y-0.5"
                style={{
                  opacity: 0,
                  animation: `fade-up 0.4s ease-out forwards`,
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <CardContent className="flex flex-col gap-4 pt-2">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                       */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  return (
    <section className="bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Empieza en 3 simples pasos
          </h2>
        </div>

        <div className="mt-16 flex flex-col gap-12">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex gap-6">
              {/* Number + line */}
              <div className="flex flex-col items-center">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.number}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mt-2 w-px flex-1 bg-border" />
                )}
              </div>

              {/* Text */}
              <div className="pb-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */

function PricingSection() {
  const navigate = useNavigate()

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Planes que crecen contigo
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            14 días gratis con todas las funcionalidades. Sin tarjeta de crédito.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING.map((plan) => (
            <PricingCard
              key={plan.name}
              name={plan.name}
              price={plan.price}
              description={plan.description}
              features={plan.features}
              popular={'popular' in plan && plan.popular === true}
              onSelect={() => navigate('/register')}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */

function Testimonials() {
  return (
    <section className="bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Lo que dicen nuestros clientes
          </h2>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="transition-smooth hover:shadow-card-hover">
              <CardContent className="flex flex-col gap-4 pt-2">
                <Quote className="size-6 text-primary/30" />
                <p className="text-sm leading-relaxed text-foreground">
                  "{t.quote}"
                </p>
                <div className="mt-auto flex items-center gap-3 pt-2">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  const navigate = useNavigate()

  return (
    <section className="bg-primary py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
          Empieza a evaluar mejor hoy
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80">
          14 días gratis. Sin tarjeta de crédito. Sin compromisos.
        </p>
        <Button
          size="xl"
          className="mt-10 bg-background text-foreground hover:bg-background/90"
          onClick={() => navigate('/register')}
        >
          Crear cuenta gratis
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex flex-col">
              <span className="text-base font-bold text-foreground">{BRAND_NAME}</span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">{BRAND_TAGLINE}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Evaluación de talento inteligente con IA
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">
                {col.title}
              </h4>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-smooth hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © 2026 {BRAND_NAME} · {BRAND_TAGLINE}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <PricingSection />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  )
}
