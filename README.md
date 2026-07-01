# 基金购买建议 Multi-Agent Web 应用

基于 Multi-Agent 协作的基金投资分析与建议系统。采用 Leader-SubAgent 模式，由编排器协调多个专业 Agent 协同工作，综合技术面、消息面、风险面给出投资建议。

## 架构

```
用户请求 → Orchestrator（编排器）
                ├── 数据分析 Agent（技术指标、趋势判断）
                ├── 财经热点 Agent（新闻分析、政策信号）
                └── 风险评估 Agent（波动率、VaR、回撤）
                         ↓
              Decision Agent（综合决策，输出最终建议）
```

## 技术栈

**后端**: Python + FastAPI + httpx + Pydantic + numpy/pandas

**前端**: React + TypeScript + Vite + TailwindCSS + Recharts + Framer Motion

**LLM 支持**: OpenAI (GPT-4o) / Anthropic (Claude 3.5 Sonnet) / 阿里通义千问 (qwen-max/plus)

**数据源**: 东方财富/天天基金公开 HTTP 接口

## 快速开始

### 环境要求

- Python 3.9+
- Node.js 18+
- 至少一个 LLM API Key（OpenAI / Anthropic / DashScope）

### 后端启动

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（复制并编辑 .env 文件）
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

在 `backend/.env` 中配置：

```env
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
DASHSCOPE_API_KEY=sk-xxx
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/funds/search?keyword=xxx | 搜索基金 |
| GET | /api/funds/{code}/nav?days=90 | 获取净值历史 |
| GET | /api/funds/{code}/info | 获取基金详情 |
| GET | /api/news/financial | 获取财经新闻 |
| GET | /api/news/hot-topics | 获取热点话题 |
| POST | /api/analysis/recommend | 触发 Multi-Agent 分析 |
| WS | /api/analysis/ws/{task_id} | 实时推送 Agent 进度 |

## 项目结构

```
agent_test/
├── backend/
│   ├── main.py                     # FastAPI 入口
│   ├── config.py                   # 配置管理
│   ├── requirements.txt
│   ├── routers/                    # API 路由
│   ├── services/                   # 数据采集服务
│   ├── agents/                     # Multi-Agent 核心
│   │   ├── orchestrator.py         # 编排器
│   │   ├── data_analysis_agent.py  # 数据分析 Agent
│   │   ├── news_agent.py           # 财经热点 Agent
│   │   ├── risk_agent.py           # 风险评估 Agent
│   │   ├── decision_agent.py       # 决策 Agent
│   │   ├── llm_client.py           # 多模型 LLM 客户端
│   │   └── prompts/                # Prompt 模板
│   └── models/                     # 数据模型
├── frontend/
│   ├── src/
│   │   ├── pages/                  # 页面组件
│   │   ├── components/             # UI 组件
│   │   ├── services/               # API 封装
│   │   └── types/                  # TypeScript 类型
│   └── vite.config.ts
└── README.md
```

## 免责声明

本系统提供的分析和建议仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。
