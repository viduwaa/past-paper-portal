# Build the contribute form

Status: ready-for-agent

## What

`/contribute` — the upload form, and the navigation entries for it and
for the wall.

## Why

The upload endpoint is worthless if nobody can find it. Contribute is a
primary action, so it belongs in the top navigation; the wall is a
read-only showcase, so it belongs in the footer beside Live Stats.

## How

**`app/contribute/page.tsx`** — the page.

**`app/_components/ContributeForm.tsx`** — the form. A file picker plus
the metadata fields, using the same Radix `Select` components the
filters already use.

**`app/api/contribute/options/route.ts`** — the dropdown options. Every
value offered comes from the catalogue itself, so a contributor can only
select a department, study year, semester or exam year that already
exists. The server validates against the same lists, which is what stops
invented rows appearing in the catalogue. Edge-cached for an hour.

The subject code field is a text input backed by a `<datalist>` of the
existing codes, so a contributor of a new subject can still type one. A
regex check accepts the `ICT 1209` shape and the corpus's other
spellings, and the value is normalised to `ICT 1209` on the way in.

**Navigation**: a Contribute tab in `app/_components/TopNavigation.tsx`
(the `layoutId="activeTab"` pill, as the other tabs use) and a
Contributors link in `app/_components/Footer.tsx`.

**`app/_components/PaperTable.tsx`** — a "Contributed by …" badge on
contributed papers, in both the desktop table and the mobile card view.

## Constraints

- The form is a client component, but the options are fetched once on
  mount rather than per field change.
- The file is checked for size in the browser before it is sent, so a
  user does not wait for an upload that will be rejected.
- Both attribution fields are optional and the form says so.

## Done when

- The dropdowns contain only values the catalogue already has.
- Choosing an existing subject code suggests its name.
- A successful upload shows a confirmation and clears the form.
- The Contribute tab is the fourth tab in the top navigation, and
  Contributors is in the footer.
- A contributed paper shows a "Contributed by" badge in the table.
