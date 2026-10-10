# SkillGO

**SkillGO** is the AI-powered skill gap intelligence platform for ambitious professionals. Upload your resume, benchmark it against the role, company or program you are targeting, and instantly receive a prioritized skill-gap matrix, a personalized 4-week learning roadmap, weekly knowledge checks and real GitHub proof-of-work verification — all delivered through a premium Neomorphic (Soft UI) experience.

Built as a production-grade SaaS, SkillGO pairs a React + Vite + Tailwind CSS front end with an Express + MongoDB back end, and uses **NVIDIA NIM** large language models as its analysis engine. Access is secured with JWT authentication and email/password plus Google OAuth sign-in.

> **Why SkillGO?** Most career tools hand you generic course lists. SkillGO reads your actual resume, understands the exact role you want, tells you precisely which skills are missing, and then proves progress — through guided weekly quizzes and an enterprise-grade GitHub Proof-of-Work verifier that audits your real code.

## Project Structure

```
SkillGO/
├── frontend/          # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── main.jsx       # React entry point (mounts App)
│   │   ├── App.jsx        # AuthContext, providers and state-aware routing
│   │   ├── pages/
│   │   │   ├── Landing.jsx    # Neomorphic landing page + auth modal
│   │   │   └── Dashboard.jsx  # Authenticated dashboard (targets, gaps, roadmap, quizzes)
│   │   └── index.css      # Tailwind base + neomorphic component classes
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
└── backend/           # Express + MongoDB + Mongoose
    ├── server.js           # Entry point
    ├── app.js              # Express app setup
    ├── models/
    │   └── user.model.js   # User schema
    ├── controllers/
    │   └── auth.controller.js
    ├── routes/
    │   ├── index.js
    │   └── auth.routes.js
    ├── package.json
    └── .env.example
```

## Features

