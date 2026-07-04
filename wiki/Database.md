# Database Reference

**Neon Postgres is the single source of truth** — every section of the site, and
every uploaded file, lives here. The full DDL is
[`scripts/schema.sql`](https://github.com/drewdog88/ewa-website-revamp/blob/main/scripts/schema.sql);
apply it with `scripts/apply-schema.mjs` (see [Development Process](Development-Process)).

## Entity overview

![The EWA data model — eight tables in one Neon Postgres database. Two relationships matter: clubs has many payment_methods (Zelle and provider links per club), and resources reference at most one artifact (an uploaded file). News, officers, fundraiser, and users stand alone. Because uploaded files live in the artifacts table as bytea, a single pg_dump captures the entire site — content, settings, and every PDF and image](assets/data-model.png)

Eight tables total. `clubs → payment_methods` and `resources → artifacts` are the
only relationships; the rest are independent content tables.

---

## `clubs`

The booster clubs / programs listed in the "Our Clubs" section.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | |
| `description` | text | |
| `website_url` | text | Optional external site |
| `is_active` | bool = true | Public list shows active only |
| `sort_order` | int = 0 | Drives the custom display order |
| `created_at` / `updated_at` | timestamptz | `updated_at` auto-maintained by trigger |

## `payment_methods`

Ways to give, **scoped to a club** (`ON DELETE CASCADE`).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `club_id` | int NOT NULL → clubs | Cascades on club delete |
| `type` | text | One of `zelle`, `stripe`, `paypal`, `venmo`, `other` |
| `label` | text | Button/label text |
| `value` | text NOT NULL | Zelle: full `enroll.zellepay.com` QR URL. Others: provider payment URL |
| `display_token` | text | **Zelle only** — email/phone shown as text beside the QR |
| `qr_settings` | jsonb | **Zelle only** — size/margin/color/error-correction |
| `sort_order` | int = 0 | |
| `is_active` | bool = true | |

Indexed on `club_id`. See [Payments](Payments) for how `value`/`display_token`
are produced and rendered.

## `news`

Announcements shown in "News & Announcements".

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `title` | text NOT NULL | |
| `body` | text | Supports markdown-style links & in-page anchors (rendered safely) |
| `tag` | text | e.g. "Announcement" |
| `is_published` | bool = false | Public endpoint filters on this |
| `published_at` | timestamptz | Set when first published; drives ordering |
| `created_at` / `updated_at` | timestamptz | trigger-maintained |

## `officers`

The board roster.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | |
| `role` | text | |
| `email` | text | |
| `sort_order` | int = 0 | |

## `resources`

Quick links & documents. Points to **either** an external link **or** an uploaded
file — never both.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `title` | text NOT NULL | |
| `description` | text | |
| `url` | text | External link (used when set) |
| `artifact_id` | int → artifacts | Uploaded file (FK `ON DELETE SET NULL`) |
| `sort_order` | int = 0 | |
| `is_active` | bool = true | |

## `artifacts`

Uploaded files (logos, PDFs, images) stored **inside the database**.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `filename` | text NOT NULL | |
| `mime_type` | text | Sent as `Content-Type` when served |
| `bytes` | bytea NOT NULL | The file itself; served base64-encoded at `/api/artifacts/:id` |
| `uploaded_at` | timestamptz | |

Storing files here (rather than an external blob store) is a deliberate choice:
**the nightly `pg_dump` captures every uploaded file automatically** — nothing
external to back up. Upload ceiling is 8 MB (enforced in the API).

## `users`

Admins only. **No public sign-up.**

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `username` | text UNIQUE NOT NULL | |
| `password_hash` | text NOT NULL | **bcrypt** — never plaintext |
| `created_at` | timestamptz | |

Seed/reset with `scripts/seed-admin.mjs` (bcrypt, cost 12). The restore drill
fails loudly if this table is empty — a backup nobody could log into is a failed
backup.

## `fundraiser`

A single active row backing the fundraiser tracker.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `headline` | text | |
| `goal_cents` | int = 0 | Money stored in **cents** to avoid float rounding |
| `raised_cents` | int = 0 | |
| `is_active` | bool = true | |
| `updated_at` | timestamptz | trigger-maintained |

---

## Conventions

- **`updated_at` triggers.** `clubs`, `news`, `fundraiser` share a
  `set_updated_at()` trigger function that stamps `updated_at = now()` on update.
- **Money in cents.** Integer cents everywhere; format to dollars in the UI.
- **Soft visibility, not deletion.** Content uses `is_active` / `is_published`
  flags so hiding something is reversible and never loses data.
- **The 8 expected tables** (what the restore drill asserts): `artifacts`,
  `clubs`, `fundraiser`, `news`, `officers`, `payment_methods`, `resources`,
  `users`.