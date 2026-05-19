# מדריך פריסה בטוחה ל-Firebase Functions (Trusted Stats)

מדריך זה מיועד לפריסה מאובטחת של פונקציית האימות:
`onMatchResultSubmissionCreated`.

> חשוב: המדריך לא מבצע פריסה אוטומטית. הפריסה נעשית ידנית בלבד על ידך, לפרויקט Firebase הנכון.

## 1) מה ה-Function עושה בפרויקט הזה

ה-Function מאזין ליצירת רשומה חדשה תחת:

- `matchResultSubmissions/{uid}/{matchId}`

לאחר יצירה הוא:

1. מבצע סניטציה לשדות.
2. מבצע ולידציה לחוזה תוצאת המשחק.
3. דוחה תוצאות לא תקינות.
4. מגן על Idempotency באמצעות:
   - `trustedStatsApplications/{matchId}`
5. מעדכן `playerStats/{uid}` רק בצד שרת (Admin SDK), אם התוצאה תקינה ולא דופליקט.

## 2) למה Trusted Stats חייבים backend

הלקוח (דפדפן) אינו מקור אמין לנתונים רגישים. לכן:

- הלקוח לא יכול לכתוב ישירות `playerStats`.
- הלקוח לא יכול לסמן `serverVerified=true` או `trustedStatsApplied=true`.
- השרת הוא הגורם היחיד שמכריע אם תוצאה תקפה ומיישם סטטיסטיקות.

## 3) דרישות מוקדמות לפני פריסה

- יש לך גישה לפרויקט Firebase הנכון.
- הפעלת Realtime Database בפרויקט.
- קובץ `database.rules.json` מעודכן ומיושם.
- קיימת תיקיית `functions/` עם dependencies מותקנים.

## 4) האם נדרשת חבילת Blaze?

בפועל, ברוב המקרים פריסת Cloud Functions דורשת פרויקט Firebase בתוכנית Blaze (Pay as you go).

מומלץ לוודא זאת מול דף הבילינג העדכני ב-Firebase Console לפני הפריסה.

## 5) התקנת Firebase CLI

```bash
npm install -g firebase-tools
firebase --version
```

(אפשר גם להשתמש ב-`npx firebase` ללא התקנה גלובלית.)

## 6) התחברות ל-Firebase

```bash
firebase login
```

## 7) בחירת הפרויקט הנכון (קריטי)

```bash
firebase projects:list
firebase use <YOUR_PROJECT_ID>
firebase use
```

לפני פריסה ודא שהפרויקט הפעיל הוא הפרויקט הנכון, ולא פרויקט אקראי.

## 8) התקנת dependencies של functions

מה-root של הריפו:

```bash
npm install --prefix functions
```

## 9) הרצת בדיקות וולידציה לפני פריסה

מה-root של הריפו:

```bash
npm run functions:check
npm run functions:test
```

אופציונלי (בדיקות כלליות של הריפו):

```bash
npm test
```

## 10) פריסה של הפונקציה בלבד

```bash
firebase deploy --only functions:onMatchResultSubmissionCreated
```

כך נמנעת פריסה רחבה של כל שירותי Firebase בטעות.

## 11) אימות שהפריסה הצליחה

1. בדוק פלט CLI שהפריסה הסתיימה ללא שגיאות.
2. פתח Firebase Console > Functions וודא שהפונקציה מופיעה כ-Active.
3. שלח משחק בדיקה אמיתי מהאפליקציה (אונליין) כדי לייצר submission.
4. בדוק ב-Realtime Database:
   - נוצר `serverReview` תחת submission.
   - במקרה תקין: `status: "applied"`.
   - במקרה כפול: `status: "duplicate"`.
   - במקרה דחייה: `status: "rejected"` + `reason`.
5. בדוק ש-`playerStats/{uid}` מתעדכן רק לאחר פעולת השרת.

## 12) בדיקת לוגים

```bash
firebase functions:log --only onMatchResultSubmissionCreated --limit 100
```

אפשר גם דרך Firebase Console > Functions > Logs.

## 13) Rollback / Disable במקרה תקלה

אם צריך לעצור מיד:

```bash
firebase functions:delete onMatchResultSubmissionCreated --force
```

לאחר מכן לתקן קוד ולפרוס שוב.

אם התקלה לא קריטית, עדיף לתקן ולבצע deploy נקודתי מחדש במקום מחיקה.

## 14) מה אסור לעשות

- לא לפרוס מפרויקט Firebase לא נכון.
- לא להכניס לריפו קבצי Service Account JSON.
- לא לפתוח כתיבה מהלקוח ל-`playerStats`.
- לא לאפשר ללקוח לסמן `serverVerified` / `trustedStatsApplied`.
- לא להוסיף coins / XP / rewards לפני ש-Trusted Stats מאומת ועובד יציב בשרת.

## 15) סטטוס שרת שנכתב כיום

הפונקציה כותבת סטטוס שרת תחת:

- `matchResultSubmissions/{uid}/{matchId}/serverReview`

ערכים אפשריים:

- `applied`
- `duplicate`
- `rejected` (עם `reason`)

כך אפשר להבין למה תוצאה נדחתה/הוחלה בלי לאפשר זיוף צד לקוח.

## 16) בדיקות Emulator/בדיקות יחידה לפני פריסה אמיתית

### הרצת בדיקות פונקציות בלבד

מה-root:

```bash
npm run functions:test
```

או ישירות:

```bash
npm test --prefix functions
```

### בדיקת תקינות קוד Function

```bash
npm run functions:check
```

### עבודה עם Firebase Emulator Suite (אופציונלי אך מומלץ)

1. הפעל אמולטור Realtime Database + Functions.
2. שחק משחק אונליין בדיקה (לא local/AI).
3. בדוק ב-Emulator UI/Realtime Database את הנתיבים:
   - `matchResultSubmissions/{uid}/{matchId}`
   - `trustedStatsApplications/{matchId}`
   - `playerStats/{uid}`

### איך יודעים שה-Function באמת רצה

- נכתב `serverReview` תחת ה-submission.
- בסטטוס תקין: `serverReview.status = "applied"`.
- במקרה דופליקט: `serverReview.status = "duplicate"`.
- במקרה דחייה: `serverReview.status = "rejected"` + `reason`.

### מה לא לערוך ידנית

- לא לערוך ידנית `playerStats/{uid}`.
- לא לערוך ידנית `trustedStatsApplications/{matchId}`.
- לא להזריק ידנית `serverVerified:true` או `trustedStatsApplied:true` מהלקוח.
