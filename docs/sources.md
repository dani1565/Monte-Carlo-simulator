# מקורות ומתודולוגיית כיול

## סדרת S&P 500

- מקור: Federal Reserve Bank of St. Louis, FRED, סדרה `SP500`.
- עמוד הסדרה: https://fred.stlouisfed.org/series/SP500
- CSV ניתן לשחזור: `https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500&cosd=2016-08-26&coed=2026-08-24`
- חלון הבדיקה: 2016-08-26 עד 2026-08-24.
- הנתון: סגירה יומית של המדד.

## מתודולוגיה

הסקריפט `scripts/calibrate-sp500-tail.mts`:

1. מוריד את ה־CSV מטווח התאריכים הקבוע.
2. מסיר רשומות FRED חסרות המסומנות `.`.
3. מחשב תשואות פשוטות בין סגירות נצפות עוקבות:

```text
return(t) = close(t) / close(t-1) - 1
```

4. מחשב excess kurtosis בשיטת Fisher עם תיקון הטיית מדגם:

```text
G2 = ((n - 1) / ((n - 2)(n - 3))) × ((n + 1)g2 + 6)
```

5. ממיר excess kurtosis חיובי של Student-t לדרגות חופש באמצעות:

```text
df = 4 + 6 / excess_kurtosis
```

הנוסחה האחרונה תקפה ל־Student-t עם `df > 4`, שבו הקורטוזיס סופי.

## תוצאה מתועדת

הרצה מאומתת ב־2026-08-26:

```text
first observation: 2016-08-26
last observation:  2026-08-24
observations:       2511
returns:            2510
excess kurtosis:    15.833504835144865
fitted df:          4.378943263823818
```

הפלט שנוצר בפועל נשמר ב־[`docs/research/sp500-tail-calibration-2016-2026.json`](research/sp500-tail-calibration-2016-2026.json) ונוצר מחדש ישירות מן הסקריפט, בלי העתקה ידנית של המספרים.

הרצה מחדש:

```bash
npm run calibrate:sp500-tail
```

חידוש קובץ הראיה מתוך הפלט בפעולה אחת:

```bash
npm run --silent calibrate:sp500-tail > docs/research/sp500-tail-calibration-2016-2026.json
```

הריצה דורשת רשת ואינה חלק משער ה־CI הרגיל. הלוגיקה הטהורה של parsing, תשואות, קורטוזיס והמרה נבדקת ללא רשת ב־`src/simulation/tailCalibration.test.ts`.

## פרשנות מוצרית

- `df ≈ 4.379` הוא אומדן מחלון נתונים מסוים בלבד, לא קבוע טבע ולא אמת היסטורית נצחית.
- `df = 4.2` ב־preset הוא בחירת לחץ מכוונת, מעט קיצונית יותר מהאומדן, כדי לבדוק פגיעות של מינוף לברבורים שחורים.
- `df = 4.1` מתאים לבדיקת קיצון חזקה יותר; הוא אינו ברירת מחדל ולא כיול היסטורי נקי.
- חלון זמן, תדירות, שיטת תשואה ואומד הקורטוזיס יכולים לשנות את התוצאה.

## מקורות מתודולוגיים

- NIST/SEMATECH e-Handbook, “t Distribution”: https://www.itl.nist.gov/div898/handbook/eda/section3/eda3664.htm — מקור לתכונות התפלגות Student-t. גורם הנרמול במודל נובע מהשונות `df/(df-2)`, וההמרה `df = 4 + 6/kurtosis` נובעת מעודף הקורטוזיס `6/(df-4)` כאשר `df > 4`.
- Rockafellar and Uryasev, “Conditional Value-at-Risk for General Loss Distributions”: https://sites.math.washington.edu/~rtr/papers/rtr187-CVaR2.pdf — מקור להגדרת CVaR על התפלגות הפסד. המוצר מציג את אותו רעיון זנב בסימון של שווי סופי: ממוצע הערכים הנמוכים ביותר, ולא “הפסד צפוי” במטבע.
- SEC/Investor.gov, “Updated Investor Bulletin: Leveraged and Inverse ETFs”: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/sec — מקור להקשר של יעדי מינוף יומיים והבדל בין יעד יומי לתוצאה ארוכת טווח.

נוסחת `V(t+1) = V(t) × max(0, 1 + L × r)` היא החלטת מודל מפשטת של גרסה 1, המתועדת ב־ADR 0001. המקורות החיצוניים נותנים הקשר ותכונות סטטיסטיות; הם אינם טענה שהמודל משחזר מוצר ממונף מסוים על כל עלויותיו ומגבלותיו.

## מקור רעיוני לברבורים שחורים

Nassim Nicholas Taleb, *The Black Swan: The Impact of the Highly Improbable*, Random House, 2007. הספר משמש מקור רעיוני להסבר הסיכון שבהסתמכות־יתר על אירועים שכבר נצפו; הוא אינו מקור לנוסחת הסימולציה או לכיול הכמותי.

## כללי עדכון

- אין לשנות מספרים היסטוריים במסמך בלי להריץ את הסקריפט ולצרף פלט ו־commit.
- שינוי חלון, מקור או אומד מחייב הסבר ב־PR ועדכון ADR אם משמעות ה־preset משתנה.
- אין להוסיף הורדת נתונים למוצר עצמו בלי אישור בעלים; הסקריפט הוא כלי מחקר מבודד בלבד.
