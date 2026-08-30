import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://static.cloudflareinsights.com/**', async (route) => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }))
  await page.route('https://fonts.googleapis.com/**', async (route) => route.fulfill({
    contentType: 'text/css',
    body: '',
  }))
  await page.route('https://fonts.gstatic.com/**', async (route) => route.fulfill({ body: '' }))
})

function sharedScenario(overrides: Record<string, string> = {}) {
  return new URLSearchParams({
    initialInvestment: '100000', leverages: '1,2,3', years: '20', paths: '2000',
    annualDrift: '0.09', annualVolatility: '0.18', degreesOfFreedom: '5',
    cvarPercentile: '0.05', positiveTailPercentile: '0.05', seed: '2026', tradingDays: '252',
    ...overrides,
  })
}

test('מזדהה בשם מבחן המינוף', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('מבחן המינוף | סימולטור מונטה קרלו')
  await expect(page.getByRole('heading', { name: 'מבחן המינוף', level: 1 })).toBeVisible()
})

test('מסביר למשתמש מה הסימולציה עושה ומה משמעות הפרמטרים', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'הכירו את הסימולטור בחמישה צעדים' })).toBeVisible()
  const activeStep = page.locator('.tour-step')
  await expect(activeStep).toHaveAttribute('aria-live', 'polite')
  await expect(activeStep).toContainText('מודל מפושט של קרן ממונפת יומית')
  await expect(activeStep).toContainText('אינו מדמה הלוואה, מרג׳ין או דרישות ביטחונות')
  const indexSequence = page.getByLabel('מסלול המדד: 100, אחר כך 110, ולבסוף 99')
  const leveragedSequence = page.getByLabel('מסלול המינוף היומי פי 3: 100, אחר כך 130, ולבסוף 91')
  await expect(indexSequence).toHaveAttribute('dir', 'rtl')
  await expect(leveragedSequence).toHaveAttribute('dir', 'rtl')
  const indexPositions = await indexSequence.locator('.tour-sequence-value').evaluateAll((values) => values.map((value) => value.getBoundingClientRect().x))
  const leveragedPositions = await leveragedSequence.locator('.tour-sequence-value').evaluateAll((values) => values.map((value) => value.getBoundingClientRect().x))
  expect(indexPositions[0]).toBeGreaterThan(indexPositions[1])
  expect(indexPositions[1]).toBeGreaterThan(indexPositions[2])
  expect(leveragedPositions[0]).toBeGreaterThan(leveragedPositions[1])
  expect(leveragedPositions[1]).toBeGreaterThan(leveragedPositions[2])
  await expect(page.getByRole('button', { name: 'הקודם' })).toBeDisabled()
  await expect(page.getByRole('link', { name: 'דלגו לתרחישים' })).toHaveAttribute('href', '#presets')

  const next = page.getByRole('button', { name: 'הבא' })
  await next.click()
  await expect(activeStep).toContainText('מסלולי שוק סינתטיים')
  await expect(activeStep).toContainText('אותם מסלולי שוק')

  await next.click()
  await expect(activeStep).toContainText('Backtest בוחן מסלול היסטורי יחיד')
  await expect(activeStep).toContainText('אינו טוב יותר לכל מטרה')
  await expect(activeStep).toContainText('משלים בדיקה היסטורית')

  await next.click()
  await expect(activeStep).toContainText('ברבור שחור הוא אירוע שוק נדיר וקיצוני')
  await expect(activeStep).toContainText('df נמוך יותר')
  await expect(activeStep).toContainText('אירועי קצה מופיעים בשווקים לעיתים קרובות יותר')
  await expect(activeStep).toContainText('משקיעים צריכים להביא גם אותם בחשבון')
  await expect(activeStep).toContainText('אינו חוזה אירוע מסוים')

  await next.click()
  await expect(activeStep).toContainText('חציון מול ממוצע')
  await expect(activeStep).toContainText('עלות מימון, margin call')
  await expect(page.getByRole('link', { name: 'לתרחישים המוכנים' })).toHaveAttribute('href', '#presets')

  const deepDive = page.getByText('להעמקה: היסטוריה, טאלב וברבורים שחורים', { exact: true })
  await deepDive.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/ההיסטוריה מראה לנו רק מסלול אחד/)).toBeVisible()
  await expect(page.getByText(/הברבור השחור.*נאסים ניקולס טאלב/)).toBeVisible()
  await expect(page.getByText(/גם סימולציה מוגבלת להנחות/)).toBeVisible()

  const helpToggles = page.getByRole('button', { name: 'הסבר ודוגמה' })
  await expect(helpToggles).toHaveCount(11)
  const volatilityField = page.locator('.parameter-field').filter({ has: page.locator('#annualVolatility') })
  await expect(volatilityField.locator('.field-description')).toHaveText('קובעת עד כמה התשואות עשויות לסטות מהממוצע.')
  await expect(volatilityField.locator('.field-description')).toHaveCSS('font-size', '12px')
  await volatilityField.getByRole('button', { name: 'הסבר ודוגמה' }).click()
  await expect(volatilityField.getByText(/תנודתיות של 30%.*מתנודתיות של 15%/)).toBeVisible()

  const tailField = page.locator('.parameter-field').filter({ has: page.locator('#degreesOfFreedom') })
  await tailField.getByRole('button', { name: 'הסבר ודוגמה' }).click()
  await expect(tailField.getByText(/תשואת המדד היומית נעצרת ב־‎-100% לפני הכפלתה במינוף/)).toBeVisible()

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
  await page.getByRole('button', { name: 'הבא' }).click()
  await page.getByRole('button', { name: 'הבא' }).click()
  await page.getByRole('button', { name: 'הבא' }).click()
  await expect(page.locator('.tour-step')).toContainText(/ברבור שחור הוא אירוע שוק נדיר וקיצוני/)
  await expect(page.locator('.tour-step')).toContainText(/פרמטר „עובי הזנבות” קובע כמה משקל המודל נותן לימים כאלה/)
  await expect(page.locator('#degreesOfFreedom-description')).toHaveText(/פחות דרגות חופש פירושן יותר אירועים חריגים \(ברבורים שחורים\)/)
})

