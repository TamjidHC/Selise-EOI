import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  Header, Footer, AlignmentType, BorderStyle,
  SectionType, PageNumber, LineRuleType, NumberFormat,
} from 'docx'
import { SELISE_OFFICES } from './constants'

const C_MAROON = '741B47'
const C_GRAY2  = '434343'
const C_BODY   = '666666'
const C_LIGHT  = '888888'
const F_BODY   = 'Open Sans'
const F_HEAD   = 'Exo'

async function svgToPngBuffer(url) {
  const resp = await fetch(url)
  const svgText = await resp.text()
  const blob = new Blob([svgText], { type: 'image/svg+xml' })
  const blobUrl = URL.createObjectURL(blob)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const w = img.naturalWidth || 620
      const h = img.naturalHeight || 82
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(async (b) => {
        const buf = await b.arrayBuffer()
        URL.revokeObjectURL(blobUrl)
        resolve(buf)
      }, 'image/png')
    }
    img.src = blobUrl
  })
}

const gap = (n = 120) => new Paragraph({ children: [new TextRun('')], spacing: { after: n } })

const bRun = (text, opts = {}) => new TextRun({
  text, font: F_BODY, size: 20, color: C_BODY,
  bold: opts.bold || false, italics: opts.italic || false,
})

const bPara = (text, opts = {}) => new Paragraph({
  children: [bRun(text, opts)],
  spacing: { after: 120, line: 276, lineRule: LineRuleType.AUTO },
  alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
})

const mPara = (runs) => new Paragraph({
  children: runs,
  spacing: { after: 100, line: 276, lineRule: LineRuleType.AUTO },
})

const h1 = (text, pb = false) => new Paragraph({
  children: [new TextRun({ text, font: F_HEAD, size: 28, color: C_MAROON })],
  spacing: { before: pb ? 0 : 400, after: 160, line: 288, lineRule: LineRuleType.AUTO },
  pageBreakBefore: pb,
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8C8C8', space: 1 } },
})

const h2 = (text) => new Paragraph({
  children: [new TextRun({ text, font: F_HEAD, size: 24, color: C_GRAY2, bold: true })],
  spacing: { before: 280, after: 100, line: 288, lineRule: LineRuleType.AUTO },
})

const h3 = (text) => new Paragraph({
  children: [new TextRun({ text, font: F_BODY, size: 20, color: C_GRAY2, bold: true })],
  spacing: { before: 200, after: 80, line: 276, lineRule: LineRuleType.AUTO },
})

const kv = (label, value) => mPara([
  new TextRun({ text: `${label}  `, font: F_BODY, size: 20, color: C_BODY, bold: true }),
  new TextRun({ text: value || '', font: F_BODY, size: 20, color: C_BODY }),
])

const tocLine = (text, indent, bold) => new Paragraph({
  children: [new TextRun({ text, font: F_BODY, size: bold ? 21 : 19, color: C_BODY, bold: bold || false })],
  spacing: { after: indent ? 50 : 80, before: indent ? 0 : 60 },
  indent: indent ? { left: indent } : undefined,
})

function credBlock(cred, idx) {
  const nodes = [gap(80), h3(`Project Profile ${idx + 1}: ${cred.title || ''}`)]
  if (cred.client) nodes.push(kv('Client & Country:', `${cred.client}${cred.country ? ', ' + cred.country : ''}`))
  if (cred.contract_value) nodes.push(kv('Contract Value:', cred.contract_value))
  if (cred.why_relevant) nodes.push(kv('Relevance to Scope:', cred.why_relevant))
  const lines = (cred.full_text || '').split('\n').filter(l => l.trim())
  lines.forEach(line => {
    const l = line.trim()
    if (!l) return
    if (l.startsWith('-') || l.startsWith('•')) {
      nodes.push(new Paragraph({
        children: [new TextRun({ text: l.replace(/^[-•]\s*/, ''), font: F_BODY, size: 20, color: C_BODY })],
        bullet: { level: 0 },
        spacing: { after: 60, line: 276, lineRule: LineRuleType.AUTO },
      }))
    } else {
      nodes.push(bPara(l))
    }
  })
  nodes.push(gap(100))
  return nodes
}

function cvBlock(cv) {
  const nodes = [h3(`${cv.name}${cv.title ? ', ' + cv.title : ''}`)]
  const lines = (cv.full_text || '').split('\n').filter(l => l.trim())
  lines.forEach(line => nodes.push(bPara(line.trim())))
  nodes.push(gap(120))
  return nodes
}

