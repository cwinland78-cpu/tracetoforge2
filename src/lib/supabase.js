import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Get current auth token from localStorage
function getAccessToken() {
  try {
    const stored = localStorage.getItem('sb-pzmykycxmbzbrzkyotkc-auth-token')
    if (stored) return JSON.parse(stored)?.access_token
  } catch {}
  return null
}

// Call a Supabase RPC function
export async function callRpc(fnName, params) {
  const token = getAccessToken()
  const headers = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = 'Bearer ' + token

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })
  const data = await res.json()
  return res.ok ? { data, error: null } : { data: null, error: data }
}

// Simple select query helper
export async function queryTable(table, select, filters) {
  const token = getAccessToken()
  const headers = {
    apikey: supabaseAnonKey,
    Accept: 'application/json',
  }
  if (token) headers.Authorization = 'Bearer ' + token

  let url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`
  if (filters) {
    for (const [col, val] of Object.entries(filters)) {
      url += `&${col}=eq.${val}`
    }
  }

  const res = await fetch(url, { headers })
  const data = await res.json()
  return res.ok ? { data, error: null } : { data: null, error: data }
}
