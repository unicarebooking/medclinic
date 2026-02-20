import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  let all: any[] = []
  let page = 0
  while (true) {
    const { data } = await s.from('appointments').select('doctor_id, patient_id').range(page * 1000, (page + 1) * 1000 - 1)
    if (!data?.length) break
    all = all.concat(data)
    if (data.length < 1000) break
    page++
  }
  console.log('Total appointments:', all.length)

  const map = new Map<string, Set<string>>()
  for (const a of all) {
    if (!map.has(a.doctor_id)) map.set(a.doctor_id, new Set())
    map.get(a.doctor_id)!.add(a.patient_id)
  }

  const { data: doctors } = await s.from('doctors').select('id, user:users!doctors_user_id_fkey(full_name)')
  let withPatients = 0, without = 0
  for (const d of doctors || []) {
    const cnt = map.get(d.id)?.size || 0
    console.log(`${(d as any).user?.full_name}: ${cnt} patients`)
    if (cnt > 0) withPatients++; else without++
  }
  console.log(`\nWith patients: ${withPatients}, Without: ${without}`)

  // Count summaries
  const { count } = await s.from('treatment_summaries').select('id', { count: 'exact', head: true })
  console.log('Total treatment summaries:', count)

  // Count document_chunks
  const { count: chunks } = await s.from('document_chunks').select('id', { count: 'exact', head: true })
  console.log('Total document chunks (RAG):', chunks)
}
main()
