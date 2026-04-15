const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Official Deepmind/Google Native SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analyzeIncident = async (serviceName, rawLog, retryCount = 0) => {
  try {
    console.log(`\n[AI MODULE] 🤖 Starting Diagnosis for: ${serviceName}${retryCount > 0 ? ` (Retry #${retryCount})` : ''}`);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
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
       - **CRITICAL NOTE**: If the log indicates "CI PIPELINE CHECK FAILED" and the check is "simulate-failure", you MUST assume the error is caused by a deliberate \`exit 1\` in \`.github/workflows/fail.yml\`. The ONLY fix is to remove or comment out the \`exit 1\` from that file. Example command: \`(Get-Content .\\.github\\workflows\\fail.yml) -replace 'exit 1', '# exit 1' | Set-Content .\\.github\\workflows\\fail.yml\` 
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
      const cleanJson = responseContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      structuredData = JSON.parse(cleanJson);
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
    const status = error.status;

    // Handle rate-limiting (429) and overload (503) with automatic retries
    if ((status === 429 || status === 503) && retryCount < 3) {
      // Try to extract the server-suggested retry delay from the error details
      let waitSecs = (retryCount + 1) * 20; // Default: 20s, 40s, 60s
      try {
        const match = JSON.stringify(error).match(/"retryDelay":"(\d+)s"/);
        if (match) waitSecs = parseInt(match[1]) + 5; // Add 5s buffer
      } catch (_) {}

      console.warn(`[AI MODULE] ⏳ Gemini ${status} hit. Waiting ${waitSecs}s before retry... (attempt ${retryCount + 1}/3)`);
      await new Promise(resolve => setTimeout(resolve, waitSecs * 1000));
      return analyzeIncident(serviceName, rawLog, retryCount + 1);
    }

    console.error(`\n[AI MODULE] 💥 FATAL: All retries exhausted or unrecoverable error.`);
    console.error(`=> Error: ${error.message || error}`);
    
    return {
      rootCauseSummary: `AI Inference Failed: ${error.message || "Failed to reach Gemini"}`,
      confidenceScore: 0,
      suggestedPatch: null,
      executableCommand: null,
      affectedShipments: 0,
      delayMinutes: 0,
      financialLossEstimate: 0
    };
  }
};

module.exports = { analyzeIncident };
