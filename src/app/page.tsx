import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const features = [
  {
    title: 'קביעת תורים בקלות',
    description: 'מצא רופאים מומחים וקבע תורים בקליק אחד',
    icon: '📅',
  },
  {
    title: 'רופאים מומחים',
    description: '30+ רופאים מומחים ב-10 התמחויות שונות',
    icon: '👨‍⚕️',
  },
  {
    title: '10 סניפים ארציים',
    description: 'קליניקות בכל רחבי הארץ לנוחיותך',
    icon: '🏥',
  },
  {
    title: 'סיכומי טיפולים',
    description: 'גישה מלאה להיסטוריית הטיפולים שלך',
    icon: '📋',
  },
]

const specializations = [
  'רפואה כללית',
  'רפואת עור',
  'רפואת עיניים',
  'רפואת אף אוזן גרון',
  'רפואת נשים',
  'רפואת ילדים',
  'אורתופדיה',
  'קרדיולוגיה',
  'נוירולוגיה',
  'פסיכיאטריה',
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              הבריאות שלך,{' '}
              <span className="text-primary">בידיים הטובות ביותר</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              מערכת ניהול קליניקות מתקדמת המחברת בין מטופלים לרופאים מומחים. קבע תור, קבל טיפול, והמשך הלאה.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/doctors">
                <Button size="lg" className="text-lg px-8">
                  מצא רופא
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  הצטרף עכשיו
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">למה לבחור ב-DOCTOR SEARCH?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Specializations Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">ההתמחויות שלנו</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {specializations.map((spec, index) => (
                <Link key={index} href={`/doctors?specialization=${encodeURIComponent(spec)}`}>
                  <Button variant="outline" className="text-base">
                    {spec}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">מוכנים להתחיל?</h2>
            <p className="text-xl mb-8 opacity-90">
              הצטרפו לאלפי המטופלים שכבר נהנים משירות רפואי איכותי
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                הירשמו בחינם
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
