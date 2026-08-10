# מחיקה חד-פעמית של Trusted Stats Function

המסמך הזה מיועד למקרה שבו פריסת `onMatchResultSubmissionCreated` נכשלת עם שינוי סוג trigger.

## מתי להשתמש בזה

להשתמש רק אם deploy של הפונקציה נכשל עם:

```text
Changing from an HTTPS function to a background triggered function is not allowed.
Please delete your function and create a new one instead.
```

השגיאה אומרת שב-Google Cloud כבר קיימת פונקציה בשם:

```text
onMatchResultSubmissionCreated
```

באזור:

```text
europe-west1
```

אבל היא קיימת כ-HTTPS function, בזמן שהקוד הנוכחי מגדיר אותה כ-Realtime Database background trigger.

Firebase לא מאפשר לשנות trigger type במקום. צריך למחוק את הפונקציה הישנה ואז להריץ deploy מחדש כדי ליצור אותה נכון.

## מה ה-workflow מוחק

ה-workflow `Delete Trusted Stats Function` מוחק רק:

```text
functions:onMatchResultSubmissionCreated
```

באזור:

```text
europe-west1
```

הוא לא מוחק Hosting, לא מוחק Realtime Database, לא מוחק database rules, ולא משנה production data.

## מנגנוני בטיחות

- ה-workflow ידני בלבד (`workflow_dispatch`).
- יש input חובה בשם `confirm_function_name`.
- הערך חייב להיות בדיוק:

```text
onMatchResultSubmissionCreated
```

- פקודת המחיקה כוללת `--region europe-west1`.
- פקודת המחיקה כוללת שם פונקציה יחיד בלבד.
- ה-workflow משתמש באותו secret:

```text
FIREBASE_SERVICE_ACCOUNT_HEBREW_TAVLA_ONLINE
```

## איך להריץ

אחרי שה-workflow ממוזג ל-`main`:

```text
GitHub -> Actions -> Delete Trusted Stats Function -> Run workflow
```

בחר branch:

```text
main
```

בשדה `confirm_function_name` כתוב בדיוק:

```text
onMatchResultSubmissionCreated
```

ואז הרץ.

## אחרי המחיקה

הרץ מיד את workflow הפריסה הרגיל:

```text
GitHub -> Actions -> Deploy Trusted Stats Function -> Run workflow
```

בחר branch:

```text
main
```

ה-deploy אמור ליצור את הפונקציה מחדש כ-Realtime Database trigger באזור `europe-west1` על instance:

```text
hebrew-tavla-online-default-rtdb
```

## בדיקת הצלחה

ב-Firebase Console / Google Cloud Console:

- לוודא ש-`onMatchResultSubmissionCreated` קיימת באזור `europe-west1`.
- לוודא שהיא event/background trigger ולא HTTPS-only function.
- לסיים משחק אונליין ולבדוק:

```text
matchResultSubmissions/{uid}/{matchId}/serverReview
trustedStatsApplications/{matchId}
playerStats/{uid}
```
