// DOM Elements
const getJokeBtn = document.getElementById('get-joke-btn');
const jokeSetupEl = document.getElementById('joke-setup');
const jokePunchlineEl = document.getElementById('joke-punchline');
const jokeCard = document.getElementById('joke-card');
const ratingSlider = document.getElementById('rating');
const giggles = document.getElementById('giggles');

const JOKE_API_URL = 'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit';

let punchlineTimeout;

// --- Functions ---

async function getJoke() {
    giggles.classList.add('telling');
    jokeCard.classList.add('loading');
    getJokeBtn.disabled = true;
    
    clearTimeout(punchlineTimeout);

    jokePunchlineEl.classList.remove('visible');
    jokePunchlineEl.textContent = '';

    try {
        const response = await fetch(JOKE_API_URL);
        const data = await response.json();

        if (data.type === 'single') {
            jokeSetupEl.textContent = data.joke;
        } else if (data.type === 'twopart') {
            jokeSetupEl.textContent = data.setup;
            
            // THE CRUCIAL FIX: Check for 'punchline' OR 'delivery'.
            // The '||' operator means "use the first value if it exists, otherwise use the second one."
            jokePunchlineEl.textContent = data.punchline || data.delivery; 
            
            punchlineTimeout = setTimeout(() => {
                jokePunchlineEl.classList.add('visible');
            }, 1200);
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

// ... (The rest of the file remains the same) ...

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

getJokeBtn.addEventListener('click', getJoke);
ratingSlider.addEventListener('change', handleRating);
getJoke();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registered.')).catch(err => console.log('SW reg failed:', err));
    });
}