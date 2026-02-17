import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent } from '@/components/ui/card'

const stats = [
  { label: 'רופאים מומחים', value: '30+' },
  { label: 'התמחויות', value: '10' },
  { label: 'סניפים', value: '10' },
  { label: 'מטופלים מרוצים', value: '10,000+' },
]

const values = [
  {
    title: 'מקצועיות',
    description: 'צוות הרופאים שלנו כולל מומחים בכירים עם ניסיון רב שנים בתחומם.',
  },
  {
    title: 'נגישות',
    description: '10 סניפים ברחבי הארץ עם שעות פעילות נוחות ומערכת תורים דיגיטלית.',
  },
  {
    title: 'חדשנות',
    description: 'שימוש בטכנולוגיות מתקדמות כולל AI לתמלול שיחות וחיפוש חכם בסיכומים.',
  },
  {
    title: 'פרטיות',
    description: 'שמירה קפדנית על פרטיות המטופלים ואבטחת מידע ברמה הגבוהה ביותר.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">אודות DOCTOR SEARCH</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              מערכת ניהול קליניקות מתקדמת המחברת בין מטופלים לרופאים מומחים ברחבי הארץ
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <Card key={i} className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">הערכים שלנו</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {values.map((value, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-6">הסיפור שלנו</h2>
            <div className="prose prose-lg mx-auto text-right">
              <p className="text-muted-foreground leading-relaxed">
                DOCTOR SEARCH הוקמה מתוך חזון להנגיש שירותי בריאות איכותיים לכל אזרח. המערכת שלנו מאפשרת למטופלים למצוא רופאים מומחים, לקבוע תורים בקלות ולעקוב אחר היסטוריית הטיפולים שלהם - הכל במקום אחד.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                אנו משלבים טכנולוגיות מתקדמות כמו תמלול שיחות באמצעות בינה מלאכותית וחיפוש חכם בסיכומי טיפולים, כדי לאפשר לרופאים להתמקד במה שחשוב באמת - הטיפול במטופל.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
