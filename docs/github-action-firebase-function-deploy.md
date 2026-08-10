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

## אזור הפונקציה וה-Database

הפונקציה מאזינה ל-Realtime Database ולכן אזור ה-trigger חייב להתאים לאזור של מסד הנתונים הקיים.

בפרויקט הזה ה-RTDB production URL הוא:

```text
https://hebrew-tavla-online-default-rtdb.europe-west1.firebasedatabase.app
```

לכן הפונקציה מוגדרת לאזור:

```text
europe-west1
```

ול-instance:

```text
hebrew-tavla-online-default-rtdb
```

אם ה-trigger מוגדר לאזור אחר, למשל `us-central1`, הפריסה יכולה להיכשל עם:

```text
pattern cannot match any databases in region us-central1
```

אם צריך לאמת ידנית:

```text
Firebase Console -> Realtime Database -> Data/Settings -> database URL/location
```

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

## בדיקת Preflight לפני deploy

לפני פקודת ה-deploy, ה-workflow בודק מראש ש-APIs חשובים לפריסת Firebase Functions Gen 2 כבר פעילים. אם חסר API, ה-workflow יעצור לפני deploy וידפיס רשימה אחת של כל ה-APIs החסרים.

APIs שצריכים להיות פעילים בפרויקט:

```text
artifactregistry.googleapis.com
cloudbilling.googleapis.com
cloudbuild.googleapis.com
cloudfunctions.googleapis.com
eventarc.googleapis.com
firebase.googleapis.com
firebasedatabase.googleapis.com
pubsub.googleapis.com
run.googleapis.com
serviceusage.googleapis.com
```

השגיאה האחרונה שנראתה היתה חסימה על:

```text
cloudbilling.googleapis.com
```

אם ה-API הזה חסר, הפתרון הקצר הוא לפתוח:

```text
Google Cloud Console -> APIs & Services -> Library -> Cloud Billing API -> Enable
```

## הרשאות מומלצות ל-service account של GitHub Actions

ה-service account שנמצא ב-secret:

```text
FIREBASE_SERVICE_ACCOUNT_HEBREW_TAVLA_ONLINE
```

צריך להיות principal עם הרשאות שמאפשרות deploy של Functions Gen 2. לפרויקט קטן ואישי, הסט הפרקטי הוא:

```text
roles/cloudfunctions.admin
roles/iam.serviceAccountUser
roles/firebase.admin
roles/cloudbuild.builds.editor
roles/artifactregistry.writer
roles/run.admin
roles/eventarc.admin
roles/pubsub.admin
roles/storage.admin
```

כדי למנוע מרדף אחרי API חסר בכל deploy ראשון, אפשר להוסיף גם:

```text
roles/serviceusage.serviceUsageAdmin
```

אם לא רוצים לתת ל-service account הרשאה להפעיל APIs, אז צריך להפעיל ידנית מראש את כל ה-APIs ברשימה למעלה.

הערה: לא לתת service-agent roles ל-service account רגיל. תפקידים כאלה מיועדים רק ל-service agents של Google.
