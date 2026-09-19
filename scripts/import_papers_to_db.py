#!/usr/bin/env python
"""
Import Faculty of Technology past papers into Neon PostgreSQL database.

This script reads the scraped new papers data and inserts them into the
past_papers table, matching records by (course_code, exam_year, academic_year)
to avoid duplicates (as defined by the UNIQUE constraint in the schema).

Usage:
    python scripts/import_papers_to_db.py [--dry-run]
"""

import json
import os
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

# Load the new papers data
NEW_PAPERS_JSON = BASE / "data" / "scraped" / "new_fot_papers.json"
# GDrive shareable links extracted from Google Drive via Apps Script
CSV_MAPPING = BASE / "data" / "new_papers" / "FoT Past Papers - GDrive Links - GDrive Links.csv"


def load_papers():
    """Load new papers metadata from JSON."""
    with open(NEW_PAPERS_JSON, encoding="utf-8") as f:
        return json.load(f)


def load_gdrive_mapping():
    """Load the GDrive mapping CSV if it exists (contains shareable links)."""
    import csv

    mapping = {}
    if CSV_MAPPING.exists():
        with open(CSV_MAPPING, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                mapping[row["file_name"]] = row
        print(f"Loaded {len(mapping)} GDrive mappings from CSV")
    else:
        print(f"No GDrive mapping found at {CSV_MAPPING}")
    return mapping


def build_insert_records(papers, gdrive_mapping):
    """Build database insert records, preferring GDrive links where available."""
    records = []

    for paper in papers:
        file_name = paper.get("File Name", "")
        gdrive = gdrive_mapping.get(file_name, {})

        # Use GDrive URLs if available (from the extracted sheet),
        # otherwise fall back to DSpace bitstream URLs
        view_url = gdrive.get("view_url") or paper.get("View Link", "")
        preview_url = gdrive.get("preview_url") or paper.get("Preview Link (Embed)", "")

        record = {
            "file_name": file_name,
            "view_url": view_url,
            "preview_url": preview_url,
            "department_code": paper.get("Department Code", ""),
            "department_name": paper.get("Department", ""),
            "academic_year": paper.get("Academic Year", ""),
            "semester": paper.get("Semester", ""),
            "exam_year": paper.get("Exam Year", ""),
            "course_code": paper.get("Course Code", ""),
            "course_name": paper.get("Course Name", ""),
        }
        records.append(record)

    return records


def deduplicate(records):
    """Remove duplicate records based on (course_code, exam_year, academic_year)."""
    seen = set()
    unique = []

    for r in records:
        key = (
            r["course_code"].strip(),
            r["exam_year"].strip(),
            r["academic_year"].strip(),
        )
        if key not in seen:
            seen.add(key)
            unique.append(r)

    removed = len(records) - len(unique)
    if removed > 0:
        print(f"Removed {removed} duplicate records (same course_code + exam_year + academic_year)")

    return unique


def truncate_value(value, max_length=500):
    """Truncate a string value to fit within the DB column constraints."""
    if not value:
        return ""
    return str(value)[:max_length]


def main():
    dry_run = "--dry-run" in sys.argv

    print("=" * 60)
    print("Faculty of Technology — Database Import")
    print("=" * 60)

    # Load data
    papers = load_papers()
    print(f"Loaded {len(papers)} new papers from scraped data")

    gdrive_mapping = load_gdrive_mapping()

    # Build records
    records = build_insert_records(papers, gdrive_mapping)
    print(f"Built {len(records)} insert records")

    # Deduplicate
    records = deduplicate(records)
    print(f"After dedup: {len(records)} unique records")

    # Show sample
    print("\nSample records:")
    for r in records[:5]:
        print(f"  {r['course_code']} ({r['exam_year']}) — {r['course_name'][:50]}")
        print(f"    Dept: {r['department_code']} | Year: {r['academic_year']} | Sem: {r['semester']}")
        print(f"    URL: {r['view_url'][:60]}...")

    if dry_run:
        print("\n[DRY RUN] Would insert into past_papers table")
        print(f"Columns: {list(records[0].keys())}")
        print(f"INSERT count: {len(records)}")
        return

    # Connect to database
    db_url = os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL")
    if not db_url:
        print("\nERROR: No DATABASE_URL or POSTGRES_URL environment variable found.")
        print("Set it with: export POSTGRES_URL='postgresql://...'")
        sys.exit(1)

    print("\nConnecting to database...")
    import psycopg2
    from psycopg2.extras import execute_values

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    # Check existing records to avoid conflicts
    cursor.execute("SELECT course_code, exam_year, academic_year FROM past_papers")
    existing_keys = set((row[0], row[1], row[2]) for row in cursor.fetchall())
    print(f"Existing records: {len(existing_keys)} unique (course_code, exam_year, academic_year) combos")

    # Filter out records that already exist
    new_records = []
    for r in records:
        key = (
            r["course_code"].strip(),
            r["exam_year"].strip(),
            r["academic_year"].strip(),
        )
        if key not in existing_keys:
            new_records.append(r)

    print(f"New records to insert: {len(new_records)}")

    if new_records:
        # Build INSERT statement
        columns = list(new_records[0].keys())
        insert_query = f"""
            INSERT INTO past_papers ({', '.join(columns)})
            VALUES %s
            ON CONFLICT (course_code, exam_year, academic_year) DO NOTHING
        """

        # Truncate values to fit column constraints
        values = [
            tuple(truncate_value(r[col]) for col in columns)
            for r in new_records
        ]

        execute_values(cursor, insert_query, values, template=None, page_size=100)
        conn.commit()
        print(f"\n✓ Inserted {cursor.rowcount} records into past_papers table")

        # Verify
        cursor.execute("SELECT COUNT(*) FROM past_papers")
        total = cursor.fetchone()[0]
        print(f"  Total records in database: {total}")

    cursor.close()
    conn.close()
    print("\n✓ Database import complete!")


if __name__ == "__main__":
    main()
