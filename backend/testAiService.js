require('dotenv').config();
const { analyzeIncident } = require('./src/services/aiService');

(async () => {
    const rawLog = "CI PIPELINE CHECK FAILED:\nCheck Name: simulate-failure\nConclusion: failure\nOutput Title: None\nOutput Summary: None\nHTML URL: https://github.com/...";
    const res = await analyzeIncident('test-service', rawLog);
    console.log(res);
})();
