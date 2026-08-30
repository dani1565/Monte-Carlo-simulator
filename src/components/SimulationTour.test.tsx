import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SimulationTour } from './SimulationTour'

afterEach(cleanup)

describe('SimulationTour', () => {
  it('מסביר תחילה איזה מינוף נבדק וממחיש צבירה יומית במספרים', () => {
    render(<SimulationTour />)

    expect(screen.getByText('1 מתוך 5')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'איזה מינוף נבדק?' })).toBeVisible()
    expect(screen.getByText(/מודל מפושט של קרן ממונפת יומית/)).toBeVisible()
    expect(screen.getByText(/אינו מדמה הלוואה, מרג׳ין או דרישות ביטחונות/)).toBeVisible()
    expect(screen.getByText(/100 ← 110 ← 99/)).toBeVisible()
    expect(screen.getByText(/100 ← 130 ← 91/)).toBeVisible()
    expect(screen.getByText(/התוצאה המצטברת אינה פשוט פי שלושה/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'הקודם' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'דלגו לתרחישים' })).toHaveAttribute('href', '#presets')
  })

  it('מוביל בין חמשת ההסברים ומבדיל בזהירות בין מונטה קרלו ל־Backtest', () => {
    render(<SimulationTour />)
    const next = screen.getByRole('button', { name: 'הבא' })

    fireEvent.click(next)
    expect(screen.getByText('2 מתוך 5')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'מה הסימולטור עושה?' })).toBeVisible()
    expect(screen.getByText(/אותם מסלולי שוק/)).toBeVisible()

    fireEvent.click(next)
    expect(screen.getByText('3 מתוך 5')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'במה זה שונה מ־Backtest?' })).toBeVisible()
    expect(screen.getByText(/Backtest בוחן מסלול היסטורי יחיד/)).toBeVisible()
    expect(screen.getByText(/אינו טוב יותר לכל מטרה/)).toBeVisible()
    expect(screen.getByText(/משלים בדיקה היסטורית/)).toBeVisible()

    fireEvent.click(next)
    expect(screen.getByText('4 מתוך 5')).toBeVisible()
    const blackSwanStep = screen.getByRole('region', { name: 'צעד 4 מתוך 5' })
    expect(screen.getByRole('heading', { name: 'מהם ברבורים שחורים ולמה הם חשובים?' })).toBeVisible()
    expect(blackSwanStep).toHaveTextContent(/df נמוך יותר/)
    expect(blackSwanStep).toHaveTextContent(/אינו חוזה אירוע מסוים/)

    fireEvent.click(next)
    expect(screen.getByText('5 מתוך 5')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'מה לבדוק בתוצאות ומה חסר במודל?' })).toBeVisible()
    expect(screen.getByText(/חציון מול ממוצע/)).toBeVisible()
    expect(screen.getByText(/עלות מימון, margin call/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'לתרחישים המוכנים' })).toHaveAttribute('href', '#presets')
    expect(screen.queryByRole('button', { name: 'הבא' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'הקודם' }))
    expect(screen.getByText('4 מתוך 5')).toBeVisible()
  })

  it('מכריז על הצעד הפעיל בלי להציג את תוכן שאר הצעדים', () => {
    render(<SimulationTour />)

    const activeStep = screen.getByRole('region', { name: 'צעד 1 מתוך 5' })
    expect(activeStep).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByRole('heading', { name: 'במה זה שונה מ־Backtest?' })).not.toBeInTheDocument()
  })
})
