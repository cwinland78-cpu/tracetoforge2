import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabase'

// Project CRUD functions
export async function createProject(userId, name, config, thumbnail) {
  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: userId, name, config, thumbnail })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(id, updates) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listProjects(userId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

export async function getProject(id) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export default function Dashboard() {
  const { user, profile, isAuthenticated, signOut, loading } = useAuth()
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/login')
        return
      }
      loadProjects()
    }
  }, [isAuthenticated, loading])

  async function loadProjects() {
    try {
      console.log('[Dashboard] Loading projects for user:', user?.id)
      const data = await listProjects(user.id)
      console.log('[Dashboard] Loaded projects:', data?.length, data)
      setProjects(data)
    } catch (err) {
      console.error('[Dashboard] Error loading projects:', err?.message || err, err)
    }
    setLoadingProjects(false)
  }

  async function handleDelete(id, name) {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      setDeletingId(id)
      try {
        await deleteProject(id)
        setProjects((prev) => prev.filter((p) => p.id !== id))
      } catch (err) {
        console.error('Error deleting project:', err)
        alert('Failed to delete project')
      }
      setDeletingId(null)
    }
  }

  function openProject(id) {
    navigate(`/editor?project=${id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-orange-500">
            TracetoForge
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {profile?.credits || 0} credit
              {profile?.credits !== 1 ? 's' : ''}
            </span>
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={() => navigate('/editor')}
              className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              New Project
            </button>
            <button
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">My Projects</h1>

        {loadingProjects ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔧</div>
            <h2 className="text-xl text-gray-300 mb-2">No projects yet</h2>
            <p className="text-gray-500 mb-6">
              Create your first tray insert to get started
            </p>
            <button
              onClick={() => navigate('/editor')}
              className="bg-orange-600 hover:bg-orange-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Start New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors group"
              >
                <div
                  className="h-48 bg-gray-750 flex items-center justify-center cursor-pointer"
                  onClick={() => openProject(proj.id)}
                >
                  {proj.thumbnail ? (
                    <img
                      src={proj.thumbnail}
                      alt={proj.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-600 text-4xl">📐</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-white font-medium truncate">
                    {proj.name}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {new Date(proj.updated_at).toLocaleDateString()} at{' '}
                    {new Date(proj.updated_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => openProject(proj.id)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDelete(proj.id, proj.name)}
                      disabled={deletingId === proj.id}
                      className="bg-gray-700 hover:bg-red-600/50 text-gray-400 hover:text-red-300 text-sm px-3 py-2 rounded-lg transition-colors"
                    >
                      {deletingId === proj.id ? '...' : '🗑'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
