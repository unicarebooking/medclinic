'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
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

const forgotPasswordSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { resetPassword } = useAuth()

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const { error } = await resetPassword(values.email)

    if (error) {
      setError('שגיאה בשליחת הקישור. נסה שוב מאוחר יותר.')
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">בדוק את האימייל שלך</CardTitle>
          <CardDescription>
            שלחנו לך קישור לאיפוס הסיסמה. בדוק את תיבת הדואר שלך.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <Link href="/login">
              <Button variant="outline" className="mt-4">
                חזור להתחברות
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">שכחת סיסמה?</CardTitle>
        <CardDescription>הזן את האימייל שלך ונשלח לך קישור לאיפוס הסיסמה</CardDescription>
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'שולח...' : 'שלח קישור לאיפוס'}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            חזור להתחברות
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
