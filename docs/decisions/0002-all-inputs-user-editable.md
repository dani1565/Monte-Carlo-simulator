# ADR 0002 — כל קלטי הסימולציה ניתנים לעריכה

- מצב: Accepted
- תאריך: 2026-08-12
- מימוש: https://github.com/dani1565/Monte-Carlo-simulator/pull/2
- בדיקות: `src/simulation/validation.test.ts`, `src/components/ParameterField.test.tsx`, `src/state/parameterStorage.test.ts`

## הקשר

מטרת הכלי היא לאפשר בדיקת רגישות ולא לכפות הנחות נסתרות על המשתמש.

## החלטה

כל פרמטר שמגיע למנוע מוצג כקלט ניתן לעריכה ומאומת בשגיאה צמודה לשדה. טיוטה לא תקינה נשארת ניתנת לעריכה ואינה מפעילה סימולציה.

## חלופות שנדחו

- פרמטרים קבועים בקוד ללא שליטה בממשק.
- presets בלבד.
- תיקון אוטומטי שקט של קלט לא תקין.

## השלכות

שינוי בסכמת פרמטרים מחייב UI, validation, defaults, engine tests, URL/localStorage ותאימות לאחור.

## אישור עתידי

הסתרת פרמטר מנוע או הפיכתו לקבוע דורשת אישור בעלים.
