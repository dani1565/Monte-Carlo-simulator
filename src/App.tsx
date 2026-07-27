import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DistributionChart, PathChart } from './components/Charts'
import { presets } from './presets'
import type { SimulationParams, SimulationResult } from './simulation/types'

const defaultParams: SimulationParams = {
  leverages: [1, 2, 3], years: 20, paths: 10_000, annualDrift: 0.09,
  annualVolatility: 0.18, degreesOfFreedom: 5, ruinThreshold: 0.1,
  cvarPercentile: 0.05, seed: 2026,
}

const leverageColors = ['#51e5b4', '#5da9ff', '#f5c15d', '#b989ff', '#ff7a81']

export default function App() {
  const [params, setParams] = useState(defaultParams)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [selectedLeverage, setSelectedLeverage] = useState(3)
  const workerRef = useRef<Worker | null>(null)

  const runSimulation = useCallback(() => {
    workerRef.current?.terminate()
    const worker = new Worker(new URL('./simulation/simulation.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    setRunning(true); setProgress(0); setError('')
    worker.onmessage = (event) => {
      if (event.data.type === 'progress') setProgress(event.data.progress)
      if (event.data.type === 'result') {
        setResult(event.data.result); setRunning(false); setProgress(1)
      }
    }
    worker.onerror = () => { setError('החישוב הופסק באופן בלתי צפוי. נסו שוב.'); setRunning(false) }
    worker.postMessage(params)
  }, [params])

  useEffect(() => {
    const timer = window.setTimeout(runSimulation, 450)
    return () => {
      window.clearTimeout(timer)
      workerRef.current?.terminate()
    }
  }, [runSimulation])

  useEffect(() => {
    if (!params.leverages.includes(selectedLeverage)) setSelectedLeverage(params.leverages[0])
  }, [params.leverages, selectedLeverage])

  const selectedResult = result?.results.find((item) => item.leverage === selectedLeverage) ?? result?.results[0]
  const computeLabel = params.paths <= 5_000 ? 'חישוב קל' : params.paths <= 20_000 ? 'חישוב בינוני' : 'חישוב כבד'
  const insight = useMemo(() => {
    if (!selectedResult) return ''
    const gap = selectedResult.median > 0 ? selectedResult.mean / selectedResult.median : Infinity
    if (selectedResult.ruinRate > .25) return `במינוף ${selectedResult.leverage}×, ${percent(selectedResult.ruinRate)} מהמסלולים נמחקו לצמיתות. הממוצע אינו מספר את הסיפור של המשקיע הטיפוסי.`
    if (gap > 2) return `הממוצע גבוה פי ${formatNumber(gap)} מהחציון — מעט תוצאות חריגות מושכות אותו כלפי מעלה.`
    return `בתרחיש הזה הפער בין הממוצע לחציון מתון יחסית, אך הזנב השלילי עדיין ראוי לתשומת לב.`
  }, [selectedResult])

  const update = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => setParams((current) => ({ ...current, [key]: value }))
  const toggleLeverage = (leverage: number) => {
    setParams((current) => {
      const included = current.leverages.includes(leverage)
      if (included && current.leverages.length === 1) return current
      return { ...current, leverages: included ? current.leverages.filter((item) => item !== leverage) : [...current.leverages, leverage].sort() }
    })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-group"><div className="brand-mark">מ</div><div><h1>מסלול</h1><p>מעבדת סיכון ממונף</p></div></div>
        <div className="status-pill"><span className={running ? 'pulse' : ''} />{running ? `מחשב · ${Math.round(progress * 100)}%` : 'המודל מוכן'}</div>
      </header>

      <section className="hero">
        <div><p className="eyebrow">סימולטור מונטה קרלו ממונף</p><h2>הממוצע מבטיח.<br /><em>המציאות מתפלגת.</em></h2></div>
        <p className="hero-copy">בדקו אלפי מסלולי שוק עם זנבות שמנים, מינוף יומי וחורבן בלתי הפיך. כי אף משקיע לא חי בתוך הממוצע.</p>
      </section>

      <section className="preset-strip" aria-label="תרחישים מוכנים">
        {presets.map((preset) => <button key={preset.name} onClick={() => setParams((current) => ({ ...current, ...preset.values }))}><strong>{preset.name}</strong><span>{preset.description}</span></button>)}
      </section>

      <div className="workspace">
        <aside className="controls">
          <div className="panel-heading"><div><p className="eyebrow">הנחות המודל</p><h3>פרמטרים</h3></div><button className="text-button" onClick={() => setParams(defaultParams)}>איפוס</button></div>
          <ControlGroup title="רמות מינוף" hint="בחרו רמה אחת או יותר להשוואה">
            <div className="leverage-grid">{[1, 2, 3, 4, 5].map((leverage) => <button className={params.leverages.includes(leverage) ? 'active' : ''} key={leverage} onClick={() => toggleLeverage(leverage)}>{leverage}×</button>)}</div>
          </ControlGroup>
          <Range label="טווח השקעה" value={`${params.years} שנים`} min={1} max={40} valueNumber={params.years} onChange={(value) => update('years', value)} />
          <Range label="מספר מסלולים" value={params.paths.toLocaleString('he-IL')} min={1000} max={50000} step={1000} valueNumber={params.paths} onChange={(value) => update('paths', value)} hint={computeLabel} />
          <Range label="תשואה שנתית צפויה" value={percent(params.annualDrift)} min={-5} max={20} valueNumber={params.annualDrift * 100} onChange={(value) => update('annualDrift', value / 100)} />
          <Range label="תנודתיות שנתית" value={percent(params.annualVolatility)} min={5} max={45} valueNumber={params.annualVolatility * 100} onChange={(value) => update('annualVolatility', value / 100)} />
          <Range label="עובי הזנבות" value={tailLabel(params.degreesOfFreedom)} min={3} max={30} valueNumber={params.degreesOfFreedom} onChange={(value) => update('degreesOfFreedom', value)} hint={`df = ${params.degreesOfFreedom}`} reverse />
          <Range label="סף חורבן" value={percent(params.ruinThreshold)} min={1} max={30} valueNumber={params.ruinThreshold * 100} onChange={(value) => update('ruinThreshold', value / 100)} />
          <Range label="זנב CVaR" value={`${params.cvarPercentile * 100}% הגרועים`} min={1} max={10} valueNumber={params.cvarPercentile * 100} onChange={(value) => update('cvarPercentile', value / 100)} />
          <div className="seed-row"><label htmlFor="seed">זרע אקראי</label><input id="seed" type="number" value={params.seed} onChange={(event) => update('seed', Number(event.target.value))} /><button title="צור מדגם חדש" onClick={() => update('seed', Math.floor(Math.random() * 1_000_000))}>↻</button></div>
          <button className="run-button" onClick={runSimulation} disabled={running}>{running ? 'מחשב תרחישים…' : 'הרץ סימולציה'}<span>←</span></button>
          {running && <div className="progress-track" role="progressbar" aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>}
          {error && <p className="error" role="alert">{error}</p>}
        </aside>

        <section className="dashboard" aria-live="polite">
          <div className="section-title"><div><p className="eyebrow">תמונת מצב</p><h3>מה קרה לכסף?</h3></div>{result && <span>{result.params.paths.toLocaleString('he-IL')} מסלולים · {result.params.years} שנים · {(result.durationMs / 1000).toFixed(1)} שנ׳</span>}</div>
          {result ? <>
            <div className="metric-grid">{result.results.map((item) => <MetricCard key={item.leverage} item={item} active={selectedLeverage === item.leverage} onClick={() => setSelectedLeverage(item.leverage)} />)}</div>
            <div className="insight"><span>!</span><div><strong>המספר שכדאי לראות</strong><p>{insight}</p></div></div>
            <div className="chart-panel">
              <ChartHeader title="מסלולי עושר לאורך זמן" subtitle="סקאלה לוגריתמית · הרצועה מציגה את 50% האמצעיים" results={result.results} selected={selectedLeverage} onSelect={setSelectedLeverage} />
              <PathChart results={result.results} selected={selectedLeverage} />
              <div className="chart-legend"><span><i className="solid" />חציון</span><span><i className="dashed" />ממוצע</span><span><i className="ruined" />מסלול שנחרב</span></div>
            </div>
            <div className="chart-panel">
              <ChartHeader title="התפלגות השווי הסופי" subtitle="כל עמודה מייצגת טווח תוצאות · ציר שווי לוגריתמי" results={result.results} selected={selectedLeverage} onSelect={setSelectedLeverage} />
              <DistributionChart results={result.results} selected={selectedLeverage} />
            </div>
            {selectedResult && <div className="tail-panel"><div><p className="eyebrow">התרחיש הרע</p><h3>אם נופלים לזנב, כמה כואב?</h3><p>ב־{params.cvarPercentile * 100}% התרחישים הגרועים, השווי הסופי הממוצע הוא <b>{formatMultiple(selectedResult.cvar)}</b>.</p></div><div className="tail-number">{formatMultiple(selectedResult.cvar)}<small>CVaR</small></div></div>}
          </> : <LoadingCards />}
        </section>
      </div>
      <footer><p>כלי מחקרי בלבד · אינו מהווה ייעוץ השקעות</p><p>התוצאות הן סימולציה סטטיסטית ואינן תחזית</p></footer>
    </main>
  )
}

function ControlGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <div className="control-group"><div className="control-label"><label>{title}</label>{hint && <small>{hint}</small>}</div>{children}</div>
}

function Range({ label, value, hint, valueNumber, min, max, step = 1, reverse, onChange }: { label: string; value: string; hint?: string; valueNumber: number; min: number; max: number; step?: number; reverse?: boolean; onChange: (value: number) => void }) {
  const fill = ((valueNumber - min) / (max - min)) * 100
  return <ControlGroup title={label} hint={hint}><div className="range-value">{value}</div><input className={reverse ? 'range reverse' : 'range'} aria-label={label} type="range" min={min} max={max} step={step} value={valueNumber} style={{ '--fill': `${fill}%` } as React.CSSProperties} onChange={(event) => onChange(Number(event.target.value))} /><div className="range-ends"><span>{min}</span><span>{max}</span></div></ControlGroup>
}

function MetricCard({ item, active, onClick }: { item: SimulationResult['results'][number]; active: boolean; onClick: () => void }) {
  const gap = item.median ? item.mean / item.median : Infinity
  return <button className={`metric-card ${active ? 'active' : ''}`} onClick={onClick} style={{ '--accent': leverageColors[item.leverage - 1] } as React.CSSProperties}>
    <div className="metric-top"><strong>{item.leverage}×</strong><span>מינוף יומי</span></div>
    <div className="metric-main"><small>שווי חציוני</small><b>{formatMultiple(item.median)}</b><span className={item.annualizedMedian >= 0 ? 'positive' : 'negative'}>{percent(item.annualizedMedian)} לשנה</span></div>
    <div className="metric-details"><span><small>ממוצע</small><b>{formatMultiple(item.mean)}</b></span><span><small>חורבן</small><b className={item.ruinRate > .1 ? 'negative' : ''}>{percent(item.ruinRate)}</b></span></div>
    <div className="gap-bar"><span style={{ width: `${Math.min(100, Number.isFinite(gap) ? gap * 16 : 100)}%` }} /></div><p>פער ממוצע–חציון {Number.isFinite(gap) ? `פי ${formatNumber(gap)}` : 'קיצוני'}</p>
  </button>
}

function ChartHeader({ title, subtitle, results, selected, onSelect }: { title: string; subtitle: string; results: SimulationResult['results']; selected: number; onSelect: (value: number) => void }) {
  return <div className="chart-header"><div><h3>{title}</h3><p>{subtitle}</p></div><div className="chart-tabs">{results.map((item) => <button key={item.leverage} className={selected === item.leverage ? 'active' : ''} onClick={() => onSelect(item.leverage)}>{item.leverage}×</button>)}</div></div>
}

function LoadingCards() { return <div className="loading-cards">{[1, 2, 3].map((item) => <div key={item} />)}</div> }
function percent(value: number) { return new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 1 }).format(value) }
function formatNumber(value: number) { return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(value) }
function formatMultiple(value: number) { if (!Number.isFinite(value)) return 'חריג'; if (value >= 1e6) return `${formatNumber(value / 1e6)}M×`; if (value >= 1000) return `${formatNumber(value / 1000)}K×`; return `${formatNumber(value)}×` }
function tailLabel(df: number) { if (df <= 5) return 'זנבות שמנים מאוד'; if (df <= 10) return 'זנבות שמנים'; if (df <= 20) return 'זנבות מתונים'; return 'זנבות דקים' }
