import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DistributionChart, PathChart } from './components/Charts'
import { leverageColor } from './components/chartMath'
import { ParameterField } from './components/ParameterField'
import { SimulationTour } from './components/SimulationTour'
import { presets } from './presets'
import { DEFAULT_SIMULATION_PARAMS, PARAMETER_LIMITS } from './simulation/defaults'
import {
  degreesOfFreedomWarningLevel,
  eventCountWarningLevel,
  tailObservationCount,
  tailObservationWarningLevel,
  wilson95Interval,
} from './simulation/statisticalReliability'
import type { StatisticalWarningLevel } from './simulation/statisticalReliability'
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
  const affectedResults = result?.results.filter((item) => item.valueLimitExceededCount > 0) ?? []
  const computeLabel = params.paths <= 5_000 ? 'חישוב קל' : params.paths <= 10_000 ? 'חישוב בינוני' : 'חישוב כבד'
  const pathsAdvisory = !validationErrors.paths && params.paths > 10_000
    ? 'מעל 10,000 מסלולים שימושי בעיקר לבדיקת אירועים נדירים ועלול להאריך משמעותית את החישוב.'
    : undefined
  const dfWarningLevel = validationErrors.degreesOfFreedom ? null : degreesOfFreedomWarningLevel(params.degreesOfFreedom)
  const dfAdvisory = dfWarningLevel === 'strong'
    ? 'אזהרת יציבות גבוהה: ליד df=2 רוב השונות עלולה להגיע מאירועים נדירים שהמדגם לא ראה. גם 100,000 מסלולים אינם מבטיחים התכנסות; מומלץ להגדיל מסלולים ולבדוק כמה seeds.'
    : dfWarningLevel === 'moderate'
      ? 'אזהרת יציבות: ב־df עד 4 המומנט הרביעי אינו סופי, ולכן שונות ומדדי זנב עלולים להשתנות בין seeds. מומלץ להגדיל מסלולים ולבדוק כמה seeds.'
      : undefined
  const insight = useMemo(() => {
    if (!selectedResult) return ''
    if (selectedResult.valueLimitExceededCount > 0) return `במינוף ${selectedResult.leverage}×, ${selectedResult.valueLimitExceededCount.toLocaleString('he-IL')} מסלולים עברו את תקרת החישוב. לכן מדדי השווי המסומנים הם חסמים תחתונים, ולא מוצג פער בין הממוצע לחציון.`
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
        <div className="brand-group"><div className="brand-mark">מ</div><div><h1>מבחן המינוף</h1><p>מעבדת סיכון ממונף</p></div></div>
        <div className={`status-pill${running ? ' status-pill--running' : ''}`}><span className={running ? 'pulse' : ''} />{running ? `מחשב · ${Math.round(progress * 100)}%` : 'המודל מוכן'}</div>
      </header>

      <section className="hero">
        <div><p className="eyebrow">סימולטור מונטה קרלו ממונף</p><h2>הממוצע מבטיח.<br /><em>המציאות מתפלגת.</em></h2></div>
        <p className="hero-copy">השוו השקעה רגילה לרמות שונות של מינוף יומי על אותם מסלולי שוק סינתטיים — ובדקו כיצד תנודתיות ואירועי קצה משנים את התוצאה לאורך זמן.</p>
      </section>

      <SimulationTour />
      <ParameterGlossary />

      <section id="presets" className="preset-strip" aria-label="תרחישים מוכנים">
        {presets.map((preset) => <button key={preset.name} onClick={() => replaceParams({ ...params, ...preset.values })}><strong>{preset.name}</strong><span>{preset.description}</span></button>)}
      </section>

      <div className="workspace">
        <aside className="controls">
          <div className="panel-heading"><div><p className="eyebrow">הנחות המודל</p><h3>פרמטרים</h3></div><div className="parameter-actions"><button className="text-button" onClick={shareScenario} disabled={hasValidationErrors}>שיתוף</button><button className="text-button" onClick={() => replaceParams(DEFAULT_SIMULATION_PARAMS)}>איפוס</button></div></div>
          {shareFeedback && <p className="share-feedback" role="status">{shareFeedback}</p>}
          <fieldset className="parameter-section">
            <legend>הגדרות בסיסיות</legend>
            <ParameterField id="initialInvestment" label="סכום התחלתי" description="קובע מאיזה שווי מתחיל כל מסלול." details={PARAMETER_HELP.initialInvestment.details} unit="₪" value={drafts.initialInvestment} {...PARAMETER_LIMITS.initialInvestment} error={validationErrors.initialInvestment} onChange={(value) => updateNumber('initialInvestment', value)} />
            <ParameterField id="years" label="טווח השקעה" description="קובע כמה שנות שוק מדמה כל מסלול." details={PARAMETER_HELP.years.details} unit="שנים" value={drafts.years} {...PARAMETER_LIMITS.years} range error={validationErrors.years} onChange={(value) => updateNumber('years', value)} />
            <ParameterField id="paths" label="מספר מסלולים" description={`קובע כמה עתידים אקראיים הכלי בודק · ${computeLabel}`} details={PARAMETER_HELP.paths.details} unit="מסלולים" value={drafts.paths} {...PARAMETER_LIMITS.paths} rangeMax={10_000} range advisory={pathsAdvisory} error={validationErrors.paths} onChange={(value) => updateNumber('paths', value)} />
            <ParameterField id="annualDrift" label="תשואה שנתית צפויה" description="קובעת את קצב התשואה השנתי שממנו נגזרת התשואה היומית." details={PARAMETER_HELP.annualDrift.details} unit="%" value={drafts.annualDrift} min={-100} max={100} step={0.1} range error={validationErrors.annualDrift} onChange={(value) => updateNumber('annualDrift', value, 100)} />
            <ParameterField id="annualVolatility" label="תנודתיות שנתית" description="קובעת עד כמה התשואות עשויות לסטות מהממוצע." details={PARAMETER_HELP.annualVolatility.details} unit="%" value={drafts.annualVolatility} min={0} max={200} step={0.1} range error={validationErrors.annualVolatility} onChange={(value) => updateNumber('annualVolatility', value, 100)} />
            <ParameterField id="leverages" label="רמות מינוף להשוואה" description="קובעות אילו מכפילי מינוף יומי יושוו זה לזה." details={PARAMETER_HELP.leverages.details} unit="×" inputType="text" value={drafts.leverages} min={PARAMETER_LIMITS.leverage.min} max={PARAMETER_LIMITS.leverage.max} step={PARAMETER_LIMITS.leverage.step} error={validationErrors.leverages} onChange={updateLeverages} />
          </fieldset>
          <fieldset className="parameter-section advanced">
            <legend>הגדרות מתקדמות</legend>
            <ParameterField id="degreesOfFreedom" label="עובי הזנבות" description={`${tailLabel(params.degreesOfFreedom)}. פחות דרגות חופש פירושן יותר אירועים חריגים (ברבורים שחורים).`} details={PARAMETER_HELP.degreesOfFreedom.details} unit="df" value={drafts.degreesOfFreedom} {...PARAMETER_LIMITS.degreesOfFreedom} range advisory={dfAdvisory} advisoryTone={dfWarningLevel ?? undefined} error={validationErrors.degreesOfFreedom} onChange={(value) => updateNumber('degreesOfFreedom', value)} />
            <ParameterField id="cvarPercentile" label="זנב CVaR" description="קובע איזה אחוז מהתרחישים הגרועים ייכלל בממוצע." details={PARAMETER_HELP.cvarPercentile.details} unit="%" value={drafts.cvarPercentile} min={1} max={25} step={1} range error={validationErrors.cvarPercentile} onChange={(value) => updateNumber('cvarPercentile', value, 100)} />
            <ParameterField id="positiveTailPercentile" label="זנב חיובי" description="קובע איזה אחוז מהתרחישים הטובים ייכלל בממוצע." details={PARAMETER_HELP.positiveTailPercentile.details} unit="%" value={drafts.positiveTailPercentile} min={1} max={25} step={1} range error={validationErrors.positiveTailPercentile} onChange={(value) => updateNumber('positiveTailPercentile', value, 100)} />
            <ParameterField id="seed" label="זרע אקראי (seed)" description="seed קבוע משחזר את אותה סדרת תרחישים; seed חדש יוצר סדרה חדשה." details={PARAMETER_HELP.seed.details} unit="seed" value={drafts.seed} {...PARAMETER_LIMITS.seed} error={validationErrors.seed} action={{ label: 'הגרל seed אקראי', icon: '↻', onClick: () => updateNumber('seed', String(Math.floor(Math.random() * 1_000_000))) }} onChange={(value) => updateNumber('seed', value)} />
            <ParameterField id="tradingDays" label="ימי מסחר בשנה" description="קובע כמה צעדים יומיים יש בכל שנת סימולציה." details={PARAMETER_HELP.tradingDays.details} unit="ימים" value={drafts.tradingDays} {...PARAMETER_LIMITS.tradingDays} error={validationErrors.tradingDays} onChange={(value) => updateNumber('tradingDays', value)} />
          </fieldset>
          <button className="run-button" onClick={runSimulation} disabled={running || hasValidationErrors}>{running ? 'מחשב תרחישים…' : 'הרץ סימולציה'}<span>←</span></button>
          <p className="run-disclaimer">כלי כללי בלבד, ללא התאמה אישית ואינו תחליף לייעוץ מקצועי. מינוף עלול להביא לאובדן מלוא ההשקעה. <a href="#legal-disclaimer">להבהרה המשפטית המלאה</a></p>
          {hasValidationErrors && <p className="validation-summary" role="alert">יש לתקן את הערכים המסומנים לפני הרצת הסימולציה.</p>}
          {running && <div className="progress-track" role="progressbar" aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>}
          {error && <p className="error" role="alert">{error}</p>}
        </aside>

        <section className="dashboard" aria-live="polite">
          <div className="section-title"><div><p className="eyebrow">תמונת מצב</p><h3>מה קרה לכסף?</h3></div>{result && <span>{result.params.paths.toLocaleString('he-IL')} מסלולים · {result.params.years} שנים · {(result.durationMs / 1000).toFixed(1)} שנ׳</span>}</div>
          {result ? <>
            {affectedResults.length > 0 && <section className="value-limit-warning" role="alert" aria-label="חריגה מתקרת החישוב">
              <div><strong>חלק ממסלולי הסימולציה חצו את רף החישוב העליון — {formatPortfolioValueLimit(result.portfolioValueLimit)}</strong><p>לכן תוצאות השווי ברמות המינוף המסומנות אינן מלאות: הערכים בפועל עשויים להיות גבוהים יותר, והם מוצגים כחסם תחתון (≥). שיעור המחיקה אינו מושפע.</p></div>
              <ul>{affectedResults.map((item) => <li key={item.leverage}>מינוף {item.leverage}×: {item.valueLimitExceededCount.toLocaleString('he-IL')} מתוך {result.params.paths.toLocaleString('he-IL')} מסלולים ({percent(item.valueLimitExceededRate)})</li>)}</ul>
            </section>}
            <div className="metric-grid">{result.results.map((item) => <MetricCard key={item.leverage} item={item} initialInvestment={result.params.initialInvestment} paths={result.params.paths} active={selectedLeverage === item.leverage} onClick={() => setSelectedLeverage(item.leverage)} />)}</div>
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
            {selectedResult && <div className="tail-panels">
              <div className="tail-panel"><div><p className="eyebrow">התרחיש הרע</p><h3>אם נופלים לזנב, כמה כואב?</h3><p>ב־{result.params.cvarPercentile * 100}% התרחישים הגרועים, השווי הסופי הממוצע הוא <b><ValueDisplay value={formatCurrency(selectedResult.cvar)} lowerBound={selectedResult.valueLimitExceededCount > 0} /></b> (<ValueDisplay value={formatMultiple(selectedResult.cvar / result.params.initialInvestment)} lowerBound={selectedResult.valueLimitExceededCount > 0} />).</p><TailSamplingNote paths={result.params.paths} percentile={result.params.cvarPercentile} /></div><div className="tail-number"><ValueDisplay value={formatCurrency(selectedResult.cvar)} lowerBound={selectedResult.valueLimitExceededCount > 0} /><small>CVaR</small></div></div>
              <div className="tail-panel positive-tail"><div><p className="eyebrow">התרחיש הטוב</p><h3>מה קורה בזנב החיובי?</h3><p>ב־{result.params.positiveTailPercentile * 100}% התרחישים הטובים ביותר, השווי הסופי הממוצע הוא <b><ValueDisplay value={formatCurrency(selectedResult.positiveTailAverage)} lowerBound={selectedResult.valueLimitExceededCount > 0} /></b> (<ValueDisplay value={formatMultiple(selectedResult.positiveTailAverage / result.params.initialInvestment)} lowerBound={selectedResult.valueLimitExceededCount > 0} />).</p><TailSamplingNote paths={result.params.paths} percentile={result.params.positiveTailPercentile} /></div><div className="tail-number"><ValueDisplay value={formatCurrency(selectedResult.positiveTailAverage)} lowerBound={selectedResult.valueLimitExceededCount > 0} /><small>ממוצע זנב חיובי</small></div></div>
            </div>}
          </> : <LoadingCards />}
        </section>
      </div>
      <section id="legal-disclaimer" className="legal-disclaimer" role="note" aria-labelledby="legal-disclaimer-title">
        <h2 id="legal-disclaimer-title">הבהרה משפטית</h2>
        <p>האתר והסימולטור נועדו למידע, לימוד והמחשה בלבד. אין בתוכן משום ייעוץ השקעות או שיווק השקעות, ואין בו הצעה או המלצה לבצע פעולה כלשהי או להימנע מביצועה. המידע אינו מותאם לנתוניו, למטרותיו ולצרכיו של אדם מסוים ואינו תחליף לייעוץ השקעות אישי המתחשב בהם מאת בעל רישיון מתאים על פי דין.</p>
        <p>התוצאות מבוססות על הנחות ועל מסלולים אקראיים, ואינן תחזית או הבטחה לתוצאה עתידית. השקעה, ובפרט השקעה ממונפת, כרוכה בסיכון להפסד עד כדי אובדן מלוא ההשקעה.</p>
        <p>לצורך הבנת השימוש באתר נאספים נתוני שימוש מצרפיים באמצעות Cloudflare Web Analytics, ללא עוגיות וללא יצירת פרופיל אישי למבקרים.</p>
      </section>
      <footer><p>כלי מידע ומחקר כללי בלבד</p><p>התוצאות הן סימולציה סטטיסטית ואינן תחזית</p></footer>
    </main>
  )
}

