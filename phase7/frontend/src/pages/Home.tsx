import { useEffect, useState, type FormEvent } from 'react'
import {
  Activity,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  CircleAlert,
  Download,
  LoaderCircle,
  Search,
  Wifi,
  WifiOff,
} from 'lucide-react'
import '../App.css'

type Finding = { claim: string; source: string }
type ResearchResult = {
  status: 'idle' | 'running' | 'done' | 'failed'
  steps_used: number
  max_steps?: number
  tokens_used?: number
  token_budget?: number
  estimated_cost_usd?: number
  findings: Finding[]
  logs: string[]
  report: string
  error?: string
}


const API_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5001'
const suggestions = [
  'How is AI changing education?',
  'The future of renewable energy',
  'Benefits and risks of GLP-1 medications',
]

export default function Home() {
  const [topic, setTopic] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [service, setService] = useState<'checking' | 'online' | 'offline'>('checking')
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_URL}/api/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Backend unavailable')
        setService('online')
      })
      .catch(() => {
        if (!controller.signal.aborted) setService('offline')
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!jobId) return
    let active = true
    let timer = 0

    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}/api/status/${jobId}`)
        if (!response.ok) throw new Error('Could not retrieve research progress')
        const data = (await response.json()) as ResearchResult
        if (!active) return
        setResult(data)
        setService('online')
        if (data.status === 'done') {
          setBusy(false)
          return
        }
      } catch {
        if (!active) return
        setError('Research progress could not be reached. Check that the backend is running, then try again.')
        setService('offline')
        setBusy(false)
        return
      }
      timer = window.setTimeout(() => void poll(), 1800)
    }

    void poll()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [jobId])

  async function startResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTopic = topic.trim()
    if (!cleanTopic || busy) return

    setError('')
    setResult(null)
    setJobId(null)
    setBusy(true)
    try {
      const response = await fetch(`${API_URL}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: cleanTopic }),
      })
      const data = (await response.json()) as { job_id?: string; error?: string }
      if (!response.ok || !data.job_id) throw new Error(data.error ?? 'Could not start research')
      setJobId(data.job_id)
      setService('online')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not connect to the backend.')
      setService('offline')
      setBusy(false)
    }
  }

  function downloadReport() {
    if (!result?.report) return
    const file = new Blob([result.report], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'research-report.md'
    link.click()
    URL.revokeObjectURL(url)
  }

  const serviceLabel = service === 'checking' ? 'Connecting' : service === 'online' ? 'API online' : 'API offline'

  return (
    <div className="research-app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Fieldwork home">
          <span className="brand-mark"><BookOpenCheck size={19} strokeWidth={1.8} /></span>
          <span>FIELDWORK<span className="brand-divider">/</span>RESEARCH</span>
        </a>
        <div className={`service-status service-${service}`} aria-live="polite">
          {service === 'online' ? <Wifi size={15} /> : service === 'offline' ? <WifiOff size={15} /> : <Activity size={15} />}
          <span>{serviceLabel}</span>
        </div>
      </header>

      <main className="workspace">
        <section className="intro">
          <p className="eyebrow"><span className="eyebrow-line" /> RESEARCH DESK <span>01 / 01</span></p>
          <h1>Curiosity, <em>with</em><br />receipts.</h1>
          <p className="intro-copy">Explore a question. Get a concise report grounded in sources you can follow.</p>
        </section>

        <form className="research-form" onSubmit={startResearch}>
          <label htmlFor="research-topic">What are you looking into?</label>
          <div className="input-wrap">
            <Search className="input-icon" size={19} />
            <input
              id="research-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ask a question or enter a topic..."
              maxLength={240}
              disabled={busy}
            />
            <button className="submit-button" type="submit" disabled={busy || !topic.trim()}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <>Research <ArrowUpRight size={17} /></>}
            </button>
          </div>
          <div className="suggestions" aria-label="Suggested topics">
            <span>TRY</span>
            {suggestions.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => setTopic(suggestion)} disabled={busy}>
                {suggestion}
              </button>
            ))}
          </div>
        </form>

        {error && <div className="error-banner" role="alert"><CircleAlert size={17} /> {error}</div>}

        <section className="results-grid" aria-label="Research results">
          <div className="activity-panel">
            <div className="section-heading">
              <div><span className="section-index">A</span><h2>Field notes</h2></div>
              {busy && <span className="working-label"><span className="pulse-dot" /> WORKING</span>}
            </div>
            {result ? (
              <>
                <div className="progress-meta">
                  <span>{result.status === 'done' ? 'Research complete' : result.status === 'failed' ? 'Research failed' : 'Gathering sources'}</span>
                  <span>
                    {result.steps_used} / {result.max_steps ?? 8} steps
                    {result.tokens_used !== undefined ? ` • ${result.tokens_used.toLocaleString()} tokens` : ''}
                    {result.estimated_cost_usd !== undefined ? ` ($${result.estimated_cost_usd.toFixed(4)})` : ''}
                  </span>
                </div>
                <div className="progress-track"><span className={result.status === 'done' ? 'progress-done' : ''} style={{ width: `${Math.min((result.steps_used / (result.max_steps ?? 8)) * 100, 100)}%` }} /></div>

                {result.findings.length > 0 ? (
                  <ol className="finding-list">
                    {result.findings.map((finding, index) => (
                      <li className="finding" key={`${finding.source}-${index}`}>
                        <span className="finding-number">{String(index + 1).padStart(2, '0')}</span>
                        <div><p>{finding.claim}</p><a href={finding.source} target="_blank" rel="noreferrer">{new URL(finding.source).hostname}<ArrowUpRight size={13} /></a></div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="empty-notes">{busy ? 'Searching the web and reading source material...' : 'No source notes were found for this run.'}</div>
                )}
                <details className="activity-log">
                  <summary>Activity log <span>{result.logs.length} events</span></summary>
                  <ul>{result.logs.map((log, index) => <li key={`${index}-${log}`}>{log}</li>)}</ul>
                </details>
              </>
            ) : (
              <div className="empty-notes empty-initial">Your source notes will appear here as the research runs.</div>
            )}
          </div>

          <aside className="report-panel">
            <div className="section-heading">
              <div><span className="section-index">B</span><h2>Final report</h2></div>
              {result?.report && <button className="icon-button" type="button" onClick={downloadReport} aria-label="Download report" title="Download report"><Download size={17} /></button>}
            </div>
            {result?.report ? (
              <>
                <div className="report-ready"><Check size={14} /> READY TO REVIEW</div>
                <pre className="report-content">{result.report}</pre>
              </>
            ) : (
              <div className="report-empty">
                <span className="report-rule" />
                <p>{busy ? 'The report is taking shape.' : 'Your findings, synthesized into a clear report with references.'}</p>
                <span className="report-caption">SOURCED · STRUCTURED · SHAREABLE</span>
              </div>
            )}
          </aside>
        </section>
        <footer className="workspace-footer"><span>FIELDWORK RESEARCH AGENT</span><span>SEARCH · READ · SYNTHESIZE</span></footer>
      </main>
    </div>
  )
}