test('הסיור נשאר קומפקטי וללא גלילה אופקית במובייל', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'איזה מינוף נבדק?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'במה זה שונה מ־Backtest?' })).toHaveCount(0)
  await expect(page.locator('.tour-step')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
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
  await page.addInitScript(() => {
    let finishSimulation = () => undefined
    window.Worker = class {
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: OnErrorEventHandler = null

      postMessage() {
        const send = (data: unknown) => this.onmessage?.(new MessageEvent('message', { data }))
        finishSimulation = () => send({ type: 'result', result: null })
        send({ type: 'progress', progress: 0.5 })
      }

      terminate() {
        finishSimulation = () => undefined
      }
    } as unknown as typeof Worker
    Object.defineProperty(window, '__finishSimulationForTest', {
      value: () => finishSimulation(),
    })
  })
  await page.goto(`/?${sharedScenario({ paths: '100', years: '1', tradingDays: '1' })}`)

  const status = page.locator('.status-pill')
  await expect.poll(() => statusSnapshot(status)).toEqual({
    text: expect.stringMatching(/מחשב · \d+%/),
    className: expect.stringContaining('status-pill--running'),
    color: 'rgb(255, 107, 114)',
  })

  await page.evaluate(() => {
    (window as typeof window & { __finishSimulationForTest: () => void }).__finishSimulationForTest()
  })

  await expect.poll(() => statusSnapshot(status), { timeout: 30_000 }).toEqual({
    text: 'המודל מוכן',
    className: 'status-pill',
    color: 'rgb(81, 229, 180)',
  })
})

async function statusSnapshot(status: import('@playwright/test').Locator) {
  return status.evaluate((element) => ({
    text: element.textContent,
    className: element.className,
    color: getComputedStyle(element.querySelector('span')!).backgroundColor,
  }))
}

test('קישור משותף עם מאה אלף מסלולים נשאר חוקי ומצמיד את המחוון לתקרה הרכה', async ({ page }) => {
  await page.goto(`/?${sharedScenario({ paths: '100000', years: '1', tradingDays: '1' })}`)

  const paths = page.getByRole('spinbutton', { name: 'מספר מסלולים' })
  const pathsSlider = page.getByRole('slider', { name: 'מספר מסלולים — מחוון' })
  await expect(paths).toHaveValue('100000')
  await expect(paths).toHaveAttribute('max', '100000')
  await expect(pathsSlider).toHaveAttribute('max', '10000')
  await expect(pathsSlider).toHaveValue('10000')
  await expect(page.locator('#paths-advisory')).toHaveText('מעל 10,000 מסלולים שימושי בעיקר לבדיקת אירועים נדירים ועלול להאריך משמעותית את החישוב.')
})

