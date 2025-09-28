# 📚 FOT Past Papers Portal

A m- **Database**: PostgreSQL with @vercel/postgres (Edge Runtime compatible)dern, responsive web portal for accessing Rajarata University Faculty of Technology (FOT) past examination papers. Built with Next.js, featuring advanced filtering, search, and a clean user interface.

## ✨ Features included

# or

-   🔍 **Advanced Search & Filtering** - Search by title, subject code, or departmentpnpm dev

-   📱 **Responsive Design** - Works seamlessly on desktop and mobile devices# or

-   🌙 **Dark/Light Theme** - Toggle between themes with smooth transitionsbun dev

-   ⭐ **Website Feedback** - Rate the website with 1-5 star ratings```

-   🎨 **Modern UI** - Built with Shadcn/UI components and Framer Motion animations

-   🔄 **Pagination** - Load more papers dynamically

-   🎯 **Department Filtering** - Filter by ITT, CMT, and other departmentsYou can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

-   📅 **Year & Semester Filtering** - Filter by study year and semester

## 🛠️ Tech Stack

## Learn More

-   **Frontend**: Next.js 15, React 19, TypeScript

-   **Styling**: Tailwind CSS, Shadcn/UI, Framer Motion

-   **Database**: PostgreSQL with direct SQL queries (no ORM)

## 🗄️ Database Setup

The application uses PostgreSQL for storing website feedback. We use direct SQL queries with the `pg` library instead of an ORM.

### 1. Database Connection

Set your `DATABASE_URL` environment variable:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### 2. Create Tables

Run the SQL script in `database-setup.sql` to create the required tables:

```sql
-- Create the website_feedback table
CREATE TABLE IF NOT EXISTS website_feedback (
    id SERIAL PRIMARY KEY,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    browser_id VARCHAR(255) NOT NULL UNIQUE,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_website_feedback_browser_id ON website_feedback(browser_id);
CREATE INDEX IF NOT EXISTS idx_website_feedback_timestamp ON website_feedback(timestamp DESC);
```

### 3. Alternative: Using a Database GUI

You can also run these commands in any PostgreSQL client like pgAdmin, DBeaver, or the psql command line tool.

-   **Deployment**: Cloudfare Pages

-   **Icons**: Lucide React

## 📖 Usage

### For Students

1. **Browse Papers**: Use the filters to find papers by department, year, semester, or subject
2. **Search**: Use the search bar to find specific papers by title or subject code
3. **Access Papers**: Click "View Paper" to open papers in a new tab
4. **Rate Website**: Use the star rating system at the bottom to provide feedback

### For Contributors

See the [Contributing](#contributing) section below.

## 🤝 Contributing

We welcome contributions! You can help by adding missing past papers to expand our collection.

### How to Contribute Past Papers

1. **Upload the Paper**

    - Upload your past paper PDF to Google Drive
    - Make sure the sharing settings allow "Anyone with the link can view"
    - Copy the shareable link

2. **Add to the Database**

    - Open the appropriate `data/year[X].json` file (year1.json, year2.json, etc.)
    - Add a new entry following this format:

    ```json
    {
        "id": "unique_id",
        "title": "Subject Name",
        "subjectCode": "DEPT XXXX",
        "department": "ITT/CMT/etc",
        "studyYear": "1/2/3/4",
        "semester": "1/2",
        "pastPaperYear": "2023/2024/etc",
        "link": "https://drive.google.com/file/d/XXXXXXXXXXXXXXXXXXXX/view?usp=sharing"
    }
    ```

3. **Create a Pull Request**
    - Fork this repository
    - Create a new branch: `git checkout -b add-paper-[subject]-[year]`
    - Add your changes to the appropriate year.json file
    - Commit your changes: `git commit -m "Add [Subject] past paper for [Year]"`
    - Push to your branch: `git push origin add-paper-[subject]-[year]`
    - Open a Pull Request

### Contribution Guidelines

-   **File Naming**: Use descriptive, consistent naming for papers
-   **Data Accuracy**: Ensure all fields are correctly filled
-   **Link Validity**: Test that Google Drive links work and are publicly accessible
-   **Unique IDs**: Use unique, sequential IDs for new entries
-   **Quality**: Only upload legitimate past papers from official sources

### Adding New Features

We also welcome code contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request with a clear description

## 📁 Project Structure

```
past-paper-portal/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── _components/       # React components
│   └── page.tsx          # Main page
├── data/                  # Past paper data (JSON files)
├── components/           # Reusable UI components
├── lib/                  # Database utilities and helper functions
└── database-setup.sql   # SQL script for database initialization
```

## 🔧 Available Scripts

-   `npm run dev` - Start development server
-   `npm run build` - Build for production
-   `npm run start` - Start production server
-   `npm run lint` - Run ESLint

## 📄 Data Format

Each past paper entry in the JSON files contains:

```typescript
{
    id: string; // Unique identifier
    title: string; // Subject name
    subjectCode: string; // Department code (e.g., "ICT 1305")
    department: string; // Department (ITT, CMT, etc.)
    studyYear: string; // Study year (1, 2, 3, 4)
    semester: string; // Semester (1 or 2)
    pastPaperYear: string; // Year of the past paper
    link: string; // Google Drive shareable link
}
```

## 🚨 Important Notice

**These papers can only be viewed with a valid tec.rjt.ac.lk domain email.** You need to use your student email to access the papers hosted on Google Drive.

---

**Created with ❤️ for FOT students**
