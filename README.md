# trip-split

Who owes whom for a group trip. Add people, add what they paid, and the page splits the total evenly and lists who pays whom.

No accounts. The trip is saved in this browser. **Share** copies a link with the trip in the URL so someone else can open the same numbers. Text fields use `dir="auto"`, so Hebrew names still display correctly.

Live site: https://galaxy83.github.io/trip-split/

## Use

1. Add at least two players.
2. Add expenses: a description, who paid, and the amount.
3. Read the summary. It updates as you type.
4. **Share**, or **Copy for WhatsApp**, to send the result.

Amounts use two decimal places. The currency symbol defaults to ₪. Blank and invalid rows are ignored. Negative amounts are rejected.

**Minimize number of payments** matches the largest debt to the largest credit. The default splits each payer in proportion to what each person is owed.

**Reset trip** clears this browser. **Export CSV** downloads the expenses and balances. Opening a share link replaces the trip saved on that device. Reload keeps the trip.

UI copy is English and lives in `src/strings.ts`.

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
