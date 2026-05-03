import React, { useState, useEffect, useCallback } from 'react'
import { Star, ChevronUp, Search, Loader2, Globe } from 'lucide-react'
import {
  listPublishedTools, getPublishedTool, getMyRating, getMyVote,
  toggleUpvote, setRating
} from '../lib/publishedTools'

const SORTS = [
  { key: 'top', label: 'Top' },
  { key: 'rated', label: 'Highest Rated' },
  { key: 'new', label: 'Newest' },
]

// Renders a star rating (interactive if onChange supplied; else static).
function Stars({ value = 0, onChange, size = 14, disabled = false }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!onChange || disabled}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(n)}
          className={`${onChange ? 'cursor-pointer' : 'cursor-default'} disabled:opacity-50`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            className={
              n <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-zinc-600'
            }
          />
        </button>
      ))}
    </div>
  )
}

/**
 * @param {object} props
 * @param {string|null} props.userId - current user id, or null
 * @param {boolean} props.canContribute - true if user is paying (gates upvote/rate)
 * @param {(tool: object) => void} [props.onUseTool] - called when user picks a tool to load
 * @param {string} [props.compactClassName] - optional grid class override for embedded use
 */
export default function CommunityLibrary({ userId, canContribute, onUseTool, compactClassName }) {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState('top')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error } = await listPublishedTools({
      sort, search: search.trim(), category: category.trim() || null, limit: 60,
    })
    setLoading(false)
    if (error) { setError('Could not load community library'); return }
    setTools(data || [])
  }, [sort, search, category])

  useEffect(() => { refresh() }, [sort])
  useEffect(() => {
    const t = setTimeout(refresh, 300)
    return () => clearTimeout(t)
  }, [search, category])

  const handleVote = async (toolId) => {
    if (!canContribute) return
    // optimistic
    setTools(prev => prev.map(t => t.id === toolId
      ? { ...t, _myVote: !t._myVote, upvotes_count: t.upvotes_count + (t._myVote ? -1 : 1) }
      : t))
    const { ok } = await toggleUpvote(toolId, userId)
    if (!ok) refresh() // revert on failure
  }

  const handleRate = async (toolId, stars) => {
    if (!canContribute) return
    const tool = tools.find(t => t.id === toolId)
    const oldStars = tool?._myStars || 0
    // optimistic aggregate update
    setTools(prev => prev.map(t => {
      if (t.id !== toolId) return t
      const newCount = oldStars > 0 ? t.ratings_count : t.ratings_count + 1
      const newSum = t.ratings_sum - oldStars + stars
      return { ...t, _myStars: stars, ratings_count: newCount, ratings_sum: newSum }
    }))
    const { ok } = await setRating(toolId, userId, stars)
    if (!ok) refresh()
  }

  // Pull "my rating / my vote" lazily for the visible tools so we can show the
  // user their existing state. Done in a second pass to keep the listing query fast.
  useEffect(() => {
    if (!userId || tools.length === 0) return
    let cancelled = false
    ;(async () => {
      // Single batched query for ratings
      const ids = tools.map(t => t.id)
      const idList = ids.join(',')
      const ratingsRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/published_tool_ratings?select=tool_id,stars&user_id=eq.${userId}&tool_id=in.(${idList})`,
        { headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('sb-pzmykycxmbzbrzkyotkc-auth-token') || '{}')?.access_token || ''),
        }}
      ).then(r => r.ok ? r.json() : []).catch(() => [])
      const votesRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/published_tool_votes?select=tool_id&user_id=eq.${userId}&tool_id=in.(${idList})`,
        { headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('sb-pzmykycxmbzbrzkyotkc-auth-token') || '{}')?.access_token || ''),
        }}
      ).then(r => r.ok ? r.json() : []).catch(() => [])
      if (cancelled) return
      const myStarsMap = Object.fromEntries(ratingsRes.map(r => [r.tool_id, r.stars]))
      const myVoteSet = new Set(votesRes.map(v => v.tool_id))
      setTools(prev => prev.map(t => ({
        ...t,
        _myStars: myStarsMap[t.id] || 0,
        _myVote: myVoteSet.has(t.id),
      })))
    })()
    return () => { cancelled = true }
  // We deliberately depend only on the LIST of ids, not on tools, to avoid loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools.map(t => t.id).join(','), userId])

  const handleUseTool = async (toolId) => {
    if (!onUseTool) return
    const { data, error } = await getPublishedTool(toolId)
    if (error || !data) return
    onUseTool(data)
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-9 pr-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <input
          type="text" value={category} onChange={e => setCategory(e.target.value)}
          placeholder="Category"
          className="sm:w-40 px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="flex bg-zinc-800 border border-zinc-700 rounded-md overflow-hidden">
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSort(s.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                sort === s.key ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 mb-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      )}

      {!loading && tools.length === 0 && (
        <div className="text-center py-12">
          <Globe size={28} className="mx-auto text-zinc-600 mb-2" />
          <p className="text-zinc-400 text-sm">
            {search || category
              ? 'No tools match that filter.'
              : 'The community library is just getting started. Be one of the first to publish a tool.'}
          </p>
        </div>
      )}

      {!loading && tools.length > 0 && (
        <div className={compactClassName || 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'}>
          {tools.map(t => {
            const avg = t.ratings_count > 0 ? (t.ratings_sum / t.ratings_count).toFixed(1) : null
            return (
              <div key={t.id} className="group relative bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden hover:border-blue-500/50 transition-colors flex flex-col">
                <button
                  onClick={() => handleUseTool(t.id)}
                  disabled={!onUseTool}
                  className="block w-full text-left disabled:cursor-default"
                >
                  <div className="aspect-square bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {t.thumbnail
                      ? <img src={t.thumbnail} alt={t.name} className="w-full h-full object-contain" />
                      : <div className="text-zinc-600 text-xs">No preview</div>}
                  </div>
                  <div className="px-3 pt-2 pb-1.5">
                    <div className="text-sm font-medium text-white truncate">{t.name}</div>
                    {t.category && <div className="text-[11px] text-zinc-500 truncate">{t.category}</div>}
                  </div>
                </button>

                {/* Engagement footer */}
                <div className="px-3 pb-2 pt-0.5 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1">
                    <Stars
                      value={t._myStars || (avg ? Math.round(avg) : 0)}
                      onChange={canContribute ? (n => handleRate(t.id, n)) : null}
                      size={12}
                    />
                    {avg && <span className="text-zinc-400 ml-1">{avg}</span>}
                    {t.ratings_count > 0 && <span className="text-zinc-600">({t.ratings_count})</span>}
                  </div>
                  <button
                    onClick={() => handleVote(t.id)}
                    disabled={!canContribute}
                    title={canContribute ? (t._myVote ? 'Remove upvote' : 'Upvote') : 'Sign in and purchase credits to vote'}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors ${
                      t._myVote
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <ChevronUp size={12} />
                    <span>{t.upvotes_count || 0}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!canContribute && tools.length > 0 && (
        <p className="mt-4 text-[11px] text-zinc-500 text-center">
          Browse free, anyone can use. Purchase credits to publish, rate, and upvote.
        </p>
      )}
    </div>
  )
}
