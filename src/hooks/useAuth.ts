'use client'

import { useEffect, useRef } from 'react'
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

  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const supabase = createClient()

    // Fetch user on mount (only once)
    fetchUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        console.log('[auth] onAuthStateChange:', event)
        if (event === 'SIGNED_IN') {
          // Only fetch if we don't already have a user (avoid duplicate during login flow)
          if (!useAuthStore.getState().user) {
            await fetchUser()
          }
        } else if (event === 'SIGNED_OUT') {
          useAuthStore.getState().setUser(null)
        }
        // TOKEN_REFRESHED doesn't need to re-fetch user data
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
