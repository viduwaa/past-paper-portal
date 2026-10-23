import json
import csv
import os
import re

# Configuration
JSON_FILES = ["../data/year1.json", "../data/year2.json", "../data/year3.json", "../data/year4.json"]
CSV_FILE = "../new_papers.csv"
OUTPUT_SQL_FILE = "seed.sql"

def extract_course_code(title, default_code=""):
    if default_code and default_code.strip():
        return default_code.strip()
    
    # Matches patterns like 'ICT 1209', 'ICT1209', 'CMT 3201' etc.
    match = re.search(r'([A-Z]{2,4}\s*\d{3,4})', title, re.IGNORECASE)
    if match:
        code = match.group(1).upper()
        # Insert a space if it's missing (e.g., ICT1209 -> ICT 1209)
        code = re.sub(r'^([A-Z]+)(\d+)$', r'\1 \2', code.replace(" ", ""))
        return code
    return ""

def extract_course_name(title):
    # Common format in old JSONs: "2022 ICT 1209 - Web Technologies"
    parts = title.split(" - ", 1)
    if len(parts) > 1:
        return parts[1].strip()
    return title.strip()

def parse_old_json():
    # Example fields: id, title, subjectCode, department, studyYear, semester, pastPaperYear, link
    papers = []
    
    for json_file in JSON_FILES:
        if not os.path.exists(json_file):
            print(f"Warning: {json_file} not found.")
            continue
            
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                # Basic mapping logic based on your old JSON structure 
                # (You may need to adjust these depending on exact old formats)
                title = item.get("title", "")
                academic_year = f"{item.get('studyYear', '')}st Year" if item.get('studyYear') == "1" else f"{item.get('studyYear', '')}nd Year" if item.get('studyYear') == "2" else f"{item.get('studyYear', '')}rd Year" if item.get('studyYear') == "3" else f"{item.get('studyYear', '')}th Year"
                semester = f"{item.get('semester', '')}st Semester" if item.get('semester') == "1" else f"{item.get('semester', '')}nd Semester"
                
                course_code = extract_course_code(title, item.get("subjectCode", ""))
                
                papers.append({
                    "file_name": title,
                    "view_url": item.get("link", ""),
                    "preview_url": item.get("link", "").replace("/view", "/preview") if "/view" in item.get("link", "") else item.get("link", ""),
                    "department_code": item.get("department", ""),
                    "department_name": "", # Might not exist in old json
                    "academic_year": academic_year.strip(),
                    "semester": semester.strip(),
                    "exam_year": item.get("pastPaperYear", ""),
                    "course_code": course_code,
                    "course_name": extract_course_name(title)
                })
    return papers

def parse_new_csv():
    # Matches the Google Apps Script headers:
    # file_name, view_url, preview_url, department_code, department_name, academic_year, semester, exam_year, course_code, course_name
    papers = []
    if not os.path.exists(CSV_FILE):
        print(f"Warning: {CSV_FILE} not found.")
        return papers
        
    with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            papers.append({
                "file_name": row.get("file_name", ""),
                "view_url": row.get("view_url", ""),
                "preview_url": row.get("preview_url", ""),
                "department_code": row.get("department_code", ""),
                "department_name": row.get("department_name", ""),
                "academic_year": row.get("academic_year", ""),
                "semester": row.get("semester", ""),
                "exam_year": row.get("exam_year", ""),
                "course_code": row.get("course_code", ""),
                "course_name": row.get("course_name", "")
            })
    return papers

def deduplicate_and_generate_sql(all_papers):
    unique_papers = {}

    # Process all papers, preferring newer entries (if we insert CSV after JSON)
    for p in all_papers:
        # Key: (course_code, exam_year, academic_year, semester, file_name)
        #
        # `semester` and `file_name` are part of the key because one
        # subject legitimately holds several papers in a single period —
        # CMT 1205 in 2025 Semester 1 has both a Written Test and an Oral
        # Test. Without them the key rejects a legitimate second paper.
        # The key must match the unique constraint on past_papers.
        key = (
            p["course_code"].strip(),
            p["exam_year"].strip(),
            p["academic_year"].strip(),
            p["semester"].strip(),
            p["file_name"].strip(),
        )

        # We skip adding if key is totally blank (invalid record)
        if not key[0] or not key[1] or not key[2]:
            # Just use URL as fallback key if needed, or skip. We'll use view_url to ensure it gets captured
            key = p["view_url"]

        unique_papers[key] = p

    # Generate SQL
    sql_lines = []
    sql_lines.append("-- Generated Seed SQL")
    sql_lines.append(f"-- Total unique records: {len(unique_papers)}")
    sql_lines.append("INSERT INTO past_papers (file_name, view_url, preview_url, department_code, department_name, academic_year, semester, exam_year, course_code, course_name)")
    sql_lines.append("VALUES")
    
    values_list = []
    for p in unique_papers.values():
        escaped_vals = []
        for col in ["file_name", "view_url", "preview_url", "department_code", "department_name", "academic_year", "semester", "exam_year", "course_code", "course_name"]:
            val = p[col]
            if not val:
                escaped_vals.append("NULL")
            else:
                # Escape single quotes
                safe_val = str(val).replace("'", "''")
                escaped_vals.append(f"'{safe_val}'")
        values_list.append(f"  ({', '.join(escaped_vals)})")
        
    sql_lines.append(",\n".join(values_list) + ";\n")
    
    with open(OUTPUT_SQL_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))
        
    print(f"✅ Generated {OUTPUT_SQL_FILE} with {len(unique_papers)} records.")

if __name__ == "__main__":
    old_papers = parse_old_json()
    new_papers = parse_new_csv()
    
    print(f"Found {len(old_papers)} entries in old JSONs")
    print(f"Found {len(new_papers)} entries in new CSV")
    
    # Combine (new _after_ old so new overwrites duplicates in our deduplicator dictionary)
    all_papers = old_papers + new_papers
    deduplicate_and_generate_sql(all_papers)
