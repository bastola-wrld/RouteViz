# RouteViz 📍 AI-Powered Multi-Modal Intelligence

**RouteViz** is a production-grade, full-stack navigation platform that fuses **Citymapper's** intelligent transit metrics with **Google Maps'** world-class search and visualization. Powered by **YOLOv8 Computer Vision** and **Real-time Transit Simulation**, it delivers a high-fidelity routing experience for modern urban mobility.

## 🚀 Key Features

### 🚇 Citymapper Smarts
- **Walk-Transit-Walk Simulation:** Automatically splits journeys into granular segments, including walking directions to/from stations for a complete "First/Last Mile" experience.
- **Live Departure Boards:** Pulsing timetable integration for 🚌 Buses and 🚆 Trains, featuring high-frequency schedule simulation.
- **Journey Impact Metrics:** Real-time calculation of **CO2 Savings**, **Estimated Fares**, and **Calories Burned** per route.
- **Vertical Timeline UI:** A professional, step-by-step journey breakdown with mode icons and station markers.

### 🗺️ Google Maps Versatility
- **Search Autocomplete:** Real-time destination suggestions using the Mapbox Geocoding API.
- **Map Style Switcher:** Instant toggling between **Dark Mode**, **High-Res Satellite**, and **Standard Street** layers.
- **Locate Me (📍):** Instant GPS positioning to anchor your journey from your current physical location.

### 🧠 AI Route Intelligence
- **Traffic Vision (YOLOv8):** A dedicated Python microservice that analyzes road density and hazards from images/video, feeding live data into the routing engine.
- **AI-Augmented Routing:** Directions are dynamically adjusted based on real-time traffic pulses and environmental data.
- **Live Heatmaps:** Visualizes congestion hotspots and system health directly on the map.

---

## 🏗️ Technical Architecture

RouteViz utilizes a decoupled microservices architecture to handle high-performance geospatial and vision tasks:

- **Frontend (React 18 / Vite):** A responsive, state-managed dashboard utilizing **Mapbox GL JS** and **Socket.io** for real-time synchronization.
- **Backend (Node.js / Express):** The central orchestrator handling authentication, multi-stop optimization, and the custom **Transit Simulation Engine**.
- **Vision Service (Python / FastAPI):** Specialized service for **YOLOv8** object detection, ensuring heavy CV tasks don't block the main event loop.

---

## 🛠️ Tech Stack
- **Languages:** JavaScript (ES6+), Python 3.9+
- **Frameworks:** React, Node.js, FastAPI
- **Geospatial:** Mapbox GL JS, Geocoding API, Directions API
- **Real-time:** Socket.io, WebSockets
- **AI/ML:** YOLOv8 (Ultralytics), PyTorch

---

## 🚦 Getting Started

### 1. Installation
```bash
git clone https://github.com/bastola-wrld/RouteViz.git
cd routeviz
```

### 2. Environment Setup
You will need a **Mapbox Access Token**.
- **Backend:** `cp backend/.env.example backend/.env` and add your `MAPBOX_TOKEN`.
- **Frontend:** `cp frontend/.env.example frontend/.env` and add your `VITE_MAPBOX_TOKEN`.

### 3. Launching Services
- **Backend:** `cd backend && npm install && npm start`
- **CV Service:** `cd cv-service && pip install -r requirements.txt && python main.py`
- **Frontend:** `cd frontend && npm install && npm run dev`

---

## 🔐 Configuration Highlights
| Variable | Description |
| :--- | :--- |
| `MAPBOX_TOKEN` | Your Mapbox API key for route calculation. |
| `JWT_SECRET` | Secret key for secure user sessions. |
| `CV_SERVICE_URL` | Endpoint for the AI Traffic Vision service. |

---
**Developed with Precision by [Babu Ram Ashwin](https://github.com/bastola-wrld)**
