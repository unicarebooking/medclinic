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
    set({ isLoading: true })
    console.log('=== fetchUser started ===')

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 5000)
      )

      const authPromise = supabase.auth.getUser()

      const result = await Promise.race([authPromise, timeoutPromise]) as any
      const authUser = result?.data?.user
      const authError = result?.error

      console.log('Auth user:', authUser?.id, 'Auth error:', authError)

      if (!authUser) {
        console.log('No auth user, setting isLoading to false')
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      console.log('User data:', userData, 'Error:', error)

      if (error || !userData) {
        console.log('No user data, setting isLoading to false')
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      console.log('Setting authenticated user')
      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (err) {
      console.log('fetchUser error:', err)
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
