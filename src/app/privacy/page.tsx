import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">מדיניות פרטיות</h1>
            <p className="text-muted-foreground">עודכן לאחרונה: ינואר 2026</p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-3xl space-y-8 text-right">
            <div>
              <h2 className="text-2xl font-bold mb-3">1. כללי</h2>
              <p className="text-muted-foreground leading-relaxed">
                DOCTOR SEARCH מחויבת לשמור על פרטיות המשתמשים שלה. מדיניות פרטיות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על המידע האישי שלכם.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">2. מידע שאנו אוספים</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>פרטים אישיים: שם, אימייל, טלפון</li>
                <li>מידע רפואי: סיכומי טיפולים, אבחנות, מרשמים</li>
                <li>מידע טכני: כתובת IP, סוג דפדפן, זמני גישה</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">3. שימוש במידע</h2>
              <p className="text-muted-foreground leading-relaxed">
                המידע משמש אך ורק לצורך מתן השירותים הרפואיים, ניהול תורים, ושיפור חוויית המשתמש. איננו מוכרים או משתפים מידע אישי עם צדדים שלישיים.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">4. אבטחת מידע</h2>
              <p className="text-muted-foreground leading-relaxed">
                אנו משתמשים בהצפנה מתקדמת (SSL/TLS) ובמערכות הרשאות מבוססות תפקידים (Row-Level Security) כדי להגן על המידע שלכם. הגישה למידע רפואי מוגבלת לרופא המטפל בלבד.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">5. זכויות המשתמש</h2>
              <p className="text-muted-foreground leading-relaxed">
                יש לכם זכות לצפות במידע שנאסף עליכם, לבקש תיקון או מחיקה של מידע, ולהתנגד לעיבוד מידע. לכל בקשה ניתן לפנות אלינו בכתובת privacy@medclinic.co.il.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
