export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold text-primary mb-4">DOCTOR SEARCH</h3>
            <p className="text-sm text-gray-600">
              מערכת ניהול קליניקות מתקדמת לשירותכם
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">קישורים מהירים</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/doctors" className="hover:text-primary">הרופאים שלנו</a></li>
              <li><a href="/about" className="hover:text-primary">אודות</a></li>
              <li><a href="/contact" className="hover:text-primary">צור קשר</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">תמיכה</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/faq" className="hover:text-primary">שאלות נפוצות</a></li>
              <li><a href="/privacy" className="hover:text-primary">מדיניות פרטיות</a></li>
              <li><a href="/terms" className="hover:text-primary">תנאי שימוש</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">יצירת קשר</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>טלפון: 03-1234567</li>
              <li>אימייל: info@medclinic.co.il</li>
              <li>תל אביב, ישראל</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} DOCTOR SEARCH. כל הזכויות שמורות.</p>
        </div>
      </div>
    </footer>
  )
}
