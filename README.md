# VoidVault Frontend

Production React frontend. Deployed at [voidvault.pages.dev](https://voidvault.pages.dev).

## Stack

- React 19 + TypeScript
- Vite
- Cookie-based API session (`credentials: include`)
- Cloudflare Pages

## Architecture

Browser -> Cloudflare Pages -> Cloudflare Worker API -> Supabase + Cloudinary

The frontend never touches Supabase directly. All auth and data goes through the backend Worker.

## Features

- Username + password signup - no email, no phone, no personal data
- Feed (Trending / Following tabs)
- Search (users and posts)
- Real-time notifications
- Anonymous Advice board
- Direct messaging (Chat)
- User profiles with editable bio and avatar initial
- Follow / Discover People
- Post composer with media support (via Cloudinary URL pipeline)
- Theme toggle (dark/light)
- Admin panel at `/admin` (requires admin credentials)

## Auth

Accounts are created with a username and password only.
Sessions are cookie-based and managed entirely by the backend.
**There is no email-based password reset.** If you lose your password, you will need to create a new account. Choose a strong password.

## Environment

Create `frontend/.env` (do not commit this file):

```env
VITE_API_URL=https://drift-backend.vivekyarra567.workers.dev
```

See `.env.example` for the full list of required variables.

## Local Development

```bash
cd frontend
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name voidvault --branch main
```
