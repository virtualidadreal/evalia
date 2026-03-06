import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import type { Organization, OrgMember } from '@/types/database'

interface AuthState {
  user: User | null
  session: Session | null
  organization: Organization | null
  membership: OrgMember | null
  isLoading: boolean
  isSuperAdmin: boolean
  setAuth: (user: User | null, session: Session | null) => void
  setOrganization: (org: Organization | null, membership: OrgMember | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  organization: null,
  membership: null,
  isLoading: true,
  isSuperAdmin: false,
  setAuth: (user, session) =>
    set({
      user,
      session,
      isSuperAdmin: user?.user_metadata?.is_super_admin === true,
    }),
  setOrganization: (organization, membership) =>
    set({ organization, membership }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({
      user: null,
      session: null,
      organization: null,
      membership: null,
      isLoading: false,
      isSuperAdmin: false,
    }),
}))
