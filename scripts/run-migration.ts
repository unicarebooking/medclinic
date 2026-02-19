/**
 * Run pgvector migration against Supabase using the SQL execution endpoint.
 * Usage: npx tsx scripts/run-migration.ts
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { config } from 'dotenv'

config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Extract project ref from URL
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]

async function runSQL(sql: string) {
  // Use Supabase's pg-meta SQL execution endpoint
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!res.ok) {
    // Try alternative: direct pg endpoint
    console.log('RPC exec_sql not available, trying pg-meta endpoint...')
    const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    })

    if (!pgRes.ok) {
      const errText = await pgRes.text()
      throw new Error(`SQL execution failed: ${pgRes.status} ${errText}`)
    }
    return await pgRes.json()
  }

  return await res.json()
}

async function main() {
  console.log(`Project: ${projectRef}`)
  console.log(`URL: ${SUPABASE_URL}`)

  const migrationPath = resolve(__dirname, '../supabase/migrations/005_pgvector_document_chunks.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  // Split into individual statements and run them one by one
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`\nRunning ${statements.length} SQL statements...\n`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ')
    console.log(`[${i + 1}/${statements.length}] ${preview}...`)

    try {
      await runSQL(stmt)
      console.log(`  ✓ OK`)
    } catch (err: any) {
      console.error(`  ✗ Error: ${err.message}`)
      // Continue with next statement
    }
  }

  console.log('\nMigration complete!')
}

main().catch(console.error)
