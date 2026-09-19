#!/usr/bin/env python
"""
Generate a mapping CSV that combines the downloaded Google Drive folder
structure info with the scraped DSpace metadata.

This script:
1. Reads the new_fot_papers.json (scraped metadata for 40 new papers)
2. Reads the download manifest (which papers were downloaded, with their
   source DSpace bitstream URLs matching the scraped data)
3. Cross-references the local download folder structure
4. Outputs a mapping CSV with: file_name, folder_path, department, academic_year,
   semester, exam_year, course_code, course_name, course_collection, faculty
   plus placeholder columns for gdrive_file_id, gdrive_view_url, gdrive_download_url
   that should be filled after running the Google Apps Script.

The gdrive_* columns are left blank for manual fill-in after the Apps Script
populates the "GDrive File Share Links" Google Sheet.
"""

import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
NEW_PAPERS_JSON = BASE / "data" / "scraped" / "new_fot_papers.json"
DOWNLOAD_DIR = BASE / "downloads" / "Faculty of Technology"
MANIFEST = DOWNLOAD_DIR / "_download_manifest.json"
OUTPUT_CSV = BASE / "data" / "scraped" / "gdrive_papers_mapping.csv"

# Expected folder path structure from metadata
# Faculty of Technology / [Department] / [Academic Year] / [Semester] / [Exam Year] / [Course Code] - [Course Name]


def main():
    # Load scraped metadata for the new papers
    with open(NEW_PAPERS_JSON, encoding="utf-8") as f:
        papers = json.load(f)

    print(f"Loaded {len(papers)} new papers from scraped metadata")

    # List actual files on disk in the download folder
    downloaded_files = list(DOWNLOAD_DIR.rglob("*.pdf"))
    print(f"Found {len(downloaded_files)} PDF files on disk")

    # Build a lookup from file name to disk path
    disk_lookup = {}
    for pdf_path in downloaded_files:
        disk_lookup[pdf_path.name] = pdf_path

    # Build the mapping
    mapping = []
    for paper in papers:
        file_name = paper.get("File Name", "")
        if not file_name:
            continue

        # Normalize the file name for lookup (some may have .jpg instead of .pdf)
        search_name = file_name
        if not search_name.lower().endswith(".pdf"):
            search_name = file_name + ".pdf"

        disk_path = disk_lookup.get(search_name) or disk_lookup.get(file_name, None)

        if disk_path:
            relative_path = str(disk_path.relative_to(DOWNLOAD_DIR))
            folder_path = str(disk_path.parent.relative_to(DOWNLOAD_DIR))
        else:
            relative_path = ""
            folder_path = paper.get("Folder Path", "")

        # Build the Drive folder path based on metadata
        dept = paper.get("Department", "")
        academic_year = paper.get("Academic Year", "")
        semester = paper.get("Semester", "")
        exam_year = paper.get("Exam Year", "")
        course_code = paper.get("Course Code", "")
        course_name = paper.get("Course Name", "")

        # Expected folder structure
        if dept and academic_year and semester and exam_year:
            expected_path = f"Faculty of Technology / {dept} / {academic_year} / {semester} / {exam_year} / {course_code} - {course_name}".strip(" /-")
        else:
            expected_path = paper.get("Folder Path", "")

        mapping.append({
            "file_name": file_name,
            "folder_path_disk": folder_path or "",
            "folder_path_expected": expected_path,
            "department_code": paper.get("Department Code", ""),
            "department": dept,
            "academic_year": academic_year,
            "semester": semester,
            "exam_year": exam_year,
            "course_code": course_code,
            "course_name": course_name,
            "course_collection": paper.get("Course Collection", ""),
            "faculty": paper.get("Faculty", "Faculty of Technology"),
            "file_size_bytes": paper.get("File Size (bytes)", ""),
            # Placeholders — fill these after running the Google Apps Script
            "gdrive_file_id": "",
            "gdrive_view_url": "",
            "gdrive_download_url": "",
        })

    # Write CSV
    if not mapping:
        print("No mappings generated!")
        return

    headers = list(mapping[0].keys())
    import csv
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(mapping)

    print(f"\nMapping CSV written to: {OUTPUT_CSV}")
    print(f"Total rows: {len(mapping)}")
    print(f"\nColumns:")
    for h in headers:
        print(f"  - {h}")
    print(f"\nNext step: Run the Google Apps Script (gdrive_share_enable.js) to populate")
    print(f"the gdrive_file_id, gdrive_view_url, and gdrive_download_url columns.")


if __name__ == "__main__":
    main()
