# מיפוי index.html - ששבש טורקי אונליין

מסמך זה ממפה את המבנה הנוכחי של `index.html` כדי שנוכל לתכנן ריפקטור עתידי בלי לשבור את המשחק הקיים.

חשוב: זה מסמך תיעוד בלבד. אין כאן שינוי קוד, אין שינוי התנהגות, ואין שינוי ב-`index.html`.

## מטרת המסמך

- להבין מה נמצא בתוך `index.html`.
- לזהות אילו אזורים שייכים ל-HTML, CSS, לוגיקת משחק, AI, Firebase, אונליין, UI, אנימציות וחוקים מיוחדים.
- לסמן אילו פונקציות הן הכי בטוחות לחילוץ בעתיד.
- לסמן אילו חלקים אסור לגעת בהם עדיין.
- להפחית סיכון להחזרת באגים ישנים בזמן Migration.

## מבנה כללי של index.html

`index.html` הוא קובץ גדול אחד שמכיל כמעט את כל המשחק:

- HTML של המסך.
- CSS של העיצוב והרספונסיביות.
- JavaScript של המשחק.
- Firebase Realtime Database.
- לוגיקת משחק מול מחשב.
- לוגיקת משחק אונליין.
- אנימציות.
- חוקים מיוחדים.
- ירושלמי.
- Undo ו-End Turn.

נכון למיפוי הזה, הקובץ מכיל בערך 1,294 שורות.

## חלוקה לפי שורות

| שורות | אזור | מה יש שם |
| --- | --- | --- |
| `1-6` | פתיחת HTML | `doctype`, שפה עברית, RTL, meta, title |
| `7-229` | CSS | כל עיצוב המשחק |
| `231-420` | HTML של המסך | לוח, לובי, כפתורים, מודלים, חוקים, צ'אט |
| `421-435` | Firebase setup | imports, config, initializeApp, getDatabase |
| `437-511` | קבועים ומצב בסיסי | constants, `els`, `state`, helpers, log, sound |
| `512-660` | UI ולוח | בניית לוח, render, reset, בחירת אבנים, Undo snapshots |
| `661-760` | אנימציות ותצוגות | תנועת אבנים, remote move, victory, ירושלמי ויזואלי |
| `760-930` | לוגיקת משחק | תנועה, חוקיות מהלכים, תורות, גלגול, חוקים מיוחדים, מחשב |
| `930-1110` | AI וסיום משחק | סיום תור, 3 דאבלים, AI, pip count, win, ירושלמי |
| `1111-1294` | אונליין ואירועים | shared state, Firebase sync, rooms, reactions, event listeners, init |

## אזור HTML/UI

אזור עיקרי: שורות `231-420`.

כולל:

- `topbar` עם שם המשחק וסטטוס.
- `boardPanel` ו-`boardWrap`.
- `board`, `boardInner`, נקודות הלוח והבר.
- `diceDock`, `die1`, `die2`.
- `offBlack`, `offWhite`.
- `pipBlack`, `pipWhite`.
- `rollBtn`, `undoBtn`, `endBtn`, `newBtn`.
- פאנל תגובות צ'אט.
- פאנל חוקים מהיר.
- לוג מהלכים.
- `startModal` עם בחירת משחק מול מחשב, משחק מול חבר וחוקים.
- `onlinePanel` לפתיחת חדר והצטרפות.
- `roomLobby`.
- `rulesPanel` עם הסבר חוקים.
- `doubleModal`.
- `lastChanceModal`.

לא מומלץ לגעת באזור הזה בתחילת הדרך, כי הוא קשור ישירות למסך שעובד היום.

## אזור CSS/Layout

אזור עיקרי: שורות `7-229`.

כולל:

- עיצוב כללי של העמוד.
- עיצוב הלוח.
- נקודות הלוח.
- אבנים.
- בר.
- מגשי הוצאה.
- קוביות.
- אנימציות.
- מודלים.
- מובייל ורספונסיביות.
- פאנל צ'אט.
- פאנל חוקים.
- Pip count.
- Victory banner.
- ירושלמי.

אזורים רגישים במיוחד:

- `.offTray`
- `.boardWrap`
- `.pipCounter`
- `.chatCard`
- `.rulesQuickCard`
- `@media`
- `#doubleModal`
- `.reactionBubble`
- `.diceDock`
- `.floatingPiece`

אסור לגעת בהם עדיין, כי בעבר היו בעיות של מגשי הוצאה שחוזרים לתוך הלוח, פאנלים שלא נכנסים למסך, וחפיפות במובייל.

## Firebase ו-online setup

אזור עיקרי: שורות `421-435`.

כולל:

- import של Firebase app.
- import של Firebase Realtime Database.
- `firebaseConfig`.
- `initializeApp`.
- `getDatabase`.

לא לגעת באזור הזה בשלב מוקדם. שינוי קטן כאן יכול לשבור אונליין לגמרי.

## מצב המשחק המרכזי

אזור עיקרי: שורות `458-464`.

המשחק משתמש באובייקט מרכזי בשם `state`.

