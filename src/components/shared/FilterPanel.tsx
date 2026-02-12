'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CITIES, SPECIALIZATIONS } from '@/lib/constants'

export function FilterPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSpecialization = searchParams.get('specialization') || ''
  const currentCity = searchParams.get('city') || ''
  const currentSearch = searchParams.get('search') || ''

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })

      return params.toString()
    },
    [searchParams]
  )

  const handleSpecializationChange = (value: string) => {
    const query = createQueryString({ specialization: value === 'all' ? '' : value })
    router.push(`/doctors${query ? `?${query}` : ''}`)
  }

  const handleCityChange = (value: string) => {
    const query = createQueryString({ city: value === 'all' ? '' : value })
    router.push(`/doctors${query ? `?${query}` : ''}`)
  }

  const handleSearchChange = (value: string) => {
    const query = createQueryString({ search: value })
    router.push(`/doctors${query ? `?${query}` : ''}`)
  }

  const clearFilters = () => {
    router.push('/doctors')
  }

  const hasFilters = currentSpecialization || currentCity || currentSearch

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">סינון רופאים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search">חיפוש שם</Label>
          <Input
            id="search"
            placeholder="חפש לפי שם רופא..."
            value={currentSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialization">התמחות</Label>
          <Select
            value={currentSpecialization || 'all'}
            onValueChange={handleSpecializationChange}
          >
            <SelectTrigger id="specialization">
              <SelectValue placeholder="כל ההתמחויות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל ההתמחויות</SelectItem>
              {SPECIALIZATIONS.map((spec) => (
                <SelectItem key={spec} value={spec}>
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">עיר</Label>
          <Select
            value={currentCity || 'all'}
            onValueChange={handleCityChange}
          >
            <SelectTrigger id="city">
              <SelectValue placeholder="כל הערים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הערים</SelectItem>
              {CITIES.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="outline" className="w-full" onClick={clearFilters}>
            נקה סינון
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
