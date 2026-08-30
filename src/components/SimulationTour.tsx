import { useState, type ReactNode } from 'react'

interface TourStep {
  title: string
  content: ReactNode
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'איזה מינוף נבדק?',
    content: <>
      <p>הכלי מדמה <strong>מינוף יומי</strong>: בכל יום תשואת המדד מוכפלת ברמת המינוף, בדומה למודל מפושט של קרן ממונפת יומית. הוא אינו מדמה הלוואה, מרג׳ין או דרישות ביטחונות.</p>
      <div className="leverage-example" aria-label="דוגמה להשפעת מינוף יומי לאורך יומיים">
        <div>
          <span>מדד רגיל</span>
          <strong className="tour-sequence" dir="rtl" aria-label="מסלול המדד: 100, אחר כך 110, ולבסוף 99">
            <span className="tour-sequence-value" aria-hidden="true">100</span>
            <span className="tour-sequence-arrow" aria-hidden="true">←</span>
            <span className="tour-sequence-value" aria-hidden="true">110</span>
            <span className="tour-sequence-arrow" aria-hidden="true">←</span>
            <span className="tour-sequence-value" aria-hidden="true">99</span>
          </strong>
          <small>יום של ‎+10%‎ ואחריו ‎-10%‎</small>
        </div>
        <div>
          <span>מינוף יומי 3×</span>
          <strong className="tour-sequence" dir="rtl" aria-label="מסלול המינוף היומי פי 3: 100, אחר כך 130, ולבסוף 91">
            <span className="tour-sequence-value" aria-hidden="true">100</span>
            <span className="tour-sequence-arrow" aria-hidden="true">←</span>
            <span className="tour-sequence-value" aria-hidden="true">130</span>
            <span className="tour-sequence-arrow" aria-hidden="true">←</span>
            <span className="tour-sequence-value" aria-hidden="true">91</span>
          </strong>
          <small>יום של ‎+30%‎ ואחריו ‎-30%‎</small>
        </div>
      </div>
      <p className="tour-takeaway"><strong>המסקנה:</strong> בגלל הצבירה היומית, התוצאה המצטברת אינה פשוט פי שלושה מתוצאת המדד.</p>
    </>,
  },
  {
    title: 'מה הסימולטור עושה?',
    content: <>
      <p>הסימולטור יוצר אלפי <strong>מסלולי שוק סינתטיים</strong>. כל מסלול הוא רצף יומי אקראי שנוצר לפי הנחות התשואה, התנודתיות ועובי הזנבות שבחרתם.</p>
      <p>כל רמות המינוף נבדקות על אותם מסלולי שוק, כך שההבדל בתוצאות נובע מהמינוף ולא מהגרלות שונות. בסוף מוצגת התפלגות של תוצאות אפשריות — לא מספר יחיד.</p>
    </>,
  },
  {
    title: 'במה זה שונה מ־Backtest?',
    content: <>
      <p><strong>Backtest בוחן מסלול היסטורי יחיד</strong> ותלוי מאוד בתקופה שנבחרה. מונטה קרלו יוצר אלפי מסלולים אפשריים תחת אותן הנחות, ולכן מתאים יותר לבחינת טווח תוצאות, רגישות וסיכוני קצה.</p>
      <p className="tour-takeaway"><strong>חשוב:</strong> מונטה קרלו אינו טוב יותר לכל מטרה. הוא משלים בדיקה היסטורית, אינו משחזר את העבר ואינו מבטיח שהעתיד יתאים למודל.</p>
    </>,
  },
  {
    title: 'מהם ברבורים שחורים ולמה הם חשובים?',
    content: <>
      <p>ברבור שחור הוא אירוע שוק נדיר וקיצוני — למשל נפילה חדה או פער פתיחה — שעלול לפגוע בתיק ממונף הרבה יותר מיום רגיל, משום שגם ההפסד היומי מוכפל. אירועי קצה מופיעים בשווקים לעיתים קרובות יותר מכפי שמודל של תנודות רגילות עלול לגרום לנו לצפות, ולכן משקיעים צריכים להביא גם אותם בחשבון.</p>
      <p>פרמטר <strong>„עובי הזנבות”</strong> קובע כמה משקל המודל נותן לימים כאלה. <strong><span dir="ltr">df</span> נמוך יותר</strong> פירושו יותר תנועות קצה. המודל בוחן פגיעות לאירועים נדירים, אך אינו חוזה אירוע מסוים.</p>
    </>,
  },
  {
    title: 'מה לבדוק בתוצאות ומה חסר במודל?',
    content: <>
      <p>התחילו ב<strong>חציון מול ממוצע</strong>: פער גדול ביניהם עשוי להעיד שמעט תוצאות חריגות מושכות את הממוצע למעלה. לאחר מכן בדקו את הפיזור, CVaR ושיעור המחיקה המלאה.</p>
      <p className="tour-takeaway"><strong>גבולות המודל:</strong> אין כאן עלות מימון, margin call, דמי ניהול, tracking error, מסים, נתוני שוק חיים או historical replay. זו המחשה מחקרית, לא תחזית או ייעוץ השקעות.</p>
    </>,
  },
]

