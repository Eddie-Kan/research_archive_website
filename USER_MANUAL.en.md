# EK Research Archive — User Manual

> A local-first bilingual research archive and portfolio website for AI4S

---

## Table of Contents

1. [Quick Start (15 Minutes)](#1-quick-start-15-minutes)
2. [Installation Prerequisites](#2-installation-prerequisites)
3. [Installation Option A: Docker Compose (Recommended)](#3-installation-option-a-docker-compose-recommended)
4. [Installation Option B: Local Development Setup](#4-installation-option-b-local-development-setup)
5. [First-Time Setup and Initialization](#5-first-time-setup-and-initialization)
6. [Daily Workflow](#6-daily-workflow)
7. [Creating and Editing Content](#7-creating-and-editing-content)
8. [Using Markdown/MDX and Built-in Components](#8-using-markdownmdx-and-built-in-components)
9. [Managing Bilingual Content and Language Switching](#9-managing-bilingual-content-and-language-switching)
10. [Privacy Model and Safe Sharing](#10-privacy-model-and-safe-sharing)
11. [Search and Dashboards](#11-search-and-dashboards)
12. [Media Management](#12-media-management)
13. [Export Workflows](#13-export-workflows)
14. [Backup and Restore](#14-backup-and-restore)
15. [Updating and Upgrading the System](#15-updating-and-upgrading-the-system)
16. [Troubleshooting Guide](#16-troubleshooting-guide)
17. [Glossary of Terms and UI Labels](#17-glossary-of-terms-and-ui-labels)

---

## 1. Quick Start (15 Minutes)

This section gets you from zero to a running system with sample data in 15 minutes.

### Prerequisites

You need one of:

- **Option A (Recommended)**: Docker Desktop (includes Docker Compose)
- **Option B**: Node.js 20+ and npm

### Option A: Docker Quick Start

```bash
# 1. Clone the repository
git clone <repository-url> ek-research-archive
cd ek-research-archive

# 2. Start everything
docker compose up -d

# 3. Open your browser
# English:  http://localhost:3000/en/
# Chinese:  http://localhost:3000/zh-Hans/
```

### Option B: Local Quick Start

```bash
# 1. Clone the repository
git clone <repository-url> ek-research-archive
cd ek-research-archive

# 2. Copy environment configuration
cp .env.example .env.local

# 3. Install dependencies (automatically runs database migration + content ingestion)
npm install

# 4. Initialize database with default admin password (abc123)
npm run db:seed

# 5. Start the development server
npm run dev

# 6. Open your browser
# http://localhost:3000/en/ or http://localhost:3000/zh-Hans/
```

### Admin Login

After starting the server, visit `/admin/login` to access the admin panel. Default password: **abc123**. You can change it later in Admin → Settings.

[Screenshot: Home dashboard showing entity statistics and recent updates]

You'll see 21 pre-loaded sample entities covering projects, publications, experiments, datasets, models, and more.

---

## 2. Installation Prerequisites

### What Are These Tools?

If you're coming from a C++/Python background, here's how these tools map to what you already know:

| Tool | What It Is | Analogy |
|------|-----------|---------|
| **Node.js** | JavaScript runtime environment | Like `python3` — runs JS code outside a browser |
| **npm** | Package manager for Node.js (installed with Node.js) | Like `pip` for Python or `vcpkg` for C++ |
| **Docker** | Containerization tool — packages an app with all its dependencies | Like a lightweight VM that runs anywhere |
| **SQLite** | Embedded database stored in a single file | Like a self-contained `.db` file — no server needed |
| **JSON** | Data format using key-value pairs in curly braces | Like a Python dictionary written to a file |
| **MDX** | Extended Markdown that supports embedded interactive components | Markdown + embeddable charts/equations/tables |

### Installing Node.js 20+

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node@20

# Or download the installer from https://nodejs.org/
```

**Windows:**
```powershell
# Using winget
winget install OpenJS.NodeJS.LTS

# Or download the installer from https://nodejs.org/
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify your installation:
```bash
node --version   # Should show v20.x.x or higher
npm --version    # Should show 10.x.x or higher
```

### Installing Docker Desktop (Optional, Recommended)

- **macOS / Windows**: Download from https://www.docker.com/products/docker-desktop/
- **Linux**: See https://docs.docker.com/engine/install/

Verify:
```bash
docker --version          # Should show Docker version 24.x or higher
docker compose version    # Should show Docker Compose version v2.x
```

---

## 3. Installation Option A: Docker Compose (Recommended)

Docker Compose is the simplest installation method. It handles all dependencies, database initialization, and content ingestion automatically.

### Steps

```bash
# 1. Clone the repository
git clone <repository-url> ek-research-archive
cd ek-research-archive

# 2. Start the service (first run builds the image — takes a few minutes)
docker compose up -d

# 3. Check logs to confirm successful startup
docker compose logs -f
# Look for "Ready on http://0.0.0.0:3000"
# Press Ctrl+C to exit log view
```

### Common Docker Commands

```bash
docker compose up -d          # Start (background)
docker compose down           # Stop
docker compose logs -f        # View live logs
docker compose restart        # Restart
docker compose up -d --build  # Rebuild and start (after code updates)
```

### Data Persistence

Docker Compose mounts three volumes so your data survives container restarts:

| Local Path | Container Path | Purpose |
|-----------|---------------|---------|
| `./content-repo` | `/app/content-repo` | Content repository (read-only mount) |
| `./data` | `/app/data` | SQLite database |
| `./backups` | `/app/backups` | Backup files |

---

## 4. Installation Option B: Local Development Setup

### Steps

```bash
# 1. Clone the repository
git clone <repository-url> ek-research-archive
cd ek-research-archive

# 2. Copy the environment configuration
cp .env.example .env.local

# 3. Create data directories
mkdir -p data backups

# 4. Install dependencies
# npm install automatically runs the "prepare" script which:
#   - runs npm run db:migrate (creates database tables)
#   - runs npm run ingest (imports content from content-repo/)
npm install

# 5. Set default admin password (abc123)
npm run db:seed

# 6. Start the development server
npm run dev
```

### Production Mode

```bash
# Build for production
npm run build

# Start the production server
npm run start
```

### Environment Variables

Configured in `.env.local`:

```bash
# Runtime mode: "local" (SQLite) or "cloud" (remote database)
RUNTIME_MODE=local

# SQLite database file path
DATABASE_URL=file:./data/archive.db

# Content repository path
CONTENT_REPO_PATH=./content-repo

# Media file storage path
MEDIA_STORAGE_PATH=./content-repo/media

# Server binding address and port
HOST=127.0.0.1
PORT=3000

# Backup directory and retention policy
BACKUP_DIR=./backups
BACKUP_RETENTION_DAILY=30     # Keep 30 daily backups
BACKUP_RETENTION_MONTHLY=12   # Keep 12 monthly backups
```

---

## 5. First-Time Setup and Initialization

### Database Initialization

When you first run `npm install`, the system automatically:

1. **Runs database migrations** (`npm run db:migrate`): Creates all tables and indexes
2. **Ingests content** (`npm run ingest`): Scans `content-repo/entities/` and imports JSON files into the database

To run these manually:

```bash
# Run database migrations
npm run db:migrate

# Run content ingestion
npm run ingest
```

After ingestion you'll see:

```
Ingestion complete:
  Entities: 21 valid, 0 invalid (21 total)
  Edges: 19 valid, 0 invalid (19 total)
  Duration: 45ms
```

### Admin Password Setup

Set the default admin password by running:

```bash
npm run db:seed
```

This sets the password to `abc123`. To use a custom password instead:

```bash
npm run admin:set-password <your-password>
```

You can change the password later via the admin panel (Settings page) or by re-running the command above.

### Verifying Your Installation

Open `http://localhost:3000/en/` in your browser. You should see:

- [Screenshot: Home dashboard] Entity counts, breakdown by type, recently updated entities
- [Screenshot: Navigation bar] Home, Projects, Publications, Experiments, Datasets, Models, Notes, Ideas, Dashboards, Search

---

## 6. Daily Workflow

### A Typical Day

1. **Add new content**: Create a JSON file in the appropriate `content-repo/entities/` subdirectory
2. **Write detailed documentation**: Create MDX files in `content-repo/docs/`
3. **Establish relationships**: Add edges in `content-repo/entities/edges.json`
4. **Import to database**: Run `npm run ingest`
5. **View in browser**: Refresh the page

### Adding a New Entity — Complete Flow

```bash
# 1. Create the entity JSON file
#    (use your preferred editor — VS Code, Vim, etc.)

# 2. Import into the database
npm run ingest

# 3. If the dev server is running, just refresh your browser
```

### Regular Maintenance

```bash
# Create a backup (recommended daily)
npm run backup

# Validate entity schemas
npm run schema:validate
```

### Using the Admin Panel

The admin panel provides a web-based interface for managing all content. Access it at `/admin/login`.

**Default password:** `abc123` (set via `npm run db:seed`)

#### Dashboard

After logging in, the dashboard (`/admin`) shows:

- Total entity and edge counts
- Breakdown by entity type
- 8 most recently updated entities

#### Managing Entities

Navigate to **Entities** to:

- Browse all entities in a paginated, searchable table
- Filter by entity type
- Click **Create** to add a new entity with a form (bilingual title, summary, status, visibility, tags, and type-specific fields)
- Click an entity to edit it — three tabs are available:
  - **Metadata**: Edit all entity fields
  - **Content**: Edit bilingual MDX body (English and Chinese)
  - **Relations**: View and manage edges connected to this entity

#### Managing Edges (Relationships)

Navigate to **Edges** to:

- Create new relationships between entities (select From Entity → Edge Type → To Entity)
- View all edges in a table
- Delete edges

#### Backup & Restore

Navigate to **Backup** to:

- Create backups via the web interface
- View existing backups with size and timestamp
- Restore from any backup (with confirmation)

#### Settings

Navigate to **Settings** to change the admin password. Requires current password, new password (min 6 characters), and confirmation.

---

## 7. Creating and Editing Content

### Content Repository Structure

All content lives in the `content-repo/` directory:

```
content-repo/
├── entities/              ← Entity JSON files
│   ├── projects/          ← Research projects
│   ├── publications/      ← Academic publications
│   ├── experiments/       ← Experiment records
│   ├── datasets/          ← Datasets
│   ├── models/            ← ML models
│   ├── notes/             ← Technical notes
│   ├── ideas/             ← Research ideas
│   ├── methods/           ← Research methods
│   ├── materials/         ← Material systems
│   ├── metrics/           ← Evaluation metrics
│   ├── collaborators/     ← Collaborators
│   ├── institutions/      ← Institutions
│   └── edges.json         ← Knowledge graph edges (relationships)
├── docs/                  ← MDX body files
└── media/                 ← Media files (images, PDFs, etc.)
```

### Base Entity Structure

All 17 entity types share these base fields:

```json
{
  "id": "my-unique-id",
  "type": "project",
  "title": {
    "en": "English Title",
    "zh-Hans": "中文标题"
  },
  "summary": {
    "en": "A brief English summary.",
    "zh-Hans": "简短的中文摘要。"
  },
  "created_at": "2025-01-15T09:00:00Z",
  "updated_at": "2025-01-15T09:00:00Z",
  "status": "active",
  "visibility": "private",
  "tags": ["machine-learning", "perovskite"],
  "links": [],
  "authorship": {
    "owner_role": "lead-researcher",
    "contributors": []
  },
  "source_of_truth": {
    "kind": "file",
    "pointer": "content-repo/entities/projects/my-unique-id.json"
  }
}
```

**Field reference:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. Recommended format: `type-short-description` |
| `type` | string | Entity type (see table below) |
| `title` | bilingual | `{ "en": "...", "zh-Hans": "..." }` |
| `summary` | bilingual | Short summary |
| `status` | string | `active`, `paused`, `completed`, or `archived` |
| `visibility` | string | `private`, `unlisted`, or `public` |
| `tags` | string[] | Tag list |

### All 17 Entity Types

| Type ID | Name | Directory | Description |
|---------|------|-----------|-------------|
| `project` | Project | `projects/` | Research projects |
| `publication` | Publication | `publications/` | Academic papers |
| `experiment` | Experiment | `experiments/` | Experiment records |
| `dataset` | Dataset | `datasets/` | Data collections |
| `model` | Model | `models/` | ML models |
| `repo` | Repository | `repos/` | Code repositories |
| `note` | Note | `notes/` | Technical notes |
| `lit_review` | Literature Review | `lit-reviews/` | Literature reviews |
| `meeting` | Meeting | `meetings/` | Meeting logs |
| `idea` | Idea | `ideas/` | Research ideas |
| `skill` | Skill | `skills/` | Skills |
| `method` | Method | `methods/` | Research methods |
| `material_system` | Material System | `materials/` | Material systems |
| `metric` | Metric | `metrics/` | Evaluation metrics |
| `collaborator` | Collaborator | `collaborators/` | Collaborators |
| `institution` | Institution | `institutions/` | Institutions |
| `media` | Media | `media/` | Media assets |

### Project Template

```json
{
  "id": "proj-my-project",
  "type": "project",
  "title": { "en": "My Research Project", "zh-Hans": "我的研究项目" },
  "summary": { "en": "Brief summary.", "zh-Hans": "简短摘要。" },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "status": "active",
  "visibility": "private",
  "tags": ["machine-learning", "materials"],
  "links": [],
  "authorship": { "owner_role": "lead-researcher", "contributors": [] },
  "source_of_truth": { "kind": "file", "pointer": "content-repo/entities/projects/proj-my-project.json" },
  "project_kind": "applied-research",
  "research_area": "AI x Materials Science",
  "problem_statement": { "en": "What we aim to solve.", "zh-Hans": "我们要解决的问题。" },
  "contributions": { "en": "Our contributions.", "zh-Hans": "我们的贡献。" },
  "methods": ["method-gnn"],
  "material_systems": ["mat-perovskite-abx3"],
  "key_results": [
    { "metric": "MAE", "value": "0.043 eV/atom", "context": { "en": "On test set", "zh-Hans": "测试集上" } }
  ],
  "timeline": { "start_date": "2024-08-01", "end_date": "2025-06-01" },
  "artifacts": { "repos": [], "datasets": [], "experiments": [], "publications": [], "notes": [] }
}
```

### Publication Template

```json
{
  "id": "pub-my-paper",
  "type": "publication",
  "title": { "en": "Paper Title", "zh-Hans": "论文标题" },
  "summary": { "en": "Summary.", "zh-Hans": "摘要。" },
  "created_at": "2025-01-15T00:00:00Z",
  "updated_at": "2025-01-15T00:00:00Z",
  "status": "active",
  "visibility": "public",
  "tags": ["GNN", "crystal-structure"],
  "links": [],
  "authorship": { "owner_role": "first-author", "contributors": [] },
  "source_of_truth": { "kind": "file", "pointer": "content-repo/entities/publications/pub-my-paper.json" },
  "publication_type": "journal-article",
  "venue": { "en": "Nature Computational Materials", "zh-Hans": "自然·计算材料" },
  "date": "2025-01-15",
  "authors": ["Your Name", "Collaborator Name"],
  "abstract": { "en": "Full abstract.", "zh-Hans": "完整摘要。" },
  "identifiers": { "doi": "10.1038/s41524-025-xxxxx", "arxiv": "2501.xxxxx" },
  "associated_projects": ["proj-my-project"],
  "peer_review_status": "published"
}
```

### Experiment Template

```json
{
  "id": "exp-my-experiment",
  "type": "experiment",
  "title": { "en": "Experiment Title", "zh-Hans": "实验标题" },
  "summary": { "en": "Summary.", "zh-Hans": "摘要。" },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "status": "completed",
  "visibility": "private",
  "tags": ["ablation"],
  "links": [],
  "authorship": { "owner_role": "lead-researcher", "contributors": [] },
  "source_of_truth": { "kind": "file", "pointer": "content-repo/entities/experiments/exp-my-experiment.json" },
  "experiment_type": "computational",
  "hypothesis": { "en": "Our hypothesis.", "zh-Hans": "我们的假设。" },
  "protocol": { "en": "Step-by-step protocol.", "zh-Hans": "逐步实验方案。" },
  "inputs": ["ds-my-dataset"],
  "outputs": ["ml-my-model"],
  "results": [{ "metric": "MAE", "value": "0.043 eV/atom" }],
  "reproducibility": { "level": "exact", "environment": "Python 3.11 + PyTorch 2.1", "seed": 42 }
}
```

### Dataset Template

```json
{
  "id": "ds-my-dataset",
  "type": "dataset",
  "title": { "en": "Dataset Title", "zh-Hans": "数据集标题" },
  "summary": { "en": "Summary.", "zh-Hans": "摘要。" },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "status": "active",
  "visibility": "public",
  "tags": ["crystal-structures"],
  "links": [],
  "authorship": { "owner_role": "lead-researcher", "contributors": [] },
  "source_of_truth": { "kind": "file", "pointer": "content-repo/entities/datasets/ds-my-dataset.json" },
  "dataset_kind": "benchmark",
  "description": { "en": "Detailed description.", "zh-Hans": "详细描述。" },
  "schema_def": {},
  "license": "CC-BY-4.0",
  "provenance": { "source": "Materials Project API", "transformations": ["filtering", "normalization"] },
  "storage": { "location": "content-repo/data/", "format": "csv", "size_bytes": 1024000, "checksum": "sha256:abc123" }
}
```

### Idea Template

```json
{
  "id": "idea-my-idea",
  "type": "idea",
  "title": { "en": "Idea Title", "zh-Hans": "想法标题" },
  "summary": { "en": "Summary.", "zh-Hans": "摘要。" },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "status": "active",
  "visibility": "private",
  "tags": ["transfer-learning"],
  "links": [],
  "authorship": { "owner_role": "lead-researcher", "contributors": [] },
  "source_of_truth": { "kind": "file", "pointer": "content-repo/entities/ideas/idea-my-idea.json" },
  "idea_kind": "research-question",
  "problem": { "en": "The problem to solve.", "zh-Hans": "要解决的问题。" },
  "proposed_approach": { "en": "Proposed approach.", "zh-Hans": "提议的方法。" },
  "expected_value": { "impact": 8, "novelty": 7, "feasibility": 6, "learning_value": 9 },
  "dependencies": [],
  "idea_status": "exploring"
}
```

### Note Template

```json
{
  "id": "note-my-note",
  "type": "note",
  "title": { "en": "Note Title", "zh-Hans": "笔记标题" },
  "summary": { "en": "Summary.", "zh-Hans": "摘要。" },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "status": "active",
  "visibility": "private",
  "tags": ["synthesis"],
  "links": [],
  "authorship": { "owner_role": "lead-researcher", "contributors": [] },
  "source_of_truth": { "kind": "file", "pointer": "content-repo/entities/notes/note-my-note.json" },
  "note_type": "reference",
  "body_mdx_id": "note-my-note",
  "related_entities": ["proj-my-project"]
}
```

### Collaborator Template

Note: The `links` field for collaborators is an **object**, not an array.

```json
{
  "id": "collab-zhang-wei",
  "type": "collaborator",
  "title": { "en": "Zhang Wei", "zh-Hans": "张伟" },
  "summary": { "en": "Computational materials scientist.", "zh-Hans": "计算材料科学家。" },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "status": "active",
  "visibility": "public",
  "tags": ["DFT", "materials"],
  "links": { "website": "https://example.edu/~zhangwei", "orcid": "0000-0001-2345-6789" },
  "authorship": { "owner_role": "contributor", "contributors": [] },
  "source_of_truth": { "kind": "file", "pointer": "content-repo/entities/collaborators/collab-zhang-wei.json" },
  "name": "Zhang Wei",
  "role": "Computational Materials Scientist",
  "affiliation": "Tsinghua University"
}
```

### Creating Relationships (Edges)

Edit `content-repo/entities/edges.json` to add relationships between entities:

```json
[
  {
    "id": "edge-proj-contains-exp",
    "from_id": "proj-my-project",
    "to_id": "exp-my-experiment",
    "edge_type": "project_contains",
    "created_at": "2025-01-15T00:00:00Z",
    "label": { "en": "contains", "zh-Hans": "包含" },
    "weight": 1.0
  }
]
```

**Supported edge types:**

| Edge Type | Meaning | Example |
|-----------|---------|---------|
| `project_contains` | Project contains | Project → Experiment |
| `produced` | Produced | Experiment → Model |
| `evaluated_on` | Evaluated on | Model → Dataset |
| `cites` | Cites | Publication → Publication |
| `derived_from` | Derived from | Dataset → Dataset |
| `implements` | Implements | Model → Method |
| `collaborates_with` | Collaborates with | Project → Collaborator |
| `related_to` | Related to | Any entity pair |
| `supersedes` | Supersedes | New version → Old version |

### Importing Content

After modifying any JSON files or edges.json, run:

```bash
npm run ingest
```

Ingestion is incremental — unchanged entities (same checksum) are skipped. Only modified entities are re-indexed.

---

## 8. Using Markdown/MDX and Built-in Components

### What Is MDX?

MDX is an extension of Markdown. If you're familiar with Markdown (`.md` files), MDX adds the ability to embed interactive components (charts, equations, data tables) directly in your documents.

### Creating MDX Body Files

To add detailed body content for an entity, create files in `content-repo/docs/`:

- English: `{entity-id}.en.mdx`
- Chinese: `{entity-id}.zh-Hans.mdx`

For example, for project `proj-my-project`:

```
content-repo/docs/proj-my-project.en.mdx      ← English body
content-repo/docs/proj-my-project.zh-Hans.mdx  ← Chinese body
```

### MDX Basic Syntax

MDX supports all standard Markdown syntax:

```markdown
# Heading 1
## Heading 2

Regular paragraph text. **Bold** and *italic*.

- Unordered list item
- Another item

1. Ordered list
2. Second item

> Blockquote

`inline code` and code blocks:

```python
import numpy as np
x = np.array([1, 2, 3])
```

[Link text](https://example.com)
![Image alt text](/media/figure.png)
```

### Built-in MDX Components

The system provides 6 specialized components you can use directly in MDX files:

#### 1. FigureCard — Image with Caption

```mdx
<FigureCard
  src="/media/crystal-structure.png"
  alt="Crystal structure diagram"
  caption_en="Figure 1: ABX3 perovskite crystal structure"
  caption_zh="图 1：ABX3 钙钛矿晶体结构"
  width={600}
  height={400}
/>
```

#### 2. CitationBlock — Academic Citation

```mdx
<CitationBlock
  authors="Zhang, W., Li, X., & Wang, Y."
  title="Graph Neural Networks for Crystal Property Prediction"
  venue="Nature Computational Materials"
  year={2025}
  doi="10.1038/s41524-025-00001"
/>
```

#### 3. Equation — LaTeX Math via KaTeX

```mdx
Inline equation: <Equation math="E = mc^2" display={false} />

Display equation:
<Equation math="\Delta G = \Delta H - T\Delta S" label="gibbs-free-energy" />
```

#### 4. InteractivePlot — Vega-Lite Charts

```mdx
<InteractivePlot
  spec={{
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "data": { "values": [{"x": 1, "y": 2}, {"x": 2, "y": 4}, {"x": 3, "y": 3}] },
    "mark": "line",
    "encoding": {
      "x": {"field": "x", "type": "quantitative"},
      "y": {"field": "y", "type": "quantitative"}
    }
  }}
  width={500}
  height={300}
/>
```

#### 5. ExperimentRunTable — Experiment Run Records

```mdx
<ExperimentRunTable
  title="Hyperparameter Search Results"
  runs={[
    { "run_id": "run-001", "params": {"lr": 0.001, "epochs": 100}, "metrics": {"mae": 0.043, "r2": 0.95}, "status": "completed", "date": "2025-01-10" },
    { "run_id": "run-002", "params": {"lr": 0.0005, "epochs": 200}, "metrics": {"mae": 0.038, "r2": 0.96}, "status": "completed", "date": "2025-01-11" }
  ]}
/>
```

#### 6. DatasetSchemaViewer — Dataset Schema Viewer

```mdx
<DatasetSchemaViewer
  title="Perovskite Dataset Schema"
  format="csv"
  fields={[
    { "name": "formula", "type": "string", "description": "Chemical formula", "example": "CsPbI3" },
    { "name": "formation_energy", "type": "float", "description": "Formation energy (eV/atom)", "nullable": false },
    { "name": "bandgap", "type": "float", "description": "Band gap (eV)", "nullable": true }
  ]}
/>
```

---

## 9. Managing Bilingual Content and Language Switching

### Bilingual Text Pattern

All user-facing text fields in the system use a bilingual format:

```json
{
  "en": "English text",
  "zh-Hans": "中文文本"
}
```

### Language Switching

- Click the language toggle button in the top-right corner of the navigation bar
- The locale segment in the URL changes accordingly: `/en/projects` ↔ `/zh-Hans/projects`
- Language preference is saved in the browser's localStorage (key: `ek-archive-locale`) and restored on next visit

[Screenshot: Language toggle button in the navigation bar]

### Fallback Behavior

If a field is missing a translation for the current language, the system automatically falls back to the other language and displays a "(fallback)" indicator.

For example: if you're viewing the Chinese interface and an entity only has an English title, the system shows the English title with a "(fallback)" note.

### Best Practices

1. **Write in your strongest language first** — the other language can be added later
2. **Use English for `id` and `tags`** — they appear in URLs and are used in program logic
3. **Maintain MDX body files separately** — `{id}.en.mdx` and `{id}.zh-Hans.mdx` are independent files and can have different levels of detail

---

## 10. Privacy Model and Safe Sharing

### Three Visibility Levels

| Level | UI Label | Description |
|-------|----------|-------------|
| `private` | Private | Only you can see it (default) |
| `unlisted` | Unlisted | Visible to anyone with the link, but not listed publicly |
| `public` | Public | Visible to everyone |

### Setting Visibility

Set the `visibility` field in the entity JSON file:

```json
{
  "visibility": "private"
}
```

### View Modes

The system supports three view modes, controlled by the `mode` API parameter:

| Mode | Description |
|------|-------------|
| `private` | Shows all entities (owner mode) |
| `public` | Shows only `visibility: "public"` entities |
| `curated` | Shows a manually selected subset of entities |

### Data Sanitization in Public Mode

When accessed in `public` mode, the following sensitive fields are automatically removed:

- `raw_metadata` (raw metadata)
- `source_of_truth` (data source information)
- `owner_role` (owner role)
- `confidentiality_note` (confidentiality notes)
- `review_notes` (review notes)

### Safe Sharing Recommendations

1. Default new entities to `private`
2. Change to `unlisted` or `public` when ready to share
3. Use `npm run export:static` to export a public-only static site
4. Review all entity visibility settings before exporting

---

## 11. Search and Dashboards

### Full-Text Search

Visit `/en/search` or press `Ctrl+K` to open search.

[Screenshot: Search page showing search box and results list]

Search is powered by SQLite FTS5 full-text search engine and supports:

- Mixed English and Chinese search
- Filtering by entity type
- Highlighted matching text in results

### Dashboards

The system provides three visualization dashboards:

#### Research Atlas (Force-Directed Graph)

Path: `/en/dashboards/atlas`

[Screenshot: Force-directed graph with nodes representing entities and edges representing relationships]

- Interactive force-directed graph showing all entities and their relationships
- Nodes are color-coded by entity type
- Supports zoom and drag
- Click a node to navigate to its detail page

#### Timeline

Path: `/en/dashboards/timeline`

[Screenshot: Timeline view showing entity events arranged chronologically]

- Displays research activities in chronological order
- Shows entity creation and update events

#### Methods × Materials Matrix

Path: `/en/dashboards/matrix`

[Screenshot: Matrix view with methods as rows and material systems as columns]

- Shows cross-relationships between research methods and material systems
- Cell numbers indicate the count of associated entities

---

## 12. Media Management

### Storage Location

Media files are stored in the `content-repo/media/` directory.

### Adding Media Files

1. Copy the file to `content-repo/media/`
2. Reference it in an MDX file:

```mdx
<FigureCard src="/media/my-figure.png" caption_en="My figure" caption_zh="我的图片" />
```

Or use standard Markdown syntax:

```markdown
![Alt text](/media/my-figure.png)
```

### Supported Media Types

- Images: PNG, JPG, SVG, WebP
- Documents: PDF
- Video: MP4, WebM
- Audio: MP3, WAV
- Other: ZIP and other archive files

### Media Provenance

Each media file can be linked to the entity that produced it (`provenance_entity_id`), enabling traceability for images and data files.

---

## 13. Export Workflows

### PDF Export

Click "Export as PDF" on any entity detail page, or use the API:

```bash
# Export English PDF
curl "http://localhost:3000/api/export/pdf?entityId=proj-my-project&locale=en"

# Export Chinese PDF
curl "http://localhost:3000/api/export/pdf?entityId=proj-my-project&locale=zh-Hans"
```

The returned HTML can be saved as PDF using your browser's "Print → Save as PDF" function.

### Static Site Export

Export the entire site as static HTML files, deployable to any static hosting service:

```bash
# Export English version
npm run export:static en ./out/static-en

# Export Chinese version
npm run export:static zh-Hans ./out/static-zh

# Export a specific curated view
npm run export:static en ./out/portfolio my-view-id
```

Example output:
```
Export complete:
  Files: 45
  Size: 2.3 MB
```

### Portable Archive Export

Package all content into a single ZIP file, including entity data, MDX documents, media files, and the database:

```bash
# Full archive
npm run export:archive

# Without media files (smaller size)
npm run export:archive ./out/my-archive.zip --no-media

# Without database (source files only)
npm run export:archive ./out/my-archive.zip --no-db
```

Example output:
```
Archive created:
  Path: ./out/archive-2025-02-16T12-30-45-123Z.zip
  Size: 15.23 MB
  Checksum: sha256:abc123...
```

### Verifying Exported Files

Use the SHA256 checksum from the output to verify file integrity:

```bash
# macOS
shasum -a 256 ./out/archive-2025-02-16T12-30-45-123Z.zip

# Linux
sha256sum ./out/archive-2025-02-16T12-30-45-123Z.zip

# Windows (PowerShell)
Get-FileHash ./out/archive-2025-02-16T12-30-45-123Z.zip -Algorithm SHA256
```

---

## 14. Backup and Restore

### Creating Backups

```bash
# Manual backup (default)
npm run backup

# Daily backup
npm run backup daily

# Monthly backup
npm run backup monthly
```

Example output:
```
Creating manual backup...
Backup created: ./backups/backup-manual-2025-02-16T12-30-45-123Z.zip
Size: 5.23 MB
Checksum: sha256:abc123...
```

### Web-Based Backup Management

Visit `/en/admin/backup`:

[Screenshot: Backup management page showing backup list and create button]

### Restoring from Backup

```bash
npm run restore ./backups/backup-manual-2025-02-16T12-30-45-123Z.zip
```

Example output:
```
Restoring from ./backups/backup-manual-2025-02-16T12-30-45-123Z.zip...
Restore successful: 21 entities restored
```

### Backup Retention Policy

The system automatically manages backup file counts:

- Daily backups: keeps the most recent 30 (configurable via `BACKUP_RETENTION_DAILY`)
- Monthly backups: keeps the most recent 12 (configurable via `BACKUP_RETENTION_MONTHLY`)
- Manual backups: never automatically deleted

### Disaster Recovery

If the database is corrupted or lost:

```bash
# 1. Remove the corrupted database
rm data/archive.db

# 2. Recreate the database and re-import content
npm run db:migrate
npm run ingest

# Or restore from a backup
npm run restore ./backups/your-latest-backup.zip
```

---

## 15. Updating and Upgrading the System

### Updating Code

```bash
# 1. Pull the latest code
git pull origin main

# 2. Install new dependencies
npm install
# npm install automatically runs database migration and content re-ingestion

# 3. If using Docker
docker compose up -d --build
```

### Database Migrations

Code updates may include database schema changes. Migrations run automatically during `npm install`, or can be run manually:

```bash
npm run db:migrate
```

### Re-indexing Search

If search results seem incorrect, re-import all content to rebuild the search index:

```bash
# Delete the database and rebuild
rm data/archive.db
npm run db:migrate
npm run ingest
```

### Safe Upgrade Checklist

1. Create a backup before updating: `npm run backup`
2. Pull code: `git pull`
3. Install dependencies: `npm install`
4. Verify build: `npm run build`
5. Run tests: `npm run test`
6. Start and verify: `npm run start`

---

## 16. Troubleshooting Guide

### Common Errors and Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Module not found` | Dependencies not installed | Run `npm ci` |
| `SQLITE_BUSY: database is locked` | Multiple processes accessing the database | Stop other processes using the database |
| `Migration failed` | Database schema inconsistency | `rm data/archive.db && npm run db:migrate && npm run ingest` |
| `EADDRINUSE: port 3000` | Port already in use | `PORT=3001 npm run dev` or close the program using port 3000 |
| `Ingestion: X invalid entities` | JSON file format errors | Run `npm run schema:validate` for detailed errors |
| `Cannot find module 'better-sqlite3'` | Native module compilation failed | `npm rebuild better-sqlite3` |

### Log Locations

- **Development mode**: Logs output directly to the terminal
- **Docker mode**: `docker compose logs -f`
- **Production mode**: Standard output (stdout)

### Database Diagnostics

```bash
# Check if the database file exists
ls -la data/archive.db

# Check entity counts by type (requires sqlite3 CLI tool)
sqlite3 data/archive.db "SELECT type, COUNT(*) FROM entities GROUP BY type;"

# Check database integrity
sqlite3 data/archive.db "PRAGMA integrity_check;"
```

### Full System Reset

If you encounter an unresolvable issue, you can fully reset:

```bash
# 1. Back up current data
npm run backup

# 2. Delete the database
rm data/archive.db

# 3. Re-initialize
npm run db:migrate
npm run ingest

# 4. Verify
npm run dev
```

---

## 17. Glossary of Terms and UI Labels

### System Terms

| Term | Description |
|------|-------------|
| Entity | The basic data unit in the system (project, publication, experiment, etc.) |
| Edge | A relationship connection between entities |
| Ingestion | The process of importing JSON file content into the database |
| Migration | A database structure update |
| FTS5 | SQLite's full-text search engine |
| MDX | Extended Markdown format supporting interactive components |
| Locale | Language region — `en` (English) or `zh-Hans` (Simplified Chinese) |
| Visibility | The access permission level of an entity |
| Curated View | A manually selected subset of entities for sharing |
| Backup | A safety copy of data |
| Checksum | A hash value used to verify file integrity |

### UI Label Reference (English ↔ Chinese)

| Location | English | Chinese |
|----------|---------|---------|
| Navigation | Home | 首页 |
| Navigation | Projects | 研究项目 |
| Navigation | Publications | 学术发表 |
| Navigation | Experiments | 实验记录 |
| Navigation | Datasets | 数据集 |
| Navigation | Models | 模型 |
| Navigation | Notes | 技术笔记 |
| Navigation | Ideas | 想法库 |
| Navigation | Dashboards | 仪表盘 |
| Navigation | Search | 搜索 |
| Navigation | Admin | 管理 |
| Dashboard | Research Atlas | 研究图谱 |
| Dashboard | Timeline | 时间线 |
| Dashboard | Collaboration Matrix | 协作矩阵 |
| Status | Active | 进行中 |
| Status | Paused | 已暂停 |
| Status | Completed | 已完成 |
| Status | Archived | 已归档 |
| Visibility | Private | 私密 |
| Visibility | Unlisted | 未公开 |
| Visibility | Public | 公开 |
| Action | Export as PDF | 导出为 PDF |
| Action | Export as static site | 导出为静态站点 |
| Action | Export as archive | 导出为归档文件 |
| Action | Create backup | 创建备份 |
| Action | Restore backup | 恢复备份 |
| Search | Search entities... (Ctrl+K) | 搜索实体... (Ctrl+K) |

### Entity Type Reference

| English | Chinese | Type ID |
|---------|---------|---------|
| Project | 项目 | `project` |
| Publication | 论文 | `publication` |
| Experiment | 实验 | `experiment` |
| Dataset | 数据集 | `dataset` |
| Model | 模型 | `model` |
| Repository | 代码仓库 | `repo` |
| Note | 笔记 | `note` |
| Literature Review | 文献综述 | `lit_review` |
| Meeting | 会议 | `meeting` |
| Idea | 想法 | `idea` |
| Skill | 技能 | `skill` |
| Method | 方法 | `method` |
| Material System | 材料体系 | `material_system` |
| Metric | 指标 | `metric` |
| Collaborator | 合作者 | `collaborator` |
| Institution | 机构 | `institution` |
| Media | 媒体 | `media` |

---

*EK Research Archive v0.1.0 — This manual was written based on the actual codebase. All commands and paths have been verified.*
