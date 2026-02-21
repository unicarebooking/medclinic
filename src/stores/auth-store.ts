import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database.types'

interface User {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setIsLoading: (isLoading: boolean) => void
  login: (email: string, password: string) => Promise<{ error: Error | null }>
  register: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: Error | null }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setIsLoading: (isLoading) => set({ isLoading }),

  login: async (email, password) => {
    const supabase = createClient()

    console.log('[auth] login started for:', email)
    const loginStart = Date.now()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log('[auth] signInWithPassword took', Date.now() - loginStart, 'ms, error:', authError?.message || 'none')

    if (authError) {
      return { error: authError }
    }

    await get().fetchUser()
    console.log('[auth] login complete, user:', get().user?.email || 'none')
    return { error: null }
  },

  register: async (email, password, fullName, role = 'patient') => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        return { error: new Error(data.error || 'Registration failed') }
      }

      // Sign in after registration
      const supabase = createClient()
      await supabase.auth.signInWithPassword({ email, password })

      await get().fetchUser()
      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  },

  logout: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  },

  resetPassword: async (email) => {
    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    return { error }
  },

  fetchUser: async () => {
    const supabase = createClient()
    const currentUser = get().user

    // Only show loading if we don't have a user yet
    if (!currentUser) {
      set({ isLoading: true })
    }

    console.log('[auth] fetchUser started, currentUser:', currentUser?.id || 'none')

    // Safety timeout: stop loading after 8s even if getUser() hangs
    const loadingTimeout = setTimeout(() => {
      console.warn('[auth] fetchUser safety timeout fired after 8s')
      if (get().isLoading) {
        set({ isLoading: false })
      }
    }, 8000)

    try {
      console.log('[auth] calling supabase.auth.getUser()...')
      const startTime = Date.now()
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      console.log('[auth] getUser() took', Date.now() - startTime, 'ms, user:', authUser?.id || 'none', 'error:', authError?.message || 'none')

      clearTimeout(loadingTimeout)

      if (authError || !authUser) {
        console.log('[auth] No auth user, clearing state')
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      // If we already have this user loaded, just stop loading
      if (currentUser?.id === authUser.id) {
        console.log('[auth] User already loaded, skipping DB fetch')
        set({ isLoading: false })
        return
      }

      console.log('[auth] Fetching user profile from DB...')
      const dbStart = Date.now()
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      console.log('[auth] DB query took', Date.now() - dbStart, 'ms, result:', userData?.id || 'none', 'error:', error?.message || 'none')

      if (error || !userData) {
        console.error('[auth] Failed to fetch user profile:', error?.message)
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      console.log('[auth] User authenticated:', userData.email, 'role:', userData.role)
      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (err) {
      clearTimeout(loadingTimeout)
      console.error('[auth] fetchUser error:', err)
      // On timeout/network error, don't log out if already authenticated
      if (currentUser) {
        set({ isLoading: false })
        return
      }
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