const PARAMETER_HELP = {
  initialInvestment: {
    glossaryLabel: 'סכום התחלתי',
    details: 'הסכום שממנו מתחיל כל מסלול. לדוגמה, בהשקעה של 100,000 ₪ התוצאות יוצגו גם בשקלים וגם כמכפיל של הסכום הזה.',
  },
  years: {
    glossaryLabel: 'טווח השקעה',
    details: 'מספר השנים שכל מסלול מדמה. לדוגמה, 20 שנים יוצרות 20 שנות צבירה; אופק ארוך מוסיף יותר ימי מסחר ויותר אפשרויות לתוצאות שונות.',
  },
  paths: {
    glossaryLabel: 'מספר מסלולים',
    details: 'מספר ההרצות האקראיות הנפרדות. לדוגמה, 10,000 מסלולים בודקים 10,000 עתידים אפשריים. אירוע נדיר עלול להופיע רק פעמים מעטות גם במדגם גדול, ולכן התוצאות מציגות את ספירת המחיקות ואת מספר התצפיות בזנב. בהקלדה ידנית אפשר להזין עד 100,000, במחיר של זמן חישוב ארוך יותר.',
  },
  annualDrift: {
    glossaryLabel: 'תשואה שנתית צפויה',
    details: 'קצב התשואה השנתי שמשמש לחישוב רכיב התשואה היומי. לדוגמה, 9% היא הנחת המודל שממנה נגזר הקצב היומי — לא תחזית ולא הבטחה לתשואה בפועל.',
  },
  annualVolatility: {
    glossaryLabel: 'תנודתיות שנתית',
    details: 'מידת הפיזור של התשואות סביב הממוצע. לדוגמה, תנודתיות של 30% תייצר בדרך כלל עליות וירידות חדות יותר מתנודתיות של 15%.',
  },
  leverages: {
    glossaryLabel: 'רמות מינוף',
    details: 'המכפילים שמושווים זה לזה. לדוגמה, מינוף 3× מכפיל כל תשואה יומית פי שלושה, ולכן גם הפסדים ותנודתיות מוגברים. מזינים כמה ערכים באמצעות פסיקים, למשל 1, 2.5, 4.',
  },
  degreesOfFreedom: {
    glossaryLabel: 'עובי הזנבות',
    details: 'פרמטר טכני של התפלגות Student-t ששולט בתדירות של ימים קיצוניים. לדוגמה, 4.2 מייצר זנבות כבדים יותר מ־10; פחות דרגות חופש פירושן יותר ברבורים שחורים וסיכון גדול יותר למינוף. ליד df=2 השונות התיאורטית אמנם סופית, אך מדגם עלול להחמיץ את האירועים הנדירים שנושאים אותה. תשואת המדד היומית נעצרת ב־‎-100% לפני הכפלתה במינוף, כדי שלא לייצר תשואה פשוטה בלתי אפשרית.',
  },
  cvarPercentile: {
    glossaryLabel: 'זנב CVaR',
    details: 'האחוז מהתוצאות הסופיות הגרועות ביותר שהכלי ממוצע. לדוגמה, 5% מתוך 2,000 מסלולים מבוסס על 100 תוצאות בלבד; הממשק מציג את המספר בפועל ומזהיר כאשר בסיס המדגם קטן.',
  },
  positiveTailPercentile: {
    glossaryLabel: 'זנב חיובי',
    details: 'האחוז מהתוצאות הסופיות הטובות ביותר שהכלי ממוצע. לדוגמה, 5% מתוך 2,000 מסלולים מבוסס על 100 תוצאות בלבד; תוצאות קצה חיוביות נדירות עלולות להשתנות בין seeds.',
  },
  seed: {
    glossaryLabel: 'זרע אקראי (seed)',
    details: 'מספר שמאפשר לשחזר בדיוק את אותה סדרת הגרלות. לדוגמה, השארת seed זהה בזמן שינוי המינוף מאפשרת להשוות את התנאים על אותם מסלולי שוק.',
  },
  tradingDays: {
    glossaryLabel: 'ימי מסחר בשנה',
    details: 'מספר הצעדים היומיים בכל שנת סימולציה. לדוגמה, 252 מייצג בקירוב שנת מסחר מקובלת ומשמש להמרת תשואה ותנודתיות שנתיות לערכים יומיים.',
  },
} as const

