// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gtzdlniozpkifuhowgjs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emRsbmlvenBraWZ1aG93Z2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODA0MDcsImV4cCI6MjA3OTM1NjQwN30.ig_wkDwGtLZ0K6vZtxDaTzl-aUrsnKLXcRsrUfHEo1M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)