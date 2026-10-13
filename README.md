# TenderHeart

_by NexusChain Consulting. Live at https://tenderheart.nexuschainconsulting.com. Internal AWS
resource names still use the original working name, `baby-day-out`._

A daycare daily-report management system that replaces a paper daily report form with a
mobile-first, installable web app. Daycare staff sign in with Google, see today's children on a dashboard,
fill out each child's daily report throughout the day (meals, rest, bowel habits, notes), and
send a polished report email to the parent exactly once, when the day is complete.

This is a monorepo with two independently deployable projects:

- [frontend/](./frontend) — React 18 + Vite PWA (Material UI v6, React Router v6, Axios, Google Sign-In)
- [backend/](./backend) — Node.js 22 ES modules on AWS Lambda + API Gateway HTTP API, MongoDB Atlas, Nodemailer

No React Native, Next.js, TypeScript, Express, Serverless Framework, Firebase, Supabase, Redux,
Netlify, or Vercel is used anywhere in this project.

## Table of contents

1. [Architecture](#architecture)
2. [Folder structure](#folder-structure)
3. [Local setup](#local-setup)
4. [Environment variables](#environment-variables)
5. [Google OAuth setup](#google-oauth-setup)
6. [MongoDB Atlas setup](#mongodb-atlas-setup)
7. [SMTP setup](#smtp-setup)
8. [AWS CLI / SAM setup](#aws-cli--sam-setup)
9. [Backend deployment](#backend-deployment)
10. [Frontend deployment](#frontend-deployment)
11. [Deployment order (exact)](#deployment-order-exact)
12. [API routes](#api-routes)
13. [PWA installation](#pwa-installation)
14. [Troubleshooting](#troubleshooting)

## Architecture

```
┌─────────────────┐        HTTPS         ┌──────────────────────┐
│  CloudFront CDN   │◄────────────────────┤  Staff's phone/tablet │
│  (OAC → private   │                      └──────────────────────┘
│   S3 bucket)      │
└─────────┬─────────┘
          │ serves React PWA (Vite build)
          ▼
┌───────────────────┐   Authorization: Bearer <Google ID token>
│  Frontend (SPA)    │────────────────────────────┐
└───────────────────┘                             ▼
                                        ┌───────────────────────┐
                                        │ API Gateway HTTP API   │
                                        │ (payload format v2)    │
                                        └───────────┬────────────┘
                                                    ▼
                                        ┌───────────────────────┐
                                        │ AWS Lambda             │
                                        │ src/handlers/index.js  │
                                        │ (manual routing)        │
                                        └───────────┬────────────┘
                                   ┌─────────────────┼─────────────────┐
                                   ▼                 ▼                 ▼
                         ┌─────────────────┐ ┌───────────────┐ ┌───────────────┐
                         │ google-auth-     │ │ MongoDB Atlas  │ │ Nodemailer/   │
                         │ library (verify  │ │ (users,        │ │ SMTP          │
                         │ Google ID token) │ │ children,      │ │ (parent email)│
                         │                  │ │ dailyReports)  │ │               │
                         └─────────────────┘ └───────────────┘ └───────────────┘
```

Key design decisions:

- **Single Lambda entry point.** `backend/src/handlers/index.js` exports `handler(event, context)`
  and does manual routing based on `event.rawPath` and `event.requestContext.http.method` — no
  Express, no framework.
- **Data isolation by `userId`.** Every `children` and `dailyReports` document carries a `userId`.
  Every service-layer query filters by it, so one signed-in user can never read or write another
  user's data.
- **Save never emails; Complete Day does.** Saving a daily report (`PUT /children/:id/daily-report`)
  only persists data — it can be called repeatedly throughout the day. Only
  `POST /children/:id/daily-report/complete` sends the parent email, and it is guarded against
  duplicate sends and race conditions.
- **7 pm auto-send safety net.** An EventBridge Scheduler rule (defined in `backend/template.yaml`,
  created by `npm run deploy`) invokes the same Lambda every day at 19:00 `Asia/Kolkata`. It emails
  every report for that day that is complete and still unsent, retries failed sends, and leaves
  incomplete reports untouched. It goes through the same guarded send path, so it can never
  double-send. Change the time or timezone with `AUTO_SEND_SCHEDULE` / `APP_TIMEZONE` in
  `backend/.env` and redeploy.
- **Private S3 + CloudFront OAC.** The frontend bucket blocks all public access; CloudFront reads
  from it using Origin Access Control with SigV4 signing. There is no S3 static website hosting.

## Folder structure

```
baby-day-out/
├── frontend/
│   ├── src/
│   │   ├── api/           axios client + per-resource API functions
│   │   ├── components/    ChildCard, Navbar, ProtectedRoute
│   │   ├── context/       AuthContext (Google auth state)
│   │   ├── pages/         LoginPage, DashboardPage, ChildReportPage
│   │   ├── utils/         time/date helpers, status labels
│   │   ├── theme.js       MUI theme + gender accent palettes
│   │   ├── App.jsx        routes
│   │   └── main.jsx       entry point (providers)
│   ├── public/icons/      PWA icons (192/512/maskable/apple-touch)
│   ├── infra/template.yaml   S3 + CloudFront CloudFormation/SAM template
│   ├── scripts/deploy.sh     build + deploy to S3/CloudFront
│   ├── vite.config.js        dev server (port 3000) + vite-plugin-pwa
│   ├── .env / .env.example
│   └── package.json
└── backend/
    ├── src/
    │   ├── config/db.js         cached MongoDB client + indexes
    │   ├── handlers/            index.js (router), auth.js, children.js,
    │   │                         dailyReports.js, email.js
    │   ├── middleware/           auth.js (Google token verification),
    │   │                         response.js (JSON/CORS helpers)
    │   ├── services/             authService, childService,
    │   │                         dailyReportService, emailService
    │   ├── utils/                validation, time/rest-duration, http parsing
    │   └── tests/                node:test suites + fakeDb test double
    ├── dev-server.js          local HTTP → API Gateway v2 event shim (port 4000)
    ├── scripts/build-lambda.mjs  stage backend/.build/lambda/ for deployment
    ├── scripts/deploy.sh         build + sam deploy
    ├── template.yaml             SAM template (HttpApi + Function + LogGroup)
    ├── .env / .env.example
    └── package.json
```

## Local setup

Prerequisites: Node.js 22+, npm, an AWS account (deployment only), a MongoDB Atlas cluster, a
Google Cloud OAuth client, and SMTP credentials for `info@nexuschainconsulting.com`.

```bash
# Backend
cd backend
npm install
npm run dev     # starts http://localhost:4000

# Frontend (in a second terminal)
cd frontend
npm install
npm run dev     # starts http://localhost:3000
```

Fill in `backend/.env` and `frontend/.env` first (see below) — both files already exist in this
repo with placeholder values for you to replace.

Run backend tests any time with:

```bash
cd backend && npm test
```

## Environment variables

### `backend/.env`

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` locally, `production` when deployed |
| `PORT` | Local dev server port (4000) |
| `DB_URL` | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `DB_NAME` | Database name, e.g. `daycare` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web client ID used as the `audience` for ID-token verification |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for STARTTLS, 465 for implicit TLS) |
| `SMTP_USER` | SMTP username (`info@nexuschainconsulting.com`) |
| `SMTP_PASSWORD` | SMTP password / app password |
| `SMTP_FROM` | From address shown to parents (`info@nexuschainconsulting.com`) |
| `FRONTEND_URL` | Deployed frontend URL (reference/documentation only — CORS is wildcard) |
| `APP_TIMEZONE` | Daycare's IANA timezone (default `Asia/Kolkata`); used for the auto-send schedule and times shown in parent emails |
| `AUTO_SEND_SCHEDULE` | EventBridge Scheduler expression for the daily auto-send (default `cron(0 19 * * ? *)`, evaluated in `APP_TIMEZONE`). Deploy-time only |
| `DEV_BYPASS_AUTH` | `true` only for local testing without a real Google token. **Must be `false` in production.** |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Same Google OAuth client ID as the backend |
| `VITE_API_URL` | Backend base URL — `http://localhost:4000` locally, the API Gateway URL in production |

> **Important:** Vite bakes `VITE_*` variables into the JS bundle at **build time**. Changing
> `VITE_API_URL` after a deploy requires rebuilding and redeploying the frontend
> (`npm run build` / `npm run deploy`), not just editing the `.env` file.

`.env.example` files with the same variable names (placeholder values) exist in both folders.
Never commit the real `.env` files — they are already excluded by [.gitignore](./.gitignore).

## Google OAuth setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth 2.0 **Web application** client ID.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (local dev)
   - `https://tenderheart.nexuschainconsulting.com` (the production domain)
   - Your CloudFront URL, e.g. `https://dxxxxxxxxxxxxx.cloudfront.net` (optional; add this **after** the
     frontend is deployed, since the URL isn't known beforehand)
4. Copy the client ID into `VITE_GOOGLE_CLIENT_ID` (frontend) and `GOOGLE_CLIENT_ID` (backend).
   Both must be the **same value**, because the backend verifies tokens using it as the audience.

## MongoDB Atlas setup

1. Create a free or paid cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user with read/write access.
3. Under **Network Access**, allow the IPs that will connect (for Lambda, the simplest option is
   `0.0.0.0/0` combined with a strong database user password, or use Atlas's VPC peering /
   PrivateLink for a locked-down setup).
4. Copy the connection string (`mongodb+srv://<user>:<password>@<cluster>/...`) into `DB_URL`.
5. Set `DB_NAME` (defaults to `daycare`). Collections (`users`, `children`, `dailyReports`) and
   indexes are created automatically on first connection — no manual migration needed.

## SMTP setup

The app sends email from `info@nexuschainconsulting.com` via Nodemailer. Use your mailbox
provider's SMTP relay (e.g. Microsoft 365: `smtp.office365.com:587`, Google Workspace:
`smtp.gmail.com:587` with an app password, or a transactional provider like SES SMTP, SendGrid,
Mailgun, etc.). Fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.

## AWS CLI / SAM setup

```bash
aws configure            # set access key, secret key, default region
aws sts get-caller-identity   # confirm the account/identity you're using

# Install SAM CLI (no sudo required, user-local install):
curl -sSL -o /tmp/sam.zip https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
unzip -q /tmp/sam.zip -d /tmp/sam-installation
/tmp/sam-installation/install --install-dir "$HOME/.local/sam-cli" --bin-dir "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
sam --version
```

Both deploy scripts are fixed to **us-east-1**: CloudFront only accepts certificates from that
region, and the backend lives there too. Set `AWS_PROFILE` if you use named profiles. **Neither
script deploys anything without first showing you the AWS account, identity, and region and asking
for explicit `y` confirmation.**

## Backend deployment

```bash
cd backend
npm install
npm run deploy     # runs backend/scripts/deploy.sh
```

This script: loads `backend/.env`, validates `DB_URL`/`DB_NAME`/`GOOGLE_CLIENT_ID`, resolves the
AWS region/profile, shows your AWS account and asks for confirmation, stages a production-only
Lambda package (`backend/.build/lambda/`), runs `sam build` + `sam deploy`, and prints the final
API Gateway URL (CloudFormation stack `baby-day-out-backend`).

## Frontend deployment

```bash
cd frontend
npm install
npm run deploy      # runs frontend/scripts/deploy.sh
```

This script: loads `frontend/.env` then `frontend/.env.production` (production values win),
validates `VITE_API_URL`/`VITE_GOOGLE_CLIENT_ID`, shows your AWS account and asks for confirmation,
then:

1. Finds or requests a free ACM certificate for `tenderheart.nexuschainconsulting.com`. On the
   first run it prints a **CNAME record to add in GoDaddy** and waits until AWS has validated it.
2. Deploys the S3 + CloudFront stack (`baby-day-out-frontend`) with the custom domain attached.
3. Builds the app (`npm ci && npm run build`), uploads hashed assets with
   `Cache-Control: public, max-age=31536000, immutable`, uploads `index.html`, the service worker
   and the manifest with `Cache-Control: no-cache`, and invalidates CloudFront.
4. Prints the second **CNAME record for GoDaddy** (`tenderheart` -> the CloudFront domain) and the
   origin to add to the Google OAuth client.

Keep the live API URL in `frontend/.env.production` so `frontend/.env` can stay on
`http://localhost:4000` for local development. Override the domain with `DOMAIN_NAME=...`.

## Deployment order (exact)

1. `cd backend && npm install && npm run deploy`
2. Copy the printed API Gateway URL into `frontend/.env.production` as `VITE_API_URL`
3. `cd frontend && npm install && npm run deploy`, adding the two GoDaddy CNAME records it prints
4. Add `https://tenderheart.nexuschainconsulting.com` as an **Authorized JavaScript origin** in the
   Google OAuth client

If you ever change `VITE_API_URL` afterwards, you must re-run `npm run build` and `npm run deploy`
in `frontend/` — the value is compiled into the static JS bundle, not read at runtime.

## API routes

All routes except `GET /`, `GET /health`, and `POST /auth/google` require
`Authorization: Bearer <Google ID token>`.

| Method | Path | Description |
|---|---|---|
| GET | `/` | API root/info |
| GET | `/health` | Health check |
| GET | `/auth` | Validate the current token, return the authenticated user |
| POST | `/auth/google` | Exchange a Google ID token for an authenticated user (creates/updates the user record) |
| GET | `/children` | List the signed-in user's active children |
| POST | `/children` | Create a child |
| GET | `/children/{id}` | Get one child |
| PUT | `/children/{id}` | Update a child |
| GET | `/children/{childId}/daily-report?date=YYYY-MM-DD` | Get (or virtually initialize) a daily report |
| POST | `/children/{childId}/daily-report` | Create a daily report for a date (409 if one already exists) |
| PUT | `/children/{childId}/daily-report` | Save/update a daily report — **never sends email** |
| POST | `/children/{childId}/check-in` | Record Time In (server timestamp, or a manual override) |
| POST | `/children/{childId}/check-out` | Record Time Out |
| POST | `/children/{childId}/rest-start` | Record Rest Start |
| POST | `/children/{childId}/rest-end` | Record Rest End and compute Rest Duration |
| POST | `/children/{childId}/daily-report/complete` | Validate, finalize, and email the report to the parent (409 if already sent) |
| POST | `/children/{childId}/daily-report/retry-send` | Retry sending after a `SEND_FAILED` status |

Responses use `{ success: true, message, data }` or `{ success: false, message }` with status
codes `400` (validation), `401` (missing/invalid token), `403` (unverified Google email), `404`
(not found / wrong owner), `409` (duplicate report or duplicate send), `423` (report already sent
and locked for editing), and `500` (unexpected error / email send failure).

## PWA installation

The app shows its own **Install TenderHeart** card on the login screen and dashboard. On Android
Chrome the card's Install button triggers the browser's install prompt; on iPhone Safari (which has
no install prompt) the card explains **Share → Add to Home Screen**. Installing only works over
HTTPS, which is why the app is served through CloudFront rather than plain S3 website hosting. The app installs in standalone mode with its own icon,
splash background, and no browser chrome. On desktop Chrome/Edge, use the install icon in the
address bar. The service worker (via `vite-plugin-pwa`) precaches the app shell so previously
visited screens still render while offline; new API data still requires connectivity.

## Troubleshooting

- **401 Unauthorized on every request** — the stored Google ID token is missing/expired. Sign out
  and sign in again. Google ID tokens are short-lived (~1 hour); long shifts may require
  re-signing in.
- **CORS errors in the browser console** — confirm `VITE_API_URL` points at the correct, deployed
  API Gateway URL and that you rebuilt the frontend after changing it.
- **Routes like `/dashboard` 404 after a hard refresh in production** — confirm the CloudFront
  distribution's custom error responses for 403 and 404 both return `/index.html` with HTTP 200
  (already configured in `frontend/infra/template.yaml`).
- **"Complete Day & Send" fails with a 500** — check `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` in
  `backend/.env` (local) or the deployed Lambda's environment variables. The report is saved as
  `SEND_FAILED`; use **Retry Send** once SMTP is fixed.
- **"A daily report for this child and date already exists" (409)** — the frontend should call
  `PUT` for subsequent saves on the same day, not `POST`, after the first save.
- **MongoDB connection timeouts** — check Atlas Network Access allows the Lambda's egress IPs (or
  `0.0.0.0/0` for simplicity), and that `DB_URL`/`DB_NAME` are correct.
- **`sam` command not found** — install SAM CLI as shown in
  [AWS CLI / SAM setup](#aws-cli--sam-setup); no `sudo` is required with `--install-dir`/`--bin-dir`.

## License

See [LICENSE](./LICENSE).
