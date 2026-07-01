import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { fetchAndParseDocx, parseDocx, parsePdf } from '../lib/torParser'
import { aiCall } from '../lib/openrouter'
import { buildDocx } from '../lib/docBuilder'
import { supabase } from '../lib/supabase'
import { MODELS, ENTITIES, SELISE_BOILERPLATE } from '../lib/constants'

const CRED_URL = import.meta.env.VITE_CRED_FILE_URL
const CVS_URL  = import.meta.env.VITE_CVS_FILE_URL

const STEPS = ['Setup', 'Analyse', 'Review', 'Generate & Edit', 'Download']

function StepBar({ step }) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 flex overflow-x-auto">
      {STEPS.map((label, i) => (
        <div key={i} className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
          i + 1 === step ? 'border-[#741B47] text-[#741B47]'
          : i + 1 < step ? 'border-green-500 text-green-600'
          : 'border-transparent text-gray-400'
        }`}>
          {i + 1 < step ? <span className="text-green-500">✓</span> : <span>{i + 1}</span>}
          {label}
        </div>
      ))}
    </div>
  )
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm ${className}`}>
      {title && <p className="text-xs font-bold uppercase tracking-widest text-[#741B47] mb-4">{title}</p>}
      {children}
    </div>
  )
}

function ProgItem({ label, detail, status }) {
  const dot = {
    idle: 'bg-gray-300',
    active: 'bg-amber-400 animate-pulse',
    done: 'bg-green-500',
    error: 'bg-red-500',
  }[status] || 'bg-gray-300'
  const bg = { active: 'bg-amber-50', done: 'bg-green-50', error: 'bg-red-50', idle: 'bg-gray-50' }[status] || 'bg-gray-50'
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg ${bg}`}>
      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${dot}`} />
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {detail && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}

function Tag({ children, color = 'purple' }) {
  const colors = {
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-600 font-mono text-[10px]',
  }
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>{children}</span>
}

function ItemCard({ item, selected, onToggle, type }) {
  return (
    <div
      onClick={onToggle}
      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
        selected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-50'
      }`}
    >
      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
        selected ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'
      }`}>
        {selected && '✓'}
      </div>
      <p className="text-sm font-bold text-gray-800 pr-7 leading-tight">
        {type === 'cred' ? item.title : item.name}
      </p>
      {type === 'cred' && (
        <p className="text-xs text-gray-500 mt-1">
          {[item.client, item.country, item.contract_value].filter(Boolean).join(' · ')}
        </p>
      )}
      {type === 'cv' && item.title && (
        <p className="text-xs text-gray-500 mt-1">{item.title}</p>
      )}
      {item.why_relevant && (
        <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200 leading-relaxed">{item.why_relevant}</p>
      )}
      <div className="flex gap-1 mt-2 flex-wrap">
        {type === 'cred' && item.eoi_section && <Tag color="purple">{item.eoi_section}</Tag>}
        {item.confidence && <Tag color={item.confidence === 'high' ? 'green' : 'blue'}>{item.confidence}</Tag>}
      </div>
    </div>
  )
}

function ErrorBox({ message, onRetry, onSwitchModel }) {
  const [countdown, setCountdown] = useState(message === 'RATE_LIMIT' ? 60 : 0)
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  const friendlyMsg = message === 'RATE_LIMIT'
    ? 'Free model rate limit reached.'
    : message === 'SERVER_ERROR'
    ? 'OpenRouter returned a server error.'
    : message

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
      <p className="text-sm font-semibold text-red-700 mb-2">⚠ {friendlyMsg}</p>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={onRetry}
          disabled={countdown > 0}
          className="text-sm px-4 py-2 bg-[#741B47] text-white rounded-lg disabled:bg-gray-300 hover:bg-[#5a1436] transition-colors"
        >
          {countdown > 0 ? `Retry in ${countdown}s` : 'Retry'}
        </button>
        <button onClick={onSwitchModel} className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
          Switch Model
        </button>
      </div>
    </div>
  )
}

