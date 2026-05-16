<p align="center">
  <img src="frontend/public/favicon.svg" alt="Flowa Logo" width="80" height="80" />
</p>

<h1 align="center">Flowa</h1>

<p align="center">
  <strong>AI-Native Workflow Automation Platform</strong>
</p>

<p align="center">
  Build and automate, and orchestrate complex workflows visually — powered by AI.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-8B5CF6?style=flat-square&labelColor=111113" alt="Version" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=111113" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=111113" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs&logoColor=white&labelColor=111113" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white&labelColor=111113" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white&labelColor=111113" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white&labelColor=111113" alt="Docker" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white&labelColor=111113" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-22D3EE?style=flat-square&labelColor=111113" alt="License" />
</p>

---

## Overview

**Flowa** is a full-stack, AI-native workflow automation platform that lets you visually design, connect, and execute workflows using a drag-and-drop canvas editor. With **173+ integration nodes** across **23 categories**, Flowa connects your entire tech stack — from AI/ML models and databases to cloud services, social media, e-commerce, and more.

Think **n8n** meets **AI-first design** — with a sleek dark UI, real-time execution, and a credentials vault built in.

---

## ✨ Features

### Visual Canvas Editor
- **Drag-and-drop** node-based workflow builder powered by [ReactFlow](https://reactflow.dev)
- Connect nodes with edges to define execution flow
- Real-time node configuration panel with typed inputs
- Run workflows directly from the canvas

### 173+ Integration Nodes

| Category | Nodes | Examples |
|----------|-------|---------|
| ⚡ Triggers | 4 | Webhook, Cron Schedule, App Event, Manual |
| 🔍 Google | 12 | Gmail, Sheets, Drive, Calendar, Docs, BigQuery, Cloud Functions, YouTube, Ads, Maps, Translate, Vision |
| 🧠 AI & ML | 22 | OpenAI, Anthropic, Gemini, Cohere, Replicate, HuggingFace, Stability AI, Whisper, Eleven Labs, LangChain, AI Agent, AI Classifier |
| 📱 Social Media | 8 | Twitter/X, LinkedIn, Instagram, Facebook, Reddit, Pinterest, TikTok, YouTube |
| 💬 Messaging | 9 | Slack, Discord, Telegram, WhatsApp, Microsoft Teams, Twilio, SendGrid, Mailgun, Vonage |
| 🗄️ Databases | 8 | PostgreSQL, MySQL, MongoDB, Redis, SQLite, Supabase, Firebase, DynamoDB |
| 🔮 Vector DBs | 5 | Pinecone, Weaviate, Qdrant, ChromaDB, Milvus |
| ☁️ Cloud & DevOps | 14 | AWS S3, Lambda, GitHub, GitLab, Docker, Kubernetes, Terraform, Vercel, Netlify, Cloudflare, DigitalOcean, Azure, GCP |
| 🌐 HTTP & APIs | 7 | HTTP Request, REST API, GraphQL, SOAP, Webhook Response, API Gateway, gRPC |
| 📁 Files & Storage | 9 | Read/Write File, CSV, JSON, XML, FTP/SFTP, Dropbox, Box, Google Drive |
| 🔄 Data Transform | 8 | Set, Map, Filter, Sort, Merge, Split, Aggregate, Code (JS/Python) |
| 🔀 Logic & Flow | 7 | IF, Switch, Loop, Wait, Error Trigger, Retry, Sub-Workflow |
| 💼 CRM & Sales | 8 | Salesforce, HubSpot, Pipedrive, Zoho CRM, Freshsales, Copper, Close, Monday Sales |
| 📋 Project Mgmt | 8 | Jira, Asana, Trello, Monday.com, ClickUp, Linear, Basecamp, Notion |
| 🛒 E-Commerce | 5 | Shopify, WooCommerce, Stripe Checkout, BigCommerce, Magento |
| 🌍 CMS & Website | 5 | WordPress, Contentful, Webflow, Strapi, Ghost |
| 🎧 Support | 4 | Zendesk, Intercom, Freshdesk, Help Scout |
| 📅 Scheduling | 4 | Calendly, Cal.com, Zoom, Google Meet |
| 📣 Marketing | 5 | Mailchimp, ActiveCampaign, ConvertKit, Brevo, Google Analytics |
| 💳 Payments | 5 | Stripe, PayPal, Square, Razorpay, LemonSqueezy |
| 📊 Analytics | 3 | Mixpanel, Amplitude, Segment |
| 🎨 Design | 3 | Figma, Canva, Adobe Creative Cloud |
| 🛠️ Utilities | 7 | Delay, Merge, Split, Crypto, Date/Time, Regex, HTTP Poll |

### Credentials Vault
- **52+ service credential types** with encrypted storage
- Per-node credential selection in the configuration panel
- Centralized Credentials Manager modal
- AES-256 encryption for stored secrets

### Modern Dark UI
- Neutral grey dark theme with Inter font
- n8n-inspired dot grid canvas background
- Animated aurora gradients, particles, and glassmorphism
- Full dark/light theme toggle
- Responsive design for all screen sizes

### Real-Time Execution Engine
- **BullMQ** job queue for workflow execution
- **WebSocket** live status updates
- Node-by-node progress tracking
- Error handling with retry logic

### AI-Powered Backend
- OpenAI & Anthropic SDK integration
- AI route for workflow suggestions
- Extensible AI service layer

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  React 18 · TypeScript · ReactFlow · Zustand · Vite │
│           TailwindCSS · react-icons · Axios          │
├─────────────────────────────────────────────────────┤
│                         │  REST + WebSocket           │
├─────────────────────────────────────────────────────┤
│                  Backend (Node.js/Express)            │
│   Auth (JWT+bcrypt) · Workflows · Executions · AI    │
│        Credentials Vault · Worker (BullMQ)           │
├──────────────────┬──────────────────────────────────┤
│   PostgreSQL 16  │          Redis 7                  │
│  (Data + State)  │  (Queue + Cache + PubSub)         │
└──────────────────┴──────────────────────────────────┘
```

---

## 📂 Project Structure

```
Flowa-Automation-Platform/
├── frontend/                       # React + TypeScript + Vite
│   ├── public/
│   │   └── favicon.svg             # Flowa logo
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell.tsx        # Layout wrapper with sidebar
│   │   │   ├── canvas/
│   │   │   │   ├── FlowNode.tsx    # Custom ReactFlow node component
│   │   │   │   ├── IOPanel.tsx     # Bottom I/O configuration panel
│   │   │   │   └── NodeIcon.tsx    # 90+ brand icon mappings
│   │   │   └── modals/
│   │   │       └── CredentialsManager.tsx  # Credentials vault UI
│   │   ├── data/
│   │   │   └── nodeCatalog.ts      # 173 node definitions (23 categories)
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx     # Marketing page with animations
│   │   │   ├── LoginPage.tsx       # Authentication
│   │   │   ├── RegisterPage.tsx    # User registration
│   │   │   ├── DashboardPage.tsx   # Workflow list & management
│   │   │   ├── EditorPage.tsx      # Canvas workflow editor
│   │   │   └── SettingsPage.tsx    # User settings
│   │   ├── store/
│   │   │   ├── index.ts            # Zustand workflow store
│   │   │   └── credentials.ts     # Zustand credentials store (52 services)
│   │   ├── utils/                  # Utility functions
│   │   ├── App.tsx                 # Router configuration
│   │   ├── main.tsx                # Entry point
│   │   └── index.css               # Global styles, theme, animations
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                        # Node.js + Express
│   └── src/
│       ├── index.js                # Express server entry
│       ├── worker.js               # BullMQ job worker
│       ├── db/
│       │   └── init.sql            # PostgreSQL schema
│       ├── middleware/              # Auth & validation middleware
│       ├── routes/
│       │   ├── auth.js             # Login / Register / JWT
│       │   ├── workflows.js        # CRUD workflows
│       │   ├── executions.js       # Run & track executions
│       │   ├── nodes.js            # Node catalog API
│       │   ├── versions.js         # Workflow versioning
│       │   └── ai.js               # AI-powered suggestions
│       ├── services/
│       │   ├── ai.js               # OpenAI + Anthropic integration
│       │   ├── queue.js            # BullMQ queue management
│       │   └── websocket.js        # WebSocket server
│       └── utils/                  # Helpers & encryption
│
├── nginx/
│   └── nginx.conf                  # Reverse proxy configuration
│
├── docker-compose.yml              # Full stack orchestration
├── .env.example                    # Environment template
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| [Node.js](https://nodejs.org) | >= 18.x |
| [Docker](https://www.docker.com/get-started) | >= 24.x |
| [Docker Compose](https://docs.docker.com/compose/) | >= 2.x |

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Flowa-Automation-Platform.git
cd Flowa-Automation-Platform
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```dotenv
# Required
JWT_SECRET=your-secure-jwt-secret
ENCRYPTION_KEY=your-32-char-encryption-key

# Optional — for AI features
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Start with Docker (Recommended)

```bash
docker compose up -d
```

This spins up all 5 services:

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | [localhost:3000](http://localhost:3000) | React UI |
| **Backend** | [localhost:4000](http://localhost:4000) | Express API |
| **Worker** | — | BullMQ job processor |
| **PostgreSQL** | 5432 | Primary database |
| **Redis** | 6379 | Queue & cache |

### 4. Start Manually (Development)

**Terminal 1 — Database & Redis:**
```bash
docker compose up postgres redis -d
```

**Terminal 2 — Backend:**
```bash
cd backend
npm install
node src/index.js
```

**Terminal 3 — Worker:**
```bash
cd backend
node src/worker.js
```

**Terminal 4 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🖥️ Screenshots

### Landing Page
> Sleek dark landing page with animated aurora gradients, dot grid pattern, and glassmorphism cards.

### Workflow Editor
> Visual drag-and-drop canvas with 173+ nodes, real-time edge connections, and a bottom I/O panel for node configuration.

### Dashboard
> Workflow management view with sidebar navigation, workflow cards, and execution history.

### Credentials Manager
> Centralized vault for managing API keys and service credentials across 52+ integrations.

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| ![React](https://img.shields.io/badge/-React_18-61DAFB?style=flat-square&logo=react&logoColor=black) | UI library |
| ![TypeScript](https://img.shields.io/badge/-TypeScript_5.6-3178C6?style=flat-square&logo=typescript&logoColor=white) | Type safety |
| ![Vite](https://img.shields.io/badge/-Vite_6-646CFF?style=flat-square&logo=vite&logoColor=white) | Build tool |
| ![TailwindCSS](https://img.shields.io/badge/-TailwindCSS_3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) | Styling |
| ![ReactFlow](https://img.shields.io/badge/-ReactFlow-FF0072?style=flat-square) | Canvas editor |
| ![Zustand](https://img.shields.io/badge/-Zustand_5-433E38?style=flat-square) | State management |

### Backend

| Technology | Purpose |
|-----------|---------|
| ![Node.js](https://img.shields.io/badge/-Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) | Runtime |
| ![Express](https://img.shields.io/badge/-Express-000000?style=flat-square&logo=express&logoColor=white) | HTTP framework |
| ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white) | Database |
| ![Redis](https://img.shields.io/badge/-Redis_7-DC382D?style=flat-square&logo=redis&logoColor=white) | Queue & cache |
| ![BullMQ](https://img.shields.io/badge/-BullMQ-E34F26?style=flat-square) | Job queue |
| ![JWT](https://img.shields.io/badge/-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) | Auth tokens |

### AI Providers

| Provider | SDK |
|----------|-----|
| ![OpenAI](https://img.shields.io/badge/-OpenAI-412991?style=flat-square&logo=openai&logoColor=white) | `openai ^4.73` |
| ![Anthropic](https://img.shields.io/badge/-Anthropic-191919?style=flat-square) | `@anthropic-ai/sdk ^0.30` |

### Infrastructure

| Tool | Purpose |
|------|---------|
| ![Docker](https://img.shields.io/badge/-Docker-2496ED?style=flat-square&logo=docker&logoColor=white) | Containerization |
| ![Nginx](https://img.shields.io/badge/-Nginx-009639?style=flat-square&logo=nginx&logoColor=white) | Reverse proxy |

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `flowa` | Database user |
| `POSTGRES_PASSWORD` | `flowa_secret_2026` | Database password |
| `POSTGRES_DB` | `flowa` | Database name |
| `DATABASE_URL` | `postgresql://...` | Full connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis connection |
| `PORT` | `4000` | Backend port |
| `JWT_SECRET` | — | **Required.** JWT signing key |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `ENCRYPTION_KEY` | — | **Required.** AES key for credentials vault |
| `OPENAI_API_KEY` | — | Optional. For AI features |
| `ANTHROPIC_API_KEY` | — | Optional. For AI features |
| `VITE_API_URL` | `http://localhost:4000` | Frontend → Backend URL |
| `VITE_WS_URL` | `ws://localhost:4000/ws` | Frontend → WebSocket URL |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login & get JWT |

### Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workflows` | List all workflows |
| `POST` | `/api/workflows` | Create workflow |
| `GET` | `/api/workflows/:id` | Get workflow |
| `PUT` | `/api/workflows/:id` | Update workflow |
| `DELETE` | `/api/workflows/:id` | Delete workflow |

### Executions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/executions/:id/run` | Execute workflow |
| `GET` | `/api/executions/:id` | Get execution status |

### Nodes
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/nodes` | List available nodes |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/suggest` | AI workflow suggestions |

### Versions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/versions/:id` | Get workflow versions |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://localhost:4000/ws` | Real-time execution updates |

---

## 🧪 Development

### Frontend Commands

```bash
cd frontend
npm run dev       # Start dev server (port 3000)
npm run build     # Production build
npm run preview   # Preview production build
```

### Backend Commands

```bash
cd backend
npm run dev         # Start with --watch (auto-restart)
npm start           # Production start
npm run worker      # Start job worker
npm run worker:dev  # Worker with --watch
```

### Docker Commands

```bash
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose logs -f backend    # Tail backend logs
docker compose restart backend    # Restart a service
docker compose up -d --build      # Rebuild containers
```

---

## 🗺️ Roadmap

- [ ] AI Workflow Generator — natural language to workflow
- [ ] Cmd+K command palette
- [ ] Sticky notes on canvas
- [ ] Workflow templates gallery
- [ ] Smart node suggestions
- [ ] Workflow analytics dashboard
- [ ] Favorites & bookmarks
- [ ] Version history with diff view
- [ ] Computer vision nodes
- [ ] Ollama local LLM integration
- [ ] Collaborative editing
- [ ] Marketplace for custom nodes

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <img src="frontend/public/favicon.svg" alt="Flowa" width="24" height="24" />
  <br />
  <sub>Built with ❤️ by the Flowa team</sub>
</p>
