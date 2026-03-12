const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const fs = require('fs');
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

async function run() {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        const data = await response.json();
        const models = data.models.map(m => m.name.replace('models/', ''));
        console.log('ALL GEMINI MODELS:');
        models.filter(m => m.includes('gemini')).forEach(m => console.log(m));
    } catch(e) { console.error(e); }
}
run();
