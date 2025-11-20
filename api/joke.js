export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
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
      return res.status(response.status).json({ 
        error: 'Failed to generate joke',
        details: errorText 
      });
    }

    const data = await response.json();
    
    // Extract the generated text from Gemini response
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!generatedText) {
      return res.status(500).json({ error: 'No joke generated' });
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

    return res.status(200).json({
      setup: joke.setup,
      punchline: joke.punchline || '',
    });
  } catch (error) {
    console.error('Error generating joke:', error);
    return res.status(500).json({ 
      error: 'Failed to generate joke',
      message: error.message 
    });
  }
}

