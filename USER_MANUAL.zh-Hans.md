# EK 研究档案系统 — 用户手册

> 面向 AI4S 研究者的本地优先双语研究档案与作品集网站

---

## 目录

1. [快速开始（15分钟）](#1-快速开始15分钟)
2. [安装前提条件](#2-安装前提条件)
3. [安装方式一：Docker Compose（推荐）](#3-安装方式一docker-compose推荐)
4. [安装方式二：本地运行](#4-安装方式二本地运行)
5. [首次设置和初始化](#5-首次设置和初始化)
6. [日常工作流程](#6-日常工作流程)
7. [创建和编辑内容](#7-创建和编辑内容)
8. [使用 Markdown/MDX 和内置组件](#8-使用-markdownmdx-和内置组件)
9. [管理双语内容和语言切换](#9-管理双语内容和语言切换)
10. [隐私模型和安全分享](#10-隐私模型和安全分享)
11. [搜索和仪表盘](#11-搜索和仪表盘)
12. [媒体管理](#12-媒体管理)
13. [导出工作流](#13-导出工作流)
14. [备份与恢复](#14-备份与恢复)
15. [系统更新和升级](#15-系统更新和升级)
16. [故障排除指南](#16-故障排除指南)
17. [术语表](#17-术语表)

---

## 1. 快速开始（15分钟）

本节帮助你在 15 分钟内启动系统并看到示例数据。

### 前提条件

你需要安装以下任一组合：

- **方式 A（推荐）**：Docker Desktop（包含 Docker Compose）
- **方式 B**：Node.js 20+ 和 npm

### 方式 A：Docker 快速启动

```bash
# 1. 克隆仓库
git clone <仓库地址> ek-research-archive
cd ek-research-archive

# 2. 一键启动
docker compose up -d

# 3. 打开浏览器
# 英文界面：http://localhost:3000/en/
# 中文界面：http://localhost:3000/zh-Hans/
```

### 方式 B：本地快速启动

```bash
# 1. 克隆仓库
git clone <仓库地址> ek-research-archive
cd ek-research-archive

# 2. 复制环境配置
cp .env.example .env.local

# 3. 安装依赖（自动执行数据库迁移和内容导入）
npm install

# 4. 初始化数据库并设置默认管理员密码 (abc123)
npm run db:seed

# 5. 启动开发服务器
npm run dev

# 6. 打开浏览器
# http://localhost:3000/en/ 或 http://localhost:3000/zh-Hans/
```

### 管理后台登录

启动后访问 `/admin/login` 进入管理后台。默认密码：**abc123**。可在管理后台「设置」页面修改密码。

[Screenshot: 首页仪表盘，显示实体统计和最近更新]

启动后你会看到预装的 21 个示例实体，涵盖项目、论文、实验、数据集、模型等类型。

---

## 2. 安装前提条件

### 什么是这些工具？

| 工具 | 说明 | 类比 |
|------|------|------|
| **Node.js** | JavaScript 运行环境，类似 Python 解释器 | 相当于 `python3` |
| **npm** | Node.js 的包管理器，随 Node.js 一起安装 | 相当于 `pip` |
| **Docker** | 容器化工具，将应用及其依赖打包在一起运行 | 相当于虚拟机，但更轻量 |
| **SQLite** | 嵌入式数据库，数据存储在单个文件中 | 相当于一个自包含的数据库文件 |
| **JSON** | 一种数据格式，用花括号和键值对表示结构化数据 | 类似 Python 字典 |
| **MDX** | Markdown 的扩展，支持嵌入交互组件 | Markdown + 可嵌入的图表/公式组件 |

### 安装 Node.js 20+

**macOS：**
```bash
# 使用 Homebrew（推荐）
brew install node@20

# 或从官网下载安装包：https://nodejs.org/
```

**Windows：**
```powershell
# 使用 winget
winget install OpenJS.NodeJS.LTS

# 或从官网下载安装包：https://nodejs.org/
```

**Linux (Ubuntu/Debian)：**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

验证安装：
```bash
node --version   # 应显示 v20.x.x 或更高
npm --version    # 应显示 10.x.x 或更高
```

### 安装 Docker Desktop（可选，推荐）

- **macOS / Windows**：从 https://www.docker.com/products/docker-desktop/ 下载安装
- **Linux**：参考 https://docs.docker.com/engine/install/

验证安装：
```bash
docker --version          # 应显示 Docker version 24.x 或更高
docker compose version    # 应显示 Docker Compose version v2.x
```

---

## 3. 安装方式一：Docker Compose（推荐）

Docker Compose 是最简单的安装方式。它会自动处理所有依赖、数据库初始化和内容导入。

### 步骤

```bash
# 1. 克隆仓库
git clone <仓库地址> ek-research-archive
cd ek-research-archive

# 2. 启动服务（首次会自动构建镜像，需要几分钟）
docker compose up -d

# 3. 查看日志确认启动成功
docker compose logs -f
# 看到 "Ready on http://0.0.0.0:3000" 表示启动成功
# 按 Ctrl+C 退出日志查看
```

### 常用 Docker 命令

```bash
docker compose up -d          # 启动（后台运行）
docker compose down           # 停止
docker compose logs -f        # 查看实时日志
docker compose restart        # 重启
docker compose up -d --build  # 重新构建并启动（代码更新后使用）
```

### 数据持久化

Docker Compose 配置了三个数据卷，确保数据不会因容器重启而丢失：

| 本地路径 | 容器路径 | 说明 |
|----------|----------|------|
| `./content-repo` | `/app/content-repo` | 内容仓库（只读挂载） |
| `./data` | `/app/data` | SQLite 数据库 |
| `./backups` | `/app/backups` | 备份文件 |

---

## 4. 安装方式二：本地运行

如果你不想使用 Docker，可以直接在本地运行。

### 步骤

```bash
# 1. 克隆仓库
git clone <仓库地址> ek-research-archive
cd ek-research-archive

# 2. 复制环境配置文件
cp .env.example .env.local

# 3. 创建数据目录
mkdir -p data backups

# 4. 安装依赖
# npm install 会自动执行 "prepare" 脚本：
#   - npm run db:migrate（创建数据库表）
#   - npm run ingest（导入 content-repo/ 中的内容）
npm install

# 5. 设置默认管理员密码 (abc123)
npm run db:seed

# 6. 启动开发服务器
npm run dev
```

### 生产模式运行

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

### 环境变量说明

环境变量在 `.env.local` 文件中配置：

```bash
# 运行模式："local"（本地 SQLite）或 "cloud"（远程数据库）
RUNTIME_MODE=local

# SQLite 数据库文件路径
DATABASE_URL=file:./data/archive.db

# 内容仓库路径
CONTENT_REPO_PATH=./content-repo

# 媒体文件存储路径
MEDIA_STORAGE_PATH=./content-repo/media

# 服务器绑定地址和端口
HOST=127.0.0.1
PORT=3000

# 备份目录和保留策略
BACKUP_DIR=./backups
BACKUP_RETENTION_DAILY=30     # 保留 30 个每日备份
BACKUP_RETENTION_MONTHLY=12   # 保留 12 个每月备份
```

---

## 5. 首次设置和初始化

### 数据库初始化

首次运行 `npm install` 时，系统会自动执行：

1. **数据库迁移** (`npm run db:migrate`)：创建所有数据库表和索引
2. **内容导入** (`npm run ingest`)：扫描 `content-repo/entities/` 目录，将 JSON 文件导入数据库

如果需要手动执行：

```bash
# 手动运行数据库迁移
npm run db:migrate

# 手动运行内容导入
npm run ingest
```

导入完成后会显示统计信息：

```
Ingestion complete:
  Entities: 21 valid, 0 invalid (21 total)
  Edges: 19 valid, 0 invalid (19 total)
  Duration: 45ms
```

### 管理员密码设置

运行以下命令设置默认管理员密码：

```bash
npm run db:seed
```

默认密码为 `abc123`。如需自定义密码：

```bash
npm run admin:set-password <你的密码>
```

之后可在管理后台「设置」页面或重新运行上述命令修改密码。

### 验证安装

打开浏览器访问 `http://localhost:3000/zh-Hans/`，你应该能看到：

- [Screenshot: 首页仪表盘] 显示实体总数、按类型分布、最近更新的实体
- [Screenshot: 导航栏] 包含：首页、研究项目、学术发表、实验记录、数据集、模型、技术笔记、想法库、仪表盘、搜索

---

## 6. 日常工作流程

### 典型的一天

1. **添加新内容**：在 `content-repo/entities/` 对应目录下创建 JSON 文件
2. **编写详细文档**：在 `content-repo/docs/` 下创建 MDX 文件
3. **建立关联**：在 `content-repo/entities/edges.json` 中添加边
4. **导入数据库**：运行 `npm run ingest`
5. **在浏览器中查看**：刷新页面查看更新

### 添加新实体的完整流程

```bash
# 1. 创建实体 JSON 文件
#    （使用你喜欢的编辑器，如 VS Code、Vim 等）

# 2. 导入到数据库
npm run ingest

# 3. 如果开发服务器正在运行，刷新浏览器即可看到新内容
```

### 定期维护

```bash
# 创建备份（建议每天执行）
npm run backup

# 验证实体 Schema
npm run schema:validate
```

### 使用管理后台

管理后台提供基于 Web 的内容管理界面。访问 `/admin/login` 登录。

**默认密码：** `abc123`（通过 `npm run db:seed` 设置）

#### 仪表盘

登录后进入仪表盘（`/admin`），显示：

- 实体和边的总数
- 按实体类型分布统计
- 最近更新的 8 个实体

#### 管理实体

进入 **实体** 页面可以：

- 浏览所有实体（分页表格，支持搜索和按类型筛选）
- 点击 **创建** 添加新实体（双语标题、摘要、状态、可见性、标签及类型专属字段）
- 点击实体进入编辑页面，包含三个标签页：
  - **元数据**：编辑实体字段
  - **内容**：编辑双语 MDX 正文（英文和中文）
  - **关联**：查看和管理与该实体相关的边

#### 管理边（关系）

进入 **边** 页面可以：

- 创建实体间的新关系（选择 起始实体 → 边类型 → 目标实体）
- 查看所有边的列表
- 删除边

#### 备份与恢复

进入 **备份** 页面可以：

- 通过 Web 界面创建备份
- 查看已有备份（含大小和时间戳）
- 从任意备份恢复（需确认）

#### 设置

进入 **设置** 页面可修改管理员密码。需输入当前密码、新密码（至少 6 位）和确认密码。

---

## 7. 创建和编辑内容

### 内容仓库结构

所有内容存储在 `content-repo/` 目录中：

```
content-repo/
├── entities/              ← 实体 JSON 文件
│   ├── projects/          ← 研究项目
│   ├── publications/      ← 学术发表
│   ├── experiments/       ← 实验记录
│   ├── datasets/          ← 数据集
│   ├── models/            ← 机器学习模型
│   ├── notes/             ← 技术笔记
│   ├── ideas/             ← 想法
│   ├── methods/           ← 研究方法
│   ├── materials/         ← 材料体系
│   ├── metrics/           ← 评估指标
│   ├── collaborators/     ← 合作者
│   ├── institutions/      ← 机构
│   └── edges.json         ← 知识图谱边（实体间关系）
├── docs/                  ← MDX 正文文件
└── media/                 ← 媒体文件（图片、PDF 等）
```

### 基础实体结构

所有 17 种实体类型共享以下基础字段：

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

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | 字符串 | 唯一标识符，建议使用 `类型-简短描述` 格式 |
| `type` | 字符串 | 实体类型（见下方列表） |
| `title` | 双语文本 | `{ "en": "...", "zh-Hans": "..." }` |
| `summary` | 双语文本 | 简短摘要 |
| `status` | 字符串 | `active`（进行中）、`paused`（已暂停）、`completed`（已完成）、`archived`（已归档） |
| `visibility` | 字符串 | `private`（私密）、`unlisted`（未公开）、`public`（公开） |
| `tags` | 字符串数组 | 标签列表 |

### 支持的 17 种实体类型

| 类型标识 | 中文名 | 目录 | 说明 |
|----------|--------|------|------|
| `project` | 项目 | `projects/` | 研究项目 |
| `publication` | 论文 | `publications/` | 学术发表 |
| `experiment` | 实验 | `experiments/` | 实验记录 |
| `dataset` | 数据集 | `datasets/` | 数据集合 |
| `model` | 模型 | `models/` | 机器学习模型 |
| `repo` | 代码仓库 | `repos/` | 代码仓库 |
| `note` | 笔记 | `notes/` | 技术笔记 |
| `lit_review` | 文献综述 | `lit-reviews/` | 文献综述 |
| `meeting` | 会议 | `meetings/` | 会议记录 |
| `idea` | 想法 | `ideas/` | 研究想法 |
| `skill` | 技能 | `skills/` | 技能 |
| `method` | 方法 | `methods/` | 研究方法 |
| `material_system` | 材料体系 | `materials/` | 材料体系 |
| `metric` | 指标 | `metrics/` | 评估指标 |
| `collaborator` | 合作者 | `collaborators/` | 合作者 |
| `institution` | 机构 | `institutions/` | 机构 |
| `media` | 媒体 | `media/` | 媒体资源 |

---

## 8. 使用 Markdown/MDX 和内置组件

### 什么是 MDX？

MDX 是 Markdown 的扩展。如果你熟悉 Markdown（`.md` 文件），MDX 增加了在文档中嵌入交互组件（图表、公式、数据表）的能力。

### 创建 MDX 正文文件

为实体添加详细正文内容，在 `content-repo/docs/` 下创建文件：

- 英文：`{entity-id}.en.mdx`
- 中文：`{entity-id}.zh-Hans.mdx`

例如，项目 `proj-my-project`：

```
content-repo/docs/proj-my-project.en.mdx      ← 英文正文
content-repo/docs/proj-my-project.zh-Hans.mdx  ← 中文正文
```

### MDX 基础语法

MDX 支持所有标准 Markdown 语法：

```markdown
# 一级标题
## 二级标题

普通段落文本。**粗体** 和 *斜体*。

- 无序列表项
- 另一项

1. 有序列表
2. 第二项

> 引用块

`行内代码` 和代码块：
```

### 内置 MDX 组件

系统提供 6 个专用组件，可直接在 MDX 文件中使用：

#### 1. FigureCard — 带标题的图片

```mdx
<FigureCard
  src="/media/crystal-structure.png"
  alt="晶体结构图"
  caption_en="Figure 1: ABX3 perovskite crystal structure"
  caption_zh="图 1：ABX3 钙钛矿晶体结构"
  width={600}
  height={400}
/>
```

#### 2. CitationBlock — 学术引用

```mdx
<CitationBlock
  authors="Zhang, W., Li, X., & Wang, Y."
  title="Graph Neural Networks for Crystal Property Prediction"
  venue="Nature Computational Materials"
  year={2025}
  doi="10.1038/s41524-025-00001"
/>
```

#### 3. Equation — LaTeX 数学公式（KaTeX）

```mdx
行内公式：<Equation math="E = mc^2" display={false} />

独立公式：
<Equation math="\Delta G = \Delta H - T\Delta S" label="gibbs-free-energy" />
```

#### 4. InteractivePlot — Vega-Lite 图表

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

#### 5. ExperimentRunTable — 实验运行记录表

```mdx
<ExperimentRunTable
  title="超参数搜索结果"
  runs={[
    { "run_id": "run-001", "params": {"lr": 0.001, "epochs": 100}, "metrics": {"mae": 0.043, "r2": 0.95}, "status": "completed", "date": "2025-01-10" },
    { "run_id": "run-002", "params": {"lr": 0.0005, "epochs": 200}, "metrics": {"mae": 0.038, "r2": 0.96}, "status": "completed", "date": "2025-01-11" }
  ]}
/>
```

#### 6. DatasetSchemaViewer — 数据集 Schema 查看器

```mdx
<DatasetSchemaViewer
  title="钙钛矿数据集 Schema"
  format="csv"
  fields={[
    { "name": "formula", "type": "string", "description": "化学式", "example": "CsPbI3" },
    { "name": "formation_energy", "type": "float", "description": "形成能 (eV/atom)", "nullable": false },
    { "name": "bandgap", "type": "float", "description": "带隙 (eV)", "nullable": true }
  ]}
/>
```

---

## 9. 管理双语内容和语言切换

### 双语文本格式

系统中所有面向用户的文本字段使用双语格式：

```json
{
  "en": "English text",
  "zh-Hans": "中文文本"
}
```

### 语言切换

- 点击导航栏右上角的语言切换按钮
- URL 中的语言段会相应变化：`/en/projects` ↔ `/zh-Hans/projects`
- 语言偏好保存在浏览器 localStorage 中（键名：`ek-archive-locale`），下次访问时自动恢复

### 回退行为

如果某字段缺少当前语言的翻译，系统会自动回退到另一种语言并显示「(fallback)」标识。

例如：在中文界面下，如果某实体只有英文标题，系统会显示英文标题并附带「(fallback)」提示。

### 最佳实践

1. **先用你最擅长的语言写** — 另一种语言可以之后再补充
2. **`id` 和 `tags` 使用英文** — 它们出现在 URL 中，也用于程序逻辑
3. **MDX 正文文件独立维护** — `{id}.en.mdx` 和 `{id}.zh-Hans.mdx` 是独立文件，可以有不同的详细程度

---

## 10. 隐私模型和安全分享

### 三种可见性级别

| 级别 | 界面标签 | 说明 |
|------|----------|------|
| `private` | 私密 | 仅自己可见（默认） |
| `unlisted` | 未公开 | 有链接的人可见，但不会公开列出 |
| `public` | 公开 | 所有人可见 |

### 设置可见性

在实体 JSON 文件中设置 `visibility` 字段：

```json
{
  "visibility": "private"
}
```

### 查看模式

系统支持三种查看模式，通过 `mode` API 参数控制：

| 模式 | 说明 |
|------|------|
| `private` | 显示所有实体（所有者模式） |
| `public` | 仅显示 `visibility: "public"` 的实体 |
| `curated` | 显示手动选择的实体子集 |

### 公开模式下的数据脱敏

以 `public` 模式访问时，以下敏感字段会被自动移除：

- `raw_metadata`（原始元数据）
- `source_of_truth`（数据来源信息）
- `owner_role`（所有者角色）
- `confidentiality_note`（保密说明）
- `review_notes`（审阅备注）

### 安全分享建议

1. 新实体默认设为 `private`
2. 准备好分享时改为 `unlisted` 或 `public`
3. 使用 `npm run export:static` 导出仅包含公开内容的静态站点
4. 导出前检查所有实体的可见性设置

---

## 11. 搜索和仪表盘

### 全文搜索

访问 `/zh-Hans/search` 或按 `Ctrl+K` 打开搜索。

搜索由 SQLite FTS5 全文搜索引擎驱动，支持：

- 中英文混合搜索
- 按实体类型筛选
- 搜索结果中高亮匹配文本

### 仪表盘

系统提供三个可视化仪表盘：

#### 研究图谱（力导向图）

路径：`/zh-Hans/dashboards/atlas`

- 交互式力导向图，展示所有实体及其关系
- 节点按实体类型着色
- 支持缩放和拖拽
- 点击节点跳转到详情页

#### 时间线

路径：`/zh-Hans/dashboards/timeline`

- 按时间顺序展示研究活动
- 显示实体的创建和更新事件

#### 方法 × 材料矩阵

路径：`/zh-Hans/dashboards/matrix`

- 展示研究方法与材料体系的交叉关系
- 单元格数字表示关联实体的数量

---

## 12. 媒体管理

### 存储位置

媒体文件存储在 `content-repo/media/` 目录中。

### 添加媒体文件

1. 将文件复制到 `content-repo/media/`
2. 在 MDX 文件中引用：

```mdx
<FigureCard src="/media/my-figure.png" caption_en="My figure" caption_zh="我的图片" />
```

或使用标准 Markdown 语法：

```markdown
![替代文本](/media/my-figure.png)
```

### 支持的媒体类型

- 图片：PNG、JPG、SVG、WebP
- 文档：PDF
- 视频：MP4、WebM
- 音频：MP3、WAV
- 其他：ZIP 等归档文件

### 媒体溯源

每个媒体文件可关联到产生它的实体（`provenance_entity_id`），实现图片和数据文件的可追溯性。

---

## 13. 导出工作流

### PDF 导出

在任意实体详情页点击「导出为 PDF」，或使用 API：

```bash
# 导出英文 PDF
curl "http://localhost:3000/api/export/pdf?entityId=proj-my-project&locale=en"

# 导出中文 PDF
curl "http://localhost:3000/api/export/pdf?entityId=proj-my-project&locale=zh-Hans"
```

返回的 HTML 可通过浏览器的「打印 → 另存为 PDF」功能保存。

### 静态站点导出

将整个站点导出为静态 HTML 文件，可部署到任何静态托管服务：

```bash
# 导出英文版
npm run export:static en ./out/static-en

# 导出中文版
npm run export:static zh-Hans ./out/static-zh

# 导出特定策展视图
npm run export:static en ./out/portfolio my-view-id
```

### 便携归档导出

将所有内容打包为单个 ZIP 文件，包含实体数据、MDX 文档、媒体文件和数据库：

```bash
# 完整归档
npm run export:archive

# 不含媒体文件（更小体积）
npm run export:archive ./out/my-archive.zip --no-media

# 不含数据库（仅源文件）
npm run export:archive ./out/my-archive.zip --no-db
```

### 验证导出文件

使用输出中的 SHA256 校验和验证文件完整性：

```bash
# macOS
shasum -a 256 ./out/archive-2025-02-16T12-30-45-123Z.zip

# Linux
sha256sum ./out/archive-2025-02-16T12-30-45-123Z.zip
```

---

## 14. 备份与恢复

### 创建备份

```bash
# 手动备份（默认）
npm run backup

# 每日备份
npm run backup daily

# 每月备份
npm run backup monthly
```

### Web 备份管理

访问 `/zh-Hans/admin/backup` 可通过管理后台创建和恢复备份。

### 从备份恢复

```bash
npm run restore ./backups/backup-manual-2025-02-16T12-30-45-123Z.zip
```

### 备份保留策略

- 每日备份：保留最近 30 个（可通过 `BACKUP_RETENTION_DAILY` 配置）
- 每月备份：保留最近 12 个（可通过 `BACKUP_RETENTION_MONTHLY` 配置）
- 手动备份：永不自动删除

### 灾难恢复

如果数据库损坏或丢失：

```bash
# 1. 删除损坏的数据库
rm data/archive.db

# 2. 重建数据库并重新导入内容
npm run db:migrate
npm run ingest

# 或从备份恢复
npm run restore ./backups/your-latest-backup.zip
```

---

## 15. 系统更新和升级

### 更新代码

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装新依赖
npm install
# npm install 会自动运行数据库迁移和内容重新导入

# 3. 如果使用 Docker
docker compose up -d --build
```

### 数据库迁移

代码更新可能包含数据库结构变更。迁移在 `npm install` 时自动运行，也可手动执行：

```bash
npm run db:migrate
```

### 重建搜索索引

如果搜索结果异常，重新导入所有内容以重建搜索索引：

```bash
rm data/archive.db
npm run db:migrate
npm run ingest
```

### 安全升级清单

1. 更新前创建备份：`npm run backup`
2. 拉取代码：`git pull`
3. 安装依赖：`npm install`
4. 验证构建：`npm run build`
5. 运行测试：`npm run test`
6. 启动并验证：`npm run start`

---

## 16. 故障排除指南

### 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| `Module not found` | 依赖未安装 | 运行 `npm ci` |
| `SQLITE_BUSY: database is locked` | 多个进程同时访问数据库 | 关闭其他使用数据库的进程 |
| `Migration failed` | 数据库结构不一致 | `rm data/archive.db && npm run db:migrate && npm run ingest` |
| `EADDRINUSE: port 3000` | 端口被占用 | `PORT=3001 npm run dev` 或关闭占用 3000 端口的程序 |
| `Ingestion: X invalid entities` | JSON 文件格式错误 | 运行 `npm run schema:validate` 查看详细错误 |
| `Cannot find module 'better-sqlite3'` | 原生模块编译失败 | `npm rebuild better-sqlite3` |

### 日志位置

- **开发模式**：日志直接输出到终端
- **Docker 模式**：`docker compose logs -f`
- **生产模式**：标准输出（stdout）

### 数据库诊断

```bash
# 检查数据库文件是否存在
ls -la data/archive.db

# 按类型查看实体数量（需要 sqlite3 命令行工具）
sqlite3 data/archive.db "SELECT type, COUNT(*) FROM entities GROUP BY type;"

# 检查数据库完整性
sqlite3 data/archive.db "PRAGMA integrity_check;"
```

### 完全重置

如果遇到无法解决的问题，可以完全重置：

```bash
# 1. 备份当前数据
npm run backup

# 2. 删除数据库
rm data/archive.db

# 3. 重新初始化
npm run db:migrate
npm run ingest

# 4. 验证
npm run dev
```

---

## 17. 术语表

### 系统术语

| 术语 | 说明 |
|------|------|
| Entity（实体） | 系统中的基本数据单元（项目、论文、实验等） |
| Edge（边） | 实体之间的关系连接 |
| Ingestion（导入） | 将 JSON 文件内容导入数据库的过程 |
| Migration（迁移） | 数据库结构更新 |
| FTS5 | SQLite 的全文搜索引擎 |
| MDX | 支持交互组件的扩展 Markdown 格式 |
| Locale（语言区域） | `en`（英文）或 `zh-Hans`（简体中文） |
| Visibility（可见性） | 实体的访问权限级别 |
| Curated View（策展视图） | 手动选择的实体子集，用于分享 |
| Backup（备份） | 数据的安全副本 |
| Checksum（校验和） | 用于验证文件完整性的哈希值 |

### 界面标签对照（英文 ↔ 中文）

| 位置 | 英文 | 中文 |
|------|------|------|
| 导航 | Home | 首页 |
| 导航 | Projects | 研究项目 |
| 导航 | Publications | 学术发表 |
| 导航 | Experiments | 实验记录 |
| 导航 | Datasets | 数据集 |
| 导航 | Models | 模型 |
| 导航 | Notes | 技术笔记 |
| 导航 | Ideas | 想法库 |
| 导航 | Dashboards | 仪表盘 |
| 导航 | Search | 搜索 |
| 导航 | Admin | 管理 |
| 仪表盘 | Research Atlas | 研究图谱 |
| 仪表盘 | Timeline | 时间线 |
| 状态 | Active | 进行中 |
| 状态 | Paused | 已暂停 |
| 状态 | Completed | 已完成 |
| 状态 | Archived | 已归档 |
| 可见性 | Private | 私密 |
| 可见性 | Unlisted | 未公开 |
| 可见性 | Public | 公开 |
| 操作 | Export as PDF | 导出为 PDF |
| 操作 | Create backup | 创建备份 |
| 操作 | Restore backup | 恢复备份 |
| 搜索 | Search entities... (Ctrl+K) | 搜索实体... (Ctrl+K) |

---

*EK Research Archive v0.1.0 — 本手册基于实际代码库编写，所有命令和路径均已验证。*