- **Landing page**: high-trust hero, social proof, an interactive 30-second skill preview, feature grid, 3-step workflow, FAQ accordion and CTA.
- **Authentication**: Email/password registration and login plus Google OAuth.
- **Google OAuth**: Sign in with Google using `@react-oauth/google` (popup, implicit flow).
- **State-aware routing**: JWT stored in `localStorage`; authenticated users are routed to the dashboard and anonymous users to the landing page.
- **Dashboard**: target selection (company / job description / higher studies), PDF resume upload, a prioritised hard & soft skill-gap matrix, a 4-week roadmap and interactive weekly quizzes.
- **Resume parsing & AI analysis**: `POST /api/career/analyze` extracts text from your PDF resume, analyses it against your target with **NVIDIA NIM** (`nvidia/nemotron-3-super-120b-a12b`) and persists the results in MongoDB.
- **Career history & progress**: every analysis is saved. The dashboard auto-loads your latest roadmap on refresh and offers a history drawer to switch between past analyses.
- **Quiz progress tracking**: weekly quiz answers are graded and persisted per week (`completed`, `score`, `selectedAnswer`, `completedAt`), and progress is shown as badges and progress bars.
- **GitHub Proof-of-Work verifier**: paste a public GitHub repo URL on any high/medium gap to have the backend fetch the repository tree and key source files and audit them with NVIDIA NIM, returning a verdict, confidence score, explanation and the exact code snippet as evidence. Verified gaps are persisted to MongoDB.
- **Exportable report**: an "Export report (PDF)" button renders the skill-gap matrix and 4-week roadmap as a clean printable report (use your browser's "Save as PDF").
- **Neomorphic UI**: Soft UI design with light/dark mode support.
- **JWT Tokens**: Secure authentication with JSON Web Tokens.

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google Cloud Console project (for OAuth)
- An NVIDIA NIM API key (from [build.nvidia.com](https://build.nvidia.com)) for resume analysis

## Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your values:
# - MONGODB_URI: Your MongoDB connection string
# - JWT_SECRET: Secure random string (32+ chars)
# - GOOGLE_CLIENT_ID: From Google Cloud Console
# - GOOGLE_CLIENT_SECRET: From Google Cloud Console
# - FRONTEND_URL: http://localhost:5121 (default)
# - NVIDIA_API_KEY: From build.nvidia.com (enables resume analysis)

# Start development server
npm run dev
```

Backend runs on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your values:
# - VITE_GOOGLE_CLIENT_ID: Same as backend GOOGLE_CLIENT_ID

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5121`

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Configure the OAuth consent screen (External is fine for testing)
4. Create an OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5121`
   - Authorized redirect URIs: `http://localhost:5121` (optional for the popup implicit flow, but harmless)
5. Copy the Client ID into **both** `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`) and `backend/.env` (`GOOGLE_CLIENT_ID`). Copy the Client Secret into `backend/.env` (`GOOGLE_CLIENT_SECRET`).
6. Restart both dev servers after changing `.env` files (Vite only reads env vars at startup).

> The popup flow sends an OAuth **access token** to `POST /api/auth/google`, which the backend verifies against Google's `userinfo` endpoint. The endpoint also still accepts an ID token via the `tokenId` field.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/google` | Google OAuth authentication |
| POST | `/api/career/analyze` | Upload a PDF resume and analyse it against a target (auth required, multipart/form-data: `resume`, `targetType`, plus `companyName` / `jobDescription` / `studyLevel`) |
| GET | `/api/career/history` | List the user's past target roles with their roadmaps, newest first (auth required) |
| GET | `/api/career/roadmap/:id` | Fetch one saved roadmap with its target role populated (auth required) |
| POST | `/api/career/roadmap/:id/quiz` | Grade a weekly quiz (`weekNumber`, `selectedAnswer`), persist the week's completion state and return the updated roadmap (auth required) |
| POST | `/api/career/roadmap/:id/verify-github` | Audit a public GitHub repo (`skillName`, `githubUrl`) with NVIDIA NIM to verify a skill gap and persist the verdict + evidence (auth required) |

## Tech Stack

### Frontend
- React 18
- Vite 4
- Tailwind CSS 3
- React Router 6
- @react-oauth/google

### Backend
- Node.js / Express
- MongoDB / Mongoose
- bcryptjs (password hashing)
- jsonwebtoken (JWT)
- google-auth-library (OAuth verification)
- openai (NVIDIA NIM client via OpenAI-compatible API)
- multer (resume upload, memory storage)
- pdf-parse (PDF text extraction)
- cors

## Neomorphic Design

The UI follows Neomorphism (Soft UI) principles:
- Light mode: Soft shadows with `#ffffff` and `#bebebe`
- Dark mode: Deep shadows with `#0f172a` and `#475569`
- Rounded corners (`rounded-2xl`)
- Inset effects for inputs
- Hover elevation effects
- Fonts: Inter (UI) + Space Grotesk (Display)

## Environment Variables

### Backend (`.env`)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skillgo
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRE=30d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:5121
NVIDIA_API_KEY=your-nvidia-nim-api-key
NVIDIA_MODEL=nvidia/nemotron-3-super-120b-a12b
GITHUB_TOKEN=your-optional-github-token
```

> `GITHUB_TOKEN` is optional. When set it raises the GitHub API rate limit used by the proof-of-work verifier; anonymous access works but is limited to 60 requests/hour per IP.

### Frontend (`.env`)
```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## Development

### Run both servers concurrently

**Terminal 1 (Backend):**
```bash
cd backend && npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend && npm run dev
```

### Build for production

```bash
# Frontend
cd frontend && npm run build

# Backend
cd backend && npm start
```

## Troubleshooting

### "Could not connect to any servers in your MongoDB Atlas cluster"

This means your current IP address is not allowed to reach the cluster. Fix it in MongoDB Atlas:

1. Open [MongoDB Atlas](https://cloud.mongodb.com/) → your project → **Network Access**.
2. Click **Add IP Address**.
3. For local development, click **Allow Access from Anywhere** (`0.0.0.0/0`) — fine for dev, do not use in production — or add your current public IP.
4. Click **Confirm** and wait ~30 seconds, then restart the backend.

You can check your public IP with `curl https://api.ipify.org`.

### Google popup does not appear

1. Allow popups for `http://localhost:5121` in your browser (popup blocker).
2. Confirm `http://localhost:5121` is listed under **Authorized JavaScript origins** for the OAuth client.
3. Confirm `frontend/.env` and `backend/.env` use the **same** Client ID.
4. Restart the Vite dev server after editing `.env` (env vars are read at startup).
5. Open the browser console (F12) and check for a `invalid_client` or `redirect_uri_mismatch` error.

### Frontend "Expected corresponding JSX closing tag" errors

These come from a missing closing quote on an attribute (for example `className="foo>`). Run `npm run build` — it fails fast with the exact line.

## License

MIT