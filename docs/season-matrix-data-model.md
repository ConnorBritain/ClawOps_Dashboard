# Season Matrix Data Model

## Goal

Support two distinct dashboard views without duplicating logic:

- `Content` = operational workflow for what is moving now
- `Season` = strategic runway for what should exist across the 13-week cycle

To do that cleanly, the data model needs a `blueprint` layer and an `execution` layer.

## Why `content_pipeline` alone is not enough

`content_pipeline` can only tell the dashboard what has already been created.

It cannot distinguish:

- a required slot that has not started yet
- from a slot that was never planned

The Season Matrix needs to render all expected weekly deliverables, including empty ones, so we need a season plan table.

## Recommended Tables

### 1. `season_blueprint`

One row per expected content slot.

Suggested columns:

- `id UUID PRIMARY KEY`
- `season SMALLINT NOT NULL`
- `week SMALLINT NOT NULL`
- `venture TEXT NOT NULL`
  - `pattern-engine`
  - `g2l`
  - `pidgeon`
  - `personal`
- `content_type TEXT NOT NULL`
  - `pattern_card`
  - `currents`
  - `challenge_lab`
  - `social_post`
  - `newsletter`
  - `build_note`
  - `marginalia`
  - `skool_post`
  - `heygen_video`
- `slot_key TEXT NOT NULL`
  - stable identifier like `s1w1-pe-pattern-card`
- `title TEXT`
  - planned topic/title
- `theme TEXT`
  - optional pattern/pillar label
- `required BOOLEAN NOT NULL DEFAULT true`
- `target_count SMALLINT NOT NULL DEFAULT 1`
  - useful for social bundles
- `platforms JSONB`
  - for example `["x","linkedin"]`
- `notes TEXT`
- `sort_order SMALLINT NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()`

Recommended constraint:

- `UNIQUE (season, week, venture, content_type, slot_key)`

### 2. `content_pipeline`

Keep this as the execution table, but add a few columns so it can hydrate both Content and Season views.

Suggested additions:

- `blueprint_slot_id UUID NULL`
  - foreign key to `season_blueprint.id`
- `scheduled_at TIMESTAMPTZ NULL`
- `published_at TIMESTAMPTZ NULL`
- `owner_agent TEXT NULL`
  - separate from `created_by` if needed
- `canonical_url TEXT NULL`
  - final published URL
- `content_preview TEXT NULL`
  - short excerpt for dashboard cards
- `channel TEXT NULL`
  - `beehiiv`, `postiz`, `skool`, `drive`, etc.

Recommended foreign key:

- `FOREIGN KEY (blueprint_slot_id) REFERENCES season_blueprint(id)`

## Recommended Views

### `season_matrix_view`

Purpose:

- return every expected slot, even if no content item exists yet
- hydrate status from linked `content_pipeline` rows when present

Shape:

- blueprint fields
- derived `effective_status`
  - `not_started` when no content row exists
  - otherwise current pipeline status
- linked content metadata
  - `content_id`
  - `drive_link`
  - `postiz_id`
  - `beehiiv_id`
  - `scheduled_at`
  - `published_at`
  - `canonical_url`
  - `updated_at`

This can be implemented as a SQL view or in the API layer, but a view is cleaner for dashboard querying.

## API Shapes Needed By The Dashboard

### `GET /api/content-pipeline`

Operational view for the Content tab.

Recommended response item shape:

```ts
type ContentPipelineCard = {
  id: string;
  title: string;
  venture: "PE" | "G2L" | "Pidgeon" | "Personal";
  type: string;
  status: "idea" | "drafted" | "review" | "approved" | "scheduled" | "published";
  ownerAgent: string | null;
  createdBy: string | null;
  driveLink: string | null;
  canonicalUrl: string | null;
  postizId: string | null;
  beehiivId: string | null;
  channel: string | null;
  platform: string | null;
  contentPreview: string | null;
  season: number | null;
  week: number | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
};
```

### `GET /api/season-matrix?season=1`

Strategic view for the Season tab.

Recommended response shape:

```ts
type SeasonMatrixSlot = {
  slotId: string;
  season: number;
  week: number;
  venture: "PE" | "G2L" | "Pidgeon" | "Personal";
  contentType: string;
  slotKey: string;
  title: string | null;
  theme: string | null;
  required: boolean;
  targetCount: number;
  platforms: string[];
  status: "not_started" | "idea" | "drafted" | "review" | "approved" | "scheduled" | "published";
  contentId: string | null;
  driveLink: string | null;
  canonicalUrl: string | null;
  ownerAgent: string | null;
  updatedAt: string | null;
};

type SeasonMatrixResponse = {
  season: number;
  weeks: Array<{
    week: number;
    label: string;
    slots: SeasonMatrixSlot[];
  }>;
};
```

## UI Model

### Content Tab

Should answer:

- what is in motion right now
- what is blocked
- what is scheduled next

Recommended sections:

- `Pipeline`
- `Social`
- `Beacon`

Avoid showing the season matrix here.

### Season Tab

Should answer:

- what should exist in this season
- what is complete vs missing
- how much runway is already prepared

Recommended structure:

1. season hero
2. 13-week horizontal rail
3. selected week detail
4. content-type by venture matrix
5. season health strip
   - runway prepared
   - completion percentage
   - spend to date
   - beacon pacing

## Status Mapping

Recommended display mapping:

- `not_started` -> gray
- `idea` -> gray
- `drafted` -> amber
- `review` -> violet
- `approved` -> blue
- `scheduled` -> blue
- `published` -> green

## Minimum Backfill To Make The Dashboard Useful Immediately

To make the current Content tab feel alive, at minimum each content row should eventually include:

- `title`
- `type`
- `venture`
- `status`
- `season`
- `week`
- `drive_link`
- `platform`
- `scheduled_at`
- `published_at`
- `owner_agent`

Without `season` and `week`, the Season Matrix cannot place items correctly.
