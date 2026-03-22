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
      // Step 1: Get image description
      let description = "";
      try {
        const visionResponse = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Describe this image briefly for social media captions." },
                { type: "image_url", image_url: { url: imageData } }
              ]
            }
          ]
        }, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 8000 // Tight timeout for Netlify
        });
        
        description = visionResponse.data.choices?.[0]?.message?.content || "A vibrant social media image.";
      } catch (visionError: any) {
        console.error("Vision Error:", visionError.message);
        description = "A vibrant social media image."; // Fallback to keep going
      }

      // Step 2: Generate captions
      const captionResponse = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [
          {
            role: "system",
            content: `Generate 5 ${options.platform} captions in JSON format. { "captions": [{ "hook": "...", "body": "...", "cta": "...", "hashtags": [] }] }`
          },
          {
            role: "user",
            content: `Image: ${description}\nTone: ${options.tone}\nLang: ${options.language}`
          }
        ],
        response_format: { type: "json_object" },
        timeout: 8000
      }, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        }
      });

      const content = captionResponse.data.choices[0].message.content;
      const parsed = JSON.parse(content);
      const captionsData = parsed.captions || parsed;

      res.json({ captions: Array.isArray(captionsData) ? captionsData.slice(0, 5) : [captionsData], isRaw: false });
    } catch (error: any) {
      console.error("Generation Error:", error.message);
      res.status(500).json({ error: error.message || "Internal Server Error" });
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
