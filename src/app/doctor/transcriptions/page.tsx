'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

interface Patient {
  id: string
  full_name: string
}

interface TranscriptionJob {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  transcriptionText: string | null
  durationSeconds: number | null
  errorMessage: string | null
  originalFilename: string
}

interface SavedTranscription {
  id: string
  original_filename: string
  transcription_text: string
  status: string
  duration_seconds: number | null
  patient: { full_name: string } | null
  created_at: string
}

const ALLOWED_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/ogg',
  'video/mp4', 'video/webm', 'video/ogg',
]

const ALLOWED_EXTENSIONS = '.mp3,.mp4,.wav,.m4a,.flac,.ogg,.webm'

export default function DoctorTranscriptionsPage() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [doctorInfo, setDoctorInfo] = useState<{ full_name: string; specialization: string } | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [savedTranscriptions, setSavedTranscriptions] = useState<SavedTranscription[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Upload & transcription state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [currentJob, setCurrentJob] = useState<TranscriptionJob | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Fetch doctor info
  useEffect(() => {
    async function fetchDoctor() {
      if (!user) return
      const supabase = createClient()

      const { data } = await supabase
        .from('doctors')
        .select('id, specialization, user:users!doctors_user_id_fkey(full_name)')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setDoctorId((data as any).id)
        setDoctorInfo({
          full_name: (data as any).user?.full_name || '',
          specialization: (data as any).specialization || '',
        })
      }
    }
    fetchDoctor()
  }, [user])

  // Fetch patients for this doctor
  useEffect(() => {
    async function fetchPatients() {
      if (!doctorId) return
      const supabase = createClient()

      const { data } = await supabase
        .from('appointments')
        .select('patient:users!appointments_patient_id_fkey(id, full_name)')
        .eq('doctor_id', doctorId)

      if (data) {
        const uniquePatients = Array.from(
          new Map(
            (data as any[])
              .map((a) => a.patient)
              .filter(Boolean)
              .map((p: Patient) => [p.id, p])
          ).values()
        ) as Patient[]
        setPatients(uniquePatients)
      }
    }
    fetchPatients()
  }, [doctorId])

  // Fetch saved transcriptions
  const fetchSavedTranscriptions = useCallback(async () => {
    if (!doctorId) return
    const supabase = createClient()

    const { data } = await supabase
      .from('transcriptions')
      .select('id, original_filename, transcription_text, status, duration_seconds, created_at, patient:users!transcriptions_patient_id_fkey(full_name)')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setSavedTranscriptions(data as any)
    }
    setIsLoading(false)
  }, [doctorId])

  useEffect(() => {
    fetchSavedTranscriptions()
  }, [fetchSavedTranscriptions])

  // Poll job status
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'error') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/transcription/status/${currentJob.jobId}`)
        const data = await res.json()

        setCurrentJob((prev) => prev ? {
          ...prev,
          status: data.status,
          progress: data.progress || 0,
          transcriptionText: data.transcription_text,
          durationSeconds: data.duration_seconds,
          errorMessage: data.error_message,
        } : null)

        if (data.status === 'completed') {
          toast.success('התמלול הושלם בהצלחה!')
          // Save to database
          await saveTranscription(data)
        } else if (data.status === 'error') {
          toast.error(`שגיאה בתמלול: ${data.error_message}`)
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [currentJob?.jobId, currentJob?.status])

  const saveTranscription = async (jobData: any) => {
    if (!doctorId) return
    const supabase = createClient() as any

    const { data: insertedTranscription } = await supabase.from('transcriptions').insert({
      doctor_id: doctorId,
      patient_id: selectedPatient && selectedPatient !== 'none' ? selectedPatient : null,
      original_filename: currentJob?.originalFilename || '',
      transcription_text: jobData.transcription_text,
      status: 'completed',
      duration_seconds: jobData.duration_seconds ? Math.round(jobData.duration_seconds) : null,
    }).select('id').single()

    // Index in RAG vector store (fire-and-forget)
    if (insertedTranscription?.id) {
      fetch('/api/rag/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_table: 'transcriptions',
          source_id: insertedTranscription.id,
        }),
      }).catch(() => {})
    }

    fetchSavedTranscriptions()
  }

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp3|mp4|wav|m4a|flac|ogg|webm)$/i)) {
      toast.error('סוג קובץ לא נתמך. השתמש ב-MP3, MP4, WAV, M4A, FLAC, OGG או WebM')
      return
    }
    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('doctor_name', doctorInfo?.full_name || '')
      formData.append('doctor_specialization', doctorInfo?.specialization || '')

      if (selectedPatient) {
        const patient = patients.find((p) => p.id === selectedPatient)
        formData.append('patient_name', patient?.full_name || '')
      }

      const res = await fetch('/api/transcription/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'שגיאה בהעלאת הקובץ')
        setIsUploading(false)
        return
      }

      setCurrentJob({
        jobId: data.job_id,
        status: 'pending',
        progress: 0,
        transcriptionText: null,
        durationSeconds: null,
        errorMessage: null,
        originalFilename: selectedFile.name,
      })

      toast.info('הקובץ הועלה, מתחיל תמלול...')
    } catch {
      toast.error('שגיאה בהתחברות לשרת התמלול. ודא שהשרת פעיל.')
    }

    setIsUploading(false)
  }

  const handleDownloadWord = async () => {
    if (!currentJob?.jobId) return

    try {
      const res = await fetch(`/api/transcription/download/${currentJob.jobId}`)

      if (!res.ok) {
        toast.error('שגיאה בהורדת המסמך')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcription_${currentJob.originalFilename.replace(/\.[^.]+$/, '')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('המסמך הורד בהצלחה!')
    } catch {
      toast.error('שגיאה בהורדת המסמך')
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setCurrentJob(null)
    setSelectedPatient('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800">הושלם</Badge>
      case 'processing': return <Badge className="bg-blue-100 text-blue-800">מתמלל...</Badge>
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">ממתין</Badge>
      case 'error': return <Badge className="bg-red-100 text-red-800">שגיאה</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">תמלול שיחות</h1>
      <p className="text-muted-foreground mb-8">העלה הקלטת שיחה רפואית לתמלול אוטומטי והורדת מסמך Word</p>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>העלאת קובץ לתמלול</CardTitle>
          <CardDescription>גרור קובץ אודיו/וידאו או לחץ לבחירה. פורמטים נתמכים: MP3, MP4, WAV, M4A</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Selection (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">שיוך למטופל (אופציונלי)</label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="בחר מטופל..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא שיוך</SelectItem>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Drop Zone */}
          {!currentJob && (
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              />

              <div className="text-5xl mb-4">🎙️</div>

              {selectedFile ? (
                <div>
                  <p className="text-lg font-medium text-primary">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">גרור קובץ לכאן או לחץ לבחירה</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    MP3, MP4, WAV, M4A, FLAC, OGG, WebM
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload Button */}
          {selectedFile && !currentJob && (
            <div className="flex gap-4">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 max-w-md"
                size="lg"
              >
                {isUploading ? 'מעלה...' : 'התחל תמלול'}
              </Button>
              <Button variant="outline" onClick={resetUpload}>
                ביטול
              </Button>
            </div>
          )}

          {/* Progress Section */}
          {currentJob && currentJob.status !== 'completed' && currentJob.status !== 'error' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">
                      {currentJob.status === 'pending' ? 'ממתין לתחילת תמלול...' : 'מתמלל...'}
                    </span>
                    <span className="text-sm text-muted-foreground">{Math.round(currentJob.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{ width: `${currentJob.progress}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                קובץ: {currentJob.originalFilename} | התמלול מתבצע מקומית על המחשב שלך
              </p>
            </div>
          )}

          {/* Error */}
          {currentJob?.status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">שגיאה בתמלול</p>
              <p className="text-red-500 text-sm mt-1">{currentJob.errorMessage}</p>
              <Button variant="outline" onClick={resetUpload} className="mt-4">
                נסה שוב
              </Button>
            </div>
          )}

          {/* Completed - Show transcription and download */}
          {currentJob?.status === 'completed' && currentJob.transcriptionText && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">התמלול הושלם</Badge>
                  {currentJob.durationSeconds && (
                    <span className="text-sm text-muted-foreground">
                      משך: {Math.floor(currentJob.durationSeconds / 60)} דקות
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadWord}>
                    📄 הורד מסמך Word
                  </Button>
                  <Button variant="outline" onClick={resetUpload}>
                    תמלול חדש
                  </Button>
                </div>
              </div>

              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">תוכן התמלול</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="whitespace-pre-wrap leading-relaxed text-right"
                    dir="rtl"
                  >
                    {currentJob.transcriptionText}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Section */}
      <Card>
        <CardHeader>
          <CardTitle>היסטוריית תמלולים</CardTitle>
          <CardDescription>תמלולים קודמים שנשמרו במערכת</CardDescription>
        </CardHeader>
        <CardContent>
          {savedTranscriptions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              עדיין לא בוצעו תמלולים
            </p>
          ) : (
            <div className="space-y-3">
              {savedTranscriptions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{t.original_filename}</p>
                      {getStatusBadge(t.status)}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>
                        {format(new Date(t.created_at), 'd בMMMM yyyy, HH:mm', { locale: he })}
                      </span>
                      {t.patient && <span>מטופל: {(t.patient as any).full_name}</span>}
                      {t.duration_seconds && (
                        <span>משך: {Math.floor(t.duration_seconds / 60)} דקות</span>
                      )}
                    </div>
                    {t.transcription_text && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2" dir="rtl">
                        {t.transcription_text}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
