'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    resetPassword,
    fetchUser,
  } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    // Fetch user on mount
    fetchUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUser()
        } else if (event === 'SIGNED_OUT') {
          useAuthStore.getState().setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUser])

  return {
    user,
    isLoading,
    isAuthenticated,
    isPatient: user?.role === 'patient',
    isDoctor: user?.role === 'doctor',
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    resetPassword,
  }
}
