const Incident = require('../models/Incident');
const { triggerAutonomousDiagnosis } = require('./incidentController');

// @desc    Ingest GitHub Webhooks
// @route   POST /api/webhooks/github
// @access  Public 
const processGithubWebhook = async (req, res) => {
    try {
        console.log(`\n[WEBHOOK] 🌐 Received payload from GitHub!`);
        
        // GitHub sends an 'x-github-event' header so we know what kind of payload this is
        const eventType = req.headers['x-github-event'];
        const payload = req.body;

        console.log(`[WEBHOOK] Event Type: ${eventType}`);

        let serviceName = 'Unknown Repository';
        let rawLog = '';
        let shouldTriggerAI = false;

        if (!payload || !payload.repository) {
            console.log(`[WEBHOOK] ⚠️ Ignored: Payload missing repository data.`);
            return res.status(200).send('Ignored');
        }

        serviceName = payload.repository.name;

        // Parse Workflow Runs
        if (eventType === 'workflow_run') {
            const workflow = payload.workflow_run;
            if (workflow.action === 'completed' && workflow.conclusion === 'failure') {
                shouldTriggerAI = true;
                rawLog = `CRITICAL CI/CD FAILURE:\nWorkflow: ${workflow.name}\nBranch: ${workflow.head_branch}\nStatus: ${workflow.status}\nConclusion: ${workflow.conclusion}\nTriggering Actor: ${sender?.login || 'Automated'}\nView details: ${workflow.html_url}`;
            } else {
                console.log(`[WEBHOOK] ✅ Ignored: Workflow run was successful or pending.`);
                return res.status(200).send('Status OK');
            }
        } 
        // Parse Check Runs
        else if (eventType === 'check_run') {
            const check = payload.check_run;
            if (check.status === 'completed' && check.conclusion === 'failure') {
                shouldTriggerAI = true;
                rawLog = `CI PIPELINE CHECK FAILED:\nCheck Name: ${check.name}\nConclusion: ${check.conclusion}\nOutput Title: ${check.output?.title || 'None'}\nOutput Summary: ${check.output?.summary || 'None'}\nHTML URL: ${check.html_url}`;
            } else {
                console.log(`[WEBHOOK] ✅ Ignored: Check run was successful.`);
                return res.status(200).send('Status OK');
            }
        } 
        else {
            console.log(`[WEBHOOK] ℹ️ Ignored: Unsupported GitHub event type (${eventType}).`);
            return res.status(200).send('Event not tracked');
        }

        // If it's a failure event, kick off our SRE pipelines!
        if (shouldTriggerAI) {
            console.log(`[WEBHOOK] 🚨 Failure detected in ${serviceName}. Booting autonomous AI Agent...`);
            
            const incident = await Incident.create({
                serviceName: serviceName,
                rawLog: rawLog,
                status: 'DETECTED'
            });

            // Asynchronously trigger Gemini
            triggerAutonomousDiagnosis(incident._id, serviceName, rawLog);

            return res.status(201).json({ success: true, message: "Parsed GitHub failure. Incident orchestrated." });
        }

    } catch (error) {
        console.error(`[WEBHOOK] 💥 Fatal Error processing GitHub Webhook:`, error);
        res.status(500).json({ success: false, error: 'Internal Webhook Parsing Error' });
    }
};

module.exports = { processGithubWebhook };