test('טוען סימולציה, משנה פרמטר ושומר אותו', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'מה קרה לכסף?' })).toBeVisible()

  await page.getByRole('spinbutton', { name: 'מספר מסלולים' }).fill('100')
  await page.getByRole('spinbutton', { name: 'ימי מסחר בשנה' }).fill('1')
  const years = page.getByRole('spinbutton', { name: 'טווח השקעה' })
  await years.fill('1')
  await expect(page.getByText('שווי חציוני').first()).toBeVisible({ timeout: 20_000 })

  await years.fill('3')
  await expect(page.getByText(/מסלולים · 3 שנים/)).toBeVisible({ timeout: 20_000 })
  await page.reload()
  await expect(page.getByRole('spinbutton', { name: 'טווח השקעה' })).toHaveValue('3')
  expect(errors).toEqual([])
})

test('מציג חריגה מתקרת החישוב כחסם תחתון בלי לפגוע בשיעור המחיקה', async ({ page }) => {
  await page.goto(`/?${sharedScenario({
    leverages: '1,20', years: '20', paths: '100', annualDrift: '1',
    annualVolatility: '0', tradingDays: '1',
  })}`)

  const warning = page.getByRole('alert', { name: 'חריגה מתקרת החישוב' })
  await expect(warning).toContainText('התוצאה חורגת מתקרת החישוב של 10¹⁵ ₪')
  await expect(warning).toContainText('מינוף 20×: 100 מתוך 100 מסלולים (100%)')

  const unaffectedCard = page.locator('.metric-card').filter({ hasText: '1×' })
  const affectedCard = page.locator('.metric-card').filter({ hasText: '20×' })
  await expect(unaffectedCard.getByText('חסם תחתון')).toHaveCount(0)
  await expect(affectedCard.getByText('חסם תחתון')).toBeVisible()
  await expect(affectedCard.getByLabel(/^לפחות/)).toHaveCount(4)
  await expect(affectedCard.getByText('פער ממוצע–חציון אינו זמין עקב החריגה')).toBeVisible()
  await expect(affectedCard.getByText('מחיקה מלאה').locator('..').getByText('0%')).toBeVisible()

  await affectedCard.click()
  await expect(page.getByText('הגרף המסומן הוא חסם תחתון').first()).toBeVisible()
  await expect(page.locator('.tail-panels').getByLabel(/^לפחות/)).toHaveCount(6)
})

test('אינו מציג אזהרת תקרה כאשר אף מסלול לא חרג', async ({ page }) => {
  await page.goto(`/?${sharedScenario({
    leverages: '1', years: '1', paths: '100', annualDrift: '0',
    annualVolatility: '0', tradingDays: '1',
  })}`)

  await expect(page.getByText('שווי חציוני')).toBeVisible()
  await expect(page.getByRole('alert', { name: 'חריגה מתקרת החישוב' })).toHaveCount(0)
  await expect(page.getByLabel(/^לפחות/)).toHaveCount(0)
})

test('קלט לא תקין חוסם הרצה ומציג הודעה', async ({ page }) => {
  await page.goto(`/?${sharedScenario({ paths: '100', years: '1', tradingDays: '1' })}`)
  await page.getByRole('spinbutton', { name: 'מספר מסלולים' }).fill('100001')
  await expect(page.getByText('מספר המסלולים חייב להיות מספר שלם בין 100 ל־100,000')).toBeVisible()
  await expect(page.locator('#paths-advisory')).toHaveCount(0)
  await expect(page.getByText('יש לתקן את הערכים המסומנים לפני הרצת הסימולציה.')).toBeVisible()
  await expect(page.getByRole('button', { name: /הרץ סימולציה/ })).toBeDisabled()
})

test('עשרת אלפים מסלולים נשארים בתחום המחוון בלי אזהרת עומס', async ({ page }) => {
  await page.goto(`/?${sharedScenario({ paths: '10000', years: '1', tradingDays: '1' })}`)
  await expect(page.getByRole('spinbutton', { name: 'מספר מסלולים' })).toHaveValue('10000')
  await expect(page.getByRole('slider', { name: 'מספר מסלולים — מחוון' })).toHaveValue('10000')
  await expect(page.locator('#paths-description')).toHaveText('קובע כמה עתידים אקראיים הכלי בודק · חישוב בינוני')
  await expect(page.locator('#paths-advisory')).toHaveCount(0)
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
