import { expect, test } from '@playwright/test'

test('מסביר למשתמש מה הסימולציה עושה ומה משמעות הפרמטרים', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'איך הסימולציה עובדת?' })).toBeVisible()
  await expect(page.getByText(/מסלולי מדד סינתטיים/)).toBeVisible()
  await expect(page.getByText(/אינה שחזור של ההיסטוריה/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'למה לא להסתפק בהרצה היסטורית?' })).toBeVisible()
  await expect(page.getByText(/ההיסטוריה מראה לנו רק מסלול אחד/)).toBeVisible()
  await expect(page.getByText(/הברבור השחור.*נאסים ניקולס טאלב/)).toBeVisible()
  await expect(page.getByText(/גם סימולציה מוגבלת להנחות/)).toBeVisible()

  const glossary = page.getByRole('group', { name: 'מה אומר כל פרמטר?' })
  await glossary.getByText('מה אומר כל פרמטר?', { exact: true }).focus()
  await page.keyboard.press('Enter')
  for (const term of ['סכום התחלתי', 'טווח השקעה', 'מספר מסלולים', 'תשואה שנתית צפויה', 'תנודתיות שנתית', 'רמות מינוף', 'עובי הזנבות', 'זנב CVaR', 'זרע אקראי', 'ימי מסחר בשנה']) {
    await expect(glossary.getByText(term, { exact: true })).toBeVisible()
  }
  await expect(glossary.getByText(/הסכום שממנו מתחיל כל מסלול/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'תרחיש לחץ בסגנון 2008' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('טוען סימולציה, משנה פרמטר ושומר אותו', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'מה קרה לכסף?' })).toBeVisible()
  await expect(page.getByText('שווי חציוני').first()).toBeVisible({ timeout: 20_000 })

  const years = page.getByRole('spinbutton', { name: 'טווח השקעה' })
  await years.fill('3')
  await expect(page.getByText(/מסלולים · 3 שנים/)).toBeVisible({ timeout: 20_000 })
  await page.reload()
  await expect(page.getByRole('spinbutton', { name: 'טווח השקעה' })).toHaveValue('3')
  expect(errors).toEqual([])
})

test('קלט לא תקין חוסם הרצה ומציג הודעה', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('spinbutton', { name: 'מספר מסלולים' }).fill('0')
  await expect(page.getByText('יש לתקן את הערכים המסומנים לפני הרצת הסימולציה.')).toBeVisible()
  await expect(page.getByRole('button', { name: /הרץ סימולציה/ })).toBeDisabled()
})

test('פרמטרים מלאים נטענים מקישור משותף', async ({ page }) => {
  const query = new URLSearchParams({
    initialInvestment: '42000', leverages: '1,2.5', years: '2', paths: '100',
    annualDrift: '0.07', annualVolatility: '0.15', degreesOfFreedom: '6',
    cvarPercentile: '0.05', seed: '77', tradingDays: '250',
  })
  await page.goto(`/?${query}`)
  await expect(page.getByLabel('סכום התחלתי')).toHaveValue('42000')
  await expect(page.getByLabel('רמות מינוף להשוואה')).toHaveValue('1, 2.5')
  await expect(page.getByText(/100 מסלולים · 2 שנים/)).toBeVisible({ timeout: 20_000 })
})