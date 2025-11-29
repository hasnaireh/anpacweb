// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ouptwqloobqnylkvrztr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cHR3cWxvb2Jxbnlsa3ZyenRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDQ4NDYsImV4cCI6MjA3OTkyMDg0Nn0.yCoEg04EZEPuv0mNs_jqY4celoRum8DXDBOnzEwxSzk'

export const supabase = createClient(supabaseUrl, supabaseKey)