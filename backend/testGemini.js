require('dotenv').config();
const OpenAI = require('openai');

async function testGemini() {
    console.log("Testing Gemini API connection...");
    console.log("API Key loaded?", !!process.env.GEMINI_API_KEY);
    
    try {
        const openai = new OpenAI({
            apiKey: process.env.GEMINI_API_KEY || "missing", 
            baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
        });

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: "Say the word test json format { \"status\": \"ok\" }" }],
            model: "gemini-1.5-flash",
        });

        console.log("Success! Response:");
        console.log(completion.choices[0].message.content);
    } catch (error) {
        console.error("💥 Error testing Gemini:", error.message);
        if (error.response) {
            console.error(error.response.data);
        }
    }
}

testGemini();
