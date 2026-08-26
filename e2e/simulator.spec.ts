import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://static.cloudflareinsights.com/**', async (route) => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }))
})

test('מזדהה בשם מבחן המינוף', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('מבחן המינוף | סימולטור מונטה קרלו')
  await expect(page.getByRole('heading', { name: 'מבחן המינוף', level: 1 })).toBeVisible()
})

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
  for (const term of ['סכום התחלתי', 'טווח השקעה', 'מספר מסלולים', 'תשואה שנתית צפויה', 'תנודתיות שנתית', 'רמות מינוף', 'עובי הזנבות', 'זנב CVaR', 'זנב חיובי', 'זרע אקראי', 'ימי מסחר בשנה']) {
    await expect(glossary.getByText(term, { exact: true })).toBeVisible()
  }
  await expect(glossary.getByText(/הסכום שממנו מתחיל כל מסלול/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'תרחיש לחץ בסגנון 2008' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('תרחיש S&P היסטורי מכוון לזנבות לחץ ומסביר ברבורים שחורים', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'S&P היסטורי' }).click()

  await expect(page.getByRole('spinbutton', { name: 'עובי הזנבות' })).toHaveValue('4.2')
  await expect(page.getByText(/ברבור שחור הוא אירוע נדיר וקיצוני בשוק ההון/)).toBeVisible()
  await expect(page.getByText(/פרמטר "עובי הזנבות" קובע כמה משקל המודל נותן לימים כאלה/)).toBeVisible()
  await expect(page.locator('#degreesOfFreedom-description')).toHaveText(/פחות דרגות חופש פירושן יותר אירועים חריגים \(ברבורים שחורים\)/)
})

test('מציג הבהרה משפטית ברורה ונגישה', async ({ page }) => {
  await page.goto('/')
  const disclaimer = page.getByRole('note', { name: 'הבהרה משפטית' })
  await expect(disclaimer).toBeVisible()
  await expect(disclaimer).toHaveAttribute('id', 'legal-disclaimer')
  await expect(page.getByRole('link', { name: 'להבהרה המשפטית המלאה' })).toHaveAttribute('href', '#legal-disclaimer')
  await expect(disclaimer.getByText(/אין בתוכן משום ייעוץ השקעות או שיווק השקעות/)).toBeVisible()
  await expect(disclaimer.getByText(/אין בו הצעה או המלצה לבצע פעולה כלשהי או להימנע מביצועה/)).toBeVisible()
  await expect(disclaimer.getByText(/אינו תחליף לייעוץ השקעות אישי.*בעל רישיון/)).toBeVisible()
  await expect(disclaimer.getByText(/נתוניו, למטרותיו ולצרכיו/)).toBeVisible()
  await expect(disclaimer.getByText(/אינן תחזית או הבטחה לתוצאה עתידית/)).toBeVisible()
  await expect(disclaimer.getByText(/אובדן מלוא ההשקעה/)).toBeVisible()
  expect(await disclaimer.evaluate((element) => getComputedStyle(element).fontSize)).toBe('14px')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('טוען מדידת שימוש מצרפית ומציג גילוי פרטיות', async ({ page }) => {
  await page.goto('/')

  const beacon = page.locator('script[src="https://static.cloudflareinsights.com/beacon.min.js"]')
  await expect(beacon).toHaveAttribute('data-cf-beacon', '{"token":"191b546809014f71a2a719eaa3bdfc51"}')
  await expect(page.getByText(/נתוני שימוש מצרפיים.*Cloudflare Web Analytics.*ללא עוגיות/)).toBeVisible()
})

test('סמל מצב החישוב בולט באדום וחוזר למצבו המוכן', async ({ page }) => {
  await page.goto('/?paths=100000&years=50')

  const status = page.locator('.status-pill')
  await expect(status).toContainText(/מחשב · \d+%/)
  await expect(status).toHaveClass(/status-pill--running/)
  await expect(status.locator('span')).toHaveCSS('background-color', 'rgb(255, 107, 114)')

  await expect(status).toHaveText('המודל מוכן', { timeout: 30_000 })
  await expect(status).not.toHaveClass(/status-pill--running/)
  await expect(status.locator('span')).toHaveCSS('background-color', 'rgb(81, 229, 180)')
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
    cvarPercentile: '0.05', positiveTailPercentile: '0.1', seed: '77', tradingDays: '250',
  })
  await page.goto(`/?${query}`)
  await expect(page.getByLabel('סכום התחלתי')).toHaveValue('42000')
  await expect(page.getByLabel('רמות מינוף להשוואה')).toHaveValue('1, 2.5')
  await expect(page.getByRole('spinbutton', { name: 'זנב חיובי' })).toHaveValue('10')
  await expect(page.getByText(/100 מסלולים · 2 שנים/)).toBeVisible({ timeout: 20_000 })
})