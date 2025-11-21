export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Get query parameters
  const topic = req.query.topic || 'food';
  const recentTopics = req.query.recentTopics ? req.query.recentTopics.split(',').filter(t => t.trim()) : [];

  try {
    // Build enhanced prompt with examples, style instructions, and context
    const prompt = buildEnhancedPrompt(topic, recentTopics);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
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
      // Clean the text - remove markdown code blocks if present
      let cleanedText = generatedText.trim();
      cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      
      // Try to parse as JSON first
      joke = JSON.parse(cleanedText);
      
      // If setup contains JSON string, parse it again
      if (typeof joke.setup === 'string' && joke.setup.trim().startsWith('{')) {
        try {
          const nestedJoke = JSON.parse(joke.setup);
          if (nestedJoke.setup) {
            joke = nestedJoke;
          }
        } catch {
          // Not nested JSON, continue with current joke
        }
      }
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

    // Ensure we have the expected format and extract only setup/punchline
    if (!joke.setup || typeof joke.setup !== 'string') {
      joke = {
        setup: typeof generatedText === 'string' ? generatedText.trim() : 'Oops! Could not generate joke.',
        punchline: (joke.punchline && typeof joke.punchline === 'string') ? joke.punchline : '',
      };
    }
    
    // Clean up - ensure setup and punchline are strings, not objects
    joke.setup = String(joke.setup || '').trim();
    joke.punchline = String(joke.punchline || '').trim();

    // Extract topic from response if provided
    const responseTopic = joke.topic || topic;

    return res.status(200).json({
      setup: joke.setup,
      punchline: joke.punchline || '',
      topic: responseTopic,
    });
  } catch (error) {
    console.error('Error generating joke:', error);
    return res.status(500).json({ 
      error: 'Failed to generate joke',
      message: error.message 
    });
  }
}

