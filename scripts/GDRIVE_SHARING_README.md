# Google Drive File Sharing Workflow for Past Papers

## Overview

Two Google Apps Scripts are provided for working with Faculty of Technology past papers 
that have been uploaded to Google Drive:

1. **`gdrive_share_enable.js`** — Enables sharing + extracts links (full featured)
2. **`gdrive_extract_links.js`** — Simply extracts links from existing shared files (lightweight)

## Folder IDs

| Folder | ID | Purpose |
|---|---|---|
| Faculty of Technology (new) | `1dT7RaOxcaAoUir5yzk8VD5cATPtuleNP` | New 40 papers added from latest scrape |
| Faculty of Technology (older) | `1R0BMmzAX6b8LqTHoVu1JoOXfW9qhLfLl` | Older papers uploaded previously |

## Quick Start (Extract Links Only)

If files are **already shared** on Drive:

1. Open [script.google.com](https://script.google.com)
2. Create a new project
3. Paste the contents of `scripts/gdrive_extract_links.js`
4. Run `extractPaperLinks()` (for new papers only) or `extractAllPaperLinks()` (for all papers)
5. Results appear in a new Google Sheet with columns:

| Column | Description |
|---|---|
| `file_name` | PDF filename |
| `view_url` | Google Drive shareable link (`...file/d/ID/view?usp=sharing`) |
| `preview_url` | Same as view_url |
| `direct_download_link` | Direct download URL (`.../uc?export=download&id=ID`) |
| `file_id` | Google Drive file ID |
| `department_code` | ICT, BPT, FDT, MTT, EET, CMT, CML |
| `department` | Full department name |
| `academic_year` | First Year, Second Year, etc. |
| `semester` | Semester I, Semester II |
| `exam_year` | 2018, 2019, ..., 2025 |
| `course_code` | e.g. `ICT- 2303` |
| `course_name` | e.g. `Data Structures & Algorithms` |
| `folder_path` | Full path on Drive |
| `file_size` | Size in bytes |

## Full Setup (Enable Sharing + Extract Links)

If files are **not yet shared**:

1. Open [script.google.com](https://script.google.com)
2. Create a new project
3. Paste the contents of `scripts/gdrive_share_enable.js`
4. Run `main()` and authorize
5. The script:
   - Recursively scans the Faculty of Technology folder
   - **Enables** "anyone with link can view" on each PDF
   - Extracts all links and metadata
   - Creates a Google Sheet with results

## Folder Structure on Drive

```
Faculty of Technology (1dT7RaOx...)
├── Bioprocess Technology/
│ ├── Second Year/
│ │ └── Semester I/
│ │   ├── 2025/
│ │   │   ├── BPT- 2201 - Quality Management/
│ │   │   │   └── BPT- 2201 - Quality Management.pdf
│ │   │   └── ...
│ │   └── 2024/
│ │       └── ...
│ └── Third Year/
│   └── Semester I/
│       └── 2025/
│           └── ...
├── Food Technology/
├── Information Communication Technology/
├── Material Technology/
├── Electrical and Electronic Technology/
├── Common - CMT/
├── Complementary - CML/
└── Department of Information Communication Technology/
    └── ...
```

## Department Codes

| Department Name | Code |
|---|---|
| Information Communication Technology | ICT |
| Bioprocess Technology | BPT |
| Food Technology | FDT |
| Material Technology | MTT |
| Electrical and Electronic Technology | EET |
| Common | CMT |
| Complementary | CML |
| Engineering Technology | ENT |
| Biosystems Technology | BST |

## Workflow: Python + Apps Script

1. **Download papers locally** → `scripts/download_new_papers.py`
   ```
   python scripts/download_new_papers.py
   ```

2. **Upload to Google Drive** → manually upload the local files to the Drive folder

3. **Run Apps Script** → `scripts/gdrive_extract_links.js` (or `gdrive_share_enable.js`)
   - Paste into script.google.com
   - Run `extractPaperLinks()`

4. **Download results** → Export the Google Sheet as CSV

5. **Import into database** → The CSV has the Neon DB-compatible schema

## Python Helper

`scripts/generate_gdrive_mapping.py` creates a mapping CSV from scraped metadata.
After running the Apps Script, merge the `view_url` and `direct_download_link` 
columns from the Apps Script sheet into this mapping CSV.
