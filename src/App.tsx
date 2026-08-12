import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DistributionChart, PathChart } from './components/Charts'
import { leverageColor } from './components/chartMath'
import { ParameterField } from './components/ParameterField'
import { presets } from './presets'
import { DEFAULT_SIMULATION_PARAMS, PARAMETER_LIMITS } from './simulation/defaults'
import type { SimulationParams, SimulationResult } from './simulation/types'
import { validateSimulationParams } from './simulation/validation'
import { decodeParams, encodeParams, safeBrowserLoad, safeBrowserSave } from './state/parameterStorage'

export default function App() {
  const [params, setParams] = useState(loadInitialParams)
  const [drafts, setDrafts] = useState(() => paramsToDrafts(params))
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [shareFeedback, setShareFeedback] = useState('')
  const [selectedLeverage, setSelectedLeverage] = useState(3)
  const workerRef = useRef<Worker | null>(null)

  const validationErrors = useMemo(() => validateSimulationParams(params), [params])
  const hasValidationErrors = Object.keys(validationErrors).length > 0

  const runSimulation = useCallback(() => {
    if (hasValidationErrors) return
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
  }, [hasValidationErrors, params])

  useEffect(() => {
    if (hasValidationErrors) {
      workerRef.current?.terminate()
      setRunning(false)
      return
    }
    const timer = window.setTimeout(runSimulation, 450)
    return () => {
      window.clearTimeout(timer)
      workerRef.current?.terminate()
    }
  }, [hasValidationErrors, runSimulation])

  useEffect(() => {
    if (!hasValidationErrors) safeBrowserSave(window, params)
  }, [hasValidationErrors, params])

  useEffect(() => {
    if (params.leverages.length && !params.leverages.includes(selectedLeverage)) setSelectedLeverage(params.leverages[0])
  }, [params.leverages, selectedLeverage])

  const selectedResult = result?.results.find((item) => item.leverage === selectedLeverage) ?? result?.results[0]
  const computeLabel = params.paths <= 5_000 ? 'חישוב קל' : params.paths <= 20_000 ? 'חישוב בינוני' : 'חישוב כבד'
  const insight = useMemo(() => {
    if (!selectedResult) return ''
    const gap = selectedResult.median > 0 ? selectedResult.mean / selectedResult.median : Infinity
    if (selectedResult.wipeoutRate > .25) return `במינוף ${selectedResult.leverage}×, ${percent(selectedResult.wipeoutRate)} מהמסלולים הגיעו לאפס. הממוצע אינו מספר את הסיפור של המשקיע הטיפוסי.`
    if (gap > 2) return `הממוצע גבוה פי ${formatNumber(gap)} מהחציון — מעט תוצאות חריגות מושכות אותו כלפי מעלה.`
    return `בתרחיש הזה הפער בין הממוצע לחציון מתון יחסית, אך הזנב השלילי עדיין ראוי לתשומת לב.`
  }, [selectedResult])

  const updateNumber = (key: Exclude<keyof SimulationParams, 'leverages'>, raw: string, scale = 1) => {
    setDrafts((current) => ({ ...current, [key]: raw }))
    const value = raw.trim() === '' ? Number.NaN : Number(raw) / scale
    setParams((current) => ({ ...current, [key]: value }))
  }
  const updateLeverages = (raw: string) => {
    setDrafts((current) => ({ ...current, leverages: raw }))
    const values = raw.trim() === '' ? [] : raw.split(',').map((value) => Number(value.trim()))
    setParams((current) => ({ ...current, leverages: values }))
  }
  const replaceParams = (next: SimulationParams) => { setParams(next); setDrafts(paramsToDrafts(next)) }
  const shareScenario = async () => {
    if (hasValidationErrors) return
    const url = new URL(window.location.href)
    url.search = encodeParams(params)
    try {
      await navigator.clipboard.writeText(url.toString())
      setShareFeedback('הקישור הועתק')
    } catch {
      setShareFeedback('לא ניתן להעתיק אוטומטית; העתיקו את הכתובת משורת הדפדפן')
      window.history.replaceState(null, '', url)
    }
    window.setTimeout(() => setShareFeedback(''), 3000)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-group"><div className="brand-mark">מ</div><div><h1>מסלול</h1><p>מעבדת סיכון ממונף</p></div></div>
        <div className="status-pill"><span className={running ? 'pulse' : ''} />{running ? `מחשב · ${Math.round(progress * 100)}%` : 'המודל מוכן'}</div>
      </header>

      <section className="hero">
        <div><p className="eyebrow">סימולטור מונטה קרלו ממונף</p><h2>הממוצע מבטיח.<br /><em>המציאות מתפלגת.</em></h2></div>
        <p className="hero-copy">בדקו אלפי מסלולי שוק עם זנבות שמנים, מינוף יומי ואפשרות למחיקה מלאה. כי אף משקיע לא חי בתוך הממוצע.</p>
      </section>

      <section className="preset-strip" aria-label="תרחישים מוכנים">
        {presets.map((preset) => <button key={preset.name} onClick={() => replaceParams({ ...params, ...preset.values })}><strong>{preset.name}</strong><span>{preset.description}</span></button>)}
      </section>

      <div className="workspace">
        <aside className="controls">
          <div className="panel-heading"><div><p className="eyebrow">הנחות המודל</p><h3>פרמטרים</h3></div><div className="parameter-actions"><button className="text-button" onClick={shareScenario} disabled={hasValidationErrors}>שיתוף</button><button className="text-button" onClick={() => replaceParams(DEFAULT_SIMULATION_PARAMS)}>איפוס</button></div></div>
          {shareFeedback && <p className="share-feedback" role="status">{shareFeedback}</p>}
          <fieldset className="parameter-section">
            <legend>הגדרות בסיסיות</legend>
            <ParameterField id="initialInvestment" label="סכום התחלתי" description="שווי התיק בתחילת הדרך" unit="₪" value={drafts.initialInvestment} {...PARAMETER_LIMITS.initialInvestment} error={validationErrors.initialInvestment} onChange={(value) => updateNumber('initialInvestment', value)} />
            <ParameterField id="years" label="טווח השקעה" description="משך הסימולציה" unit="שנים" value={drafts.years} {...PARAMETER_LIMITS.years} range error={validationErrors.years} onChange={(value) => updateNumber('years', value)} />
            <ParameterField id="paths" label="מספר מסלולים" description={`דגימות אקראיות · ${computeLabel}`} unit="מסלולים" value={drafts.paths} {...PARAMETER_LIMITS.paths} range error={validationErrors.paths} onChange={(value) => updateNumber('paths', value)} />
            <ParameterField id="annualDrift" label="תשואה שנתית צפויה" description="הנחת הממוצע השנתי" unit="%" value={drafts.annualDrift} min={-100} max={100} step={0.1} range error={validationErrors.annualDrift} onChange={(value) => updateNumber('annualDrift', value, 100)} />
            <ParameterField id="annualVolatility" label="תנודתיות שנתית" description="סטיית התקן השנתית" unit="%" value={drafts.annualVolatility} min={0} max={200} step={0.1} range error={validationErrors.annualVolatility} onChange={(value) => updateNumber('annualVolatility', value, 100)} />
            <ParameterField id="leverages" label="רמות מינוף להשוואה" description="הפרידו ערכים בפסיקים, למשל 1, 2.5, 4" unit="×" inputType="text" value={drafts.leverages} min={PARAMETER_LIMITS.leverage.min} max={PARAMETER_LIMITS.leverage.max} step={PARAMETER_LIMITS.leverage.step} error={validationErrors.leverages} onChange={updateLeverages} />
          </fieldset>
          <fieldset className="parameter-section advanced">
            <legend>הגדרות מתקדמות</legend>
            <ParameterField id="degreesOfFreedom" label="עובי הזנבות" description={tailLabel(params.degreesOfFreedom)} unit="df" value={drafts.degreesOfFreedom} {...PARAMETER_LIMITS.degreesOfFreedom} range error={validationErrors.degreesOfFreedom} onChange={(value) => updateNumber('degreesOfFreedom', value)} />
            <ParameterField id="cvarPercentile" label="זנב CVaR" description="שיעור התרחישים הגרועים" unit="%" value={drafts.cvarPercentile} min={1} max={25} step={1} range error={validationErrors.cvarPercentile} onChange={(value) => updateNumber('cvarPercentile', value, 100)} />
            <ParameterField id="seed" label="זרע אקראי" description="לשחזור אותה סדרת תרחישים" unit="seed" value={drafts.seed} {...PARAMETER_LIMITS.seed} error={validationErrors.seed} onChange={(value) => updateNumber('seed', value)} />
            <button className="random-seed" type="button" onClick={() => updateNumber('seed', String(Math.floor(Math.random() * 1_000_000)))}>↻ צור מדגם חדש</button>
            <ParameterField id="tradingDays" label="ימי מסחר בשנה" description="משמש להמרה מפרמטרים שנתיים ליומיים" unit="ימים" value={drafts.tradingDays} {...PARAMETER_LIMITS.tradingDays} error={validationErrors.tradingDays} onChange={(value) => updateNumber('tradingDays', value)} />
          </fieldset>
          <button className="run-button" onClick={runSimulation} disabled={running || hasValidationErrors}>{running ? 'מחשב תרחישים…' : 'הרץ סימולציה'}<span>←</span></button>
          {hasValidationErrors && <p className="validation-summary" role="alert">יש לתקן את הערכים המסומנים לפני הרצת הסימולציה.</p>}
          {running && <div className="progress-track" role="progressbar" aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>}
          {error && <p className="error" role="alert">{error}</p>}
        </aside>

        <section className="dashboard" aria-live="polite">
          <div className="section-title"><div><p className="eyebrow">תמונת מצב</p><h3>מה קרה לכסף?</h3></div>{result && <span>{result.params.paths.toLocaleString('he-IL')} מסלולים · {result.params.years} שנים · {(result.durationMs / 1000).toFixed(1)} שנ׳</span>}</div>
          {result ? <>
            <div className="metric-grid">{result.results.map((item) => <MetricCard key={item.leverage} item={item} initialInvestment={result.params.initialInvestment} active={selectedLeverage === item.leverage} onClick={() => setSelectedLeverage(item.leverage)} />)}</div>
            <div className="insight"><span>!</span><div><strong>המספר שכדאי לראות</strong><p>{insight}</p></div></div>
            <div className="chart-panel">
              <ChartHeader title="מסלולי עושר לאורך זמן" subtitle="סקאלה לוגריתמית · הרצועה מציגה את 50% האמצעיים" results={result.results} selected={selectedLeverage} onSelect={setSelectedLeverage} />
              <PathChart results={result.results} selected={selectedLeverage} initialInvestment={result.params.initialInvestment} />
              <div className="chart-legend"><span><i className="solid" />חציון</span><span><i className="dashed" />ממוצע</span><span><i className="ruined" />מסלול שנמחק</span></div>
            </div>
            <div className="chart-panel">
              <ChartHeader title="התפלגות השווי הסופי" subtitle="כל עמודה מייצגת טווח תוצאות · ציר שווי לוגריתמי" results={result.results} selected={selectedLeverage} onSelect={setSelectedLeverage} />
              <DistributionChart results={result.results} selected={selectedLeverage} initialInvestment={result.params.initialInvestment} />
            </div>
            {selectedResult && <div className="tail-panel"><div><p className="eyebrow">התרחיש הרע</p><h3>אם נופלים לזנב, כמה כואב?</h3><p>ב־{result.params.cvarPercentile * 100}% התרחישים הגרועים, השווי הסופי הממוצע הוא <b>{formatCurrency(selectedResult.cvar)}</b> ({formatMultiple(selectedResult.cvar / result.params.initialInvestment)}).</p></div><div className="tail-number">{formatCurrency(selectedResult.cvar)}<small>CVaR</small></div></div>}
          </> : <LoadingCards />}
        </section>
      </div>
      <footer><p>כלי מחקרי בלבד · אינו מהווה ייעוץ השקעות</p><p>התוצאות הן סימולציה סטטיסטית ואינן תחזית</p></footer>
    </main>
  )
}