export async function buildDocx(meta, genData, selCreds, selCvs, analysis) {
  const logoUrl = import.meta.env.VITE_SELISE_LOGO_URL
  const logoBuf = await svgToPngBuffer(logoUrl)
  const outline = analysis?.eoi_structure || {}
  const date = meta.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // ── Cover page ──────────────────────────────────
  const cover = [
    gap(2400),
    new Paragraph({ children: [new TextRun({ text: 'Expression of Interest', font: 'Exo Light', size: 40, color: C_LIGHT })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: meta.projectName, font: F_HEAD, size: 52, color: C_MAROON, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
    new Paragraph({ children: [new TextRun({ text: `Procurement No: ${meta.procNo}`, font: F_HEAD, size: 28, color: '000000' })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: `for ${meta.client}`, font: F_HEAD, size: 36, color: '111111' })], alignment: AlignmentType.CENTER, spacing: { after: 3200 } }),
    new Paragraph({ children: [new TextRun({ text: meta.entity, font: F_HEAD, size: 18, color: C_BODY, bold: true })], alignment: AlignmentType.LEFT, spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: 'The Circle 37, 8058 Zurich-Flughafen, Switzerland', font: F_HEAD, size: 16, color: C_BODY })], alignment: AlignmentType.LEFT, spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: '+41 (0) 448058044  |  www.selisegroup.com', font: F_HEAD, size: 16, color: C_BODY })], alignment: AlignmentType.LEFT }),
  ]

  // ── Header / Footer ──────────────────────────────
  const hdr = new Header({
    children: [new Paragraph({
      children: [new ImageRun({ data: logoBuf, transformation: { width: 580, height: 76 }, type: 'png' })],
      spacing: { after: 60 },
    })],
  })
  const ftr = new Footer({
    children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 1 } },
      spacing: { before: 60 },
      children: [
        new TextRun({ children: [PageNumber.CURRENT], font: F_BODY, size: 18, color: C_BODY }),
        new TextRun({ text: '  |  ', font: F_BODY, size: 18, color: C_BODY }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F_BODY, size: 18, color: C_BODY }),
        new TextRun({ text: `   © ${meta.entity}, ${new Date().getFullYear()}   This document is confidential and protected from disclosure.`, font: F_BODY, size: 16, color: C_BODY }),
      ],
    })],
  })
  const emptyHdr = new Header({ children: [new Paragraph({ children: [] })] })
  const emptyFtr = new Footer({ children: [new Paragraph({ children: [] })] })

  // ── TOC ──────────────────────────────────────────
  const toc = [
    h1('Table of Contents'),
    tocLine('EOI Submission Letter', 0, true),
    tocLine('1.0  Firm Qualifications and Corporate Profile', 0, true),
    outline.include_section_1_1 !== false && tocLine('1.1  Overview of SELISE\'s Corporate Capacity', 360, false),
    outline.include_section_1_2 !== false && tocLine('1.2  Relevant Experience', 360, false),
    tocLine('2.0  Technical and Managerial Capabilities', 0, true),
    outline.include_section_2_1 !== false && tocLine('2.1  Technical Capabilities', 360, false),
    outline.include_section_2_2 !== false && tocLine('2.2  Managerial Capabilities', 360, false),
    outline.include_section_3 !== false && tocLine('3.0  Demonstrated Domain Experience', 0, true),
    ...(outline.section_3_subsections || []).map(s => tocLine(`${s.number}  ${s.title}`, 360, false)),
    outline.include_section_4 !== false && tocLine('4.0  Qualifications of Key In-House Staff', 0, true),
  ].filter(Boolean)

  // ── Letter ───────────────────────────────────────
  const letter = genData.submission_letter || {}
  const editedLetter = genData._edited?.submission_letter || {}
  const letterParas = (editedLetter.paragraphs || letter.paragraphs || [])
  const letterNodes = [
    h1('EOI Submission Letter', true), gap(80),
    kv('Date:', date),
    kv('To:', editedLetter.to || letter.to || meta.client),
    gap(80),
    kv('Subject:', editedLetter.subject || letter.subject || `Expression of Interest — ${meta.projectName} (Procurement No. ${meta.procNo})`),
    gap(80), bPara('Dear Sir or Madam,'), gap(40),
    ...letterParas.map(p => bPara(p)),
    gap(40), bPara('Sincerely,', { bold: true }), gap(240),
    bPara('Julian A. Weber', { bold: true }),
    bPara(`Chief Executive Officer, ${meta.entity}`),
    bPara('The Circle 37, 8058 Zurich-Flughafen, Zurich, Switzerland'),
    bPara('julian.weber@selisegroup.com'),
  ]

  // ── Section 1 ────────────────────────────────────
  const s11 = genData._edited?.section_1_1 || genData.section_1_1 || {}
  const s11Nodes = [h1('1.0  Firm Qualifications and Corporate Profile', true)]
  if (outline.include_section_1_1 !== false) {
    s11Nodes.push(h2('1.1  Overview of SELISE\'s Corporate Capacity and General Expertise'))
    if (s11.intro) s11Nodes.push(bPara(s11.intro))
    ;(s11.capabilities || []).forEach(c => {
      s11Nodes.push(mPara([
        new TextRun({ text: `${c.title}: `, font: F_BODY, size: 20, color: C_BODY, bold: true }),
        new TextRun({ text: c.text || '', font: F_BODY, size: 20, color: C_BODY }),
      ]))
      s11Nodes.push(gap(80))
    })
  }
  if (outline.include_section_1_2 !== false) {
    s11Nodes.push(h2('1.2  Relevant Experience'))
    const intro12 = genData._edited?.section_1_2_intro || genData.section_1_2_intro
    if (intro12) s11Nodes.push(bPara(intro12))
    const creds12 = selCreds.filter(c => !c.eoi_section || c.eoi_section.startsWith('1'))
    const use12 = creds12.length ? creds12 : selCreds.slice(0, Math.ceil(selCreds.length / 2))
    use12.forEach((c, i) => s11Nodes.push(...credBlock(c, i)))
  }

  // ── Section 2 ────────────────────────────────────
  const s22 = genData._edited?.section_2_2 || genData.section_2_2 || {}
  const s2Nodes = [h1('2.0  Technical and Managerial Capabilities', true)]
  if (outline.include_section_2_1 !== false) {
    s2Nodes.push(h2('2.1  Technical Capabilities'))
    const intro21 = genData._edited?.section_2_1_intro || genData.section_2_1_intro
    if (intro21) s2Nodes.push(bPara(intro21))
    const creds21 = selCreds.filter(c => c.eoi_section && c.eoi_section.startsWith('2'))
    const use21 = creds21.length ? creds21 : selCreds.slice(Math.ceil(selCreds.length / 2))
    use21.forEach((c, i) => s2Nodes.push(...credBlock(c, i)))
  }
  if (outline.include_section_2_2 !== false) {
    s2Nodes.push(h2('2.2  Managerial Capabilities'))
    if (s22.intro) s2Nodes.push(bPara(s22.intro))
    ;(s22.subsections || []).forEach(sub => {
      s2Nodes.push(h3(sub.title))
      s2Nodes.push(bPara(sub.text || ''))
    })
  }

  // ── Section 3 ────────────────────────────────────
  const s3 = genData._edited?.section_3 || genData.section_3 || {}
  const s3Nodes = []
  if (outline.include_section_3 !== false) {
    s3Nodes.push(h1('3.0  Demonstrated Experience in Relevant Technical Domains', true))
    if (s3.intro) s3Nodes.push(bPara(s3.intro))
    ;(s3.subsections || []).forEach(sub => {
      s3Nodes.push(h2(`${sub.number}  ${sub.title}`))
      ;(sub.paragraphs || []).forEach(p => s3Nodes.push(bPara(p)))
    })
  }

  // ── Section 4 ────────────────────────────────────
  const s4Nodes = []
  if (outline.include_section_4 !== false) {
    s4Nodes.push(h1('4.0  Qualifications of Key In-House Staff', true))
    const intro4 = genData._edited?.section_4_intro || genData.section_4_intro
    if (intro4) s4Nodes.push(bPara(intro4))
    selCvs.forEach(cv => s4Nodes.push(...cvBlock(cv)))
  }

  // ── Back page ─────────────────────────────────────
  const back = [gap(600)]
  SELISE_OFFICES.forEach(o => {
    back.push(new Paragraph({ children: [new TextRun({ text: o.city, font: F_HEAD, size: 22, color: C_MAROON, bold: true })], spacing: { before: 200, after: 40 } }))
    back.push(new Paragraph({ children: [new TextRun({ text: o.entity, font: F_BODY, size: 18, color: '333333', bold: true })], spacing: { after: 30 } }))
    back.push(new Paragraph({ children: [new TextRun({ text: o.address, font: F_BODY, size: 18, color: C_BODY })], spacing: { after: 20 } }))
    back.push(new Paragraph({ children: [new TextRun({ text: o.country, font: F_BODY, size: 18, color: C_BODY })], spacing: { after: 20 } }))
    back.push(new Paragraph({ children: [new TextRun({ text: o.phone, font: F_BODY, size: 18, color: C_BODY })], spacing: { after: 80 } }))
  })

  const mainContent = [...toc, ...letterNodes, ...s11Nodes, ...s2Nodes, ...s3Nodes, ...s4Nodes]
  const pageProps = { size: { width: 11906, height: 16838 } }

  const doc = new Document({
    sections: [
      { properties: { type: SectionType.NEXT_PAGE, page: { ...pageProps, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } }, headers: { default: emptyHdr }, footers: { default: emptyFtr }, children: cover },
      { properties: { type: SectionType.NEXT_PAGE, page: { ...pageProps, margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } } }, headers: { default: hdr }, footers: { default: ftr }, children: mainContent },
      { properties: { type: SectionType.NEXT_PAGE, page: { ...pageProps, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } }, headers: { default: emptyHdr }, footers: { default: emptyFtr }, children: back },
    ],
  })

  return Packer.toBlob(doc)
}