export default function EOIGenerator() {
  const [model, setModel] = useState(MODELS[0].id)
  const [step, setStep] = useState(1)
  const [kbStatus, setKbStatus] = useState({ cred: 'loading', cvs: 'loading' })
  const kbRef = useRef({ credText: null, cvsText: null })

  // Form state
  const [form, setForm] = useState({ projectName: '', procNo: '', client: '', date: '', entity: ENTITIES[0] })
  const [torText, setTorText] = useState('')
  const [torFileName, setTorFileName] = useState('')
  const [torWarning, setTorWarning] = useState(false)

  // Analysis state
  const [progs, setProgs] = useState([])
  const [analysisResult, setAnalysisResult] = useState(null)
  const [matchNotice, setMatchNotice] = useState(null)
  const [aiError, setAiError] = useState(null)
  const retryFnRef = useRef(null)

  // Review state
  const [selCreds, setSelCreds] = useState(new Set())
  const [selCvs, setSelCvs] = useState(new Set())

  // Generate state
  const [genProgs, setGenProgs] = useState([])
  const [generatedData, setGeneratedData] = useState(null)
  const [editedData, setEditedData] = useState({})
  const [genError, setGenError] = useState(null)
  const [docBlob, setDocBlob] = useState(null)

  // Load KB on mount
  useEffect(() => {
    loadKB()
  }, [])

  async function loadKB() {
    setKbStatus({ cred: 'loading', cvs: 'loading' })
    try {
      const text = await fetchAndParseDocx(CRED_URL)
      kbRef.current.credText = text
      setKbStatus(s => ({ ...s, cred: 'ok' }))
    } catch {
      setKbStatus(s => ({ ...s, cred: 'error' }))
    }
    try {
      const text = await fetchAndParseDocx(CVS_URL)
      kbRef.current.cvsText = text
      setKbStatus(s => ({ ...s, cvs: 'ok' }))
    } catch {
      setKbStatus(s => ({ ...s, cvs: 'error' }))
    }
  }

  async function handleTorFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setTorFileName(file.name)
    setTorWarning(false)
    try {
      let text = ''
      const ext = file.name.split('.').pop().toLowerCase()
      if (ext === 'docx') text = await parseDocx(file)
      else if (ext === 'pdf') { text = await parsePdf(file); setTorWarning(true) }
      else { alert('Please upload a .docx or .pdf file'); return }
      setTorText(text)
    } catch (err) {
      alert('Could not read file: ' + err.message)
    }
  }

  function setProg(idx, status, detail) {
    setProgs(p => p.map((item, i) => i === idx ? { ...item, status, detail: detail || item.detail } : item))
  }

  function setGenProg(idx, status, detail) {
    setGenProgs(p => p.map((item, i) => i === idx ? { ...item, status, detail: detail || item.detail } : item))
  }

  async function startAnalysis() {
    if (!form.projectName || !form.procNo || !form.client) { alert('Fill in Project Name, Procurement No., and Client.'); return }
    if (torText.length < 200) { alert('TOR text is too short. Please upload or paste the full Terms of Reference.'); return }
    if (!kbRef.current.credText || !kbRef.current.cvsText) { alert('Knowledge base files are still loading. Please wait.'); return }

    setStep(2)
    setAiError(null)
    setMatchNotice(null)
    setProgs([
      { label: 'Checking for previous TOR matches', detail: 'Searching your EOI history...', status: 'idle' },
      { label: 'Matching credentials to TOR', detail: 'Cross-referencing your project profiles...', status: 'idle' },
      { label: 'Matching CVs to TOR', detail: 'Identifying relevant staff expertise...', status: 'idle' },
      { label: 'Building EOI outline', detail: 'Proposing section structure based on TOR...', status: 'idle' },
    ])

    const run = async () => {
      try {
        // Check procurement number match
        setProg(0, 'active')
        const { data: existing } = await supabase
          .from('eoi_records')
          .select('*')
          .eq('procurement_no', form.procNo)
          .single()

        if (existing) {
          setMatchNotice({ type: 'exact', record: existing })
          setProg(0, 'done', 'Exact match found — same procurement number')
          return
        }
        setProg(0, 'done', 'No previous match found')

        // AI analysis
        setProg(1, 'active')
        const system = `You are a senior proposal strategist at SELISE Group AG. Analyse a Terms of Reference and match it against SELISE's knowledge base to select the best credentials and CVs for an EOI.

SELISE CONTEXT: ${SELISE_BOILERPLATE}

CREDENTIALS KNOWLEDGE BASE:
${kbRef.current.credText}

CVs KNOWLEDGE BASE:
${kbRef.current.cvsText}

Return ONLY valid JSON — no markdown, no explanation:
{
  "tor_analysis": {
    "project_type": "one sentence",
    "key_requirements": ["4-8 items"],
    "technical_domains": ["3-6 items"],
    "team_requirements": ["2-5 items"],
    "key_tor_terms": ["6-10 exact phrases from TOR"],
    "evaluation_criteria": ["scoring criteria"]
  },
  "eoi_structure": {
    "include_section_1_1": true,
    "include_section_1_2": true,
    "include_section_2_1": true,
    "include_section_2_2": true,
    "include_section_3": true,
    "section_3_subsections": [{"number": "3.1", "title": "domain title using TOR language"}],
    "include_section_4": true,
    "section_1_1_angle": "how to frame SELISE for this TOR",
    "section_1_2_focus": "what experience matters most",
    "section_2_1_focus": "what technical capability to highlight",
    "section_4_focus": "what staff expertise is most needed"
  },
  "selected_credentials": [
    {
      "id": "cred_0",
      "title": "exact project title from KB",
      "client": "client name",
      "country": "country",
      "contract_value": "value if available",
      "why_relevant": "1-2 sentences specific to this TOR",
      "tor_requirements_matched": ["requirement 1"],
      "eoi_section": "1.2",
      "confidence": "high",
      "full_text": "complete verbatim project text from KB"
    }
  ],
  "selected_cvs": [
    {
      "id": "cv_0",
      "name": "full name",
      "title": "job title",
      "why_relevant": "1-2 sentences",
      "expertise_matched": ["domain"],
      "confidence": "high",
      "full_text": "complete verbatim bio from KB"
    }
  ]
}`

        const user = `Project: ${form.projectName}
Procurement No: ${form.procNo}
Client: ${form.client}

TOR:
${torText}`

        const result = await aiCall(model, system, user, 8192)
        setProg(1, 'done', `${result.selected_credentials?.length || 0} credentials matched`)
        setProg(2, 'done', `${result.selected_cvs?.length || 0} CVs matched`)
        setProg(3, 'done', 'EOI outline ready')

        setAnalysisResult(result)
        setSelCreds(new Set((result.selected_credentials || []).map(c => c.id)))
        setSelCvs(new Set((result.selected_cvs || []).map(c => c.id)))

        setTimeout(() => setStep(3), 600)
      } catch (err) {
        const msg = err.message
        setAiError(msg)
        setProgs(p => p.map(item => item.status === 'active' ? { ...item, status: 'error' } : item))
        retryFnRef.current = run
      }
    }

    await run()
  }

  async function generateEOI() {
    const creds = (analysisResult.selected_credentials || []).filter(c => selCreds.has(c.id))
    const cvs   = (analysisResult.selected_cvs || []).filter(c => selCvs.has(c.id))
    if (!creds.length || !cvs.length) { alert('Select at least one credential and one CV.'); return }

    setStep(4)
    setGenError(null)
    setGenProgs([
      { label: 'Generating section text', detail: 'Claude writes all sections mirroring TOR language...', status: 'idle' },
      { label: 'Building Word document', detail: 'Applying SELISE formatting — logo, fonts, cover, offices...', status: 'idle' },
      { label: 'Ready to download', detail: '', status: 'idle' },
    ])

    const run = async () => {
      try {
        setGenProg(0, 'active')
        const tor = analysisResult.tor_analysis || {}
        const outline = analysisResult.eoi_structure || {}

        const system = `You are a senior proposal writer at SELISE Group AG. Write complete EOI section text using only the selected credentials and CVs provided. Mirror the TOR's exact terminology throughout. Formal consulting language. No em dashes. Reference the client by name. No filler phrases.

SELISE CONTEXT: ${SELISE_BOILERPLATE}

TOR KEY TERMS TO MIRROR: ${(tor.key_tor_terms || []).join(', ')}

Return ONLY valid JSON — no markdown:
{
  "submission_letter": {
    "to": "recipient",
    "subject": "full subject line with project name and procurement number",
    "paragraphs": ["para 1 — formal intro with firm name and why directly relevant", "para 2 — 2-3 specific qualifications tied to TOR", "para 3 — team availability and readiness", "para 4 — invite follow-up"]
  },
  "section_1_1": {
    "intro": "2-3 sentences framing SELISE for this TOR",
    "capabilities": [{"title": "capability title in TOR language", "text": "2-3 sentences"}]
  },
  "section_1_2_intro": "1-2 sentences",
  "section_2_1_intro": "1-2 sentences",
  "section_2_2": {
    "intro": "1-2 sentences",
    "subsections": [{"title": "title", "text": "paragraph"}]
  },
  "section_3": {
    "intro": "1-2 sentences",
    "subsections": [{"number": "3.1", "title": "title", "paragraphs": ["para 1", "para 2"]}]
  },
  "section_4_intro": "1-2 sentences"
}`

        const credBlock = creds.map((c, i) => `[CREDENTIAL ${i+1}]\nTitle: ${c.title}\nClient: ${c.client} | Country: ${c.country} | Value: ${c.contract_value}\nRelevance: ${c.why_relevant}\nFull text:\n${c.full_text}`).join('\n\n---\n\n')
        const cvBlock   = cvs.map((c, i) => `[CV ${i+1}]\nName: ${c.name} | Title: ${c.title}\nWhy selected: ${c.why_relevant}\nFull bio:\n${c.full_text}`).join('\n\n---\n\n')

        const user = `Project: ${form.projectName} | Procurement: ${form.procNo} | Client: ${form.client} | Entity: ${form.entity}
TOR type: ${tor.project_type || ''}
TOR key terms: ${(tor.key_tor_terms || []).join(', ')}
Section 3 structure: ${(outline.section_3_subsections || []).map(s => s.number + ' ' + s.title).join('; ')}

SELECTED CREDENTIALS:
${credBlock}

SELECTED CVs:
${cvBlock}`

        const genData = await aiCall(model, system, user, 8192)
        setGeneratedData(genData)
        setEditedData({})
        setGenProg(0, 'done', 'All sections written')

        setGenProg(1, 'active')
        const date = form.date
          ? new Date(form.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

        const blob = await buildDocx(
          { projectName: form.projectName, procNo: form.procNo, client: form.client, entity: form.entity, date },
          genData, creds, cvs, analysisResult
        )
        setDocBlob(blob)
        setGenProg(1, 'done')
        setGenProg(2, 'done')

        // Save record to Supabase
        const { data: { user: authUser } } = await supabase.auth.getUser()
        await supabase.from('eoi_records').insert({
          created_by: authUser.id,
          project_name: form.projectName,
          client: form.client,
          procurement_no: form.procNo,
          submission_date: form.date || null,
          entity: form.entity,
          model_used: model,
          tor_analysis: analysisResult.tor_analysis,
          eoi_structure: analysisResult.eoi_structure,
          selected_credentials: { items: creds },
          selected_cvs: { items: cvs },
          generated_text: genData,
        })

      } catch (err) {
        setGenError(err.message)
        setGenProgs(p => p.map(item => item.status === 'active' ? { ...item, status: 'error' } : item))
        retryFnRef.current = run
      }
    }

    await run()
  }

  function downloadDoc() {
    if (!docBlob) return
    const client = form.client.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')
    const project = form.projectName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
    const filename = `EOI_${client}_${project}_${date}.docx`
    const url = URL.createObjectURL(docBlob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function startOver() {
    setStep(1); setTorText(''); setTorFileName(''); setTorWarning(false)
    setAnalysisResult(null); setGeneratedData(null); setEditedData({})
    setDocBlob(null); setMatchNotice(null); setAiError(null); setGenError(null)
    setForm({ projectName: '', procNo: '', client: '', date: '', entity: ENTITIES[0] })
  }

  // ── RENDER ───────────────────────────────────────
  return (
    <Layout model={model} setModel={setModel} kbStatus={kbStatus}>
      <StepBar step={step} />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* ── STEP 1: SETUP ── */}
        {step === 1 && (
          <>
            <Card title="Project Details">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Project Name', key: 'projectName', placeholder: 'e.g. Digital Platform Development', span: 3 },
                  { label: 'Procurement No.', key: 'procNo', placeholder: 'e.g. 0002022611' },
                  { label: 'Client / Organisation', key: 'client', placeholder: 'e.g. World Bank', span: 2 },
                  { label: 'Submission Date', key: 'date', type: 'date' },
                ].map(f => (
                  <div key={f.key} className={f.span === 3 ? 'sm:col-span-3' : f.span === 2 ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#741B47]"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Submitting Entity</label>
                  <select
                    value={form.entity}
                    onChange={e => setForm(p => ({ ...p, entity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#741B47]"
                  >
                    {ENTITIES.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>
            </Card>

            <Card title="Terms of Reference">
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-2">Upload TOR file <span className="font-normal text-gray-400">(.docx or .pdf)</span></label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">
                    ↑ Upload file
                    <input type="file" accept=".docx,.pdf" onChange={handleTorFile} className="hidden" />
                  </label>
                  {torFileName && <span className="text-sm text-gray-500">{torFileName}</span>}
                </div>
                {torWarning && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                    ⚠ Review the extracted text below — PDF extraction can produce errors. Edit anything that looks wrong before analysing.
                  </div>
                )}
              </div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Or paste TOR text</label>
              <textarea
                value={torText}
                onChange={e => setTorText(e.target.value)}
                rows={16}
                placeholder="Paste the complete Terms of Reference here, or upload a file above."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#741B47] resize-y font-mono leading-relaxed"
              />
              <p className="text-xs text-gray-400 mt-1">{torText.length} characters</p>
            </Card>

            <div className="flex justify-end">
              <button
                onClick={startAnalysis}
                className="px-6 py-2.5 bg-[#741B47] text-white rounded-lg text-sm font-semibold hover:bg-[#5a1436] transition-colors"
              >
                Analyse TOR →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: ANALYSE ── */}
        {step === 2 && (
          <Card title="Analysing TOR">
            <div className="space-y-2">
              {progs.map((p, i) => <ProgItem key={i} {...p} />)}
            </div>

            {matchNotice?.type === 'exact' && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-1">Exact match found</p>
                <p className="text-sm text-blue-700 mb-3">
                  This procurement number matches <strong>{matchNotice.record.project_name}</strong> for <strong>{matchNotice.record.client}</strong>.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const r = matchNotice.record
                      const savedResult = {
                        tor_analysis: r.tor_analysis,
                        eoi_structure: r.eoi_structure,
                        selected_credentials: r.selected_credentials?.items || [],
                        selected_cvs: r.selected_cvs?.items || [],
                      }
                      setAnalysisResult(savedResult)
                      setSelCreds(new Set((savedResult.selected_credentials || []).map(c => c.id)))
                      setSelCvs(new Set((savedResult.selected_cvs || []).map(c => c.id)))
                      setStep(3)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                  >
                    Use saved record →
                  </button>
                  <button onClick={startAnalysis} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    Run fresh analysis
                  </button>
                </div>
              </div>
            )}

            {aiError && (
              <ErrorBox
                message={aiError}
                onRetry={() => { setAiError(null); retryFnRef.current?.() }}
                onSwitchModel={() => {}}
              />
            )}
          </Card>
        )}

        {/* ── STEP 3: REVIEW ── */}
        {step === 3 && analysisResult && (
          <>
            {/* TOR Summary */}
            <Card title="TOR Analysis">
              {analysisResult.tor_analysis?.project_type && (
                <p className="text-sm text-gray-600 mb-3">{analysisResult.tor_analysis.project_type}</p>
              )}
              <div className="space-y-3">
                {analysisResult.tor_analysis?.key_requirements?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Key Requirements</p>
                    <div className="flex flex-wrap gap-1">{analysisResult.tor_analysis.key_requirements.map((r, i) => <Tag key={i} color="purple">{r}</Tag>)}</div>
                  </div>
                )}
                {analysisResult.tor_analysis?.technical_domains?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Technical Domains</p>
                    <div className="flex flex-wrap gap-1">{analysisResult.tor_analysis.technical_domains.map((d, i) => <Tag key={i} color="blue">{d}</Tag>)}</div>
                  </div>
                )}
                {analysisResult.tor_analysis?.key_tor_terms?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">TOR Key Terms — mirrored in EOI</p>
                    <div className="flex flex-wrap gap-1">{analysisResult.tor_analysis.key_tor_terms.map((t, i) => <Tag key={i} color="gray">{t}</Tag>)}</div>
                  </div>
                )}
              </div>
            </Card>

            {/* Credentials + CVs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title={`Credentials — ${selCreds.size} / ${analysisResult.selected_credentials?.length || 0} selected`}>
                <div className="space-y-3">
                  {(analysisResult.selected_credentials || []).map(c => (
                    <ItemCard key={c.id} item={c} type="cred"
                      selected={selCreds.has(c.id)}
                      onToggle={() => setSelCreds(s => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                    />
                  ))}
                </div>
              </Card>
              <Card title={`CVs — ${selCvs.size} / ${analysisResult.selected_cvs?.length || 0} selected`}>
                <div className="space-y-3">
                  {(analysisResult.selected_cvs || []).map(c => (
                    <ItemCard key={c.id} item={c} type="cv"
                      selected={selCvs.has(c.id)}
                      onToggle={() => setSelCvs(s => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                    />
                  ))}
                </div>
              </Card>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                ← Back
              </button>
              <button
                onClick={generateEOI}
                disabled={!selCreds.size || !selCvs.size}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300 transition-colors"
              >
                Generate EOI Document →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 4: GENERATE & EDIT ── */}
        {step === 4 && (
          <>
            <Card title="Generating Document">
              <div className="space-y-2 mb-4">
                {genProgs.map((p, i) => <ProgItem key={i} {...p} />)}
              </div>
              {genError && (
                <ErrorBox
                  message={genError}
                  onRetry={() => { setGenError(null); retryFnRef.current?.() }}
                  onSwitchModel={() => {}}
                />
              )}
            </Card>

            {generatedData && (
              <>
                <p className="text-sm text-gray-500 px-1">Review and edit any section below before downloading. Click <strong>Reset</strong> to restore the AI-generated original.</p>

                {/* Submission Letter */}
                <Card title="EOI Submission Letter">
                  <EditSection
                    label="Subject line"
                    value={editedData.subject ?? generatedData.submission_letter?.subject ?? ''}
                    original={generatedData.submission_letter?.subject ?? ''}
                    onChange={v => setEditedData(p => ({ ...p, subject: v }))}
                    onReset={() => setEditedData(p => { const n = { ...p }; delete n.subject; return n })}
                    rows={2}
                  />
                  {(generatedData.submission_letter?.paragraphs || []).map((para, i) => (
                    <EditSection
                      key={i}
                      label={`Paragraph ${i + 1}`}
                      value={editedData[`letter_p${i}`] ?? para}
                      original={para}
                      onChange={v => setEditedData(p => ({ ...p, [`letter_p${i}`]: v }))}
                      onReset={() => setEditedData(p => { const n = { ...p }; delete n[`letter_p${i}`]; return n })}
                    />
                  ))}
                </Card>

                {/* Section 1.1 */}
                {analysisResult?.eoi_structure?.include_section_1_1 !== false && (
                  <Card title="Section 1.1 — Corporate Capacity">
                    <EditSection
                      label="Introduction"
                      value={editedData.s11_intro ?? generatedData.section_1_1?.intro ?? ''}
                      original={generatedData.section_1_1?.intro ?? ''}
                      onChange={v => setEditedData(p => ({ ...p, s11_intro: v }))}
                      onReset={() => setEditedData(p => { const n = { ...p }; delete n.s11_intro; return n })}
                    />
                    {(generatedData.section_1_1?.capabilities || []).map((cap, i) => (
                      <EditSection
                        key={i}
                        label={cap.title}
                        value={editedData[`cap_${i}`] ?? cap.text ?? ''}
                        original={cap.text ?? ''}
                        onChange={v => setEditedData(p => ({ ...p, [`cap_${i}`]: v }))}
                        onReset={() => setEditedData(p => { const n = { ...p }; delete n[`cap_${i}`]; return n })}
                      />
                    ))}
                  </Card>
                )}

                {/* Section 3 */}
                {analysisResult?.eoi_structure?.include_section_3 !== false && generatedData.section_3 && (
                  <Card title="Section 3 — Domain Experience">
                    {(generatedData.section_3.subsections || []).map((sub, si) => (
                      <div key={si} className="mb-4">
                        <p className="text-xs font-bold text-gray-500 mb-2">{sub.number} {sub.title}</p>
                        {(sub.paragraphs || []).map((para, pi) => (
                          <EditSection
                            key={pi}
                            label={`Paragraph ${pi + 1}`}
                            value={editedData[`s3_${si}_${pi}`] ?? para}
                            original={para}
                            onChange={v => setEditedData(p => ({ ...p, [`s3_${si}_${pi}`]: v }))}
                            onReset={() => setEditedData(p => { const n = { ...p }; delete n[`s3_${si}_${pi}`]; return n })}
                          />
                        ))}
                      </div>
                    ))}
                  </Card>
                )}

                <div className="flex justify-between">
                  <button onClick={() => setStep(3)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    ← Back to Review
                  </button>
                  <button
                    onClick={downloadDoc}
                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    ↓ Download .docx
                  </button>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </Layout>
  )
}

function EditSection({ label, value, original, onChange, onReset, rows = 4 }) {
  const isDirty = value !== original
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        {isDirty && (
          <button onClick={onReset} className="text-xs text-[#741B47] underline">Reset</button>
        )}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-lg text-sm resize-y focus:outline-none leading-relaxed ${
          isDirty ? 'border-amber-400 bg-amber-50 focus:border-amber-500' : 'border-gray-200 focus:border-[#741B47]'
        }`}
      />
    </div>
  )
}