function MetricCard({ item, initialInvestment, active, onClick }: { item: SimulationResult['results'][number]; initialInvestment: number; active: boolean; onClick: () => void }) {
  const gap = item.median ? item.mean / item.median : Infinity
  return <button className={`metric-card ${active ? 'active' : ''}`} onClick={onClick} style={{ '--accent': leverageColor(item.leverage) } as React.CSSProperties}>
    <div className="metric-top"><strong>{item.leverage}×</strong><span>מינוף יומי</span></div>
    <div className="metric-main"><small>שווי חציוני</small><b>{formatCurrency(item.median)}</b><small>{formatMultiple(item.median / initialInvestment)}</small><span className={item.annualizedMedian >= 0 ? 'positive' : 'negative'}>{percent(item.annualizedMedian)} לשנה</span></div>
    <div className="metric-details"><span><small>ממוצע</small><b>{formatCurrency(item.mean)}</b></span><span><small>מחיקה מלאה</small><b className={item.wipeoutRate > .1 ? 'negative' : ''}>{percent(item.wipeoutRate)}</b></span></div>
    <div className="gap-bar"><span style={{ width: `${Math.min(100, Number.isFinite(gap) ? gap * 16 : 100)}%` }} /></div><p>פער ממוצע–חציון {Number.isFinite(gap) ? `פי ${formatNumber(gap)}` : 'קיצוני'}</p>
  </button>
}

