# Textraordinary

Textraordinary is an interactive texting simulator that helps users practice communication in professional, social, or flirtatious scenarios. Users can choose from suggested responses or write their own, while AI-powered conversations and rubric-based feedback help them improve their texting skills.

## Project Setup

```sh
npm install
```

### Firebase configuration

Authentication uses Firebase. Copy `.env.example` to `.env.local` and fill in the values from the Firebase console (Project settings → General → Your apps → Web app). `.env.local` is gitignored, so each developer creates their own.

### AI (UF NaviGator Toolkit)

AI features use UF's [NaviGator Toolkit](https://docs.ai.it.ufl.edu/docs/navigator_toolkit/intro), which is OpenAI-compatible. Get an API key at https://api.ai.it.ufl.edu/ui (GatorLink sign-in), then add it to `.env.local`:

```sh
NAVIGATOR_API_KEY=sk-...
```

Do **not** prefix it with `VITE_`, or Vite will bundle it into the browser code. You can also set it as an OS environment variable with the same name, which takes priority over `.env.local`:

```powershell
# Windows (PowerShell); restart your terminal/editor afterwards
setx NAVIGATOR_API_KEY "sk-..."
```

```sh
# macOS / Linux: add to ~/.zshrc or ~/.bashrc
export NAVIGATOR_API_KEY="sk-..."
```

The Vite dev/preview server proxies `/api/navigator` to NaviGator and adds the key on the server side, so it is never sent to the browser. Call the model from app code with `chat()` / `chatJson()` in `src/ai/navigator.ts`. To change the model, set `VITE_NAVIGATOR_MODEL` in `.env.local` (default: `gpt-oss-120b`).

**Cost:** every UF student, faculty and staff member gets a free $100/month credit (reset monthly) for personal Toolkit keys. It only covers models hosted locally at UF, such as `gpt-oss-120b` and `llama-3.3-70b-instruct`. Cloud models (`gpt-4o`, `gpt-4.1`, …) need a team account with a UFIT billing number, so stick to local models unless your team has one.

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with ESLint

```sh
npm run lint
```

## Administrators

To make someone an administrator, open the Firebase console → **Firestore Database** → `users` → their document (the ID is their uid, and the document shows their email), click **Add field**, and add `admin` of type **boolean** set to `true`. They see an **Admin** link in the nav bar after reloading the page. Delete the field (or set it to `false`) to remove the role.

The security rules stop members from setting `admin` on themselves; only the console or an existing administrator can change it. A user's document is created the first time they sign in, so they need to sign in once first.

## Daily challenges

Every day, all members get the same scenario as the daily challenge (`/daily`, also linked from the dashboard and the scenario list). Code is in `src/data/daily.ts`.

- Administrators schedule scenarios on the admin page (`/admin/scenarios`): change any of the next 14 days, or fill the next _n_ days from chosen scenarios. The page warns when tomorrow isn't scheduled. Each scheduled date is a `dailyChallenges/{YYYY-MM-DD}` document holding its `scenarioId`; only administrators can write them.
- A date with nothing scheduled falls back to the scenario list (scenarios take turns in their `order`), so every date always has a challenge.
- `users/{uid}/dailyResults/{YYYY-MM-DD}` is a member's official result. The security rules only allow creating it, so each challenge counts once and the result page is shown afterwards.
- Streaks are worked out from those results (`src/data/streaks.ts`); missing a day resets the streak.
- `/daily/archive` lists past challenges. Replaying one saves nothing, so official scores and streaks don't change.

Dates are in the member's own time zone. **After pulling these changes, publish `firestore.rules` in the Firebase console** (Firestore → Rules), otherwise the real database rejects the daily challenge writes.

## Attempt history

Every time a signed-in member plays a scenario, the attempt is saved to `users/{uid}/attempts/{attemptId}` (code in `src/data/attempts.ts`, shape in `src/types/attempt.ts`). It's the same structure for every practice mode: picked or written replies, regular practice, daily challenges (`source: 'daily'`) and their replays (`source: 'replay'`).

- Each attempt stores the scenario, the mode (`choose`, `write`, or `mixed` if the member switched), and for each round the reply, score and the coach's feedback (verdict, tone match, strengths, improvements, suggested rewrite), plus the average score and when it was started and completed.
- It's saved after every round, so an attempt the member leaves halfway is kept as `in-progress`. "Practice again" starts a new attempt.
- The security rules let a member read only their own history, and only add rounds to their own unfinished attempts. Earlier rounds and finished attempts can't be changed, and nothing can be deleted.

**Publish `firestore.rules` in the Firebase console after pulling this**, otherwise the real database rejects the history writes (the practice page then shows "couldn't be saved to your history").

## Tests

End-to-end tests in `e2e/` use [Playwright](https://playwright.dev) to click through the app like a user. Each test is named after its manual test case (`TC-UA-01`, `TC-SR-01`, `TC-CR-01`).

They never touch the real Firebase project or use NaviGator credit:

- **Firebase:** the app runs against the local [Firebase emulators](https://firebase.google.com/docs/emulator-suite) with a throwaway demo project (settings in `.env.test`). Before each run, the emulators are wiped, the test account `testuser01@example.com` is created, and the test scenario in `e2e/fixtures/scenarios.json` is seeded.
- **AI grading:** each test replaces the NaviGator request with a fixed answer, so the grade is the same every run. No API key is needed.

`firestore.rules` is a copy of the rules deployed in the Firebase console, so the emulator behaves like the real database. If you change the rules in the console, update this file too.

### Running them in GitHub

The **Tests** workflow (`.github/workflows/tests.yml`) runs automatically on every pull request and every push to `main`. You don't need anything installed to use it: open your PR and check the result at the bottom. If it fails, open the run and download the `playwright-report` artifact to see what went wrong, with a trace of each step.

### Running them on your computer (optional)

The Firebase emulators need **Java 21 or newer** (check with `java -version`). If you don't have it, install [Temurin JDK 21](https://adoptium.net/temurin/releases/?version=21) or skip local runs and rely on the GitHub check. Java is only needed for the tests, not for running the app.

```sh
npx playwright install chromium   # once, downloads the test browser
npm run test:e2e                  # run all tests
npm run test:e2e:ui               # or watch them run step by step
npx playwright show-report        # open the last run's report
```

Run the tests through these npm scripts, not with `npx playwright test` directly: the scripts start the emulators first.