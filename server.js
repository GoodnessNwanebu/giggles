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

// Parse URL and query parameters
function parseUrl(url) {
  const [pathname, queryString] = url.split('?');
  const query = {};
  
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        query[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });
  }
  
  return { pathname, query };
}

// Import the API handler from the actual file
async function handleApiRequest(req, res) {
  const { pathname, query } = parseUrl(req.url);
  
  if (pathname === '/api/joke' && req.method === 'GET') {
    try {
      // Import the handler function from api/joke.js
      const { default: handler } = await import('./api/joke.js');
      
      // Create mock req/res objects that match Vercel's format
      const mockReq = {
        method: req.method,
        url: req.url,
        query: query, // Add parsed query parameters
        headers: req.headers,
      };
      
      const mockRes = {
        setHeader: (name, value) => {
          // Store headers for later use
          if (!mockRes._headers) mockRes._headers = {};
          mockRes._headers[name] = value;
        },
        status: (code) => ({
          json: (data) => {
            const headers = { 'Content-Type': 'application/json', ...mockRes._headers };
            res.writeHead(code, headers);
            res.end(JSON.stringify(data));
          },
          end: () => {
            const headers = { ...mockRes._headers };
            res.writeHead(code, headers);
            res.end();
          }
        }),
        json: (data) => {
          const headers = { 'Content-Type': 'application/json', ...mockRes._headers };
          res.writeHead(200, headers);
          res.end(JSON.stringify(data));
        },
        end: () => {
          const headers = { ...mockRes._headers };
          res.writeHead(200, headers);
          res.end();
        }
      };
      
      await handler(mockReq, mockRes);
    } catch (error) {
      console.error('API handler error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
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

