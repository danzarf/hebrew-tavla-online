# בדיקות Emulator + Integration ל-Trusted Stats

מסמך זה נועד לבדיקה בטוחה **לפני** פריסה לפרודקשן.

## מטרה

לאמת מקומית שה-pipeline של verified stats עובד מקצה לקצה:

1. submission חוקי (online) מתעבד.
2. נכתב `trustedStatsApplications/{matchId}`.
3. `playerStats` מתעדכן למנצח/מפסיד.
4. duplicate לא נספר פעמיים.
5. submission לא חוקי/זדוני נדחה.

## חשוב לדעת

- Emulator ≠ Production. באמולטור אין סיכון לנתוני פרודקשן.
- אין צורך בסודות או בקובצי credentials.
- אין לבצע `firebase deploy` כחלק מהבדיקות הללו.

## פקודות הרצה

מה-root של הפרויקט:

```bash
npm install --prefix functions
npm run functions:check
npm run functions:test
npm run functions:integration:test
```

או הכל יחד:

```bash
npm run functions:emulator:test
```

להרצה ידנית של אמולטור לצפייה בלוגים בזמן אמת:

```bash
npm run functions:emulator
```

## מה הבדיקה האינטגרטיבית עושה בפועל

`functions/tests/emulator.integration.test.js` בודקת:

- submission חוקי `online` -> `serverReview.status = applied`.
- יצירת `trustedStatsApplications/{matchId}` עם `status = applied`.
- עדכון `playerStats/{winnerUid}` ו-`playerStats/{loserUid}`.
- כתיבה חוזרת לאותו path -> `serverReview.status = duplicate` וללא ספירה כפולה.
- submission לא חוקי (`mode=local`) -> `rejected` + `unsupported-mode`.
- submission זדוני (`clientSubmittedBy` לא תואם path) -> `rejected`.

## איפה לבדוק ב-DB Emulator

- `matchResultSubmissions/{uid}/{matchId}`
- `trustedStatsApplications/{matchId}`
- `playerStats/{uid}`

## payloads לדוגמה (fixtures למסמך)

אפשר להשתמש במבנים הבאים לבדיקות ידניות:

### 1) valid online

```json
{
  "matchId": "m_demo_1",
  "mode": "online",
  "players": [
    {"uid": "u_w", "color": "white"},
    {"uid": "u_l", "color": "black"}
  ],
  "winnerColor": "white",
  "loserColor": "black",
  "resultSource": "manual-emulator",
  "gameType": "tavla",
  "ruleset": "hebrew-tavla",
  "finalStatus": "normal-win",
  "clientSubmittedBy": "u_submit",
  "serverVerified": false,
  "trustedStatsApplied": false,
  "endedAt": 1700000000000,
  "submittedAt": 1700000000100
}
```

### 2) invalid local

כמו הדוגמה למעלה, אבל `"mode": "local"`.

### 3) malicious submitter mismatch

כמו הדוגמה למעלה, אבל `"clientSubmittedBy": "another_uid"`.

### 4) malicious economy fields

אפשר להוסיף שדות כמו `coins`, `xp`, `rewards` — הם לא חלק מחוזה ה-trusted stats ולא יעודכנו ב-`playerStats`.

## הצלחה/כישלון

הצלחה:

- כל הטסטים עוברים.
- אין duplicate increments ב-`playerStats`.
- invalid/malicious מקבלים `rejected`.

כישלון (לא לפרוס):

- טסט אינטגרציה נכשל.
- `playerStats` מתעדכן פעמיים על אותו `matchId`.
- submission לא חוקי מקבל `applied`.

## מה לשלוח ל-ChatGPT אם יש תקלה

1. הפקודה המדויקת שנכשלה.
2. הפלט המלא מהטרמינל.
3. צילום/העתקה של הערכים בנתיבים:
   - `matchResultSubmissions/{uid}/{matchId}`
   - `trustedStatsApplications/{matchId}`
   - `playerStats/{uid}`
4. האם התקלה קרתה ב-emulator או אחרי deploy.
