// DOM Elements
const getJokeBtn = document.getElementById('get-joke-btn');
const jokeSetupEl = document.getElementById('joke-setup');
const jokePunchlineEl = document.getElementById('joke-punchline');
const jokeCard = document.getElementById('joke-card');
const ratingSlider = document.getElementById('rating');
const giggles = document.getElementById('giggles');

// Joke tracking to prevent repetition
let usedJokes = new Set();
let currentJoke = null;

// Multiple joke APIs for variety and reliability
const JOKE_APIS = [
    {
        name: 'JokeAPI',
        url: 'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit',
        parser: (data) => {
            if (data.type === 'single') {
                return { setup: data.joke, punchline: '' };
            } else if (data.type === 'twopart') {
                return { setup: data.setup, punchline: data.punchline || data.delivery };
            }
            return null;
        }
    },
    {
        name: 'DadJokes',
        url: 'https://icanhazdadjoke.com/',
        headers: { 'Accept': 'application/json' },
        parser: (data) => {
            return { setup: data.joke, punchline: '' };
        }
    },
    {
        name: 'ChuckNorris',
        url: 'https://api.chucknorris.io/jokes/random',
        parser: (data) => {
            return { setup: data.value, punchline: '' };
        }
    },
    {
        name: 'JokeAPIProgramming',
        url: 'https://v2.jokeapi.dev/joke/Programming?blacklistFlags=nsfw,religious,political,racist,sexist,explicit',
        parser: (data) => {
            if (data.type === 'single') {
                return { setup: data.joke, punchline: '' };
            } else if (data.type === 'twopart') {
                return { setup: data.setup, punchline: data.punchline || data.delivery };
            }
            return null;
        }
    },
    {
        name: 'JokeAPIMisc',
        url: 'https://v2.jokeapi.dev/joke/Misc?blacklistFlags=nsfw,religious,political,racist,sexist,explicit',
        parser: (data) => {
            if (data.type === 'single') {
                return { setup: data.joke, punchline: '' };
            } else if (data.type === 'twopart') {
                return { setup: data.setup, punchline: data.punchline || data.delivery };
            }
            return null;
        }
    }
];

