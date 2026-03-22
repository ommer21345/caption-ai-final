import express from "express";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize Gemini for the vision step (using the platform's key)
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const app = express();
app.use(express.json({ limit: '50mb' }));

  // API route for caption generation using OpenRouter
  app.post("/api/generate-captions", async (req, res) => {
    const { imageData, options } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("Missing OPENROUTER_API_KEY");
      return res.status(500).json({ error: "API Key Missing: Please set OPENROUTER_API_KEY in your Netlify environment variables." });
    }

    try {
      // Single step: Use a vision-capable model to analyze and generate captions in one go
      // This saves time and avoids Netlify's 10s function timeout
      const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "openai/gpt-4o-mini", // Vision capable and fast
        messages: [
          {
            role: "system",
            content: `You are a social media strategist. Analyze the image and generate 5 highly engaging ${options.platform} captions in ${options.language}. 
            Return ONLY a JSON object with this structure: 
            { "captions": [{ "hook": "Catchy first line", "body": "Main content", "cta": "Call to action", "hashtags": ["tag1", "tag2"] }] }`
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Tone: ${options.tone}\nPlatform: ${options.platform}\nLanguage: ${options.language}\nAdditional Context: ${options.additionalContext || "None"}` 
              },
              { 
                type: "image_url", 
                image_url: { 
                  url: imageData // imageData is already base64 with prefix
                } 
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://captioncrafter.ai", // Required by some OpenRouter models
          "X-Title": "CaptionCrafter AI"
        },
        timeout: 9000 // Leave 1s buffer for Netlify's 10s limit
      });

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);
      const captionsData = parsed.captions || parsed;

      res.json({ 
        captions: Array.isArray(captionsData) ? captionsData.slice(0, 5) : [captionsData], 
        isRaw: false 
      });
    } catch (error: any) {
      console.error("Generation Error:", error.response?.data || error.message);
      
      // Provide more specific error messages to the frontend
      let message = "Failed to generate captions.";
      if (error.code === 'ECONNABORTED') message = "Request timed out. The image might be too complex or the AI is busy.";
      if (error.response?.status === 401) message = "Invalid API Key. Please check your OPENROUTER_API_KEY in Netlify.";
      if (error.response?.status === 402) message = "Insufficient credits in your OpenRouter account.";
      if (error.response?.data?.error?.message) message = error.response.data.error.message;

      res.status(500).json({ error: message });
    }
  });

  // Health check for Netlify debugging
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: { 
        hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
        nodeEnv: process.env.NODE_ENV 
      } 
    });
  });

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.NETLIFY) {
  startServer();
}

export default app;
