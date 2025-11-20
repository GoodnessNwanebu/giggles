# Giggle's Joke Factory

A fun web app that generates jokes using Google's Gemini AI.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

3. Set the environment variable:
   - For local development: Create a `.env` file with `GEMINI_API_KEY=your_key_here`
   - For deployment: Add `GEMINI_API_KEY` to your platform's environment variables (Vercel, Netlify, etc.)

4. The serverless function at `/api/joke.js` handles all API calls securely, keeping your API key server-side only.

## Development

Run the development server locally:
```bash
npm run dev
```

This will start a local server at `http://localhost:3000` that serves your static files and handles the `/api/joke` endpoint, allowing you to test the Gemini API integration locally.

Make sure you have a `.env` file in the root directory with:
```
GEMINI_API_KEY=your_api_key_here
```

## Deployment

This project uses serverless functions. The API endpoint is located at `/api/joke.js` and works with:
- Vercel (automatic detection)
- Netlify (may need `netlify.toml` configuration)
- Other serverless platforms

Make sure to set the `GEMINI_API_KEY` environment variable in your deployment platform.
