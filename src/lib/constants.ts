export const CITIES = [
  'תל אביב',
  'ירושלים',
  'חיפה',
  'באר שבע',
  'ראשון לציון',
  'פתח תקווה',
  'אשדוד',
  'נתניה',
  'חולון',
  'בני ברק',
] as const

export const SPECIALIZATIONS = [
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
] as const

export const APPOINTMENT_STATUSES = {
  pending: 'ממתין לאישור',
  confirmed: 'מאושר',
  completed: 'הושלם',
  cancelled: 'בוטל',
} as const

export const USER_ROLES = {
  patient: 'מטופל',
  doctor: 'רופא',
  admin: 'מנהל',
} as const

export const TICKET_STATUSES = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  resolved: 'נפתר',
  closed: 'סגור',
} as const

export const TICKET_PRIORITIES = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
  urgent: 'דחוף',
} as const
