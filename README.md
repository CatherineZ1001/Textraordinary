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