'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface SidebarLink {
  href: string
  label: string
  icon: string
}

const patientLinks: SidebarLink[] = [
  { href: '/patient/dashboard', label: 'לוח בקרה', icon: '🏠' },
  { href: '/patient/appointments', label: 'התורים שלי', icon: '📅' },
  { href: '/patient/summaries', label: 'סיכומי טיפולים', icon: '📋' },
  { href: '/patient/tickets', label: 'פניות', icon: '🎫' },
  { href: '/doctors', label: 'מצא רופא', icon: '👨‍⚕️' },
]

const doctorLinks: SidebarLink[] = [
  { href: '/doctor/dashboard', label: 'לוח בקרה', icon: '🏠' },
  { href: '/doctor/patients', label: 'המטופלים שלי', icon: '👥' },
  { href: '/doctor/appointments', label: 'תורים', icon: '📅' },
  { href: '/doctor/availability', label: 'ניהול זמינות', icon: '⏰' },
  { href: '/doctor/summaries', label: 'סיכומי טיפולים', icon: '📋' },
  { href: '/doctor/search-summaries', label: 'חיפוש סיכומים', icon: '🔍' },
  { href: '/doctor/transcriptions', label: 'תמלול שיחות', icon: '🎙️' },
  { href: '/doctor/rag-search', label: 'חיפוש חכם', icon: '🤖' },
]

const adminLinks: SidebarLink[] = [
  { href: '/admin/dashboard', label: 'לוח בקרה', icon: '🏠' },
  { href: '/admin/users', label: 'ניהול משתמשים', icon: '👥' },
  { href: '/admin/doctors', label: 'ניהול רופאים', icon: '👨‍⚕️' },
  { href: '/admin/locations', label: 'ניהול סניפים', icon: '🏥' },
  { href: '/admin/tickets', label: 'פניות תמיכה', icon: '🎫' },
  { href: '/admin/reports', label: 'דוחות', icon: '📊' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isPatient, isDoctor, isAdmin } = useAuth()

  const isOnDoctorPages = pathname.startsWith('/doctor')
  const isOnAdminPages = pathname.startsWith('/admin')

  const links = (isAdmin || isOnAdminPages) ? adminLinks
    : (isDoctor || isOnDoctorPages) ? doctorLinks
    : patientLinks

  return (
    <aside className="w-64 min-h-[calc(100vh-4rem)] bg-gray-50 border-l">
      <nav className="p-4 space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
              pathname === link.href
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-gray-100 text-gray-700'
            )}
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
