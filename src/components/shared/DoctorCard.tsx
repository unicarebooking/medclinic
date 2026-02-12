'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Doctor {
  id: string
  user: {
    full_name: string
    avatar_url: string | null
  }
  specialization: string
  years_of_experience: number
  consultation_fee: number
  bio: string | null
}

interface DoctorCardProps {
  doctor: Doctor
}

export function DoctorCard({ doctor }: DoctorCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={doctor.user.avatar_url || ''} alt={doctor.user.full_name} />
          <AvatarFallback className="text-lg">{getInitials(doctor.user.full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-lg">ד&quot;ר {doctor.user.full_name}</CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{doctor.specialization}</Badge>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {doctor.bio || `רופא מומחה ב${doctor.specialization} עם ${doctor.years_of_experience} שנות ניסיון`}
          </p>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {doctor.years_of_experience} שנות ניסיון
            </span>
            <span className="font-semibold text-primary">
              ₪{doctor.consultation_fee} לביקור
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <Link href={`/doctors/${doctor.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                צפה בפרופיל
              </Button>
            </Link>
            <Link href={`/doctors/${doctor.id}/book`} className="flex-1">
              <Button className="w-full">
                קבע תור
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
