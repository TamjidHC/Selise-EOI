import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { MODELS } from '../lib/constants'

const CRED_URL = import.meta.env.VITE_CRED_FILE_URL
const CVS_URL  = import.meta.env.VITE_CVS_FILE_URL

const KB_FILES = [
  {
    key: 'cred',
    label: 'Master Reference Cases',
    filename: 'Master Reference Case.docx',
    description: 'All SELISE project credentials used in EOI submissions',
    urlKey: 'VITE_CRED_FILE_URL',
    url: CRED_URL,
  },
  {
    key: 'cvs',
    label: 'Master CVs',
    filename: 'Master CV.docx',
    description: 'Staff biographies and expertise profiles',
    urlKey: 'VITE_CVS_FILE_URL',
    url: CVS_URL,
  },
]

export default function KnowledgeBase() {
  const [model, setModel] = useState(MODELS[0].id)
  const [statuses, setStatuses] = useState({ cred: 'checking', cvs: 'checking' })
  const [kbStatus, setKbStatus] = useState({ cred: 'loading', cvs: 'loading' })

  useEffect(() => { checkFiles() }, [])

  async function checkFiles() {
    for (const f of KB_FILES) {
      try {
        const res = await fetch(f.url, { method: 'HEAD' })
        setStatuses(s => ({ ...s, [f.key]: res.ok ? 'ok' : 'missing' }))
        setKbStatus(s => ({ ...s, [f.key]: res.ok ? 'ok' : 'error' }))
      } catch {
        setStatuses(s => ({ ...s, [f.key]: 'missing' }))
        setKbStatus(s => ({ ...s, [f.key]: 'error' }))
      }
    }
  }

  return (
    <Layout model={model} setModel={setModel} kbStatus={kbStatus}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-800">Knowledge Base</h1>
          <button onClick={checkFiles} className="text-sm text-[#741B47] underline">Refresh</button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-6">
          These files are stored in Supabase and loaded by the AI at generation time. To update them, replace the files in your Supabase Storage bucket (<strong>kb/</strong>), then generate new signed URLs and update your <strong>.env</strong> file.
        </div>

        <div className="space-y-4">
          {KB_FILES.map(f => (
            <div key={f.key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{f.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.filename}</p>
                  <p className="text-xs text-gray-400 mt-1">{f.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {statuses[f.key] === 'checking' && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-semibold">Checking...</span>
                  )}
                  {statuses[f.key] === 'ok' && (
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">✓ Accessible</span>
                  )}
                  {statuses[f.key] === 'missing' && (
                    <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">✗ Not found</span>
                  )}
                </div>
              </div>

              {statuses[f.key] === 'ok' && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                  <a
                    href={f.url}
                    download
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    ↓ Download
                  </a>
                </div>
              )}

              {statuses[f.key] === 'missing' && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-red-700">
                  File not reachable — the signed URL may have expired. Replace it in your <strong>.env</strong> file with a new signed URL from Supabase Storage.
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-5 text-xs text-gray-500 space-y-2">
          <p className="font-semibold text-gray-600 text-sm mb-3">How to update KB files</p>
          <p>1. Open Supabase → Storage → <strong>kb</strong> bucket</p>
          <p>2. Delete the old file and upload your updated .docx</p>
          <p>3. Right-click the file → Get URL → copy the signed URL (set expiry to max)</p>
          <p>4. Replace the matching <strong>VITE_CRED_FILE_URL</strong> or <strong>VITE_CVS_FILE_URL</strong> in your <strong>.env</strong> file</p>
          <p>5. Restart the dev server (<strong>npm run dev</strong>) or redeploy to Vercel</p>
        </div>
      </div>
    </Layout>
  )
}
