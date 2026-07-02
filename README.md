# 基金购买建议 Multi-Agent Web 应用

基于 Multi-Agent 协作的基金投资分析与建议系统。采用 Leader-SubAgent 模式，由编排器协调多个专业 Agent 协同工作，综合技术面、消息面、风险面给出投资建议。内置 AI 持仓助理（ReAct Agent），支持用户持仓管理、收益计算和个性化投资咨询。

## 架构

```
Frontend (React + TypeScript)           Backend (FastAPI + Python)
┌────────────────────────────┐         ┌──────────────────────────────────┐
│ Dashboard（基金搜索/图表）    │         │ Multi-Agent 分析系统               │
│ FundDetail（详情/AI分析）    │──REST──▶│ ├─ Orchestrator（编排器）           │
│ ProfilePage（个人中心）      │         │ ├─ DataAnalysis Agent（技术面）     │
│ ChatBubble（浮动AI助理）    │──SSE──▶│ ├─ News Agent（消息面）             │
│ AuthModal（登录/注册）       │         │ ├─ Risk Agent（风险面）             │
│                            │         │ └─ Decision Agent（综合建议）       │
└────────────────────────────┘         │                                  │
                                       │ ReAct Agent 助理                  │
                                       │ ├─ Tool: query_fund_nav           │
                                       │ ├─ Tool: search_news              │
                                       │ ├─ Tool: get_user_portfolio       │
                                       │ ├─ Tool: calculate_profit         │
                                       │ └─ Tool: search_funds             │
                                       │                                  │
                                       │ SQLite（用户/持仓/聊天/API Key）   │
                                       └──────────────────────────────────┘
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS + Recharts + Framer Motion |
| 后端 | Python 3.9+ + FastAPI + SQLAlchemy (async) + aiosqlite |
| AI/LLM | OpenAI (GPT-4o) / Anthropic (Claude) / 阿里通义千问 + 自定义中转站 |
| 数据源 | 东方财富/天天基金公开 HTTP 接口 |
| 认证 | JWT (python-jose) + SHA256 密码哈希 |
| 数据库 | SQLite（轻量，无需额外部署） |

## 功能特性

- **基金搜索与详情** — 搜索基金、查看净值走势（1月/3月/6月）、MA 均线
- **Multi-Agent AI 分析** — 多 Agent 协作，从技术面/消息面/风险面综合给出投资建议
- **AI 持仓助理（ReAct Agent）** — 右下角浮动聊天气泡，支持：
  - 持仓管理（添加/查询/收益计算）
  - 实时工具调用（查净值、搜新闻、算收益）
  - 流式输出（SSE）+ Markdown 渲染
- **用户体系** — 注册/登录，JWT 认证，页面入口级守卫
- **个人中心** — 基础信息管理、API Key 管理（支持自定义 Base URL 中转站）、持仓收益（开发中）
- **模型选择** — 分析和聊天均可独立选择 LLM 模型

## 快速开始

### 环境要求

- Python 3.9+
- Node.js 18+
- 至少一个 LLM API Key（OpenAI / Anthropic / DashScope，或中转站 Key）

### 后端启动

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（可选，也可在个人中心页面配置 API Key）
cp .env.example .env
# 编辑 .env 填入你的 API Key

# 启动服务
uvicorn main:app --reload --port 8000
```

### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 即可使用。

## 环境变量配置

在 `backend/.env` 中配置（可选，用户也可在个人中心配置自己的 Key）：

```env
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
ANTHROPIC_API_KEY=sk-ant-xxx
DASHSCOPE_API_KEY=sk-xxx
JWT_SECRET=your-secret-key
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户信息 |
| GET | /api/funds/search?keyword=xxx | 搜索基金 |
| GET | /api/funds/{code}/nav?days=180 | 获取净值历史 |
| GET | /api/funds/{code}/info | 获取基金详情 |
| GET | /api/news/financial | 获取财经新闻 |
| POST | /api/analysis/recommend | 触发 Multi-Agent 分析 |
| WS | /api/analysis/ws/{task_id} | 实时推送 Agent 进度 |
| GET | /api/portfolio/ | 获取持仓列表 |
| POST | /api/portfolio/ | 添加持仓 |
| PUT | /api/portfolio/{id} | 修改持仓 |
| DELETE | /api/portfolio/{id} | 删除持仓 |
| POST | /api/chat/stream | SSE 流式聊天 |
| GET | /api/chat/history | 获取聊天历史 |
| DELETE | /api/chat/history | 清空聊天历史 |
| GET | /api/profile/ | 获取个人信息 |
| PUT | /api/profile/email | 修改邮箱 |
| PUT | /api/profile/password | 修改密码 |
| GET | /api/profile/api-keys | 获取 API Key 列表 |
| POST | /api/profile/api-keys | 新增 API Key |
| DELETE | /api/profile/api-keys/{id} | 删除 API Key |

## 项目结构

```
agent_test/
├── backend/
│   ├── main.py                     # FastAPI 入口 + 路由注册
│   ├── config.py                   # 全局配置
│   ├── database.py                 # SQLAlchemy 异步数据库
│   ├── requirements.txt
│   ├── routers/
│   │   ├── fund.py                 # 基金数据接口
│   │   ├── news.py                 # 新闻接口
│   │   ├── analysis.py             # Multi-Agent 分析接口
│   │   ├── auth.py                 # 认证（注册/登录/JWT）
│   │   ├── portfolio.py            # 持仓 CRUD
│   │   ├── chat.py                 # SSE 流式聊天
│   │   └── profile.py              # 个人信息 + API Key 管理
│   ├── agents/
│   │   ├── orchestrator.py         # 编排器
│   │   ├── data_analysis_agent.py  # 数据分析 Agent
│   │   ├── news_agent.py           # 财经热点 Agent
│   │   ├── risk_agent.py           # 风险评估 Agent
│   │   ├── decision_agent.py       # 决策 Agent
│   │   ├── assistant_agent.py      # ReAct 持仓助理 Agent
│   │   ├── assistant_tools.py      # 助理工具集
│   │   ├── llm_client.py           # 多模型 LLM 客户端
│   │   └── prompts/                # Prompt 模板
│   ├── models/
│   │   └── db_models.py            # ORM 模型（User/Portfolio/Chat/ApiKey）
│   └── services/                   # 数据采集服务
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # 应用入口（认证守卫 + 路由）
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # 首页（搜索/图表/新闻）
│   │   │   ├── FundDetail.tsx      # 基金详情
│   │   │   └── ProfilePage.tsx     # 个人中心
│   │   ├── components/
│   │   │   ├── ChatBubble.tsx      # 浮动聊天气泡
│   │   │   ├── ChatPanel.tsx       # 聊天面板
│   │   │   ├── ChatMessage.tsx     # 消息渲染（Markdown）
│   │   │   ├── AuthModal.tsx       # 登录/注册弹窗
│   │   │   ├── FundChart.tsx       # 净值走势图
│   │   │   ├── FundSearch.tsx      # 基金搜索
│   │   │   ├── ModelSelector.tsx   # 模型选择器
│   │   │   └── ...                 # 其他组件
│   │   ├── services/
│   │   │   ├── api.ts              # 基金/分析 API
│   │   │   └── auth.ts             # 认证 + 聊天 API
│   │   └── types/
│   │       └── index.ts            # TypeScript 类型定义
│   └── vite.config.ts              # Vite 配置 + API 代理
└── README.md
```

## 免责声明

本系统提供的分析和建议仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。