הוא כולל בין היתר:

- מצב הלוח.
- אבנים על הבר.
- אבנים שהוצאו.
- צבע השחקן וצבע המחשב.
- מי בתור.
- מצב המשחק.
- קוביות.
- מהלכים שנותרו.
- מצב `5-6` חופשי.
- מצב דאבל.
- Undo stack.
- לוג.
- double streak.
- אונליין.
- room code.
- player id.
- last move.
- ירושלמי.
- מנצח.

זה אזור מאוד חשוב. בעתיד לא כדאי לשנות אותו ישירות לפני שיש בדיקות.

## לוגיקת UI ולוח

אזורים עיקריים: שורות `512-660`.

פונקציות מרכזיות:

- `buildBoard`
- `renderEmptyDie`
- `setDie`
- `setDice`
- `setInitialBoard`
- `resetForNewGame`
- `renderAll`
- `renderBoard`
- `renderBar`
- `renderOff`
- `canEndCurrentTurn`
- `manualEndTurn`
- `renderUI`
- `canHumanRoll`
- `clearSelection`
- `selectableColor`
- `canInteract`
- `onPointClick`
- `onBarClick`
- `onOffClick`
- `selectSource`
- `snapshot`
- `restoreSnapshot`

חלק מהפונקציות כאן נוגעות ישירות ל-DOM ולכן לא מתאימות לחילוץ ראשון.

## אנימציות ותצוגות

אזורים עיקריים: שורות `661-760`, וגם `867-870`.

כולל:

- שמירת מהלך אחרון.
- אנימציית מהלך יריב אונליין.
- מציאת מיקום אבן על המסך.
- תנועת אבן עם `flyPiece`.
- הודעת ניצחון.
- אפקטים של ירושלמי.
- אנימציית גלגול קוביות.

לא לגעת כאן מוקדם. זה אזור רגיש כי באונליין בעבר מהלכי היריב לא הוצגו באנימציה.

## לוגיקת משחק וחוקיות מהלכים

אזורים עיקריים: שורות `760-930`.

פונקציות מרכזיות:

- `consumeMove`
- `applyMove`
- `cloneState`
- `allInHome`
- `canBearOff`
- `barDest`
- `legalMovesForToken`
- `uniqueTokens`
- `getAllLegalMoves`
- `getLegalMovesForSource`
- `startOpeningRoll`
- `openingRollLoop`
- `startTurn`
- `rollForCurrent`
- `rollDiceVisual`
- `processRoll`
- `isOneTwo`
- `isFourFive`
- `isFiveSix`
- `beginMovePhase`
- `showDoubleChooser`
- `chooseHumanDouble`
- `computerChooseDouble`
- `runComputerTurn`

זה האזור שממנו בעתיד אפשר להתחיל לחלץ פונקציות טהורות בזהירות, אבל לא את כולו בבת אחת.

## חוקים מיוחדים

אזורים עיקריים:

- `processRoll`: שורות `873-884`.
- `triggerSideSwap`: שורות `947-950`.
- ירושלמי: שורות `1020-1093`.

חוקים קיימים:

- `1-2` / `2-1`: הפסד תור.
- דאבל רגיל: ארבעה מהלכים ותור נוסף.
- 3 דאבלים: החלפת צדדים.
- `4-5` / `5-4`: בחירת דאבל בלי תור נוסף.
- `5-6` / `6-5`: שני מהלכים חופשיים.
- ירושלמי בסוף המשחק.

אזורים אלה רגישים מאוד. לא לחלץ אותם ראשונים.

## AI

אזורים עיקריים: שורות `918-1014`.

פונקציות מרכזיות:

- `runComputerTurn`
- `sameMove`
- `computerMove`
- `chooseAiSequence`
- `chooseBestSequenceFor`
- `generateSequences`
- `dedupeMoves`
- `quickMoveScore`
- `simulateSequence`
- `evaluate`
- `pipCount`
- `isHomePoint`
- `blotPenalty`
- `distributionScore`

חלק מהפונקציות כאן טהורות יחסית, אבל ה-AI תלוי חזק במבנה מצב המשחק. לא מומלץ להתחיל ממנו.

## סיום תור, ניצחון וירושלמי

אזורים עיקריים: שורות `930-1110`.

כולל:

- `endTurn`
- `triggerSideSwap`
- `checkWinAfterMove`
- `startLastChance`
- `resolveLastChance`
- `rollLastChanceNow`
- `finishGame`
- `initChanceSelectors`

לא לגעת מוקדם. אלה אזורים שמחוברים לבאגים ישנים: Undo, End Turn, 3 דאבלים וירושלמי.

## Firebase / Online sync

אזורים עיקריים: שורות `1111-1213`.

פונקציות מרכזיות:

- `sharedState`
- `normalizeBoard`
- `applyShared`
- `syncShared`
- `generateRoomCode`
- `renderLobby`
- `subscribeRoom`
- `createRoom`
- `joinRoom`
- `toggleReady`
- `startOnlineOpening`

