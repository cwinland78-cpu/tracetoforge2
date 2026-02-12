import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pzmykycxmbzbrzkyotkc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bXlreWN4bWJ6YnJ6a3lvdGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjUxNjYsImV4cCI6MjA4NjE0MTE2Nn0.382YBaplfZJVl_ngKbGSpEPm1w3urlrxYAQFzRJW3z0'

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
