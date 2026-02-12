import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { FilterPanel } from '@/components/shared/FilterPanel'
import { DoctorsList } from './DoctorsList'
import { Skeleton } from '@/components/ui/skeleton'

interface DoctorsPageProps {
  searchParams: Promise<{
    specialization?: string
    city?: string
    search?: string
  }>
}

function DoctorsListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-64" />
      ))}
    </div>
  )
}

export default async function DoctorsPage({ searchParams }: DoctorsPageProps) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">הרופאים שלנו</h1>
            <p className="text-muted-foreground">
              מצא את הרופא המתאים לך מבין 30+ רופאים מומחים
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1">
              <Suspense fallback={<Skeleton className="h-96" />}>
                <FilterPanel />
              </Suspense>
            </aside>

            <div className="lg:col-span-3">
              <Suspense fallback={<DoctorsListSkeleton />}>
                <DoctorsList
                  specialization={params.specialization}
                  city={params.city}
                  search={params.search}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
