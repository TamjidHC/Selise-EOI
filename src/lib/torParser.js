import mammoth from 'mammoth'

export async function parseDocx(file) {
  const buf = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return result.value
}

export async function parsePdf(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map(s => s.str).join(' '))
  }
  return pages.join('\n\n')
}

export async function fetchAndParseDocx(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Could not load file: ${resp.status}`)
  const buf = await resp.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return result.value
}
