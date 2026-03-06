import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setOrganization, setLoading, reset } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuth(session.user, session)
        loadOrganization(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setAuth(session.user, session)
        await loadOrganization(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        reset()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadOrganization(userId: string) {
    try {
      const { data: member } = await supabase
        .from('org_members')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (member) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', member.organization_id)
          .single()

        setOrganization(org, member)
      }
    } catch (error) {
      console.error('Error loading organization:', error)
    } finally {
      setLoading(false)
    }
  }

  return <>{children}</>
}
