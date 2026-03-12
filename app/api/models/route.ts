import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key is required to fetch models.' }), { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We fetch the pure list of models available to this specific key.
    // The Google SDK automatically targets the correct v1/v1beta endpoint internally.
    const response = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // dummy initialization
    
    // Using native NodeJS fetch to hit the REST endpoint securely on behalf of the user,
    // because the standard SDK does not easily expose a .listModels() method.
    const restResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!restResponse.ok) {
        throw new Error(`Google API Error: ${restResponse.status} ${restResponse.statusText}`);
    }

    const data = await restResponse.json();
    
    const allowedBaseNames = [
      'gemini-2.5-flash', 
      'gemini-3.1-flash-lite-preview'
    ];

    // Filter only for text generation models that are in our whitelist
    const supportedModels = (data.models || []).filter((model: any) => {
        const isSupported = model.supportedGenerationMethods?.includes('generateContent');
        const baseName = model.name.replace('models/', '');
        return isSupported && allowedBaseNames.includes(baseName);
    });

    // Detect Billing Tier via native fetch to read headers
    let tier = 'paid';
    try {
        const checkReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } })
        });
        
        const rpmHeader = checkReq.headers.get('x-ratelimit-limit-requests-per-minute');
        if (rpmHeader && parseInt(rpmHeader) <= 15) {
            tier = 'free';
        }
    } catch(e) { console.warn("Tier check failed", e); }

    return new Response(JSON.stringify({ models: supportedModels, tier }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Model List Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch models' }), { status: 500 });
  }
}
