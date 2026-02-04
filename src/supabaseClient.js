import { createClient } from '@supabase/supabase-js'

// 1. ไปที่เว็บ https://supabase.com แล้วสมัคร/สร้างโปรเจกต์ใหม่
// 2. ไปที่เมนู Settings -> API
// 3. ก๊อปปี้ "Project URL" และ "anon public key" มาใส่ตรงนี้ครับ

const supabaseUrl = 'https://dkdukttqqwbujxdriuyg.supabase.co'
const supabaseKey = 'sb_publishable_VTVGYFMCO-r0WWfP8yLZ_Q_u8fiVX2o'

export const supabase = createClient(supabaseUrl, supabaseKey)