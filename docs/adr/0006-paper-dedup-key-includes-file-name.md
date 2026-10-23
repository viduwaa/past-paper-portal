# The paper dedup key includes the file name

`past_papers` is keyed on
`(course_code, exam_year, academic_year, semester, file_name)`.

The subject alone is not an identity. One subject legitimately holds
several papers in a single period: CMT 1205 in 2025 Semester 1 has both
a Written Test and an Oral Test, and the corpus also holds
Theory/Practical pairs. Keying on the subject would have made a
legitimate second paper impossible to record.

`file_name` is what distinguishes the papers of one subject from each
other, and it is what the site shows a student anyway, so it is the
right thing to key on.

## Consequences

- The key must match the `ON CONFLICT` target in the import scripts.
  Postgres rejects an `ON CONFLICT` clause that does not name a real
  unique index, so `scripts/import_papers_to_db.py` and
  `scripts/generate_seed.py` use the same five columns.
- A paper re-uploaded under a slightly different file name is a
  different row. That is acceptable: the approval queue is where a
  human notices a near-duplicate, and the two files would have different
  names anyway.
- The production table had **no** unique constraint before this
  migration, so 38 duplicate rows existed and the key could not be
  tightened without first merging them. The merge is recorded in
  `past_papers_merge_log` so the superseded Drive copy stays findable.
