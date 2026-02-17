import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">תנאי שימוש</h1>
            <p className="text-muted-foreground">עודכן לאחרונה: ינואר 2026</p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-3xl space-y-8 text-right">
            <div>
              <h2 className="text-2xl font-bold mb-3">1. הסכמה לתנאים</h2>
              <p className="text-muted-foreground leading-relaxed">
                השימוש באתר DOCTOR SEARCH מהווה הסכמה לתנאי שימוש אלה. אם אינכם מסכימים לתנאים, אנא הימנעו משימוש באתר.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">2. השירותים</h2>
              <p className="text-muted-foreground leading-relaxed">
                האתר מספק פלטפורמה לקביעת תורים, ניהול מטופלים וצפייה בסיכומי טיפולים. השירות אינו מהווה תחליף לייעוץ רפואי דחוף.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">3. חשבון משתמש</h2>
              <p className="text-muted-foreground leading-relaxed">
                המשתמש אחראי לשמירה על סודיות פרטי ההתחברות שלו. יש להודיע מיד על כל שימוש לא מורשה בחשבון.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">4. ביטול תורים</h2>
              <p className="text-muted-foreground leading-relaxed">
                ניתן לבטל תור עד 24 שעות לפני המועד ללא עלות. ביטול מאוחר יותר עלול לגרור חיוב בהתאם למדיניות הקליניקה.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">5. קניין רוחני</h2>
              <p className="text-muted-foreground leading-relaxed">
                כל התכנים באתר, כולל עיצוב, לוגו וטקסטים, הם רכושה של DOCTOR SEARCH ומוגנים בחוקי זכויות יוצרים.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">6. הגבלת אחריות</h2>
              <p className="text-muted-foreground leading-relaxed">
                DOCTOR SEARCH אינה אחראית לנזקים ישירים או עקיפים הנובעים משימוש באתר. המידע באתר הוא לצרכי מידע כללי בלבד.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
