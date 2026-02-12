export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'patient' | 'doctor' | 'admin'
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      doctors: {
        Row: {
          id: string
          user_id: string
          specialization: string
          bio: string | null
          license_number: string
          years_of_experience: number
          consultation_fee: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          specialization: string
          bio?: string | null
          license_number: string
          years_of_experience?: number
          consultation_fee?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          specialization?: string
          bio?: string | null
          license_number?: string
          years_of_experience?: number
          consultation_fee?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          phone: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      treatment_types: {
        Row: {
          id: string
          doctor_id: string
          name: string
          description: string | null
          duration_minutes: number
          price: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          name: string
          description?: string | null
          duration_minutes?: number
          price?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          name?: string
          description?: string | null
          duration_minutes?: number
          price?: number
          is_active?: boolean
          created_at?: string
        }
      }
      doctor_availability_slots: {
        Row: {
          id: string
          doctor_id: string
          location_id: string
          slot_datetime: string
          duration_minutes: number
          is_booked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          location_id: string
          slot_datetime: string
          duration_minutes?: number
          is_booked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          location_id?: string
          slot_datetime?: string
          duration_minutes?: number
          is_booked?: boolean
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          slot_id: string
          treatment_type_id: string | null
          status: AppointmentStatus
          notes: string | null
          payment_status: string
          payment_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          slot_id: string
          treatment_type_id?: string | null
          status?: AppointmentStatus
          notes?: string | null
          payment_status?: string
          payment_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          slot_id?: string
          treatment_type_id?: string | null
          status?: AppointmentStatus
          notes?: string | null
          payment_status?: string
          payment_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      treatment_summaries: {
        Row: {
          id: string
          appointment_id: string
          doctor_id: string
          patient_id: string
          diagnosis: string
          treatment_notes: string
          prescription: string | null
          follow_up_required: boolean
          follow_up_date: string | null
          search_vector: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          doctor_id: string
          patient_id: string
          diagnosis: string
          treatment_notes: string
          prescription?: string | null
          follow_up_required?: boolean
          follow_up_date?: string | null
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          doctor_id?: string
          patient_id?: string
          diagnosis?: string
          treatment_notes?: string
          prescription?: string | null
          follow_up_required?: boolean
          follow_up_date?: string | null
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
      }
      transcriptions: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string | null
          appointment_id: string | null
          original_filename: string
          transcription_text: string | null
          status: 'pending' | 'processing' | 'completed' | 'error'
          error_message: string | null
          duration_seconds: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id?: string | null
          appointment_id?: string | null
          original_filename: string
          transcription_text?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'error'
          error_message?: string | null
          duration_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string | null
          appointment_id?: string | null
          original_filename?: string
          transcription_text?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'error'
          error_message?: string | null
          duration_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          user_id: string
          assigned_to: string | null
          subject: string
          description: string
          status: TicketStatus
          priority: TicketPriority
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          assigned_to?: string | null
          subject: string
          description: string
          status?: TicketStatus
          priority?: TicketPriority
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          assigned_to?: string | null
          subject?: string
          description?: string
          status?: TicketStatus
          priority?: TicketPriority
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_treatment_summaries: {
        Args: {
          search_query: string
          doctor_filter?: string
        }
        Returns: {
          id: string
          diagnosis: string
          treatment_notes: string
          patient_name: string
          created_at: string
          rank: number
        }[]
      }
    }
    Enums: {
      user_role: UserRole
      appointment_status: AppointmentStatus
      ticket_status: TicketStatus
      ticket_priority: TicketPriority
    }
  }
}