// Fallback jokes when APIs are down
const FALLBACK_JOKES = [
    { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything!" },
    { setup: "What do you call a fake noodle?", punchline: "An impasta!" },
    { setup: "Why did the scarecrow win an award?", punchline: "He was outstanding in his field!" },
    { setup: "Why don't eggs tell jokes?", punchline: "They'd crack each other up!" },
    { setup: "What do you call a bear with no teeth?", punchline: "A gummy bear!" },
    { setup: "Why did the math book look so sad?", punchline: "Because it had too many problems!" },
    { setup: "What do you call a fish wearing a bowtie?", punchline: "So-fish-ticated!" },
    { setup: "Why don't skeletons fight each other?", punchline: "They don't have the guts!" },
    { setup: "What do you call a dinosaur that crashes his car?", punchline: "Tyrannosaurus wrecks!" },
    { setup: "Why did the cookie go to the doctor?", punchline: "Because it was feeling crumbly!" },
    { setup: "What do you call a can opener that doesn't work?", punchline: "A can't opener!" },
    { setup: "Why did the golfer bring two pairs of pants?", punchline: "In case he got a hole in one!" },
    { setup: "What do you call a cheese that isn't yours?", punchline: "Nacho cheese!" },
    { setup: "Why did the tomato turn red?", punchline: "Because it saw the salad dressing!" },
    { setup: "Why don't oysters donate to charity?", punchline: "Because they're shellfish!" },
    { setup: "What do you call a sleeping bull?", punchline: "A bulldozer!" },
    { setup: "Why did the computer go to the doctor?", punchline: "Because it had a virus!" },
    { setup: "What do you call a group of musical whales?", punchline: "An orca-stra!" },
    { setup: "Why did the bicycle fall over?", punchline: "Because it was two-tired!" },
    { setup: "What do you call a dog that does magic tricks?", punchline: "A labracadabrador!" },
    { setup: "Why did the coffee file a police report?", punchline: "It got mugged!" },
    { setup: "What do you call a snowman with a six-pack?", punchline: "An abdominal snowman!" },
    { setup: "Why did the invisible man turn down the job offer?", punchline: "He couldn't see himself doing it!" },
    { setup: "What do you call a duck that gets all A's?", punchline: "A wise quacker!" },
    { setup: "Why did the banana go to the doctor?", punchline: "Because it wasn't peeling well!" },
    { setup: "What do you call a cat that likes to bowl?", punchline: "An alley cat!" },
    { setup: "Why did the chicken go to the seance?", punchline: "To talk to the other side!" },
    { setup: "What do you call a bear with no teeth?", punchline: "A gummy bear!" },
    { setup: "Why did the scarecrow win an award?", punchline: "Because he was outstanding in his field!" },
    { setup: "What do you call a fake noodle?", punchline: "An impasta!" },
    { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything!" },
    { setup: "What do you call a can opener that doesn't work?", punchline: "A can't opener!" },
    { setup: "Why did the golfer bring two pairs of pants?", punchline: "In case he got a hole in one!" },
    { setup: "What do you call a cheese that isn't yours?", punchline: "Nacho cheese!" },
    { setup: "Why did the tomato turn red?", punchline: "Because it saw the salad dressing!" },
    { setup: "Why don't oysters donate to charity?", punchline: "Because they're shellfish!" },
    { setup: "What do you call a sleeping bull?", punchline: "A bulldozer!" },
    { setup: "Why did the computer go to the doctor?", punchline: "Because it had a virus!" },
    { setup: "What do you call a group of musical whales?", punchline: "An orca-stra!" },
    { setup: "Why did the bicycle fall over?", punchline: "Because it was two-tired!" },
    { setup: "What do you call a dog that does magic tricks?", punchline: "A labracadabrador!" },
    { setup: "Why did the coffee file a police report?", punchline: "It got mugged!" }
];

let punchlineTimeout;

// --- Functions ---

function getJokeHash(joke) {
    // Create a simple hash to identify duplicate jokes
    const text = (joke.setup + joke.punchline).toLowerCase().replace(/[^a-z0-9]/g, '');
    return text;
}

function isJokeUsed(joke) {
    const hash = getJokeHash(joke);
    return usedJokes.has(hash);
}

function markJokeAsUsed(joke) {
    const hash = getJokeHash(joke);
    usedJokes.add(hash);
    currentJoke = joke;
}

function getRandomFallbackJoke() {
    const availableJokes = FALLBACK_JOKES.filter(joke => !isJokeUsed(joke));
    if (availableJokes.length === 0) {
        // If all fallback jokes have been used, reset the used jokes set
        usedJokes.clear();
        return FALLBACK_JOKES[Math.floor(Math.random() * FALLBACK_JOKES.length)];
    }
    return availableJokes[Math.floor(Math.random() * availableJokes.length)];
}

async function fetchJokeFromAPI(api) {
    try {
        const options = {
            method: 'GET',
            headers: api.headers || {}
        };
        
        const response = await fetch(api.url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const joke = api.parser(data);
        
        if (joke && joke.setup) {
            return joke;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching from ${api.name}:`, error);
        return null;
    }
}

async function getJoke() {
    giggles.classList.add('telling');
    jokeCard.classList.add('loading');
    getJokeBtn.disabled = true;
    
    clearTimeout(punchlineTimeout);

    jokePunchlineEl.classList.remove('visible');
    jokePunchlineEl.textContent = '';

    try {
        let joke = null;
        
        // Try each API in order until we get a new joke
        for (const api of JOKE_APIS) {
            const fetchedJoke = await fetchJokeFromAPI(api);
            if (fetchedJoke && !isJokeUsed(fetchedJoke)) {
                joke = fetchedJoke;
                break;
            }
        }
        
        // If no new joke from APIs, try fallback jokes
        if (!joke) {
            joke = getRandomFallbackJoke();
        }
        
        // If still no joke, use any available joke (including used ones)
        if (!joke) {
            const randomAPI = JOKE_APIS[Math.floor(Math.random() * JOKE_APIS.length)];
            joke = await fetchJokeFromAPI(randomAPI) || getRandomFallbackJoke();
        }
        
        if (joke) {
            markJokeAsUsed(joke);
            jokeSetupEl.textContent = joke.setup;
            
            if (joke.punchline) {
                jokePunchlineEl.textContent = joke.punchline;
                punchlineTimeout = setTimeout(() => {
                    jokePunchlineEl.classList.add('visible');
                }, 1200);
            }
        } else {
            jokeSetupEl.textContent = "Oops! Giggles's joke book is stuck.";
        }

    } catch (error) {
        console.error('Error fetching joke:', error);
        jokeSetupEl.textContent = "Oh no! The joke machine is broken.";
        jokePunchlineEl.textContent = "Check your internet connection.";
    } finally {
        jokeCard.classList.remove('loading');
        getJokeBtn.disabled = false;
        
        giggles.addEventListener('animationend', () => {
            giggles.classList.remove('telling');
        }, { once: true });
    }
}

function handleRating() {
    giggles.classList.remove('happy', 'groan');
    const ratingValue = parseInt(ratingSlider.value);
    setTimeout(() => {
        if (ratingValue > 60) {
            giggles.classList.add('happy');
        } else if (ratingValue < 40) {
            giggles.classList.add('groan');
        }
        giggles.addEventListener('animationend', () => {
             giggles.classList.remove('happy', 'groan');
        }, { once: true });
    }, 50);
}

// Add joke counter display
function updateJokeCounter() {
    const jokeCountEl = document.getElementById('joke-count');
    const usedCount = usedJokes.size;
    jokeCountEl.textContent = usedCount;
    console.log(`Jokes used: ${usedCount}`);
}

getJokeBtn.addEventListener('click', () => {
    getJoke();
    updateJokeCounter();
});
ratingSlider.addEventListener('change', handleRating);

// Initialize with first joke
getJoke();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registered.')).catch(err => console.log('SW reg failed:', err));
    });
}