// Build enhanced prompt with examples, style instructions, and context
function buildEnhancedPrompt(topic, recentTopics) {
  // Examples of GREAT jokes - clever, surprising, genuinely funny
  const goodExamples = [
    {
      setup: "I told my wife she was drawing her eyebrows too high.",
      punchline: "She looked surprised.",
      note: "Clever wordplay with double meaning - misdirection that surprises"
    },
    {
      setup: "Why don't scientists trust atoms?",
      punchline: "Because they make up everything!",
      note: "Wordplay on 'make up' meaning both 'compose' and 'lie' - clever twist"
    },
    {
      setup: "I'm reading a book about anti-gravity.",
      punchline: "It's impossible to put down!",
      note: "Literal interpretation of a common phrase - surprising and clever"
    },
    {
      setup: "What do you call a fish with no eyes?",
      punchline: "Fsh.",
      note: "Unexpected answer that makes you think - clever wordplay"
    }
  ];

  // Examples of BAD jokes - what to avoid
  const badExamples = [
    {
      setup: "What do you call a bear with no teeth?",
      punchline: "A gummy bear.",
      note: "Too simple, predictable, childish - not clever enough"
    },
    {
      setup: "What did one wall say to the other wall?",
      punchline: "I'll meet you at the corner.",
      note: "Overused, not surprising, lacks cleverness"
    },
    {
      setup: "Why did the chicken cross the road?",
      punchline: "To get to the other side.",
      note: "Cliché, everyone knows it, zero surprise factor"
    }
  ];

  const goodExamplesText = goodExamples.map((ex, i) => {
    return `${i + 1}. Setup: "${ex.setup}"\n   Punchline: "${ex.punchline}"\n   Why it's great: ${ex.note}`;
  }).join('\n\n');

  const badExamplesText = badExamples.map((ex, i) => {
    return `${i + 1}. Setup: "${ex.setup}"\n   Punchline: "${ex.punchline}"\n   Why it's weak: ${ex.note}`;
  }).join('\n\n');

  // Topic-specific context
  const topicContext = {
    'food': 'about food, cooking, restaurants, or eating',
    'school': 'about school, education, teachers, students, or learning',
    'family': 'about family, parents, kids, or relationships',
    'sports': 'about sports, games, athletes, or competition',
    'animals': 'about animals, pets, or wildlife',
    'technology': 'about computers, phones, internet, or tech',
    'work': 'about jobs, offices, careers, or working',
    'transportation': 'about cars, planes, trains, or travel',
    'weather': 'about weather, seasons, or climate',
    'health': 'about health, fitness, doctors, or medicine',
    'nature': 'about nature, outdoors, plants, or environment',
    'music': 'about music, instruments, songs, or musicians',
    'science': 'about science, math, physics, or experiments',
    'everyday': 'about everyday life, common situations, or daily activities'
  };

  const topicDescription = topicContext[topic] || 'about everyday life';

  let prompt = `You are an expert, highly-rated comedy writer specializing in short, witty, and universally funny jokes. Your goal is to generate jokes that are genuinely VERY FUNNY and will make users laugh most of the time.

Generate a SHORT, CLEVER joke ${topicDescription} that is:

CRITICAL REQUIREMENTS:
- KEEP IT SHORT: Maximum 2 sentences total (setup + punchline, or a one-liner)
- GENUINELY VERY FUNNY: Must be clever enough to elicit a real laugh, not just a groan
- CLEVER TECHNIQUES: Use misdirection, irony, surprising twists, or clever wordplay (not just simple puns)
- EASILY DIGESTIBLE: Simple to understand, no complex setups
- FAMILY-FRIENDLY: Appropriate for all ages
- AVOID CLICHÉS: No overused joke formats or predictable patterns

WHAT MAKES A GREAT JOKE:
- Clever wordplay, misdirection, or irony that surprises
- Unexpected but logical connection between setup and punchline
- Short and punchy (one-liner or quick setup/punchline)
- Relatable and easy to understand
- The kind that makes you think "oh that's clever!" and laugh
- Quality over quantity - aim for 70%+ laugh rate

EXAMPLES OF GREAT JOKES (Target Quality):
${goodExamplesText}

EXAMPLES OF WEAK JOKES (Avoid These):
${badExamplesText}

`;

  // Add context about recent topics to avoid
  if (recentTopics.length > 0) {
    prompt += `CONTEXT - Avoid these recently used topics: ${recentTopics.join(', ')}\nTry a different angle or topic to ensure variety. Also vary the humor technique used (misdirection, irony, wordplay, etc.).\n\n`;
  }

  prompt += `Return your response in JSON format with these fields:
- "setup": The joke setup or question (required, keep it SHORT)
- "punchline": The punchline or answer (empty string if it's a one-liner)
- "topic": "${topic}"

IMPORTANT RULES: 
- If it's a one-liner, put the entire joke in "setup" and leave "punchline" as an empty string
- Keep the total joke under 2 sentences - brevity is key
- Make it GENUINELY VERY FUNNY - aim for quality that makes users laugh most of the time
- Use clever techniques: misdirection, irony, surprising twists, or sophisticated wordplay
- Avoid simple puns or predictable patterns - be clever and surprising
- The joke should make people think "that's brilliant!" not just "that's a pun"

Now generate a short, clever, VERY FUNNY joke about ${topicDescription}:`;

  return prompt;
}

// Simple topic extraction helper
function extractTopicFromJoke(joke) {
  const text = (joke.setup + ' ' + (joke.punchline || '')).toLowerCase();
  
  const topicKeywords = {
    'science': ['atom', 'scientist', 'math', 'physics', 'chemistry', 'biology', 'computer', 'technology', 'lab'],
    'food': ['noodle', 'cheese', 'cookie', 'coffee', 'banana', 'tomato', 'food', 'eat', 'cooking', 'pizza', 'bread'],
    'animals': ['chicken', 'bear', 'fish', 'dog', 'duck', 'cat', 'whale', 'dinosaur', 'skeleton', 'bird'],
    'sports': ['golfer', 'golf', 'sport', 'ball', 'game', 'football', 'basketball'],
    'nature': ['scarecrow', 'snowman', 'tree', 'flower', 'ocean', 'weather', 'rain'],
    'everyday': ['doctor', 'pants', 'bicycle', 'car', 'book', 'opener', 'phone', 'work', 'job']
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return topic;
    }
  }
  
  return 'general';
}

