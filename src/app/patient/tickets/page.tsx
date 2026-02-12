'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TICKET_STATUSES, TICKET_PRIORITIES } from '@/lib/constants'
import { toast } from 'sonner'

interface Ticket {
  id: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export default function PatientTicketsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  // Form state
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')

  useEffect(() => {
    async function fetchTickets() {
      if (!user) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching tickets:', error)
      } else {
        setTickets(data as Ticket[] || [])
      }
      setIsLoading(false)
    }

    fetchTickets()
  }, [user])

  const handleSubmitTicket = async () => {
    if (!user || !subject.trim() || !description.trim()) {
      toast.error('נא למלא את כל השדות')
      return
    }

    setIsSubmitting(true)

    const supabase = createClient() as any
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        status: 'open',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating ticket:', error)
      toast.error('שגיאה בשליחת הפנייה')
    } else {
      setTickets((prev) => [data, ...prev])
      toast.success('הפנייה נשלחה בהצלחה')
      setSubject('')
      setDescription('')
      setPriority('medium')
      setDialogOpen(false)
    }

    setIsSubmitting(false)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      open: 'outline',
      in_progress: 'default',
      resolved: 'secondary',
      closed: 'destructive',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {TICKET_STATUSES[status as keyof typeof TICKET_STATUSES] || status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority]}`}>
        {TICKET_PRIORITIES[priority as keyof typeof TICKET_PRIORITIES] || priority}
      </span>
    )
  }

  if (authLoading || isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">הפניות שלי</h1>
          <p className="text-muted-foreground">ניהול וצפייה בפניות</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>פתח פנייה חדשה</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>פתיחת פנייה חדשה</DialogTitle>
              <DialogDescription>
                פרט את הבעיה או הבקשה שלך וצוות התמיכה שלנו יטפל בה בהקדם
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">נושא</Label>
                <Input
                  id="subject"
                  placeholder="נושא הפנייה"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">תיאור</Label>
                <Textarea
                  id="description"
                  placeholder="תאר את הבעיה או הבקשה בפירוט..."
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">דחיפות</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">נמוכה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="urgent">דחוף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSubmitTicket} disabled={isSubmitting}>
                {isSubmitting ? 'שולח...' : 'שלח פנייה'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">אין לך פניות</p>
            <Button onClick={() => setDialogOpen(true)}>פתח פנייה חדשה</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      נפתח: {format(new Date(ticket.created_at), 'd בMMMM yyyy בשעה HH:mm', { locale: he })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                {selectedTicket && getStatusBadge(selectedTicket.status)}
                {selectedTicket && getPriorityBadge(selectedTicket.priority)}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">תיאור</Label>
                <p className="mt-1 whitespace-pre-wrap">{selectedTicket?.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">נפתח</Label>
                  <p>
                    {selectedTicket &&
                      format(new Date(selectedTicket.created_at), 'd/M/yyyy HH:mm', { locale: he })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">עודכן לאחרונה</Label>
                  <p>
                    {selectedTicket &&
                      format(new Date(selectedTicket.updated_at), 'd/M/yyyy HH:mm', { locale: he })}
                  </p>
                </div>
                {selectedTicket?.resolved_at && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">נפתר</Label>
                    <p>
                      {format(new Date(selectedTicket.resolved_at), 'd/M/yyyy HH:mm', { locale: he })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
