const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Official Deepmind/Google Native SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analyzeIncident = async (serviceName, rawLog) => {
  try {
    console.log(`\n[AI MODULE] 🤖 Starting Diagnosis for: ${serviceName}`);
    // We use gemini-flash-latest because it is blazingly fast and has a huge free tier.
    // By forcing "application/json", Gemini guarantees strict JSON parsing with no markdown ticks.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const prompt = `
    You are an expert Site Reliability Engineer (SRE).
    Analyze the following error log from the microservice: "${serviceName}"
    
    Log Data:
    ${rawLog}

    Return your response strictly as a minified JSON object with the following exact keys:
    {
      "rootCauseSummary": "A 1-2 sentence explanation of why this service crashed.",
      "confidenceScore": 95,
      "suggestedPatch": "Provide a hypothetical string of code or config changes to fix this issue. E.g., docker resource limits, code patch, db pool variables.",
      "affectedShipments": 500,
      "delayMinutes": 45
    }
    `;

    console.log(`[AI MODULE] 📡 Sending request to Gemini Native API...`);
    const result = await model.generateContent(prompt);
    const responseContent = result.response.text();
    
    let structuredData;
    try {
      structuredData = JSON.parse(responseContent);
      console.log(`[AI MODULE] ✅ Success! Received and parsed JSON from Gemini.`);
    } catch (parseError) {
      console.error(`[AI MODULE] ❌ JSON Parse Error on output: \n${responseContent}`);
      throw parseError;
    }
    
    return {
      rootCauseSummary: structuredData.rootCauseSummary || "Unknown LLM Output",
      confidenceScore: structuredData.confidenceScore || 50,
      suggestedPatch: structuredData.suggestedPatch || "// Manual intervention required",
      affectedShipments: structuredData.affectedShipments || 0,
      delayMinutes: structuredData.delayMinutes || 0,
      financialLossEstimate: (structuredData.affectedShipments || 0) * 15 // Business impact projection
    };

  } catch (error) {
    console.error(`\n[AI MODULE] 💥 FATAL CATCH BLOCK EXECUTED`);
    console.error(`=> Error Details: ${error.message || error}`);
    console.error(`=> Stack Trace: \n`, error);
    
    return {
      rootCauseSummary: `AI Inference Failed: ${error.message || "Failed to reach Gemini"}`,
      confidenceScore: 0,
      suggestedPatch: null,
      affectedShipments: 0,
      delayMinutes: 0,
      financialLossEstimate: 0
    };
  }
};

module.exports = { analyzeIncident };
