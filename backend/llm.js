// LLM integration module for traffic analysis and recommendations
import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const cache = new Map();
const CACHE_TTL = (process.env.LLM_CACHE_TTL_SECONDS || 300) * 1000;

export function buildTrafficPrompt(routeData, congestionData, mode) {
  const stopsStr = routeData.stops.map(s => s.name).join(' → ');
  const originalEta = Math.round(routeData.baseDuration / 60);
  const adjustedEta = Math.round(routeData.totalDuration / 60);
  const delay = adjustedEta - originalEta;
  
  const worstLeg = routeData.legs.reduce((prev, curr) => 
    (curr.congestion_score > (prev?.congestion_score || 0)) ? curr : prev, routeData.legs[0]);

  const hazardsCount = routeData.legs.filter(l => l.congestion_level === 'high').length;

  const context = `
    Route data:
    - Stops: ${stopsStr}
    - Original ETA: ${originalEta} minutes
    - Adjusted ETA: ${adjustedEta} minutes
    - Total delay: ${delay} minutes
    - Overall congestion: ${congestionData.congestion_level}
    - Worst leg: ${worstLeg.startName} → ${worstLeg.endName}
    
    CV Detection:
    - Vehicles detected: ${congestionData.vehicle_count}
    - Congestion level: ${congestionData.congestion_level}
    - Detected signs: ${(congestionData.detected_signs || []).join(', ') || 'none'}
    
    Hazards: ${hazardsCount} detected
  `;

  if (mode === "summarize") {
    return {
      system: "You are a smart traffic assistant for RouteViz, an AI route planner. Always respond with valid JSON only. No markdown, no explanation, no code fences. Pure JSON matching the schema provided. Be concise. Prioritize driver safety. Use plain English in all message fields.",
      user: `Analyze this traffic data and summarize current conditions.\n${context}\nRespond with this exact JSON schema:\n{\n  "headline": string, // max 10 words, present tense\n  "condition": "clear"|"moderate"|"heavy"|"severe",\n  "summary": string, // 1-2 sentences, plain English\n  "keyFacts": [string], // 2-4 bullet facts, each max 12 words\n  "confidence": number // 0.0-1.0\n}`
    };
  }

  if (mode === "recommend") {
    return {
      system: "You are a smart traffic assistant for RouteViz, an AI route planner. Response with valid JSON only.",
      user: `Given this traffic situation, provide actionable driving recommendations.\n${context}\nReroute suggested by system: ${delay > 10}\nRespond with this exact JSON schema:\n{\n  "recommendation": string, // max 20 words\n  "actions": [\n    { "priority": "high"|"medium"|"low", "action": string, "reason": string }\n  ],\n  "estimatedTimeSaving": number,\n  "alternateAdvice": string | null\n}`
    };
  }

  if (mode === "reroute") {
    return {
      system: "You are a smart traffic assistant for RouteViz. Response with valid JSON only.",
      user: `Heavy traffic detected. Suggest a reroute strategy.\n${context}\nRespond with this exact JSON schema:\n{\n  "rerouteAdvice": string, // max 25 words\n  "avoidAreas": [string],\n  "suggestedDeparture": string,\n  "estimatedSaving": number,\n  "confidence": number,\n  "alternateStopOrder": [string] | null\n}`
    };
  }
}

export async function callLLM(prompt, systemPrompt, stream = false) {
  // Check Cache
  const cacheKey = btoa(JSON.stringify({ p: prompt.substring(0, 100), s: systemPrompt.substring(0, 100) }));
  if (!stream && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() < cached.expiresAt) return cached.data;
  }

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
        stream: stream
      });
      
      if (!stream) {
        const text = response.content[0].text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(text);
        cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });
        return data;
      }
      return response; // Return stream
    }

    if (process.env.OPENAI_API_KEY) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        stream: stream
      });

      if (!stream) {
        const text = response.choices[0].message.content.replace(/```json|```/g, '').trim();
        const data = JSON.parse(text);
        cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });
        return data;
      }
      return response; // Return stream
    }

    throw new Error("No API keys provided");
  } catch (err) {
    console.error("LLM Call failed:", err.message);
    throw err;
  }
}

export function getFallback(mode) {
  const fallbacks = {
    summarize: { headline: "Traffic data available", condition: "moderate", summary: "Route calculated with current traffic conditions.", keyFacts: ["CV analysis complete", "ETA adjusted for congestion"], confidence: 0.5 },
    recommend: { recommendation: "Proceed with caution on congested legs", actions: [{ priority:"medium", action:"Monitor traffic ahead", reason:"Congestion detected on route" }], estimatedTimeSaving: 0, alternateAdvice: null },
    reroute: { rerouteAdvice: "Consider delaying departure if possible", avoidAreas: [], suggestedDeparture: "Monitor conditions before departing", estimatedSaving: 0, confidence: 0.3, alternateStopOrder: null }
  };
  return fallbacks[mode];
}

export function clearCache() { cache.clear(); }
export function getCacheSize() { return cache.size; }
