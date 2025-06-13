
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lakvfrohnlinfcqfwkqq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxha3Zmcm9obmxpbmZjcWZ3a3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODQyNDcsImV4cCI6MjA2NTE2MDI0N30.Cohs36ZVp5vb-CfxsLkF51GyuMf_nhBDTjKqYKgi9b0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