function ParameterGlossary() {
  return <section className="parameter-reference" aria-label="מילון פרמטרים">
    <details className="parameter-glossary" aria-label="מה אומר כל פרמטר?">
      <summary>מה אומר כל פרמטר?</summary>
      <div className="glossary-grid">{Object.values(PARAMETER_HELP).map(({ glossaryLabel, details }) => <article key={glossaryLabel}><h3>{glossaryLabel}</h3><p>{details}</p></article>)}</div>
    </details>
  </section>
}

function MetricCard({ item, initialInvestment, paths, active, onClick }: { item: SimulationResult['results'][number]; initialInvestment: number; paths: number; active: boolean; onClick: () => void }) {
  const gap = item.median ? item.mean / item.median : Infinity
  const lowerBound = item.valueLimitExceededCount > 0
  return <button className={`metric-card ${active ? 'active' : ''}`} onClick={onClick} style={{ '--accent': leverageColor(item.leverage) } as React.CSSProperties}>
    <div className="metric-top"><strong>{item.leverage}×</strong>{lowerBound ? <span className="lower-bound-badge">חסם תחתון</span> : <span>מינוף יומי</span>}</div>
    <div className="metric-main"><small>שווי חציוני</small><b><ValueDisplay value={formatCurrency(item.median)} lowerBound={lowerBound} /></b><small><ValueDisplay value={formatMultiple(item.median / initialInvestment)} lowerBound={lowerBound} /></small><span className={item.annualizedMedian >= 0 ? 'positive' : 'negative'}><ValueDisplay value={`${percent(item.annualizedMedian)} לשנה`} lowerBound={lowerBound} /></span></div>
    <div className="metric-details"><span><small>ממוצע</small><b><ValueDisplay value={formatCurrency(item.mean)} lowerBound={lowerBound} /></b></span><span><small>מחיקה מלאה</small><b className={item.wipeoutRate > .1 ? 'negative' : ''}>{percent(item.wipeoutRate)}</b></span></div>
    <WipeoutSamplingNote events={item.wipedOutCount} paths={paths} />
    {lowerBound ? <p className="gap-unavailable">פער ממוצע–חציון אינו זמין עקב החריגה</p> : <><div className="gap-bar"><span style={{ width: `${Math.min(100, Number.isFinite(gap) ? gap * 16 : 100)}%` }} /></div><p>פער ממוצע–חציון {Number.isFinite(gap) ? `פי ${formatNumber(gap)}` : 'קיצוני'}</p></>}
  </button>
}

