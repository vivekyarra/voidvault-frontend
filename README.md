# VoidVault Frontend

Production React frontend for VoidVault, deployed on Cloudflare Pages.

## Stack
- React 19 + TypeScript
- Vite
- Cookie-based API session model (`credentials: include`)

## Architecture
Browser -> Frontend (Pages) -> Drift Backend (Workers) -> Supabase + Cloudinary

Frontend does not use Supabase auth directly.

## Features
- Signup/login with recovery-key flow
- Mobile-first dashboard UI
- Trending/following feed
- Search, follow, notifications, chat, profile, advice
- Post composer with media URL pipeline support
- Theme toggle and auth/session guard behavior
- Admin route at `/admin` with moderation tools

## Environment
Create `frontend/.env`:
```env
VITE_API_URL=https://drift-backend.vivekyarra567.workers.dev
```

## Local Development
```bash
cd frontend
npm install
npm run dev
```

## Validation
```bash
npm run lint
npm run build
```

## Deploy to Cloudflare Pages
```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name voidvault --branch main --commit-dirty=true
```

Production domain:
- `https://voidvault.pages.dev`

## Important Integration Notes
- API calls use `credentials: include`
- CSRF header is attached from cookie for mutating requests
- Session token fallback is handled for cross-browser compatibility

## Repository
- GitHub: https://github.com/vivekyarra/voidvault-frontend