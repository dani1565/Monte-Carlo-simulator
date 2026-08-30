# מצב נוכחי

עודכן: 2026-08-30

## שחרור ציבורי

- Repository: https://github.com/dani1565/Monte-Carlo-simulator
- ענף ברירת מחדל: `main`
- אתר: https://dani1565.github.io/Monte-Carlo-simulator/
- baseline לפני חבילת ההעברה לקודקס: `78ba11b`
- ריצת איכות baseline: https://github.com/dani1565/Monte-Carlo-simulator/actions/runs/32965351964
- ריצת Pages baseline: https://github.com/dani1565/Monte-Carlo-simulator/actions/runs/32965351960
- חבילת ההעברה המקומית אומתה באמצעות `npm run check:release`; המספרים המעודכנים רשומים ביומן המימוש. לפני הוספת סמן ה־commit, בדיקת האתר אישרה HTTP 200, כותרת ו־assets. האימות הסופי לאחר המיזוג ידרוש גם התאמה מדויקת בין `main` לבין `build-commit` שבאתר.

## שערים

- מהיר: `npm run check:fast`
- מלא: `npm run check:full`
- שחרור: `npm run check:release`
- כיול מחקרי: `npm run calibrate:sp500-tail`
- אימות אתר חי: `npm run verify:live`

## מגבלות ידועות

- אין עלות מימון, דמי ניהול, מסים או tracking error.
- אין volatility clustering, regime switching או gaps כתהליך נפרד.
- אין historical replay או נתוני שוק חיים.
- `S&P היסטורי` הוא preset סינתטי עם זנב לחץ 4.2, לא שחזור היסטורי מלא.
- Cloudflare Web Analytics מודד שימוש מצרפי בלבד; האפליקציה אינה שולחת פרמטרי סימולציה לאחסון שרת.

## עבודה פתוחה

GitHub Issues הוא התור הקנוני: https://github.com/dani1565/Monte-Carlo-simulator/issues

- Issue #18 מוסיף סיור פתיחה מודרך וממתין להצגת Preview ולאישור בעלים לפני מיזוג.

אין לשמור backlog רק בקובץ זה. כל משימה חדשה נפתחת כ־Issue עם קריטריוני קבלה וסיווג אישור בעלים.
