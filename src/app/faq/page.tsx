import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const faqs = [
  {
    question: 'כיצד ניתן לקבוע תור?',
    answer: 'ניתן לקבוע תור דרך האתר - חפש רופא לפי התמחות או עיר, בחר מועד מתאים ואשר את התור. תקבל אישור במייל.',
  },
  {
    question: 'האם ניתן לבטל תור?',
    answer: 'כן, ניתן לבטל תור עד 24 שעות לפני המועד דרך לוח הבקרה שלך באתר.',
  },
  {
    question: 'כיצד ניתן לצפות בסיכומי טיפולים?',
    answer: 'לאחר כל ביקור, הרופא יעלה סיכום טיפול. ניתן לצפות בכל הסיכומים דרך לוח הבקרה של המטופל בלשונית "סיכומי טיפולים".',
  },
  {
    question: 'האם המידע הרפואי שלי מאובטח?',
    answer: 'בהחלט. אנו משתמשים בהצפנה מתקדמת ושומרים על תקני אבטחת מידע מחמירים. רק אתה והרופא המטפל יכולים לגשת למידע שלך.',
  },
  {
    question: 'מה עושים במקרה של בעיה טכנית?',
    answer: 'ניתן לפנות לתמיכה הטכנית שלנו דרך מערכת הפניות באתר, בטלפון 03-1234567 או במייל support@medclinic.co.il.',
  },
  {
    question: 'האם יש אפליקציה לנייד?',
    answer: 'האתר מותאם לשימוש מכל מכשיר כולל טלפונים ניידים וטאבלטים.',
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">שאלות נפוצות</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              תשובות לשאלות הנפוצות ביותר
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
