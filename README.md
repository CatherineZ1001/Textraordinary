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