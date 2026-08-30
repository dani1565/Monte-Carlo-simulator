import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ParameterField } from './ParameterField'

describe('ParameterField', () => {
  it('מקשר תווית, הסבר ושגיאה לשדה המספרי', () => {
    render(<ParameterField id="years" label="טווח השקעה" description="משך הסימולציה" unit="שנים" value="0" min={1} max={100} step={1} error="מספר השנים אינו תקין" onChange={() => undefined} />)
    const input = screen.getByLabelText('טווח השקעה')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('משך הסימולציה מספר השנים אינו תקין')
    expect(screen.getByRole('alert')).toHaveTextContent('מספר השנים אינו תקין')
  })

  it('מעביר הקלדה מדויקת כמחרוזת בלי לתקן ערך לא חוקי', () => {
    const onChange = vi.fn()
    render(<ParameterField id="return" label="תשואה" description="באחוזים" unit="%" value="9" min={-100} max={100} step={0.1} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('תשואה'), { target: { value: '9.25' } })
    expect(onChange).toHaveBeenCalledWith('9.25')
  })

  it('מציג גם מחוון אופציונלי ששולט באותו ערך', () => {
    const onChange = vi.fn()
    render(<ParameterField id="years" label="שנים" description="משך" unit="שנים" value="20" min={1} max={40} step={1} range onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('שנים — מחוון'), { target: { value: '25' } })
    expect(onChange).toHaveBeenCalledWith('25')
  })

  it('מאפשר למחוון תקרה רכה נפרדת מתקרת הקלט ומנגיש הודעה צמודה', () => {
    render(<ParameterField
      id="paths"
      label="מספר מסלולים"
      description="דגימות אקראיות · חישוב כבד"
      unit="מסלולים"
      value="50000"
      min={100}
      max={100000}
      rangeMax={10000}
      step={100}
      range
      advisory="מעל 10,000 מסלולים שימושי בעיקר לבדיקת אירועים נדירים ועלול להאריך משמעותית את החישוב."
      onChange={() => undefined}
    />)

    const input = screen.getByLabelText('מספר מסלולים')
    const slider = screen.getByLabelText('מספר מסלולים — מחוון')
    expect(input).toHaveAttribute('max', '100000')
    expect(input).toHaveAccessibleDescription('דגימות אקראיות · חישוב כבד מעל 10,000 מסלולים שימושי בעיקר לבדיקת אירועים נדירים ועלול להאריך משמעותית את החישוב.')
    expect(slider).toHaveAttribute('max', '10000')
    expect(slider).toHaveValue('10000')
    expect(slider).toHaveAccessibleDescription('דגימות אקראיות · חישוב כבד מעל 10,000 מסלולים שימושי בעיקר לבדיקת אירועים נדירים ועלול להאריך משמעותית את החישוב.')
    expect(screen.getByText('10000', { exact: true })).toBeInTheDocument()
  })
})
