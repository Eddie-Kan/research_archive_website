# EK Research Archive

A bilingual (English / 中文) knowledge management web application for organizing research projects, publications, experiments, datasets, and related artifacts.

[中文说明见下方](#中文说明)

---

## Features

- **16 Entity Types** — projects, publications, experiments, datasets, models, repositories, notes, ideas, literature reviews, meetings, skills, methods, material systems, metrics, collaborators, institutions
- **Knowledge Graph** — D3-powered atlas visualization of entity relationships
- **Bilingual i18n** — full English and Simplified Chinese support with locale-based routing
- **Admin Panel** — authenticated CRUD interface with audit logging
- **Full-Text Search** — SQLite FTS5 with faceted filtering; optional semantic search via Transformers.js
- **Dashboards** — timeline, atlas, registry, integrity checker, media gallery
- **Export & Backup** — ZIP archive export, static site export, scheduled backups with retention policies
- **Local-First** — SQLite database, file-based content repo, optional cloud mode (PostgreSQL + S3)
- **Docker Support** — multi-stage Dockerfile with docker-compose

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 16, React 18, TypeScript, Tailwind CSS, Radix UI |
| Visualization | D3.js, Vega-Lite |
| Content | MDX, KaTeX (math), rehype-pretty-code |
| Backend | Next.js API routes, better-sqlite3 |
| Testing | Vitest, Playwright |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env.local

# 3. Initialize database and set default admin password (abc123)
npm run db:seed

# 4. Start development server
npm run dev
```

Open http://localhost:3000. Admin panel at `/admin/login`, default password: **abc123**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database (sets default password abc123) |
| `npm run ingest` | Ingest content from content-repo/ |
| `npm run backup` | Create database backup |
| `npm run restore` | Restore from backup |
| `npm run export:static` | Export as static HTML |
| `npm run export:archive` | Export as ZIP archive |
| `npm run admin:set-password <pw>` | Set admin password |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run lint` | Lint source code |
| `npm run typecheck` | TypeScript type check |

## Project Structure

```
src/
  app/[locale]/       # Locale-routed pages (en, zh-Hans)
    admin/            # Admin panel (login, entities, edges, backup, settings)
    dashboards/       # Atlas, timeline, registry, integrity, media
    search/           # Search interface
  components/         # React components (admin, entity, layout, dashboards, mdx)
  lib/                # Utilities (db, auth, i18n, search, ingestion, export, backup)
  domain/             # Business logic, hooks, services, types
scripts/              # CLI scripts (migrate, seed, ingest, backup, export, etc.)
packages/schema/      # Shared Zod schemas and TypeScript types
content-repo/         # Content storage (entities JSON, media, docs)
```

## Configuration

Copy `.env.example` to `.env.local`. Key options:

| Variable | Default | Description |
|----------|---------|-------------|
| `RUNTIME_MODE` | `local` | `local` (SQLite) or `cloud` (PostgreSQL + S3) |
| `DATABASE_URL` | `file:./data/archive.db` | Database path |
| `SEMANTIC_SEARCH_ENABLED` | `false` | Enable ML-based semantic search |
| `EXPORT_STATIC` | `false` | Static site export mode |
| `BACKUP_RETENTION_DAILY` | `30` | Days to keep daily backups |

## Docker

```bash
docker compose up
```

## License

[MIT](LICENSE)

---

<a id="中文说明"></a>

# 中文说明

一个双语（English / 中文）知识管理 Web 应用，用于组织研究项目、论文、实验、数据集及相关研究成果。

## 功能特性

- **16 种实体类型** — 项目、论文、实验、数据集、模型、代码仓库、笔记、想法、文献综述、会议、技能、方法、材料体系、指标、合作者、机构
- **知识图谱** — 基于 D3 的图谱可视化，展示实体间关系
- **双语国际化** — 完整的中英文支持，基于 URL 的语言路由
- **管理后台** — 带身份验证的 CRUD 管理界面，含审计日志
- **全文搜索** — SQLite FTS5 全文检索，支持分面过滤；可选基于 Transformers.js 的语义搜索
- **仪表盘** — 时间线、图谱、注册表、完整性检查、媒体库
- **导出与备份** — ZIP 归档导出、静态站点导出、定时备份（含保留策略）
- **本地优先** — SQLite 数据库 + 文件内容仓库，可选云模式（PostgreSQL + S3）
- **Docker 支持** — 多阶段构建 Dockerfile + docker-compose

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 复制环境配置
cp .env.example .env.local

# 3. 初始化数据库并设置默认管理员密码 (abc123)
npm run db:seed

# 4. 启动开发服务器
npm run dev
```

打开 http://localhost:3000。管理后台位于 `/admin/login`，默认密码：**abc123**。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产环境构建 |
| `npm run db:seed` | 初始化数据库（设置默认密码 abc123） |
| `npm run ingest` | 从 content-repo/ 导入内容 |
| `npm run backup` | 创建数据库备份 |
| `npm run admin:set-password <密码>` | 设置管理员密码 |
| `npm test` | 运行单元测试 |
| `npm run test:e2e` | 运行端到端测试 |

## 许可证

[MIT](LICENSE)
