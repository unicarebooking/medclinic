import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, fullName, role = 'patient' } = await request.json()

    const supabase = await createClient()

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Registration failed' },
        { status: 400 }
      )
    }

    // Create user record in users table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: userError } = await (supabase as any).from('users').insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role,
    })

    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
