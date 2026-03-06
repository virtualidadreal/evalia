import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const OnboardingPage = lazy(() => import('@/pages/auth/OnboardingPage'))
const DashboardPage = lazy(() => import('@/pages/app/DashboardPage'))
const EmployeesPage = lazy(() => import('@/pages/app/EmployeesPage'))
const EvaluationsPage = lazy(() => import('@/pages/app/EvaluationsPage'))
const EvaluationBuilderPage = lazy(() => import('@/pages/app/EvaluationBuilderPage'))
const CampaignsPage = lazy(() => import('@/pages/app/CampaignsPage'))
const CampaignWizardPage = lazy(() => import('@/pages/app/CampaignWizardPage'))
const CampaignDetailPage = lazy(() => import('@/pages/app/CampaignDetailPage'))
const ResultsPage = lazy(() => import('@/pages/app/ResultsPage'))
const ReportsPage = lazy(() => import('@/pages/app/ReportsPage'))
const SettingsPage = lazy(() => import('@/pages/app/SettingsPage'))
const EvaluatePublicPage = lazy(() => import('@/pages/public/EvaluatePublicPage'))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'))

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-pulse-glow h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-lg">E</span>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, requireOnboarding = false }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  const { user, organization, isLoading } = useAuthStore()

  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (requireOnboarding && organization && !organization.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, isLoading } = useAuthStore()

  if (isLoading) return <LoadingScreen />
  if (!user || !isSuperAdmin) return <Navigate to="/" replace />

  return <>{children}</>
}

// Lazy import for AppLayout
const AppLayout = lazy(() => import('@/components/layout/AppLayout'))

export function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/evaluate/:token" element={<EvaluatePublicPage />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

          {/* App */}
          <Route path="/app" element={<ProtectedRoute requireOnboarding><AppLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="evaluations" element={<EvaluationsPage />} />
            <Route path="evaluations/new" element={<EvaluationBuilderPage />} />
            <Route path="evaluations/:id/edit" element={<EvaluationBuilderPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="campaigns/new" element={<CampaignWizardPage />} />
            <Route path="campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Admin (Carmen) */}
          <Route path="/admin" element={<SuperAdminRoute><AdminPage /></SuperAdminRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