function ChartHeader({ title, subtitle, results, selected, onSelect }: { title: string; subtitle: string; results: SimulationResult['results']; selected: number; onSelect: (value: number) => void }) {
  return <div className="chart-header"><div><h3>{title}</h3><p>{subtitle}</p></div><div className="chart-tabs">{results.map((item) => <button key={item.leverage} className={selected === item.leverage ? 'active' : ''} onClick={() => onSelect(item.leverage)}>{item.leverage}×</button>)}</div></div>
}

function LoadingCards() { return <div className="loading-cards">{[1, 2, 3].map((item) => <div key={item} />)}</div> }
function loadInitialParams(): SimulationParams {
  return decodeParams(window.location.search) ?? safeBrowserLoad(window) ?? DEFAULT_SIMULATION_PARAMS
}
function paramsToDrafts(params: SimulationParams) {
  return {
    initialInvestment: String(params.initialInvestment), years: String(params.years), paths: String(params.paths),
    annualDrift: String(params.annualDrift * 100), annualVolatility: String(params.annualVolatility * 100),
    leverages: params.leverages.join(', '), degreesOfFreedom: String(params.degreesOfFreedom),
    cvarPercentile: String(params.cvarPercentile * 100), seed: String(params.seed), tradingDays: String(params.tradingDays),
  }
}
function percent(value: number) { return new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 1 }).format(value) }
function formatNumber(value: number) { return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(value) }
function formatCurrency(value: number) { return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0, notation: value >= 1e7 ? 'compact' : 'standard' }).format(value) }
function formatMultiple(value: number) { if (!Number.isFinite(value)) return 'חריג'; if (value >= 1e6) return `${formatNumber(value / 1e6)}M×`; if (value >= 1000) return `${formatNumber(value / 1000)}K×`; return `${formatNumber(value)}×` }
function tailLabel(df: number) { if (df <= 5) return 'זנבות שמנים מאוד'; if (df <= 10) return 'זנבות שמנים'; if (df <= 20) return 'זנבות מתונים'; return 'זנבות דקים' }
