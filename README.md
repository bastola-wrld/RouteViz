# RouteViz 📍 AI-Powered Route Intelligence

RouteViz is a high-performance, full-stack route planning platform that integrates **Computer Vision** (YOLOv8) and **Large Language Models** (Claude/GPT-4o) to provide real-time traffic analysis and intelligent navigation decisions.

## 🚀 Live Demo
[Launch RouteViz](https://routeviz-frontend.vercel.app) *(Coming Soon!)*

## 🧠 Key Features
- **AI-Augmented Routing**: Mapbox directions adjusted live by local traffic analysis.
- **Advanced Multi-Modal Transit**: Simulated 🚌 Bus and 🚆 Train journeys with real-time station-access walking legs and live departure boards.
- **Citymapper-Style Metrics**: Real-time calculation of **CO2 Savings**, **Estimated Fares**, and **Calories Burned** per journey.
- **Google Maps Interaction**: Integrated search autocomplete, "Locate Me" GPS tracking, and multi-layer map styles (Satellite/Street/Dark).
- **Traffic Vision**: Detect vehicle density and road hazards using YOLOv8 via the CV microservice.
- **Real-Time Sync**: WebSocket-powered map pulses and heatmap overlays that update live.

## 🏗️ Architecture & Engineering Decisions
RouteViz is built with a decoupled microservices approach to ensure scalability and specialized performance.
- **FastAPI for CV**: We chose Python/FastAPI for the Vision service specifically to leverage its native integration with the PyTorch/YOLO ecosystem, ensuring high-performance asynchronous object detection that doesn't block the Node.js event loop.
- **SSE vs. Polling**: The AI Decision Engine uses Server-Sent Events (SSE) to stream analysis rather than polling, providing a low-latency "ChatGPT-style" UI while maintaining a lightweight unidirectional connection.
- **Service Separation**: The LLM layer is strictly decoupled from the core routing engine; this allows us to swap intelligence providers (switching from Claude to a local Llama model) or adjust routing logic independently without systemic risk.

## 🛠️ Tech Stack
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, Mapbox GL JS | Interactive mapping and state management |
| **Backend** | Node.js, Express, Socket.io | Core logic, Auth, and Real-time updates |
| **Vision** | Python, FastAPI, YOLOv8 | Traffic image/video detection |
| **AI** | Anthropic Claude / GPT-4o | Natural language decision engine |
| **DevOps** | Docker, Vercel, Railway | Containerization and Cloud Hosting |

## 🚦 Getting Started (Local)

### Prerequisites
- Node.js v18+
- Python 3.9+
- [Mapbox Access Token](https://mapbox.com)

### Installation
1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/routeviz.git
   cd routeviz
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env # Add your MAPBOX_TOKEN
   npm start
   ```

3. **CV Service Setup**
   ```bash
   cd ../cv-service
   pip install -r requirements.txt
   python main.py
   ```

4. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env # Add your VITE_MAPBOX_TOKEN
   npm run dev
   ```

### 🐳 Docker Compose
Alternatively, run everything at once:
```bash
docker-compose up --build
```

## 🔐 Environment Variables
| Variable | Required | Description |
| :--- | :--- | :--- |
| `MAPBOX_TOKEN` | Yes | Mapbox GL JS public token |
| `JWT_SECRET` | Yes | Secure string for token signing (min 32 chars) |
| `ANTHROPIC_API_KEY` | Optional | API key for Claude (Summary engine) |
| `OPENAI_API_KEY` | Optional | API key for GPT-4o (Backup engine) |
| `CV_SERVICE_URL` | Optional | URL of the Python microservice |

## 🗺️ Roadmap
- [ ] **Predictive ML**: Historical traffic pattern analysis for future trip planning.
- [ ] **Mobile App**: Native iOS/Android version using React Native.
- [ ] **Social Routing**: Shared "Hazard Markers" across a live user network.

---
Built by [Babu Ram Ashwin](https://github.com/bastola-wrld)
