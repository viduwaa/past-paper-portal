# 📚 FOT Past Papers Portal

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-00B86B?style=for-the-badge&logo=redis&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)

A responsive, open-source web portal for accessing **Rajarata University Faculty of Technology (FOT)** past examination papers and calculating GPA. Built with Next.js App Router and deployed on Cloudflare Pages using Edge runtime.

## ✨ Features

- **🔍 Advanced Search & Filtering**: Instantly search by title, subject code, department, study year, and semester.
- **🛡️ Secure & Resilient**: Database queries are protected globally using Upstash Redis rate-limiting (sliding window).
- **🧮 GPA Calculator**: Highly customized semester-wise GPA tracking tool specifically built for FOT grading standards.
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices.
- **🌙 Dark/Light Theme**: Native theme toggling integration for comfortable late-night studying.
- **🎨 Modern UI/UX**: Built heavily utilizing Shadcn/UI primitives, Radix UI, and Framer Motion animations.
- **⚡ Edge Optimized**: Deployed on Cloudflare Pages using native Edge runtime with direct SQL queries.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (React 19), TypeScript
- **Styling**: Tailwind CSS, Shadcn UI (Radix)
- **Animations**: Framer Motion
- **Database**: PostgreSQL (via @vercel/postgres)
- **Rate Limiting**: Upstash Redis (@upstash/ratelimit)
- **Deployment**: Cloudflare Pages

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/en/) & pnpm (recommended)
- A [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) Database (or any valid Postgres instance)
- An [Upstash Redis](https://upstash.com/) Database (for rate limiting)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/viduwaa/past-paper-portal.git
   cd past-paper-portal
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your credentials:
   ```env
   POSTGRES_URL="postgres://default:xyz@ep-your-db-region.postgres.vercel-storage.com:5432/verceldb"
   POSTGRES_PRISMA_URL="postgres://default:xyz@ep-your-db-region.postgres.vercel-storage.com:5432/verceldb?pgbouncer=true&connect_timeout=15"
   POSTGRES_URL_NON_POOLING="postgres://default:xyz@ep-your-db-region.postgres.vercel-storage.com:5432/verceldb"
   POSTGRES_USER="default"
   POSTGRES_HOST="ep-your-db.postgres.vercel-storage.com"
   POSTGRES_PASSWORD="xyz"
   POSTGRES_DATABASE="verceldb"

   UPSTASH_REDIS_REST_URL="https://your-upstash-url.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your_upstash_token"
   ```

4. **Initialize the Database:**
   Run the SQL commands found in `database-setup.sql` on your connected PostgreSQL instance to create the `past_papers` and `website_feedback` schemas.

5. **Start the Development Server:**
   ```bash
   pnpm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to view the portal.

---

## 📊 Upstash Redis quota

The free tier allows **500,000 commands per month**, and Upstash bills a
Lua script as one command *plus one for every internal `redis.call` it
makes*. The presence scripts are written to minimise internal calls for
exactly this reason — see `docs/adr/0004-upstash-bills-eval-internals.md`.

When the quota is exhausted every Redis command fails, including
`PING`. The site keeps working because each Redis path degrades to the
database, but the live badge, the presence tracking and the Redis rate
limiter all go quiet until the monthly reset. Check the Upstash
dashboard's command count rather than assuming the badge is broken.

The upload endpoint does not rely on Redis for its daily limit. It counts
attempts in Postgres, so the limit holds even with Redis completely
unavailable.

## 🤝 Contributing

This is a totally open-source project aimed at helping RUSL FOT students. If you have past papers, or want to enhance the site's code, we welcome your PRs!

### Adding New Past Papers

Use the **Contribute** page in the site's navigation. Upload a PDF and
fill in the subject, study year, semester and exam year it belongs to.

- PDFs only, up to 10 MB.
- Every submission is **reviewed before it is published** — you will see
  your paper on the site once a maintainer approves it.
- You can add your name and/or GitHub username to be credited on the
  [Contributors page](https://past-paper-portal.pages.dev/contributors).
  Both are optional; leave them blank to stay anonymous.
- Up to 5 submissions a day. Unreviewed submissions expire after 30 days.

Contributions are credited on the Contributors wall, which lists both
paper contributions and code contributions to this repository.

#### Maintainer setup

The upload flow talks to Google Drive on the server. To run it you need:

1. A Google Cloud project with the Drive API enabled and an OAuth client
   of type **Web application**.
2. The consent screen published in **Production** status with the
   `drive.file` scope. An app left in **Testing** issues refresh tokens
   that expire after seven days, which silently breaks uploads.
3. A refresh token, obtained by authorising once at
   `https://accounts.google.com/o/oauth2/v2/auth` (with
   `access_type=offline&prompt=consent`) and exchanging the returned code
   at `https://oauth2.googleapis.com/token` with
   `grant_type=authorization_code`.
4. These Cloudflare Pages environment variables — see `.env.example`
   for the full list:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
5. A `Contributions/` folder in the same Drive account, with a `Pending/`
   subfolder shared with the reviewers' email addresses, and a
   `Rejected/` subfolder.
6. `CLEANUP_SECRET` — a shared secret for the daily expiry job, matching
   the `CLEANUP_SECRET` GitHub Actions secret.
7. `SUBMISSIONS_PEPPER` — a salt for hashing submitter IPs.

Apply the database changes with:

```bash
node --env-file=.env scripts/migrate-contributions.mjs
```

### Contributing Code
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📁 Project Structure

```
past-paper-portal/
├── app/                          # Next.js App Router directory
│   ├── api/                      # Next.js Serverless/Edge API Routes
│   ├── _components/              # Reusable modular React UI components
│   ├── gpa-calculator/           # Dedicated GPA Calculator pages
│   └── page.tsx                  # Home Portal view
├── components/
│   └── ui/                       # Shadcn/UI primitive components
├── data/                         # Seed and static data resources
├── lib/                          # Database interfaces and API logic (rate limits)
├── public/                       # Static assets
├── database-setup.sql            # PostgreSQL core tables setup
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── postcss.config.mjs            # PostCSS configuration
├── eslint.config.mjs             # ESLint configuration
└── package.json                  # Project dependencies
```

---

## 🚨 Important Notice

**Paper Privacy:** Many of the physical papers hosted on the associated drive domains can **only be viewed with a valid tec.rjt.ac.lk domain email**. You need to use your university active student email to access them successfully.

---

**Created with ❤️ for FOT students by [viduwaa](https://github.com/viduwaa)**
