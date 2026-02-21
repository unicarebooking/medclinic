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

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return { error: authError }
    }

    await get().fetchUser()
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

    // Safety timeout: stop loading after 5s even if getUser() hangs
    const loadingTimeout = setTimeout(() => {
      if (get().isLoading) {
        set({ isLoading: false })
      }
    }, 5000)

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      clearTimeout(loadingTimeout)

      if (authError || !authUser) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      // If we already have this user loaded, just stop loading
      if (currentUser?.id === authUser.id) {
        set({ isLoading: false })
        return
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error || !userData) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (err) {
      clearTimeout(loadingTimeout)
      // On timeout/network error, don't log out if already authenticated
      if (currentUser) {
        set({ isLoading: false })
        return
      }
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
