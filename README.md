# ClawOps Dashboard

Single pane of glass for the Pattern Engine operation. Shows season tracking, content pipeline, agent health, and business metrics.

## Stack

- **Next.js 14** (App Router, Server Components)
- **Tailwind CSS** (dark theme, #FF7D45 accent)
- **Data Sources:** OpenRouter API, Beacon (Supabase), Postiz, OpenClaw cron

## Setup

```bash
npm install
cp .env.example .env.local  # Fill in your keys
npm run dev
```

## Deploy

Connect to Vercel, set environment variables, add `ops.patternengine.ai` custom domain.

## Architecture

See the [Architecture Proposal](https://docs.google.com/document/d/12nKCBLfXdYngYEGtPw0zaIRLfK4883ayrlOjVFLWrbs/edit) in Google Drive.

---

Pattern Engine LLC · Built by Cyrus 🦅
