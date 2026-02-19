import '@testing-library/jest-dom'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local for Supabase credentials
config({ path: resolve(__dirname, '../.env.local') })
