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

## 🤝 Contributing

This is a totally open-source project aimed at helping RUSL FOT students. If you have past papers, or want to enhance the site's code, we welcome your PRs!

### Adding New Past Papers
To contribute past papers, please create an Issue or submit a Pull Request. Since the database is relational (PostgreSQL), data edits will need to be made via SQL seeds provided to the repository maintainer.
1. Upload your past paper PDF to Google Drive and ensure it's restricted to **tec.rjt.ac.lk** domain or accessible publicly.
2. Provide the Subject Name, Subject Code, Year, Semester, and URL via an Issue.

### Contributing Code
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m "Add some amazing feature"`)
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
