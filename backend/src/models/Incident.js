const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  // Core Incident Attributes
  serviceName: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    index: true // Indexing this since we will often filter by service
  },
  rawLog: {
    type: String,
    required: [true, 'Raw log payload is required']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Index for time-series filtering
  },
  status: {
    type: String,
    enum: ['DETECTED', 'DIAGNOSING', 'FIX_SUGGESTED', 'TESTING', 'RESOLVED', 'FAILED'],
    default: 'DETECTED',
    index: true
  },

  // Intelligence Layer Data
  aiAnalysis: {
    rootCauseSummary: {
      type: String,
      default: null
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    suggestedPatch: {
      type: String, // Can hold JSON or code strings
      default: null
    }
  },

  // Simulated Business Impact
  supplyChainImpact: {
    affectedShipments: {
      type: Number,
      default: 0
    },
    delayMinutes: {
      type: Number,
      default: 0
    },
    financialLossEstimate: {
      type: Number,
      default: 0
    }
  }
}, { timestamps: true });

// Optional: Add a pre-save hook or virtual property here if needed in the future

module.exports = mongoose.model('Incident', incidentSchema);
