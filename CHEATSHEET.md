# EK Research Archive — Quick Reference / 快速参考

---

## NPM Scripts / 脚本命令

| Command / 命令 | Description / 说明 |
|---|---|
| `npm run dev` | Start dev server / 启动开发服务器 |
| `npm run build` | Production build / 生产构建 |
| `npm run start` | Start production server / 启动生产服务器 |
| `npm run db:migrate` | Run database migrations / 运行数据库迁移 |
| `npm run ingest` | Ingest content from `content-repo/` / 从 `content-repo/` 导入内容 |
| `npm run backup` | Create backup (`daily\|monthly\|manual`) / 创建备份 |
| `npm run restore <path>` | Restore from backup ZIP / 从备份 ZIP 恢复 |
| `npm run export:static` | Static snapshot (`locale outputDir viewId`) / 静态快照 |
| `npm run export:archive` | Portable archive (`outputPath`, `--no-media --no-db`) / 便携归档 |
| `npm run test` | Run unit tests / 运行单元测试 |
| `npm run test:integration` | Run integration tests / 运行集成测试 |
| `npm run test:e2e` | Run E2E tests / 运行端到端测试 |
| `npm run schema:validate` | Validate entity schemas / 验证实体 Schema |
| `npm run lint` | Lint code / 代码检查 |
| `npm run typecheck` | Type check / 类型检查 |

## Docker

```bash
docker compose up -d            # Start / 启动
docker compose down             # Stop / 停止
docker compose logs -f          # View logs / 查看日志
docker compose up -d --build    # Rebuild after updates / 更新后重建
```

## Key URLs / 关键地址 (default port 3000)

```
/en/                        Home (English)        /zh-Hans/                   首页（中文）
/en/projects                Projects list         /zh-Hans/projects           项目列表
/en/search                  Search                /zh-Hans/search             搜索
/en/dashboards/atlas        Research Atlas        /en/dashboards/timeline     Timeline / 时间线
/en/dashboards/matrix       Methods × Materials   /en/admin/backup            Backup Mgmt / 备份管理
```

---

## Content Structure / 内容结构

```
content-repo/
├── entities/
│   ├── projects/        ← {id}.json          ├── docs/        ← {id}.en.mdx
│   ├── publications/    ← {id}.json          │                  {id}.zh-Hans.mdx
│   ├── experiments/     ← {id}.json          └── media/       ← Images, PDFs / 图片、PDF
│   ├── datasets/        ← {id}.json
│   ├── models/          ← {id}.json
│   ├── notes/           ← {id}.json
│   ├── ideas/           ← {id}.json
│   ├── methods/         ← {id}.json
│   ├── materials/       ← {id}.json
│   ├── metrics/         ← {id}.json
│   ├── collaborators/   ← {id}.json
│   ├── institutions/    ← {id}.json
│   └── edges.json       ← Knowledge graph edges / 知识图谱边
```

## Entity Types / 实体类型 (17)

| English | 中文 | English | 中文 |
|---|---|---|---|
| project | 项目 | note | 笔记 |
| publication | 论文 | lit_review | 文献综述 |
| experiment | 实验 | meeting | 会议 |
| dataset | 数据集 | idea | 想法 |
| model | 模型 | skill | 技能 |
| repo | 代码仓库 | method | 方法 |
| material_system | 材料体系 | metric | 指标 |
| collaborator | 合作者 | institution | 机构 |
| media | 媒体 | | |

## Edge Types / 边类型

`project_contains` · `produced` · `evaluated_on` · `cites` · `derived_from` · `implements` · `collaborates_with` · `related_to` · `supersedes`

## Visibility / 可见性 &nbsp;&nbsp;|&nbsp;&nbsp; Status / 状态

| Visibility | 可见性 | | Status | 状态 |
|---|---|---|---|---|
| `private` | 私密 | | `active` | 进行中 |
| `unlisted` | 未公开 | | `paused` | 已暂停 |
| `public` | 公开 | | `completed` | 已完成 |
| | | | `archived` | 已归档 |

---

## Entity JSON Template / 实体 JSON 模板 (minimal / 最小)

```json
{
  "id": "my-entity-id",
  "type": "project",
  "title":   { "en": "Title", "zh-Hans": "标题" },
  "summary": { "en": "Summary", "zh-Hans": "摘要" },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "status": "active",
  "visibility": "private",
  "tags": [],
  "links": [],
  "authorship": { "owner_role": "lead-researcher", "contributors": [] },
  "source_of_truth": { "kind": "file", "pointer": "content-repo/entities/projects/my-entity-id.json" }
}
```

## MDX Components / MDX 组件

```mdx
<FigureCard src="/media/fig1.png" caption_en="Caption" caption_zh="说明" />
<CitationBlock authors="Zhang et al." title="Paper Title" year={2025} doi="10.xxx/xxx" />
<Equation math="E = mc^2" />
<InteractivePlot spec={vegaLiteSpec} />
<ExperimentRunTable runs={[{run_id:"r1", params:{lr:0.001}, metrics:{mae:0.04}}]} />
<DatasetSchemaViewer fields={[{name:"formula", type:"string"}]} />
```

---

## Common Workflows / 常用工作流

| # | Steps / 步骤 |
|---|---|
| 1 | **Add entity / 添加实体:** Create JSON in `content-repo/entities/{type}/` → `npm run ingest` |
| 2 | **Add MDX body / 添加正文:** Create `{id}.en.mdx` + `{id}.zh-Hans.mdx` in `content-repo/docs/` → `npm run ingest` |
| 3 | **Add edge / 添加关系:** Edit `content-repo/entities/edges.json` → `npm run ingest` |
| 4 | **Backup / 备份:** `npm run backup` |
| 5 | **Export PDF / 导出 PDF:** Open entity page → click "Export as PDF" / 导出为 PDF |
| 6 | **Export archive / 导出归档:** `npm run export:archive` |

## Environment Variables / 环境变量 (`.env.local`)

```bash
RUNTIME_MODE=local
DATABASE_URL=file:./data/archive.db
CONTENT_REPO_PATH=./content-repo
MEDIA_STORAGE_PATH=./content-repo/media
HOST=127.0.0.1
PORT=3000
BACKUP_DIR=./backups
```

## Troubleshooting / 故障排除

| Problem / 问题 | Fix / 解决方法 |
|---|---|
| "Module not found" | `npm ci` |
| "Database locked" / 数据库锁定 | Stop other processes using the DB / 停止占用数据库的进程 |
| "Migration failed" / 迁移失败 | `rm data/archive.db && npm run db:migrate && npm run ingest` |
| Port in use / 端口占用 | `PORT=3001 npm run dev` |
| Ingestion errors / 导入错误 | `npm run schema:validate` |
