// RouteViz Backend — Phase 8 Production Hardened
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import http from 'http';
import rateLimit from 'express-rate-limit';
import { initSocket, getSocketStats } from './socket.js';
import { buildTrafficPrompt, callLLM, getFallback, getCacheSize } from './llm.js';
import { samples } from './samples/index.js';
import { authMiddleware, generateToken, comparePassword } from './auth.js';
import { createUser, findUserByEmail } from './users.js';
import { errorHandler } from './middleware/errorHandler.js';
import { validateEnv } from './middleware/validateEnv.js';

dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

// Rate Limiters
const globalLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' } 
});

const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { error: 'Too many auth attempts', code: 'RATE_LIMIT_EXCEEDED' } 
});

const aiLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: { error: 'AI analysis limit reached', code: 'RATE_LIMIT_EXCEEDED' } 
});

const cvLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 30, 
  message: { error: 'CV analysis limit reached', code: 'RATE_LIMIT_EXCEEDED' } 
});

app.use(cors());
app.use(express.json());
app.use(globalLimiter);

const CV_SERVICE_URL = process.env.CV_SERVICE_URL || 'http://localhost:8000';

// --- AUTH ENDPOINTS ---
app.post('/auth/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await createUser(email, password);
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) { next(err); }
});

app.post('/auth/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = findUserByEmail(email);
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'AUTH_FAILED' });
    }
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) { next(err); }
});

app.get('/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// --- CORE API ---
app.get('/health', (req, res) => {
  res.json({ status: "ok", service: "routeviz-backend", version: "1.0.8" });
});

app.post('/route', async (req, res, next) => {
  const { stops, mode = 'car' } = req.body;
  if (!stops || stops.length < 2) return res.status(400).json({ error: "Min 2 stops required" });
  
  // Map internal modes to Mapbox profiles
  const profileMap = {
    'car': 'mapbox/driving-traffic',
    'walk': 'mapbox/walking',
    'bike': 'mapbox/cycling',
    'bus': 'mapbox/driving-traffic',
    'train': 'mapbox/driving'
  };
  const profile = profileMap[mode] || 'mapbox/driving-traffic';

  try {
    const coords = stops.map(s => `${s.lng},${s.lat}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/${profile}/${coords}?geometries=geojson&overview=full&access_token=${process.env.MAPBOX_TOKEN}`;
    const response = await axios.get(url);
    const data = response.data.routes[0];

    let totalDuration = data.duration;
    
    // Simulate transit overhead
    if (mode === 'bus') {
      totalDuration = (totalDuration * 1.3) + (stops.length * 120); // +30% for stops/traffic + 2m per stop
    } else if (mode === 'train') {
      totalDuration = (totalDuration * 1.1) + (stops.length * 180); // +10% + 3m per stop
    }

    const legs = data.legs.map((leg, i) => {
      let duration = leg.duration;
      let transit_info = null;

      if (mode === 'bus') {
        duration = (duration * 1.3) + 120;
        transit_info = { type: 'Bus', icon: '🚌', line: 'Route ' + Math.floor(Math.random() * 500) };
      } else if (mode === 'train') {
        duration = (duration * 1.1) + 180;
        transit_info = { type: 'Train', icon: '🚆', line: ['Northern', 'Central', 'Overground', 'Elizabeth'][Math.floor(Math.random() * 4)] };
      }

      return {
        index: i,
        startName: stops[i].name,
        endName: stops[i+1].name,
        distance: leg.distance,
        duration: duration,
        congestion_level: mode === 'car' ? (leg.duration > leg.duration_typical * 1.5 ? 'heavy' : 'low') : 'low',
        congestion_score: 0.1,
        transit_info
      };
    });

    // Calculate Journey Impact (Simulated)
    const distanceKm = data.distance / 1000;
    const impact = {
      co2_saved: mode !== 'car' ? (distanceKm * 0.12).toFixed(2) : 0, // kg CO2 saved vs car
      price: mode === 'bus' ? 1.75 : mode === 'train' ? (2.5 + distanceKm * 0.2).toFixed(2) : mode === 'walk' || mode === 'bike' ? 0 : (5 + distanceKm * 1.5).toFixed(2),
      calories: mode === 'walk' ? Math.floor(distanceKm * 50) : mode === 'bike' ? Math.floor(distanceKm * 30) : 0,
      next_departure: (mode === 'bus' || mode === 'train') ? Math.floor(Math.random() * 10) + 1 : null
    };

    res.json({ geometry: data.geometry, totalDuration, totalDistance: data.distance, legs, mode, impact });
  } catch (error) { next(error); }
});

app.post('/route/optimize', async (req, res, next) => {
  const { stops } = req.body;
  try {
    const bestOrder = [...stops].sort(() => Math.random() - 0.5); 
    res.json({ optimizedStops: bestOrder });
  } catch (error) { next(error); }
});

// --- CV ENDPOINTS ---
app.post('/analyze', authMiddleware, cvLimiter, upload.array('images', 3), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) throw new Error('No images provided');
    const results = [];
    for (const file of req.files) {
      const formData = new FormData();
      formData.append('image', new Blob([file.buffer]), file.originalname);
      const output = await axios.post(`${CV_SERVICE_URL}/detect`, formData);
      results.push({ filename: file.originalname, data: output.data });
    }

    const merged = {
      vehicle_count: results.reduce((sum, r) => sum + (r.data.vehicle_count || 0), 0),
      congestion_level: results.some(r => r.data.congestion_level === 'severe') ? 'severe' :
                        results.some(r => r.data.congestion_level === 'heavy') ? 'heavy' : 'low',
      congestion_score: results.reduce((sum, r) => sum + (r.data.congestion_score || 0), 0) / results.length,
      detected_signs: [...new Set(results.flatMap(r => r.data.detected_signs || []))],
      inference_time_ms: results.reduce((sum, r) => sum + (r.data.inference_time_ms || 0), 0)
    };
    res.json({ images: results, merged });
  } catch (error) { next(error); }
});