function TailSamplingNote({ paths, percentile: percentileValue }: { paths: number; percentile: number }) {
  const observations = tailObservationCount(paths, percentileValue)
  const warningLevel = tailObservationWarningLevel(observations)
  const warning = warningLevel === 'strong'
    ? ' מעט מאוד תצפיות בזנב; התוצאה עלולה להשתנות מאוד בין seeds.'
    : warningLevel === 'moderate'
      ? ' מספר התצפיות בזנב מוגבל; מומלץ להגדיל מסלולים ולבדוק כמה seeds.'
      : ''
  return <p className={samplingNoteClass('tail-sampling-note', warningLevel)}>המדד מבוסס על {observations.toLocaleString('he-IL')} מתוך {paths.toLocaleString('he-IL')} מסלולים.{warning}</p>
}

function WipeoutSamplingNote({ events, paths }: { events: number; paths: number }) {
  const interval = wilson95Interval(events, paths)
  const warningLevel = eventCountWarningLevel(events)
  const warning = warningLevel === 'strong'
    ? ' מעט אירועים: שיעור המחיקה רועש מאוד.'
    : warningLevel === 'moderate'
      ? ' אי־ודאות מוגברת בגלל מספר אירועים מוגבל.'
      : ''
  return <p className={samplingNoteClass('wipeout-sampling-note', warningLevel)}>{events.toLocaleString('he-IL')} מתוך {paths.toLocaleString('he-IL')} מסלולים · רווח Wilson 95%: {statisticalPercent(interval.lower)}–{statisticalPercent(interval.upper)}.{warning}</p>
}

