import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'

const contactInfo = [
  {
    icon: Phone,
    title: 'טלפון',
    details: ['03-1234567', '1-800-DOCTOR'],
  },
  {
    icon: Mail,
    title: 'אימייל',
    details: ['info@medclinic.co.il', 'support@medclinic.co.il'],
  },
  {
    icon: MapPin,
    title: 'כתובת',
    details: ['רחוב הרצל 50', 'תל אביב, ישראל'],
  },
  {
    icon: Clock,
    title: 'שעות פעילות',
    details: ['ראשון - חמישי: 08:00 - 20:00', 'שישי: 08:00 - 14:00'],
  },
]

const branches = [
  'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון',
  'פתח תקווה', 'נתניה', 'אשדוד', 'הרצליה', 'כפר סבא',
]

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">צור קשר</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              נשמח לעמוד לשירותכם בכל שאלה או בקשה
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactInfo.map((info, i) => (
                <Card key={i} className="text-center">
                  <CardHeader>
                    <info.icon className="h-8 w-8 mx-auto text-primary mb-2" />
                    <CardTitle className="text-lg">{info.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {info.details.map((detail, j) => (
                      <p key={j} className="text-muted-foreground">{detail}</p>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">הסניפים שלנו</h2>
            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              {branches.map((branch, i) => (
                <span
                  key={i}
                  className="px-4 py-2 bg-white rounded-full border text-sm font-medium"
                >
                  {branch}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