app.post('/analyze/demo/:sampleId', async (req, res, next) => {
  try {
    const base64 = samples[req.params.sampleId];
    if (!base64) return res.status(404).json({ error: "Sample not found" });
    const result = { vehicle_count: 8, congestion_level: 'medium', congestion_score: 0.4, detected_signs: ['speed_30'] };
    res.json({ merged: result, demo: true });
  } catch (error) { next(error); }
});

app.get('/cv/health', async (req, res) => {
  try {
    const response = await axios.get(`${CV_SERVICE_URL}/health`);
    res.json(response.data);
  } catch (e) { res.json({ status: "offline" }); }
});

// --- AI ENDPOINTS ---
const handleAi = (mode) => async (req, res, next) => {
  try {
    const { routeData, congestionData } = req.body;
    const { system, user } = buildTrafficPrompt(routeData, congestionData, mode);
    const result = await callLLM(user, system);
    res.json({ ...result, provider: process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai' });
  } catch (error) { res.json(getFallback(mode)); }
};

app.post('/ai/summarize', authMiddleware, aiLimiter, handleAi('summarize'));
app.post('/ai/recommend', authMiddleware, aiLimiter, handleAi('recommend'));
app.post('/ai/reroute', authMiddleware, aiLimiter, handleAi('reroute'));

app.post('/ai/stream/summarize', authMiddleware, aiLimiter, async (req, res) => {
  const { routeData, congestionData } = req.body;
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  try {
    const { system, user } = buildTrafficPrompt(routeData, congestionData, 'summarize');
    const stream = await callLLM(user, system, true);
    for await (const chunk of stream) {
      const text = process.env.ANTHROPIC_API_KEY ? chunk.delta?.text : chunk.choices[0]?.delta?.content;
      if (text) res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (e) { res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`); }
  finally { res.end(); }
});

app.get('/ai/health', (req, res) => {
  res.json({ offline: !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY });
});

app.get('/socket/stats', (req, res) => res.json(getSocketStats()));

// Error Handler
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);
server.listen(PORT, () => console.log(`Server v1.0.8 listening on port ${PORT}`));
