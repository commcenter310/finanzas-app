import { createClient } from '@supabase/supabase-js'

// ⚠️ SERVICE_ROLE_KEY — SOLO usar en serverless functions, NUNCA en el frontend
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
