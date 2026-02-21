import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip auth check entirely for public routes and API routes (major perf improvement)
  const isPublicRoute = pathname === '/' ||
    pathname.startsWith('/doctors') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/api/')

  if (isPublicRoute) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define protected routes
  const isAuthRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password')

  const isPatientRoute = pathname.startsWith('/patient')

  // Use '/doctor/' with trailing slash to avoid matching '/doctors' (public page)
  const isDoctorRoute = pathname.startsWith('/doctor/')

  const isAdminRoute = pathname.startsWith('/admin')

  // Redirect to login if accessing protected routes without authentication
  if (!user && (isPatientRoute || isDoctorRoute || isAdminRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and tries to access auth routes, redirect to appropriate dashboard
  if (user && isAuthRoute) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    if (userData?.role === 'doctor') {
      url.pathname = '/doctor/dashboard'
    } else if (userData?.role === 'admin') {
      url.pathname = '/admin/dashboard'
    } else {
      url.pathname = '/patient/dashboard'
    }
    return NextResponse.redirect(url)
  }

  // Check role-based access
  if (user && (isDoctorRoute || isAdminRoute)) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (isDoctorRoute && userData?.role !== 'doctor' && userData?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/patient/dashboard'
      return NextResponse.redirect(url)
    }

    if (isAdminRoute && userData?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = userData?.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
