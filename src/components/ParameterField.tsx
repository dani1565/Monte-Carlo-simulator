export interface ParameterFieldProps {
  id: string
  label: string
  description: string
  unit: string
  value: string
  min: number
  max: number
  step: number
  error?: string
  range?: boolean
  inputType?: 'number' | 'text'
  onChange: (value: string) => void
}

export function ParameterField({ id, label, description, unit, value, min, max, step, error, range, inputType = 'number', onChange }: ParameterFieldProps) {
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  const describedBy = error ? `${descriptionId} ${errorId}` : descriptionId
  const numericValue = Number(value)
  const fill = Number.isFinite(numericValue) ? Math.max(0, Math.min(100, ((numericValue - min) / (max - min)) * 100)) : 0

  return (
    <div className={`parameter-field ${error ? 'invalid' : ''}`}>
      <div className="parameter-heading">
        <label htmlFor={id}>{label}</label>
        <span id={descriptionId}>{description}</span>
      </div>
      <div className="number-control">
        <input id={id} type={inputType} inputMode={inputType === 'number' ? 'decimal' : 'text'} value={value} min={inputType === 'number' ? min : undefined} max={inputType === 'number' ? max : undefined} step={inputType === 'number' ? step : undefined} aria-invalid={Boolean(error)} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} />
        <span>{unit}</span>
      </div>
      {range && <>
        <input className="range" aria-label={`${label} — מחוון`} type="range" min={min} max={max} step={step} value={Number.isFinite(numericValue) ? Math.max(min, Math.min(max, numericValue)) : min} style={{ '--fill': `${fill}%` } as React.CSSProperties} onChange={(event) => onChange(event.target.value)} />
        <div className="range-ends"><span>{min}</span><span>{max}</span></div>
      </>}
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
    </div>
  )
}
