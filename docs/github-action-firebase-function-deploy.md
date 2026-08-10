# פריסת GitHub Action ל-Trusted Stats Function

המסמך הזה מסביר איך לפרוס ידנית מ-GitHub את פונקציית הסטטיסטיקות האמינות.

## מה ה-workflow עושה

ה-workflow `Deploy Trusted Stats Function` מריץ בדיקות ואז פורס רק את:

```bash
functions:onMatchResultSubmissionCreated
```

הוא משתמש בפרויקט Firebase:

```text
hebrew-tavla-online
```

## מה הוא לא עושה

- לא פורס Hosting.
- לא פורס Realtime Database rules.
- לא פורס את כל הפונקציות.
- לא משנה חוקי משחק, קוביות, AI, או סטטיסטיקות מה-client.
- לא מוסיף coins, XP, rewards או economy.

## secret נדרש ב-GitHub

צריך להוסיף repository secret בשם:

```text
FIREBASE_SERVICE_ACCOUNT_HEBREW_TAVLA_ONLINE
```

הערך של ה-secret הוא JSON של Firebase service account עם הרשאה לפרוס Cloud Functions בפרויקט `hebrew-tavla-online`.

חשוב: לא להדביק את ה-service account JSON ב-ChatGPT, בצ'אט, ב-commit, ב-PR, או במקום ציבורי.

## איפה מוסיפים את ה-secret

ב-GitHub:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

שם:

```text
FIREBASE_SERVICE_ACCOUNT_HEBREW_TAVLA_ONLINE
```

ערך: תוכן ה-JSON המלא של ה-service account.

## איך מריצים deploy

אחרי שה-secret קיים ואחרי שה-workflow ממוזג ל-`main`:

```text
GitHub -> Actions -> Deploy Trusted Stats Function -> Run workflow
```

בחר את branch `main` והריץ.

## איך בודקים שהפריסה הצליחה

ב-Firebase Console:

- Functions: לוודא ש-`onMatchResultSubmissionCreated` קיימת ופעילה.
- Realtime Database: לבדוק נתונים אחרי משחק אונליין.

## בדיקת QA אחרי deploy

1. סיים משחק אונליין אמיתי.
2. בדוק שנוצר:

```text
matchResultSubmissions/{uid}/{matchId}
```

3. בדוק שבתוך ה-submission נכתב:

```text
serverReview.status = "applied"
```

4. בדוק שנוצר:

```text
trustedStatsApplications/{matchId}
```

5. בדוק שהתעדכן:

```text
playerStats/{winnerUid}
playerStats/{loserUid}
```

6. ודא ש-`playerStats` מתעדכן רק אחרי פעולת השרת ולא מכתיבת client ישירה.
7. ודא שלא נוספו coins, XP, rewards או economy.

## אם ה-workflow נכשל

בדוק קודם:

- האם ה-secret קיים בשם המדויק.
- האם ה-service account שייך לפרויקט `hebrew-tavla-online`.
- האם ל-service account יש הרשאות deploy מתאימות ל-Cloud Functions.
- האם Blaze / billing פעיל בפרויקט Firebase.
