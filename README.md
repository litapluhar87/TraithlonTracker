# TriTracker — Frontend

React frontend for the Ojhar Bergman Olympic Triathlon training tracker.
Race date: 4 October 2026.

## Stack
- React 19 + Vite + Tailwind CSS v3 + Recharts + React Router v7

## Screens built
| Screen | File | Status |
|--------|------|--------|
| Login / Welcome | Login.jsx | ✅ Done |
| Dashboard (Home) | Dashboard.jsx | ✅ Done |
| Log Session | LogSession.jsx | ✅ Done |
| Weekly Plan | WeeklyPlan.jsx | ✅ Done |
| Progress Charts | Progress.jsx | ✅ Done |
| 12-Week Overview | Overview.jsx | ✅ Done |

## Local dev
1. Copy folder to `C:\Rahul\claude-projects\FitnessApp\TraithlonTracker\frontend\`
2. Create `.env` from `.env.example`: set `VITE_API_URL=http://localhost:3001`
3. `npm install` then `npm run dev` → runs at http://localhost:5173
4. Backend must be on port 3001 for API calls

## Deploy to GitHub Pages
1. Set `base` in `vite.config.js` to your repo path (e.g. `/FitnessApp/`)
2. `npm run deploy` → builds and pushes to gh-pages branch

## Pending (next session)
- Wire LogSession → POST /api/activities (backend needs user_id endpoints first)
- Wire Dashboard + Progress → GET /api/activities/:userId from Supabase
- Progressive target calculator (after Week 1 data)
- FIT file upload
- Race Countdown screen (Screen 6)

## Race targets (5-min buffer applied)
| Discipline | Distance | Target   | Pace/Speed   |
|-----------|---------|---------|-------------|
| Swim      | 1500m   | 1:00:00 | 4:00 /100m  |
| Bike      | 40km    | 2:05:00 | 19.2 km/h   |
| Run       | 10km    | 1:40:00 | 10:00 /km   |
