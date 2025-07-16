import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = 'https://alexhdutnvlxwhziudnr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZXhoZHV0bnZseHdoeml1ZG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MTk4NjAsImV4cCI6MjA2MzA5NTg2MH0.5xENkTcPI7cQR3fPG8_zD05E8b0EbfCMtr0HAhmHhzI'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)