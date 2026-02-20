/**
 * Seed: assigns 10 patients to each doctor that has none,
 * creates 10 appointments + 10 treatment summaries per doctor-patient pair.
 * Then triggers RAG reindex-all.
 *
 * Usage: npx tsx scripts/seed-summaries.ts
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ALB_URL = 'http://medclinic-alb-789263220.il-central-1.elb.amazonaws.com'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const summaryTemplates = [
  {
    diagnosis: 'דלקת גרון חריפה (Acute Pharyngitis)',
    treatment_notes: `המטופל הגיע עם תלונות על כאב גרון חזק שהחל לפני 3 ימים, קושי בבליעה וחום של 38.5 מעלות.
בבדיקה פיזית נמצא אודם בגרון, שקדים מוגדלים עם ליחה לבנבנה, ובלוטות לימפה צוואריות רגישות.
בוצע משטח גרון מהיר (Strep test) שהגיע חיובי לסטרפטוקוקוס מקבוצה A.
נרשם טיפול אנטיביוטי - אמוקסיצילין 500 מ"ג שלוש פעמים ביום למשך 10 ימים.
הומלץ על שתייה מרובה של נוזלים חמים, מנוחה, וגרגור עם מי מלח.
ניתנה הנחיה לחזור אם החום לא יורד תוך 48 שעות מתחילת הטיפול.
יש לעקוב אחר סימנים של סיבוכים כגון אבצס פריטונסילרי או חום ראומטי.
המטופל הונחה להימנע ממגע עם אנשים אחרים למשך 24 שעות מתחילת האנטיביוטיקה.
תור מעקב נקבע לעוד שבועיים לבדיקה חוזרת ווידוא החלמה מלאה.`,
    prescription: 'אמוקסיצילין 500 מ"ג x3 ביום (10 ימים), אקמול 500 מ"ג לפי צורך',
    follow_up_required: true,
  },
  {
    diagnosis: 'יתר לחץ דם (Hypertension) - מעקב שגרתי',
    treatment_notes: `המטופל מגיע לבדיקת מעקב שגרתית ליתר לחץ דם שאובחן לפני 3 שנים.
לחץ דם נמדד 145/92 מ"מ כספית בישיבה, מעט גבוה מהיעד של 130/80.
המטופל מדווח על ציות חלקי לטיפול התרופתי - לעיתים שוכח את המנה הערבית.
בבדיקת דם אחרונה: תפקודי כליה תקינים, קריאטינין 0.9, אשלגן 4.2.
ניתנה תוספת של אמלודיפין 5 מ"ג בנוסף לרמיפריל 10 מ"ג הקיים.
הודגשה חשיבות הפחתת מלח בתזונה - מתחת ל-5 גרם ביום.
הומלץ על פעילות גופנית אירובית - הליכה מהירה 30 דקות לפחות 5 פעמים בשבוע.
המטופל הונחה למדוד לחץ דם בבית פעמיים ביום ולרשום ביומן.
נקבעה בדיקת דם ושתן ליפיד פרופיל ו-microalbumin בעוד חודש.
תור מעקב נקבע לעוד 6 שבועות להערכת תגובה לשינוי הטיפול.`,
    prescription: 'רמיפריל 10 מ"ג x1 בוקר, אמלודיפין 5 מ"ג x1 ערב',
    follow_up_required: true,
  },
  {
    diagnosis: 'סוכרת סוג 2 - בקרה לא מאוזנת',
    treatment_notes: `המטופל מגיע עם תוצאות HbA1c של 8.2%, עלייה מ-7.4% לפני 3 חודשים.
סוכר צום 167 מ"ג/דצ"ל. המטופל מדווח על קושי לשמור על דיאטה ואכילת ממתקים תכופה.
משקל 92 ק"ג, BMI 31.2 - עלייה של 2 ק"ג מהביקור האחרון.
בבדיקת כפות רגליים: עור יבש, ללא פצעים או כיבים, דפקים פריפריים תקינים.
הוחלט להוסיף סמגלוטייד (אוזמפיק) 0.25 מ"ג שבועי בנוסף למטפורמין 1000 מ"ג x2.
הופנה לדיאטנית קלינית לבניית תוכנית תזונה מותאמת אישית.
הומלץ להתחיל מדידות סוכר יומיות - צום ושעתיים אחרי ארוחת ערב.
נשלחה הפנייה לבדיקת קרקעית עין שנתית אצל רופא עיניים.
יש לבצע בדיקת שתן ל-microalbumin ותפקודי כליה בעוד חודש.
תור מעקב נקבע לעוד 3 חודשים עם בדיקת HbA1c חוזרת.`,
    prescription: 'מטפורמין 1000 מ"ג x2 ביום, סמגלוטייד 0.25 מ"ג זריקה שבועית',
    follow_up_required: true,
  },
  {
    diagnosis: 'כאב גב תחתון כרוני (Chronic Low Back Pain)',
    treatment_notes: `המטופל סובל מכאב גב תחתון כרוני כבר 6 חודשים, מחמיר בישיבה ממושכת.
הכאב מוקרן לרגל שמאל עד הברך, ללא חולשה בגפיים או הפרעות בסוגרים.
MRI עמוד שדרה מותני הראה בליטת דיסק L4-L5 עם לחץ קל על שורש עצב.
טווח תנועה מוגבל בכיפוף קדימה, SLR חיובי בצד שמאל ב-60 מעלות.
נרשם טיפול משולב: פיזיותרפיה 12 טיפולים, ודולוקסטין 30 מ"ג ליום.
הומלץ על תרגילי חיזוק ליבה יומיים לפי דף הנחיות שנמסר.
יש להימנע מהרמת משאות כבדים ולשמור על יציבה נכונה בעבודה.
נמסרה הפנייה לרופא כאב במידה ואין שיפור תוך 6 שבועות.
המטופל הונחה שטיפול כירורגי אינו נדרש בשלב זה.
תור מעקב נקבע לעוד חודשיים להערכת תגובה לפיזיותרפיה.`,
    prescription: 'דולוקסטין 30 מ"ג x1 ביום, איבופרופן 400 מ"ג x3 ביום לפי צורך',
    follow_up_required: true,
  },
  {
    diagnosis: 'חרדה מוכללת (Generalized Anxiety Disorder)',
    treatment_notes: `המטופלת מגיעה עם תלונות על דאגנות מוגברת, קושי בהירדמות ומתח שרירי כרוני.
תסמינים קיימים כ-8 חודשים ומחמירים בתקופות לחץ בעבודה.
שאלון GAD-7 הראה ציון 15 - חרדה בדרגת חומרה בינונית-קשה.
אין מחשבות אובדניות או התנהגות אלימה. אין שימוש בחומרים.
המטופלת מדווחת על הפרעות שינה - שעת הירדמות ממוצעת של שעתיים.
הוחלט להתחיל טיפול ב-SSRI - סרטרלין 50 מ"ג, עם עלייה הדרגתית ל-100 מ"ג.
הופנתה לטיפול CBT (טיפול קוגניטיבי-התנהגותי) - 12 מפגשים שבועיים.
הומלץ על תרגילי נשימה ומיינדפולנס יומיים, ניתן דף הנחיות.
הוסברו תופעות לוואי אפשריות של התרופה - בחילה, כאב ראש, עייפות ראשונית.
תור מעקב נקבע לעוד 3 שבועות להערכת תגובה ראשונית לטיפול התרופתי.`,
    prescription: 'סרטרלין 50 מ"ג x1 בוקר (שבועיים), ואז 100 מ"ג x1 בוקר',
    follow_up_required: true,
  },
  {
    diagnosis: 'אסתמה - התקף קל-בינוני',
    treatment_notes: `המטופל הגיע עם קוצר נשימה וצפצופים שהחלו בלילה האחרון, שיעול יבש.
רוויון חמצן 95% באוויר חדר, קצב נשימה 22 לדקה.
בהאזנה לריאות נשמעים צפצופים דו-צדדיים, בעיקר בנשיפה.
בדיקת PEF: 65% מהצפוי - ירידה משמעותית מהנורמלי.
ניתן טיפול אינהלציה עם סלבוטמול (ונטולין) 4 שאיפות, עם שיפור לאחר 15 דקות.
PEF עלה ל-82% אחרי הטיפול - תגובה טובה למרחיבי סמפונות.
נרשם שינוי בטיפול: מעבר מ-Symbicort 160/4.5 ל-Symbicort 320/9 פעמיים ביום.
יש להמשיך עם ונטולין לפי צורך, ולפנות למיון אם יש שימוש מעל 6 פעמים ביום.
המטופל הונחה לנקות את הבית מאבק ולהימנע מחשיפה לאלרגנים ידועים.
תור מעקב דחוף נקבע לעוד שבוע, עם הפנייה לספירומטריה מלאה.`,
    prescription: 'סימביקורט 320/9 x2 שאיפות בוקר וערב, ונטולין לפי צורך',
    follow_up_required: true,
  },
  {
    diagnosis: 'דלקת עור אטופית (Atopic Dermatitis) - התלקחות',
    treatment_notes: `המטופלת מגיעה עם התלקחות של אקזמה בכיפופי המרפקים והברכיים שהחלה לפני שבוע.
העור אדום, מגורד, עם סדקים ונוזל סרוזי. שטח מעורב כ-15% משטח הגוף.
המטופלת מדווחת על גרד עז שמפריע לשינה ולתפקוד יומי.
אין סימנים של זיהום משני - אין מוגלה, אין חום, אין בלוטות מוגדלות.
נרשמה משחה סטרואידית בינונית - מומטזון פורואט 0.1% ליום למשך שבועיים.
יש למרוח תחליב לחות לפחות פעמיים ביום על כל הגוף.
הומלץ על אמבטיה קצרה בפושרים עם תחליף סבון ללא בישום.
ניתנה הנחיה להימנע מאריגים סינתטיים ולהעדיף כותנה.
נרשם אנטיהיסטמין - לוראטאדין 10 מ"ג ליום להקלה על הגרד.
תור מעקב נקבע לעוד שבועיים להערכת שיפור ושקילת מעבר לטיפול חלופי.`,
    prescription: 'מומטזון 0.1% משחה x1 ביום, לוראטאדין 10 מ"ג x1 ביום',
    follow_up_required: true,
  },
  {
    diagnosis: 'דלקת אוזן תיכונה חריפה (Acute Otitis Media)',
    treatment_notes: `הילד בן 4 הובא עם כאב אוזן ימנית שהחל בלילה, חום 38.8 מעלות ובכי ממושך.
בבדיקת אוטוסקופ: עכירות ואודם של עור התוף הימני, בליטה כלפי חוץ.
אוזן שמאלית תקינה. גרון - אודם קל ללא ליחה.
המטופל עבר דלקת אוזניים דומה לפני 3 חודשים שטופלה באנטיביוטיקה.
נרשם אמוקסיצילין 80 מ"ג/ק"ג/יום מחולק ל-3 מנות למשך 10 ימים.
ניתנו טיפות אוזניים אוטיפקס להקלה על הכאב - 4 טיפות x3 ביום.
ניתנה הוראה למתן נורופן 100 מ"ג כל 6-8 שעות לכאב וחום.
ההורים הונחו לפנות למיון אם הכאב מחמיר, יש הפרשה מהאוזן, או חום מעל 40.
יש לוודא שהילד משלים את כל מנות האנטיביוטיקה גם אם מרגיש טוב.
תור מעקב נקבע לעוד שבוע, עם הפנייה לרופא א.א.ג אם חוזר בתוך חודש.`,
    prescription: 'אמוקסיצילין 250 מ"ג/5 מ"ל x3 ביום, אוטיפקס טיפות, נורופן לפי צורך',
    follow_up_required: true,
  },
  {
    diagnosis: 'אנמיה מחוסר ברזל (Iron Deficiency Anemia)',
    treatment_notes: `המטופלת הגיעה עם תלונות על עייפות כרונית, חולשה, סחרחורת וקוצר נשימה קל במאמץ.
בדיקות דם: המוגלובין 9.8 גר/דצ"ל, MCV 72, פריטין 8 (נמוך מאוד), ברזל 25, טרנספרין מוגבר.
בירור GI: בדיקת דם סמוי בצואה - שלילי. אין דימום ווסתי חריג.
המטופלת מדווחת על תזונה צמחונית ללא תוספי ברזל.
נרשם ברזל גלוקונאט 325 מ"ג פעמיים ביום על קיבה ריקה עם מיץ תפוזים.
הוסברה חשיבות נטילת הברזל שעה לפני אוכל עם ויטמין C לספיגה טובה יותר.
יש להימנע מתה, קפה וחלב בסמוך לנטילת הברזל כי הם מפריעים לספיגה.
תופעות לוואי צפויות: עצירות, צואה כהה, בחילה.
הופנתה לדיאטנית להעשרת התזונה במקורות ברזל צמחיים.
בדיקת דם חוזרת נקבעה לעוד חודשיים, תור מעקב לעוד 3 חודשים.`,
    prescription: 'ברזל גלוקונאט 325 מ"ג x2 ביום, ויטמין C 500 מ"ג x2 ביום',
    follow_up_required: true,
  },
  {
    diagnosis: 'זיהום בדרכי השתן (Urinary Tract Infection)',
    treatment_notes: `המטופלת הגיעה עם תלונות על צריבה במתן שתן, תכיפות, דחיפות ולחץ מעל חיבור הערווה.
אין חום, אין כאב בגב התחתון - ללא חשד לפיילונפריטיס.
בדיקת שתן כללית: ניטריט חיובי, לויקוציטים 50+, דם מיקרוסקופי.
תרבית שתן נשלחה למעבדה - תוצאות צפויות תוך 48 שעות.
נרשם טיפול אמפירי - ניטרופורנטואין 100 מ"ג פעמיים ביום למשך 5 ימים.
הומלץ על שתייה מרובה - לפחות 2 ליטר מים ביום.
הוסברו אמצעי מניעה: ניגוב מלפנים לאחור, השתנה אחרי יחסי מין.
יש לחזור אם הסימפטומים לא משתפרים תוך 48 שעות או אם מופיע חום.
במידה ותרבית השתן תראה חיידק עמיד, ייתכן שינוי באנטיביוטיקה.
אין צורך בתור מעקב, יש לבצע תרבית שתן ביקורת בעוד שבוע.`,
    prescription: 'ניטרופורנטואין 100 מ"ג x2 ביום (5 ימים), אורוולון קפסולות x2 ביום',
    follow_up_required: false,
  },
]

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function createRecord(
  doctorId: string, patientId: string, locationId: string,
  templateIdx: number, dayOffset: number, hour: number, minute: number,
): Promise<{ ok: boolean; err?: string }> {
  const t = summaryTemplates[templateIdx % summaryTemplates.length]
  const d = new Date(); d.setDate(d.getDate() - dayOffset); d.setHours(hour, minute, 0, 0)

  const { data: slot, error: e1 } = await supabase.from('doctor_availability_slots')
    .insert({ doctor_id: doctorId, location_id: locationId, slot_datetime: d.toISOString(), duration_minutes: 30, is_booked: true })
    .select('id').single()
  if (e1) return { ok: false, err: `slot: ${e1.message}` }

  const { data: appt, error: e2 } = await supabase.from('appointments')
    .insert({ patient_id: patientId, doctor_id: doctorId, slot_id: slot.id, status: 'completed', payment_status: 'paid', payment_amount: 350 + Math.floor(Math.random() * 200) })
    .select('id').single()
  if (e2) return { ok: false, err: `appt: ${e2.message}` }

  const { error: e3 } = await supabase.from('treatment_summaries')
    .insert({
      appointment_id: appt.id, doctor_id: doctorId, patient_id: patientId,
      diagnosis: t.diagnosis, treatment_notes: t.treatment_notes, prescription: t.prescription,
      follow_up_required: t.follow_up_required,
      follow_up_date: t.follow_up_required ? new Date(Date.now() + (14 + templateIdx * 7) * 86400000).toISOString().split('T')[0] : null,
    })
  if (e3) return { ok: false, err: `summary: ${e3.message}` }
  return { ok: true }
}

async function main() {
  console.log('=== Seed: 10 summaries per patient per doctor ===\n')

  const { data: doctors } = await supabase.from('doctors')
    .select('id, specialization, user:users!doctors_user_id_fkey(full_name)').eq('is_active', true)
  if (!doctors?.length) { console.error('No doctors!'); return }

  const { data: allPatients } = await supabase.from('users')
    .select('id').eq('role', 'patient').limit(100)
  if (!allPatients?.length) { console.error('No patients!'); return }

  // Get existing doctor-patient pairs (paginated)
  let allAppts: any[] = []
  let page = 0
  while (true) {
    const { data } = await supabase.from('appointments').select('doctor_id, patient_id').range(page * 1000, (page + 1) * 1000 - 1)
    if (!data?.length) break
    allAppts = allAppts.concat(data)
    if (data.length < 1000) break
    page++
  }
  console.log(`Fetched ${allAppts.length} existing appointments`)

  const existingPairs = new Map<string, Set<string>>()
  for (const a of allAppts) {
    if (!existingPairs.has(a.doctor_id)) existingPairs.set(a.doctor_id, new Set())
    existingPairs.get(a.doctor_id)!.add(a.patient_id)
  }

  const { data: locations } = await supabase.from('locations').select('id').limit(1)
  const locationId = locations?.[0]?.id!

  let grandTotal = 0

  for (let dIdx = 0; dIdx < doctors.length; dIdx++) {
    const doctor = doctors[dIdx]
    const doctorName = (doctor as any).user?.full_name || doctor.id
    let patientIds = Array.from(existingPairs.get(doctor.id) || [])

    // If doctor has no patients, assign 10 random ones
    if (patientIds.length === 0) {
      const start = (dIdx * 10) % allPatients.length
      patientIds = allPatients.slice(start, start + 10).map(p => p.id)
    }

    // Check how many summaries this doctor already has
    const { count } = await supabase.from('treatment_summaries')
      .select('id', { count: 'exact', head: true }).eq('doctor_id', doctor.id)
    const needed = patientIds.length * 10
    if ((count || 0) >= needed) {
      console.log(`${doctorName}: already has ${count}/${needed} summaries ✓`)
      continue
    }

    console.log(`${doctorName} (${doctor.specialization}) - ${patientIds.length} patients, has ${count || 0} summaries...`)

    // Process sequentially with small batches (3 at a time) to avoid rate limits
    let ok = 0, fail = 0
    let firstErr = ''
    for (let pIdx = 0; pIdx < patientIds.length; pIdx++) {
      const batch: Promise<{ ok: boolean; err?: string }>[] = []
      for (let i = 0; i < 10; i++) {
        batch.push(createRecord(
          doctor.id, patientIds[pIdx], locationId, i,
          500 + dIdx * 40 + pIdx * 4 + i * 8,  // unique days far in past
          7 + (i % 8),
          (pIdx % 2) * 30,
        ))
      }
      // Run 10 records for this patient sequentially in groups of 3
      for (let b = 0; b < batch.length; b += 3) {
        const chunk = batch.slice(b, b + 3)
        const results = await Promise.all(chunk)
        for (const r of results) {
          if (r.ok) ok++
          else {
            fail++
            if (!firstErr && r.err) firstErr = r.err
          }
        }
      }
      // Small delay between patients to avoid rate limiting
      await sleep(100)
    }

    console.log(`  -> ${ok}/${ok + fail} created${firstErr ? ` (first error: ${firstErr})` : ''}`)
    grandTotal += ok

    // Delay between doctors
    await sleep(500)
  }

  console.log(`\n=== Total new records created: ${grandTotal} ===`)

  // Final counts
  const { count: totalS } = await supabase.from('treatment_summaries').select('id', { count: 'exact', head: true })
  const { count: totalA } = await supabase.from('appointments').select('id', { count: 'exact', head: true })
  console.log(`Total summaries in DB: ${totalS}`)
  console.log(`Total appointments in DB: ${totalA}`)

  // Trigger RAG reindex
  console.log('\nTriggering RAG reindex-all...')
  try {
    const res = await fetch(`${ALB_URL}/rag/reindex-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': SERVICE_KEY },
      signal: AbortSignal.timeout(600000),
    })
    if (res.ok) console.log('RAG reindex result:', JSON.stringify(await res.json(), null, 2))
    else console.error(`RAG reindex error: ${res.status} ${await res.text().catch(() => '')}`)
  } catch (err: any) {
    console.error(`RAG reindex: ${err.message}`)
  }
}

main().catch(console.error)
