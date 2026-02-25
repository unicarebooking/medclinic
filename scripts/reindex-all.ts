/**
 * Reindex all treatment summaries via the RAG /rag/index endpoint.
 * Paginates through all summaries and skips already-indexed ones.
 * Includes health check, retries, and generous delays for stability.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RAG_URL = 'http://medclinic-alb-789263220.il-central-1.elb.amazonaws.com'
const API_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function waitForHealth(maxWaitMs = 120000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(`${RAG_URL}/rag/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Key': API_KEY },
        body: JSON.stringify({ source_table: 'treatment_summaries', source_id: '00000000-0000-0000-0000-000000000000' }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.status !== 502 && res.status !== 503) {
        console.log('  RAG server is responsive')
        return true
      }
    } catch {}
    console.log('  Waiting for RAG server...')
    await sleep(10000)
  }
  return false
}

async function fetchAllIds(table: string): Promise<string[]> {
  const all: string[] = []
  let page = 0
  while (true) {
    const { data } = await supabase
      .from(table)
      .select('id')
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data?.length) break
    all.push(...data.map((r: any) => r.id))
    if (data.length < 1000) break
    page++
  }
  return all
}

async function fetchIndexedSourceIds(sourceTable: string): Promise<Set<string>> {
  const set = new Set<string>()
  let page = 0
  while (true) {
    const { data } = await supabase
      .from('document_chunks')
      .select('source_id')
      .eq('source_table', sourceTable)
      .eq('chunk_index', 0)
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data?.length) break
    for (const r of data) set.add(r.source_id)
    if (data.length < 1000) break
    page++
  }
  return set
}

async function indexOne(sourceTable: string, sourceId: string): Promise<boolean> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)
      const res = await fetch(`${RAG_URL}/rag/index`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': API_KEY,
        },
        body: JSON.stringify({ source_table: sourceTable, source_id: sourceId }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) return true
      if (res.status === 502 || res.status === 503) {
        console.log(`  502/503 - waiting for recovery (attempt ${attempt}/5)...`)
        await waitForHealth()
        continue
      }
      console.error(`  FAIL ${sourceId.slice(0,8)}: ${res.status}`)
      return false
    } catch (e: any) {
      console.log(`  Fetch error (attempt ${attempt}/5): ${e.message.slice(0,50)}`)
      await waitForHealth()
      continue
    }
  }
  console.error(`  GAVE UP on ${sourceId.slice(0,8)} after 5 attempts`)
  return false
}

async function main() {
  console.log('=== RAG Reindex (paginated, skip existing) ===\n')

  // Quick connectivity test (skip full health check since /api/health routes to web TG)
  console.log('Testing RAG connectivity...')
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const res = await fetch(`${RAG_URL}/rag/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': API_KEY },
      body: JSON.stringify({ source_table: 'treatment_summaries', source_id: '00000000-0000-0000-0000-000000000000' }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    console.log(`  RAG server responded: ${res.status}`)
  } catch (e: any) {
    console.log(`  Warning: RAG test failed (${e.message}), will retry on each request`)
  }

  // Treatment summaries
  const allSummaryIds = await fetchAllIds('treatment_summaries')
  const indexedSummaryIds = await fetchIndexedSourceIds('treatment_summaries')
  const toIndex = allSummaryIds.filter(id => !indexedSummaryIds.has(id))

  console.log(`\nTreatment summaries: ${allSummaryIds.length} total, ${indexedSummaryIds.size} already indexed, ${toIndex.length} to index\n`)

  let done = 0, failed = 0
  for (let i = 0; i < toIndex.length; i++) {
    const ok = await indexOne('treatment_summaries', toIndex[i])
    if (ok) done++; else failed++
    if ((done + failed) % 25 === 0) {
      console.log(`  Progress: ${done + failed}/${toIndex.length} (${done} ok, ${failed} failed)`)
    }
    // 3s delay between requests
    await sleep(3000)
  }

  console.log(`\nDone: ${done} indexed, ${failed} failed`)

  // Final count
  const { count } = await supabase.from('document_chunks').select('id', { count: 'exact', head: true })
  console.log(`Total document chunks in DB: ${count}`)
}

main().catch(console.error)
