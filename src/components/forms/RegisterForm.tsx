'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const registerSchema = z.object({
  fullName: z.string().min(2, 'שם מלא חייב להכיל לפחות 2 תווים'),
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'הסיסמאות אינן תואמות',
  path: ['confirmPassword'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: RegisterFormValues) {
    setIsLoading(true)
    setError(null)

    const { error } = await register(values.email, values.password, values.fullName)

    if (error) {
      setError('שגיאה בהרשמה. ייתכן שהאימייל כבר קיים במערכת.')
      setIsLoading(false)
      return
    }

    router.push('/patient/dashboard')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">הרשמה</CardTitle>
        <CardDescription>צור חשבון חדש במערכת</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md text-center">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם מלא</FormLabel>
                  <FormControl>
                    <Input placeholder="ישראל ישראלי" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>אימייל</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                      dir="ltr"
                      className="text-left"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>סיסמה</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} dir="ltr" className="text-left" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>אימות סיסמה</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} dir="ltr" className="text-left" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'נרשם...' : 'הירשם'}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">כבר יש לך חשבון? </span>
          <Link href="/login" className="text-primary hover:underline">
            התחבר
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
