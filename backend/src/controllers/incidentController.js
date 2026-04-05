const Incident = require('../models/Incident');
const { analyzeIncident } = require('../services/aiService');

// @desc    Report new incident & trigger AI diagnosis
// @route   POST /api/incidents
// @access  Public (Simulating an internal webhook endpoint)
const reportIncident = async (req, res) => {
    try {
        console.log(`\n[API ENTRY] 📥 HTTP POST /api/incidents received!`);
        const { serviceName, rawLog } = req.body;
        
        if (!serviceName || !rawLog) {
            console.log(`[API ENTRY] ❌ Bad Request: Missing fields.`);
            return res.status(400).json({ success: false, error: 'Please provide serviceName and rawLog' });
        }

        // 1. Synchronously create the base incident record
        const incident = await Incident.create({
            serviceName,
            rawLog,
            status: 'DETECTED'
        });

        // 2. Asynchronously Trigger the AI Diagnosis
        // Critical Architecture Note: We DO NOT 'await' this function here!
        // If the OpenAI API takes 10 seconds, and we await it, the upstream microservice
        // monitoring tool will experience a 504 Gateway Timeout while waiting for our API.
        // We acknowledge the payload immediately, and let the AI process in the background.
        triggerAutonomousDiagnosis(incident._id, serviceName, rawLog);

        res.status(201).json({
            success: true,
            data: incident,
            message: "Incident logged. Autonomous Agent began diagnosis."
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Background Job to process the AI Diagnosis
 */
const triggerAutonomousDiagnosis = async (incidentId, serviceName, rawLog) => {
    try {
        console.log(`[CONTROLLER] 🔄 Background worker triggered for incident ID: ${incidentId}`);
        // Step A: Mark as currently diagnosing
        await Incident.findByIdAndUpdate(incidentId, { status: 'DIAGNOSING' });

        // Step B: Ask the Intelligence Layer for root cause and fix
        const aiResult = await analyzeIncident(serviceName, rawLog);

        // Step C: Save findings and update state machine
        await Incident.findByIdAndUpdate(incidentId, {
            status: 'FIX_SUGGESTED',
            aiAnalysis: {
                rootCauseSummary: aiResult.rootCauseSummary,
                confidenceScore: aiResult.confidenceScore,
                suggestedPatch: aiResult.suggestedPatch
            },
            supplyChainImpact: {
                affectedShipments: aiResult.affectedShipments,
                delayMinutes: aiResult.delayMinutes,
                financialLossEstimate: aiResult.financialLossEstimate
            }
        });
        console.log(`[CONTROLLER] 🎉 Update complete! Incident ${incidentId} marked as FIX_SUGGESTED.`);

    } catch (error) {
        console.error(`\n[CONTROLLER] 💥 FATAL CATCH BLOCK EXECUTED IN BACKGROUND WORKER`);
        console.error(`=> Failed processing incident ${incidentId}`);
        console.error(`=> Error Details: ${error.message || error}`);
        console.error(`=> Stack Trace: \n`, error);
        
        // Fallback state
        await Incident.findByIdAndUpdate(incidentId, { status: 'FAILED' });
        console.log(`[CONTROLLER] Defaulted incident ${incidentId} to FAILED due to crash.`);
    }
}

// @desc    Get all incidents (Dashboard view)
// @route   GET /api/incidents
// @access  Public
const getIncidents = async (req, res) => {
    try {
        // We sort by most recent first
        const incidents = await Incident.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: incidents.length, data: incidents });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Clear all incidents (For Demo Purposes)
// @route   DELETE /api/incidents
// @access  Public 
const clearAllIncidents = async (req, res) => {
    try {
        await Incident.deleteMany({});
        res.status(200).json({ success: true, message: 'All incidents cleared.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Apply AI suggested patch
// @route   POST /api/incidents/:id/patch
const applyPatch = async (req, res) => {
    try {
        const { id } = req.params;
        const incident = await Incident.findById(id);
        
        if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });
        
        if (incident.status !== 'FIX_SUGGESTED') {
             return res.status(400).json({ success: false, error: 'No patch available to apply' });
        }

        console.log(`\n[PIPELINE] 🚀 Initiating autonomous patch deployment for incident ${id}`);
        // Simulate immediate deployment verification state
        await Incident.findByIdAndUpdate(id, { status: 'TESTING' });
        
        // Mock the asynchronous CD (Continuous Deployment) test pipeline
        setTimeout(async () => {
            await Incident.findByIdAndUpdate(id, { status: 'RESOLVED' });
            console.log(`[PIPELINE] ✅ Patch verified via Sandbox Integration. Incident ${id} RESOLVED.`);
        }, 4000);

        res.status(200).json({ success: true, message: 'Patch application initiated. Testing pipeline running.' });
    } catch (error) {
        console.error(`[PIPELINE] Error applying patch:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { reportIncident, getIncidents, applyPatch, clearAllIncidents, triggerAutonomousDiagnosis };
