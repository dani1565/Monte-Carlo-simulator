# מצב נוכחי

עודכן: 2026-08-31

## שחרור ציבורי

- Repository: https://github.com/dani1565/Monte-Carlo-simulator
- ענף ברירת מחדל: `main`
- אתר: https://dani1565.github.io/Monte-Carlo-simulator/
- baseline לפני חבילת ההעברה לקודקס: `78ba11b`
- שחרור מאומת אחרון: `8401cbd` — הבהרת אזהרת תקרת החישוב.
- ריצת איכות ב־`main`: https://github.com/dani1565/Monte-Carlo-simulator/actions/runs/33338582240
- ריצת Pages: https://github.com/dani1565/Monte-Carlo-simulator/actions/runs/33338582219
- האתר החי אומת באמצעות `npm run verify:live`: ‏HTTP 200, כותרת ו־assets תקינים, ו־`build-commit` תואם בדיוק ל־`8401cbd`.

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
- התשואה השנתית מומרת לרכיב יומי מצטבר; ללא תנודתיות וב־1× היא מתקבלת בדיוק לאחר שנת מסחר אחת.
- תשואת המדד הפשוטה נעצרת ב־‎-100% לפני החלת המינוף; החסימה עשויה להסיט מעט את המומנטים בתרחישי זנב קיצוניים.
- שווי תיק נשמר עד תקרת חישוב של `10^15` ₪; בחריגה, הממשק מדווח כמה מסלולים נפגעו ומסמן מדדי שווי וגרפים כחסמים תחתונים.
- Cloudflare Web Analytics מודד שימוש מצרפי בלבד; האפליקציה אינה שולחת פרמטרי סימולציה לאחסון שרת.

## עבודה פתוחה

GitHub Issues הוא התור הקנוני: https://github.com/dani1565/Monte-Carlo-simulator/issues

אין לשמור backlog רק בקובץ זה. כל משימה חדשה נפתחת כ־Issue עם קריטריוני קבלה וסיווג אישור בעלים.
