import { createClient } from '@supabase/supabase-js'
import { getRequiredEnv } from './env.js'

// SERVICE_ROLE_KEY: solo serverless functions, nunca frontend.
let supabaseAdminClient = null

export function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
    )
  }
  return supabaseAdminClient
}

export const supabaseAdmin = new Proxy({}, {
  get(_target, prop) {
    const client = getSupabaseAdmin()
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