function samplingNoteClass(base: string, warningLevel: StatisticalWarningLevel) {
  return `sampling-note ${base}${warningLevel ? ` sampling-note--${warningLevel}` : ''}`
}

function ChartHeader({ title, subtitle, results, selected, onSelect }: { title: string; subtitle: string; results: SimulationResult['results']; selected: number; onSelect: (value: number) => void }) {
  const selectedResult = results.find((item) => item.leverage === selected) ?? results[0]
  const lowerBound = selectedResult.valueLimitExceededCount > 0
  return <div className="chart-header"><div><h3>{title}</h3><p>{subtitle}{lowerBound && <> · <strong className="chart-lower-bound">הגרף המסומן הוא חסם תחתון (≥)</strong></>}</p></div><div className="chart-tabs">{results.map((item) => <button key={item.leverage} className={selected === item.leverage ? 'active' : ''} onClick={() => onSelect(item.leverage)} aria-label={`${item.valueLimitExceededCount > 0 ? 'חסם תחתון, ' : ''}מינוף ${item.leverage}`}><span aria-hidden="true">{item.valueLimitExceededCount > 0 ? '≥ ' : ''}{item.leverage}×</span></button>)}</div></div>
}

function ValueDisplay({ value, lowerBound }: { value: string; lowerBound: boolean }) {
  if (!lowerBound) return <>{value}</>
  return <span className="lower-bound-value" aria-label={`לפחות ${value}`}><span aria-hidden="true">≥ </span><span aria-hidden="true">{value}</span></span>
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
    cvarPercentile: String(params.cvarPercentile * 100), positiveTailPercentile: String(params.positiveTailPercentile * 100), seed: String(params.seed), tradingDays: String(params.tradingDays),
  }
}
function percent(value: number) { return new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 1 }).format(value) }
function statisticalPercent(value: number) { return new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 2 }).format(value) }
function formatNumber(value: number) { return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(value) }
function formatCurrency(value: number) { return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0, notation: value >= 1e7 ? 'compact' : 'standard' }).format(value) }
function formatPortfolioValueLimit(value: number) { return value === 1e15 ? '10¹⁵ ₪' : formatCurrency(value) }
function formatMultiple(value: number) { if (!Number.isFinite(value)) return 'חריג'; if (value >= 1e6) return `${formatNumber(value / 1e6)}M×`; if (value >= 1000) return `${formatNumber(value / 1000)}K×`; return `${formatNumber(value)}×` }
function tailLabel(df: number) { if (df <= 5) return 'זנבות שמנים מאוד'; if (df <= 10) return 'זנבות שמנים'; if (df <= 20) return 'זנבות מתונים'; return 'זנבות דקים' }
