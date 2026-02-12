<div align="center">

# MedClinic

### Medical Clinic Management System

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)

---

**Full-stack medical clinic platform with appointment booking, treatment documentation, AI-powered audio transcription, and multi-role management.**

[Features](#-features) | [Tech Stack](#-tech-stack) | [Getting Started](#-getting-started) | [Architecture](#-architecture) | [Database](#-database-schema) | [API](#-transcription-service)

</div>

---

## Overview

MedClinic is a comprehensive medical clinic management system supporting three user roles - **Patients**, **Doctors**, and **Admins**. Built with Next.js 16, Supabase, and a Python transcription service, it provides end-to-end clinic management with Hebrew language support.

```
+------------------+     +------------------+     +------------------+
|    Patient       |     |     Doctor       |     |     Admin        |
+------------------+     +------------------+     +------------------+
| - Book appts     |     | - Manage appts   |     | - System stats   |
| - View summaries |     | - Patient records|     | - User mgmt      |
| - Browse doctors |     | - Transcriptions |     | - Ticket mgmt    |
| - Support tickets|     | - Treatment docs |     | - Reports        |
+------------------+     +------------------+     +------------------+
         |                        |                        |
         +------------------------+------------------------+
                                  |
                    +-----------------------------+
                    |      Supabase (PostgreSQL)   |
                    |   Auth | Database | RLS      |
                    +-----------------------------+
```

---

## Features

### Patient Portal

| Feature | Description |
|---------|-------------|
| **Browse Doctors** | Search and filter doctors by specialization, city, and availability |
| **Book Appointments** | Select time slots, choose location, and book with any active doctor |
| **My Appointments** | View upcoming, pending, and past appointments with status tracking |
| **Treatment Summaries** | Access diagnosis, prescriptions, and follow-up notes from completed visits |
| **Support Tickets** | Submit and track support requests |
| **Dashboard** | Overview with upcoming appointments, stats, and quick actions |

### Doctor Portal

| Feature | Description |
|---------|-------------|
| **Dashboard** | Analytics with charts - weekly appointments (bar), status distribution (pie) |
| **My Patients** | Full patient list with search, click to view detailed history |
| **Patient Details** | Tabbed view: appointments, treatment summaries, transcriptions, payments |
| **Appointments** | Confirm, complete, or cancel appointments. View patient details |
| **Availability** | Create and manage time slots across multiple clinic locations |
| **Treatment Summaries** | Write detailed summaries with diagnosis, prescription, and follow-up |
| **Search Summaries** | Full-text search across all treatment summaries (PostgreSQL tsvector) |
| **Transcription** | Upload audio/video recordings for AI transcription + Word document export |

### Admin Panel

| Feature | Description |
|---------|-------------|
| **Dashboard** | System-wide analytics - users, doctors, patients, appointments |
| **Support Tickets** | Manage, assign, and resolve support tickets |

---

## Tech Stack

```
Frontend                          Backend / Database
+----------------------------+    +----------------------------+
| Next.js 16 + React 19     |    | Supabase (PostgreSQL)      |
| TypeScript 5               |    | Row-Level Security (RLS)   |
| Tailwind CSS 4             |    | Supabase Auth (JWT)        |
| shadcn/ui + Radix UI       |    | Full-Text Search (tsvector)|
| Zustand (state)            |    +----------------------------+
| React Hook Form + Zod      |
| Recharts (analytics)       |    Transcription Service
| date-fns (Hebrew locale)   |    +----------------------------+
| Sonner (notifications)     |    | Python + FastAPI           |
+----------------------------+    | Faster Whisper (local AI)  |
                                  | python-docx (Word export)  |
                                  +----------------------------+
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.8+ (for transcription service)
- **Supabase** project ([create one here](https://supabase.com))

### 1. Install & Configure

```bash
# Clone the repository
git clone https://github.com/unicarebooking/medclinic.git
cd medclinic

# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # for seeding only
```

### 2. Setup Database

Run the migration files in order on your Supabase SQL editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_fix_rls_policies.sql
supabase/migrations/003_complete_rls_fix.sql
supabase/migrations/004_transcriptions_table.sql
```

### 3. Seed Test Data (Optional)

```bash
npx tsx scripts/seed-database.ts
```

This creates:
- **10** clinic locations across Israel
- **30** doctors with varied specializations
- **100** patients
- **3,000** treatment summaries
- **90 days** of availability slots

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Setup Transcription Service (Optional)

```bash
cd services/transcription
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python server.py             # Runs on http://localhost:8000
```

---

## Test Accounts

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@medclinic.test` | `admin123` |
| **Doctor** | `doctor1@medclinic.test` ... `doctor30@medclinic.test` | `password123` |
| **Patient** | `patient1@medclinic.test` ... `patient100@medclinic.test` | `password123` |

---

## Architecture

### Route Structure

```
src/app/
+-- page.tsx                          # Home page
+-- login/page.tsx                    # Login
+-- register/page.tsx                 # Registration
+-- forgot-password/page.tsx          # Password reset
+-- doctors/                          # Public doctor browsing
|   +-- page.tsx                      # Doctor list + filters
|   +-- [doctorId]/page.tsx           # Doctor profile
|   +-- [doctorId]/book/page.tsx      # Appointment booking
|
+-- patient/                          # Patient portal
|   +-- layout.tsx                    # Shared layout (Header + Sidebar)
|   +-- dashboard/page.tsx            # Patient dashboard
|   +-- appointments/page.tsx         # My appointments
|   +-- summaries/page.tsx            # Treatment summaries
|   +-- tickets/page.tsx              # Support tickets
|
+-- doctor/                           # Doctor portal
|   +-- layout.tsx                    # Shared layout (Header + Sidebar)
|   +-- dashboard/page.tsx            # Doctor dashboard + charts
|   +-- patients/page.tsx             # Patient list
|   +-- patients/[patientId]/page.tsx # Patient detail (tabs)
|   +-- appointments/page.tsx         # Appointment management
|   +-- availability/page.tsx         # Time slot management
|   +-- summaries/page.tsx            # Create treatment summaries
|   +-- search-summaries/page.tsx     # Full-text search
|   +-- transcriptions/page.tsx       # Audio transcription
|
+-- admin/                            # Admin panel
|   +-- layout.tsx                    # Shared layout
|   +-- dashboard/page.tsx            # System analytics
|   +-- tickets/page.tsx              # Ticket management
|
+-- api/                              # API routes
    +-- auth/register/route.ts        # User registration
    +-- transcription/
        +-- upload/route.ts           # Upload audio file
        +-- status/[jobId]/route.ts   # Check transcription status
        +-- download/[jobId]/route.ts # Download Word document
```

### Component Structure

```
src/components/
+-- layout/
|   +-- Header.tsx        # Top navigation bar with auth state
|   +-- Sidebar.tsx       # Role-based sidebar navigation
|   +-- Footer.tsx        # Page footer
|
+-- forms/
|   +-- LoginForm.tsx     # Login form with validation
|   +-- RegisterForm.tsx  # Registration form
|   +-- ForgotPasswordForm.tsx
|
+-- shared/
|   +-- DoctorCard.tsx    # Doctor profile card
|   +-- FilterPanel.tsx   # Search filters
|
+-- ui/                   # shadcn/ui components
    +-- button, card, dialog, tabs, table, badge,
        select, input, form, skeleton, avatar, ...
```

---

## Database Schema

```
+-------------+       +------------------+       +------------------------+
|   users     |       |    doctors       |       | doctor_availability    |
|-------------|       |------------------|       |   _slots               |
| id (PK)     |<---+  | id (PK)          |<---+  |------------------------|
| email        |   |  | user_id (FK)     |   |  | id (PK)                |
| full_name    |   |  | specialization   |   |  | doctor_id (FK)         |
| phone        |   |  | bio              |   |  | location_id (FK)       |
| role         |   |  | license_number   |   |  | slot_datetime          |
| avatar_url   |   |  | years_experience |   |  | duration_minutes       |
+-------------+   |  | consultation_fee |   |  | is_booked              |
      |           |  +------------------+   |  +------------------------+
      |           |                         |            |
      |           |  +------------------+   |            |
      |           +--| appointments     |---+            |
      |              |------------------|                |
      +--------------| patient_id (FK)  |                |
                     | doctor_id (FK)   |----------------+
                     | slot_id (FK)     |
                     | status           |
                     | payment_status   |
                     | payment_amount   |
                     +------------------+
                            |
              +-------------+-------------+
              |                           |
+------------------------+    +----------------------+
| treatment_summaries    |    |   transcriptions     |
|------------------------|    |----------------------|
| id (PK)                |    | id (PK)              |
| appointment_id (FK)    |    | doctor_id (FK)       |
| doctor_id (FK)         |    | patient_id (FK)      |
| patient_id (FK)        |    | original_filename    |
| diagnosis              |    | transcription_text   |
| treatment_notes        |    | status               |
| prescription           |    | duration_seconds     |
| follow_up_required     |    +----------------------+
| follow_up_date         |
| search_vector (GIN)    |
+------------------------+

+------------------+     +-----------------+
|   locations      |     |    tickets      |
|------------------|     |-----------------|
| id (PK)          |     | id (PK)         |
| name             |     | user_id (FK)    |
| address          |     | subject         |
| city             |     | description     |
| phone            |     | status          |
| is_active        |     | priority        |
+------------------+     +-----------------+
```

---

## Transcription Service

The transcription service runs locally using **Faster Whisper** for Hebrew audio transcription.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/transcribe` | Upload audio file, returns `job_id` |
| `GET` | `/api/status/{job_id}` | Check transcription progress (0-100%) |
| `GET` | `/api/download/{job_id}` | Download completed transcription as Word doc |
| `GET` | `/api/health` | Service health check |

### Supported Formats

`MP3` `MP4` `WAV` `M4A` `FLAC` `OGG` `WebM`

### Flow

```
Audio File  -->  FastAPI Server  -->  Faster Whisper (local)
                                          |
                                     Hebrew Text
                                          |
                              +-----------+-----------+
                              |                       |
                        Save to DB              Generate DOCX
                        (Supabase)              (python-docx)
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx tsx scripts/seed-database.ts` | Seed database with test data |

---

## Security

- **Row-Level Security (RLS)** on all database tables
- **JWT Authentication** via Supabase Auth
- **Role-Based Access Control** - patient, doctor, admin
- **Policy Enforcement**:
  - Patients can only see their own data
  - Doctors can only access their patients and records
  - Admins have system-wide access
- **Sensitive data excluded** from git (`.env*` in `.gitignore`)

---

<div align="center">

Built with Next.js + Supabase + Faster Whisper

</div>
