import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { MODELS } from '../lib/constants'

export default function History() {
  const [model, setModel] = useState(MODELS[0].id)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('eoi_records')
      .select('id, project_name, client, procurement_no, submission_date, entity, model_used, created_at, tor_analysis, eoi_structure, selected_credentials, selected_cvs')
      .order('created_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
    if (error) console.error(error)
  }

  function toggle(id) {
    setExpanded(e => e === id ? null : id)
  }

  return (
    <Layout model={model} setModel={setModel}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-800">EOI History</h1>
          <button onClick={load} className="text-sm text-[#741B47] underline">Refresh</button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading...</div>
        )}

        {!loading && records.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            No EOIs generated yet. Head to <strong>Generate</strong> to create your first one.
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="space-y-3">
            {records.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div
                  onClick={() => toggle(r.id)}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{r.project_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.client} · {r.procurement_no}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {r.submission_date
                        ? new Date(r.submission_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">{r.entity}</span>
                    <span className={`text-xs transition-transform ${expanded === r.id ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>

                {expanded === r.id && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {/* TOR summary */}
                    {r.tor_analysis?.project_type && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#741B47] mb-2">TOR Summary</p>
                        <p className="text-sm text-gray-600">{r.tor_analysis.project_type}</p>
                        {r.tor_analysis.key_requirements?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {r.tor_analysis.key_requirements.map((req, i) => (
                              <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{req}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Credentials */}
                    {r.selected_credentials?.items?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#741B47] mb-2">
                          Credentials Used — {r.selected_credentials.items.length}
                        </p>
                        <div className="space-y-1">
                          {r.selected_credentials.items.map((c, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-gray-300 flex-shrink-0">•</span>
                              <div>
                                <span className="font-medium text-gray-700">{c.title}</span>
                                {c.client && <span className="text-gray-400 ml-2 text-xs">{c.client} · {c.country}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CVs */}
                    {r.selected_cvs?.items?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#741B47] mb-2">
                          Staff CVs Used — {r.selected_cvs.items.length}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {r.selected_cvs.items.map((c, i) => (
                            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">
                              {c.name}{c.title ? ` — ${c.title}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        Generated {new Date(r.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                        {r.model_used && <> · <span className="font-mono">{r.model_used.split('/').pop()}</span></>}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