export function SimulationTour() {
  const [activeStep, setActiveStep] = useState(0)
  const step = TOUR_STEPS[activeStep]
  const stepNumber = activeStep + 1

  return <section className="simulation-tour" aria-labelledby="simulation-tour-title">
    <header className="tour-heading">
      <div>
        <p className="eyebrow">לפני שמתחילים</p>
        <h2 id="simulation-tour-title">הכירו את הסימולטור בחמישה צעדים</h2>
        <p>הסיור קצר ולא חוסם — אפשר לדלג ישירות להגדרות ולהתחיל לבדוק תרחיש.</p>
      </div>
      <a className="tour-skip" href="#presets">דלגו לתרחישים</a>
    </header>

    <div className="tour-progress" aria-label={`צעד ${stepNumber} מתוך ${TOUR_STEPS.length}`}>
      <span>{stepNumber} מתוך {TOUR_STEPS.length}</span>
      <div aria-hidden="true">{TOUR_STEPS.map((item, index) => <i key={item.title} className={index === activeStep ? 'active' : index < activeStep ? 'complete' : ''} />)}</div>
    </div>

    <div className="tour-step" role="region" aria-label={`צעד ${stepNumber} מתוך ${TOUR_STEPS.length}`} aria-live="polite">
      <p className="tour-step-label">צעד {stepNumber}</p>
      <h3>{step.title}</h3>
      <div className="tour-step-content">{step.content}</div>
    </div>

    <nav className="tour-navigation" aria-label="ניווט בסיור">
      <button type="button" className="tour-secondary" disabled={activeStep === 0} onClick={() => setActiveStep((current) => current - 1)}>הקודם</button>
      {activeStep < TOUR_STEPS.length - 1
        ? <button type="button" className="tour-primary" onClick={() => setActiveStep((current) => current + 1)}>הבא <span aria-hidden="true">←</span></button>
        : <a className="tour-primary" href="#presets">לתרחישים המוכנים <span aria-hidden="true">↓</span></a>}
    </nav>

    <details className="tour-deep-dive">
      <summary>להעמקה: היסטוריה, טאלב וברבורים שחורים</summary>
      <div>
        <h3>למה לא להסתפק בהרצה היסטורית?</h3>
        <p>ההיסטוריה מראה לנו רק מסלול אחד שהתממש מתוך מסלולים רבים שהיו יכולים להתממש. בדיקה היסטורית מספרת מה קרה בתקופה מסוימת; סימולציית מונטה קרלו מרחיבה את המבט ובודקת אלפי עתידים אפשריים תחת אותן הנחות.</p>
        <p>הרעיון קשור לאזהרה שבספר <cite>„הברבור השחור”</cite> של נאסים ניקולס טאלב מפני הסתמכות־יתר על מה שכבר נצפה ועל סיפורים שנראים ברורים רק בדיעבד.</p>
        <h3>מה חשוב לזכור?</h3>
        <p>גם סימולציה מוגבלת להנחות שהוזנו. היא מרחיבה את מגוון האפשרויות ביחס למסלול היסטורי יחיד, אך אינה יכולה להבטיח שתכלול אירוע קיצוני שהמודל לא מייצג.</p>
      </div>
    </details>
  </section>
}
