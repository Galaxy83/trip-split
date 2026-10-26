# trip-split

Who owes whom for a group trip. Add people, add what they paid, and the page splits the total by how many people are paying, then lists who pays whom.

No accounts. The trip is saved in this browser. **Share** copies a link with the trip in a short hash so someone else can open the same numbers. Older, longer links still open. Text fields use `dir="auto"`, so Hebrew names still display correctly.

Live site: https://galaxy83.github.io/trip-split/

## Use

1. Add at least two members.
2. Add expenses: a description, who paid, and the amount.
3. Read the summary. It updates as you type. The chart is two rings in the same color: the outer ring is what each member paid, the inner ring is their fair share, and the legend shows both amounts and the difference.
4. **Share**, or **Copy for WhatsApp**, to send the result.

A **Member** counts as one person. **Family** asks how many people are sharing the cost (the weight, at least 1, default 2) and is settled as one entry: “Cohen family pays Maxim”. Fair share per member is the total divided by the sum of the weights. Each entry’s share is that amount times its weight. An older share link treats every entry as a member of weight 1.

Amounts use two decimal places. The currency dropdown defaults to the Israeli shekel. Older links that stored a symbol such as ₪, €, or $ still open on the matching currency, or on the shekel when the symbol is unknown. Blank and invalid rows are ignored. Negative amounts are rejected.

**Minimize number of payments** is on for a new trip: it matches the largest debt to the largest credit. Turn it off to split each payer in proportion to what each person is owed. An older trip or share link that never stored this choice opens with it on. One that saved it off stays off.

**Reset trip** clears this browser. **Export CSV** downloads the expenses and balances. Opening a share link replaces the trip saved on that device. Reload keeps the trip.

The theme follows this device until you choose Light or Dark. That choice stays on this device and is not part of the share link. English is the default; עברית is Hebrew, laid out right to left; Русский is Russian, laid out left to right. The language is saved on this device and written into the share link (`?lang=en`, `?lang=he`, or `?lang=ru`), so the recipient opens the trip in the sender's language. Switching language updates the link. An older link with no language uses the language saved on that device, or English.

## עברית

העמוד באנגלית כברירת מחדל. אפשר לעבור לעברית, והפריסה תהיה מימין לשמאל. ערכת הנושא עוקבת אחרי המכשיר עד שבוחרים בהיר או כהה, והבחירה נשמרת במכשיר ולא נכללת בקישור. השפה נשמרת במכשיר וגם נכתבת בקישור השיתוף, כדי שמי שפותח אותו יראה את השפה של מי ששלח. החלפת שפה מעדכנת את הקישור. קישור ישן בלי שפה נפתח לפי השפה השמורה במכשיר, או באנגלית.

1. הוסיפו לפחות שני חברים.
2. הוסיפו הוצאות: תיאור, מי שילם, וסכום.
אפשר לסמן רשומה כחבר, או כמשפחה ולבחור כמה אנשים מחלקים את העלות. החלק ההוגן לכל חבר הוא הסכום חלקי סך המשקלות. קישור ישן נפתח כשכל הרשומות הן חברים במשקל 1. המטבע הוא רשימה, וברירת המחדל היא שקל. בסיכום יש תרשים עם שתי טבעות: החיצונית היא מה ששולם, והפנימית היא החלק ההוגן. ליד כל חבר מופיעים שני הסכומים וההפרש.

3. הסיכום מתעדכן תוך כדי הקלדה, כולל החלק ההוגן לכל חבר.
4. **שיתוף** מעתיק קישור. **העתקה לוואטסאפ** מעתיקה את מי משלם למי.

## Русский

По умолчанию страница на английском. Русский выбирается в шапке и остаётся слева направо. Язык сохраняется на этом устройстве и попадает в ссылку (`?lang=ru`), поэтому получатель откроет поездку по-русски. Смена языка обновляет ссылку. Старая ссылка без языка открывается на сохранённом языке или на английском.

Участник считается как один человек. Семья указывает, сколько людей делят стоимость (вес, минимум 1, по умолчанию 2), и рассчитывается одной записью: «Cohen family платит Maxim». Справедливая доля на человека — это сумма, делённая на общий вес. В итоге есть диаграмма из двух колец: внешнее — сколько оплачено, внутреннее — справедливая доля. Рядом с каждым участником указаны обе суммы и разница.

English, Hebrew, and Russian copy live in `src/strings.ts`.

## Develop

```bash
npm install
npm test
npm run dev
```

Dev server: http://localhost:5173/trip-split/

```bash
npm run build
npm run preview
```

Pushes to `main` run the unit tests, then deploy to GitHub Pages from GitHub Actions.
