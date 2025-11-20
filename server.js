import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Import the API handler logic directly
async function handleApiRequest(req, res) {
  if (req.url === '/api/joke' && req.method === 'GET') {
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.error('GEMINI_API_KEY is not set');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server configuration error' }));
        return;
      }

      // Generate a joke using Gemini API
      const prompt = `Generate a clean, family-friendly joke. Return the response in JSON format with two fields: "setup" (the joke setup or question) and "punchline" (the punchline or answer). If it's a one-liner, put the entire joke in "setup" and leave "punchline" empty. Make it very funny and appropriate for all ages.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Failed to generate joke',
          details: errorText 
        }));
        return;
      }

      const data = await response.json();
      
      // Extract the generated text from Gemini response
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!generatedText) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No joke generated' }));
        return;
      }

      // Try to parse JSON from the response, or extract joke parts
      let joke;
      try {
        // Try to parse as JSON first
        joke = JSON.parse(generatedText);
      } catch {
        // If not JSON, try to extract setup and punchline from text
        // Look for common patterns like "Q: ... A: ..." or split by newlines
        const lines = generatedText.split('\n').filter(line => line.trim());
        
        if (lines.length >= 2) {
          joke = {
            setup: lines[0].replace(/^(Q:|Question:)\s*/i, '').trim(),
            punchline: lines.slice(1).join(' ').replace(/^(A:|Answer:)\s*/i, '').trim(),
          };
        } else {
          // Single line joke
          joke = {
            setup: generatedText.trim(),
            punchline: '',
          };
        }
      }

      // Ensure we have the expected format
      if (!joke.setup) {
        joke = {
          setup: generatedText.trim(),
          punchline: joke.punchline || '',
        };
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        setup: joke.setup,
        punchline: joke.punchline || '',
      }));
    } catch (error) {
      console.error('Error generating joke:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Failed to generate joke',
        message: error.message 
      }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

// Serve static files
function serveStaticFile(filePath, res) {
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

const server = http.createServer((req, res) => {
  // Handle API routes
  if (req.url.startsWith('/api/')) {
    handleApiRequest(req, res);
    return;
  }

  // Handle static files
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  serveStaticFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Make sure you have a .env file with GEMINI_API_KEY set`);
});

