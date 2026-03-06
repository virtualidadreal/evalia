import { AuthProvider } from './providers/AuthProvider'
import { QueryProvider } from './providers/QueryProvider'
import { Router } from './Router'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <Router />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryProvider>
  )
}