זה אחד האזורים הכי רגישים במשחק. לא לגעת בו עד שיש בדיקות אונליין מסודרות בשני חלונות.

## Reactions וירושלמי UI

אזורים עיקריים: שורות `1214-1268`.

כולל:

- `showReaction`
- `sendReaction`
- `renderLastChanceUI`
- `lastChanceButton`

לא לגעת בשלב מוקדם, כי זה משפיע על אונליין ועל סיום משחק.

## Event listeners ו-init

אזורים עיקריים: שורות `1271-1294`.

כולל:

- התחלת משחק מול מחשב.
- פתיחת משחק חדש.
- גלגול.
- Undo.
- End Turn.
- מעבר בין טאבים בלובי.
- יצירת חדר.
- הצטרפות לחדר.
- ready.
- תגובות צ'אט.
- `init`.

לא לגעת בשלב מוקדם, כי כל כפתור במשחק תלוי בזה.

## פונקציות שהכי בטוח לחלץ בעתיד

בעתיד, אם מתחילים ריפקטור אמיתי, הכי בטוח להתחיל מפונקציות שלא נוגעות ב-DOM, לא נוגעות ב-Firebase, ולא מפעילות אנימציות:

- `WHITE`
- `BLACK`
- `SIGN`
- `otherColor`
- `countColorAt`
- `oppCountAt`
- `isBlocked`
- `cloneState`
- `allInHome`
- `canBearOff`
- `barDest`
- `legalMovesForToken`
- `uniqueTokens`
- `getAllLegalMoves`
- `pipCount`
- `isHomePoint`
- `distributionScore`
- `isOneTwo`
- `isFourFive`
- `isFiveSix`

גם פונקציות אלה צריכות להיחלץ רק אחרי שמוסיפים בדיקות או לפחות מבצעים QA ידני לפי `docs/manual-qa-checklist.md`.

## לא להוציא ראשון

לא להתחיל מחילוץ של:

- `processRoll`
- `endTurn`
- `triggerSideSwap`
- `applyShared`
- `syncShared`
- `renderBoard`
- `renderUI`
- `humanMove`
- `undo`
- `rollLastChanceNow`
- CSS של מובייל.
- CSS של מגשי הוצאה.

הסיבה: כל אלה מחוברים להתנהגות עובדת ורגישה.

## אזורים שאסור לגעת בהם עדיין

- `index.html` עצמו, עד שיש תוכנית ריפקטור קטנה ומוגדרת.
- Firebase config.
- imports של Firebase.
- CSS של `.offTray`, `.boardWrap`, `.pipCounter`, media queries.
- Undo ו-End Turn.
- 3 דאבלים / side-swap.
- Online sync.
- Remote move animation.
- ירושלמי UI וסנכרון.
- Chat reactions.
- Rules panel layout.

## באגים ישנים שעלולים לחזור

אם עושים ריפקטור לא זהיר, אלה הבאגים שהכי קל להחזיר:

- Undo ייעלם אחרי מהלך אחד.
- End Turn יאפשר סיום תור מוקדם מדי.
- מגשי ההוצאה יחזרו לתוך הלוח ויחסמו אבנים.
- 3 דאבלים יקפיא את המשחק.
- מהלכי יריב באונליין יופיעו בלי אנימציה.
- `5-6` יאפשר בטעות להכניס אבן מהבר לכל מקום.
- ירושלמי לא יסתנכרן לשני השחקנים.
- Pip count ישתבש אחרי אכילה, הוצאה או side-swap.
- פאנל החוקים והצ'אט לא ייכנסו למסך.

## משימת קוד קטנה מומלצת לעתיד

המשימה הראשונה בעתיד לא צריכה להיות ריפקטור גדול.

המשימה המומלצת:

1. ליצור קובץ חדש בלבד עבור helpers טהורים, למשל `src/game/rules.js`.
2. להעביר אליו רק פונקציות שלא נוגעות ב-DOM ולא ב-Firebase.
3. להשאיר את `index.html` עובד בדיוק כמו קודם.
4. לבדוק ידנית לפי רשימת QA.

אבל לפני המשימה הזו, כדאי לאשר את המיפוי במסמך הזה.

## בדיקות אם בעתיד מוסיפים רק תיעוד

אם השינוי הוא רק תיעוד, כמו המסמך הזה:

- לוודא שה-diff כולל רק את קובץ התיעוד.
- לוודא ש-`index.html` לא השתנה.
- לוודא שאין שינוי בקוד משחק.
- אין צורך בבדיקת משחק מלאה, כי אין שינוי התנהגות.

## בדיקות אם בעתיד מתחילים חילוץ helpers

אם בעתיד מתחילים חילוץ קוד, חובה לבדוק:

- משחק מול מחשב.
- Undo.
- End Turn.
- `1-2`.
- דאבל רגיל.
- 3 דאבלים.
- `4-5`.
- `5-6` עם אבן על הבר.
- Pip count.
- אונליין בשני חלונות.
- תגובות צ'אט.
- ירושלמי.
- layout מובייל.
