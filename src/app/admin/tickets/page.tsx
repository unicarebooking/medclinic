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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  user: {
    full_name: string
    email: string
  }
}

export default function AdminTicketsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [newStatus, setNewStatus] = useState<string>('')
  const [response, setResponse] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function fetchTickets() {
      if (!user) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          user:users!tickets_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching tickets:', error)
      } else {
        setTickets((data || []) as any)
      }
      setIsLoading(false)
    }

    fetchTickets()
  }, [user])

  const handleUpdateTicket = async () => {
    if (!selectedTicket || !newStatus) return

    setIsUpdating(true)

    const supabase = createClient() as any
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'resolved' || newStatus === 'closed') {
      updateData.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', selectedTicket.id)

    if (error) {
      console.error('Error updating ticket:', error)
      toast.error('שגיאה בעדכון הפנייה')
    } else {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, ...updateData }
            : t
        )
      )
      toast.success('הפנייה עודכנה בהצלחה')
      setSelectedTicket(null)
      setNewStatus('')
      setResponse('')
    }

    setIsUpdating(false)
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

  const openTickets = tickets.filter((t) => t.status === 'open')
  const inProgressTickets = tickets.filter((t) => t.status === 'in_progress')
  const resolvedTickets = tickets.filter((t) => ['resolved', 'closed'].includes(t.status))

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

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">אין לך הרשאה לצפות בעמוד זה</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <Card
      className="cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => {
        setSelectedTicket(ticket)
        setNewStatus(ticket.status)
      }}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{ticket.subject}</h3>
              {getStatusBadge(ticket.status)}
              {getPriorityBadge(ticket.priority)}
            </div>
            <p className="text-sm text-muted-foreground">
              מאת: {(ticket.user as any)?.full_name} ({(ticket.user as any)?.email})
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {ticket.description}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(ticket.created_at), 'd/M/yyyy HH:mm', { locale: he })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ניהול פניות</h1>
        <p className="text-muted-foreground">טיפול בפניות משתמשים</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">סה&quot;כ פניות</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">פתוחות</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{openTickets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">בטיפול</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{inProgressTickets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">נפתרו</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{resolvedTickets.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="open" className="space-y-6">
        <TabsList>
          <TabsTrigger value="open">
            פתוחות ({openTickets.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            בטיפול ({inProgressTickets.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            נפתרו ({resolvedTickets.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            הכל ({tickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4">
          {openTickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">אין פניות פתוחות</p>
              </CardContent>
            </Card>
          ) : (
            openTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          {inProgressTickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">אין פניות בטיפול</p>
              </CardContent>
            </Card>
          ) : (
            inProgressTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          {resolvedTickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">אין פניות שנפתרו</p>
              </CardContent>
            </Card>
          ) : (
            resolvedTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">אין פניות</p>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </TabsContent>
      </Tabs>

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
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-muted-foreground">פונה</Label>
              <p className="font-medium">
                {(selectedTicket?.user as any)?.full_name} - {(selectedTicket?.user as any)?.email}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">תיאור</Label>
              <p className="mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                {selectedTicket?.description}
              </p>
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
                <Label className="text-muted-foreground">עודכן</Label>
                <p>
                  {selectedTicket &&
                    format(new Date(selectedTicket.updated_at), 'd/M/yyyy HH:mm', { locale: he })}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="status">עדכן סטטוס</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">פתוח</SelectItem>
                  <SelectItem value="in_progress">בטיפול</SelectItem>
                  <SelectItem value="resolved">נפתר</SelectItem>
                  <SelectItem value="closed">סגור</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>
              ביטול
            </Button>
            <Button onClick={handleUpdateTicket} disabled={isUpdating}>
              {isUpdating ? 'מעדכן...' : 'עדכן פנייה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
