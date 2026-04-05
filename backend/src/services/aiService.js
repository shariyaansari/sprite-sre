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

    // The project root is the parent of the backend directory
    const PROJECT_ROOT = 'C:/Users/shari/Downloads/Sprite';

    const prompt = `
    You are an expert autonomous Site Reliability Engineer (SRE) AI Agent running on Windows.
    The project root is located at: ${PROJECT_ROOT}
    
    Analyze the following error log from the microservice or repository: "${serviceName}"
    
    Log Data:
    ---
    ${rawLog}
    ---

    Your job is to:
    1. Diagnose the root cause.
    2. Generate a REAL, EXECUTABLE Windows PowerShell (pwsh) one-liner command that will ACTUALLY FIX the file on disk.
       - The command must be a single line.
       - Use PowerShell commands like (Get-Content ... | Where-Object ... | Set-Content ...) or (Remove-Item ...) etc.
       - The command must target files relative to the project root: ${PROJECT_ROOT}
       - If the log is from a GitHub Actions workflow failure with 'exit 1', the fix is to comment out or remove the 'exit 1' line from the file.
       - If fixing a Node.js app, resolve the specific config error.
       - ONLY output a command that modifies real files. Do NOT use 'echo' as the executable command.
    
    Return your response STRICTLY as a minified JSON object with these exact keys:
    {
      "rootCauseSummary": "A 1-2 sentence explanation of why this service crashed.",
      "confidenceScore": 95,
      "suggestedPatch": "A human-readable description of the fix being applied.",
      "executableCommand": "A single-line PowerShell command that literally fixes the file on disk.",
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
    
    console.log(`[AI MODULE] 🛠️ Executable Command: ${structuredData.executableCommand}`);
    return {
      rootCauseSummary: structuredData.rootCauseSummary || "Unknown LLM Output",
      confidenceScore: structuredData.confidenceScore || 50,
      suggestedPatch: structuredData.suggestedPatch || "// Manual intervention required",
      executableCommand: structuredData.executableCommand || null,
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
