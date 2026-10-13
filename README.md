# Textraordinary

Textraordinary is an interactive texting simulator that helps users practice communication in professional, social, or flirtatious scenarios. Users can choose from suggested responses or write their own, while AI-powered conversations and rubric-based feedback help them improve their texting skills.

## Project Setup

```sh
npm install
```

### Firebase configuration

Authentication uses Firebase. Copy `.env.example` to `.env.local` and fill in the values from the Firebase console (Project settings → General → Your apps → Web app). `.env.local` is gitignored, so each developer creates their own.

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
