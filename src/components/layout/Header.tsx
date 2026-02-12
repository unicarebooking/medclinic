'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { USER_ROLES } from '@/lib/constants'

export function Header() {
  const { user, isAuthenticated, isLoading, logout, isDoctor, isAdmin } = useAuth()

  const getDashboardLink = () => {
    if (isAdmin) return '/admin/dashboard'
    if (isDoctor) return '/doctor/dashboard'
    return '/patient/dashboard'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">DOCTOR SEARCH</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/doctors" className="text-sm font-medium hover:text-primary transition-colors">
            הרופאים שלנו
          </Link>
          <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
            אודות
          </Link>
          <Link href="/contact" className="text-sm font-medium hover:text-primary transition-colors">
            צור קשר
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || ''} alt={user.full_name} />
                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground mt-1">
                      {USER_ROLES[user.role]}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={getDashboardLink()}>לוח בקרה</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile">הפרופיל שלי</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                  התנתק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost">התחבר</Button>
              </Link>
              <Link href="/register">
                <Button>הירשם</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
