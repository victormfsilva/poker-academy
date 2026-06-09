import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://psbhjvtjhjntjbfwslsg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzYmhqdnRqaGpudGpiZndzbHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NjU0NDQsImV4cCI6MjA5NjU0MTQ0NH0.BMRM50KT_rZn6N6AEdKS5Ggp264ewW0CE-sIVGR4mrc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
