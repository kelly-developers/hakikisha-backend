const Queue = require('bull');
const { processClaimWithAI } = require('../services/aiService');
const Claim = require('../models/Claim');
const AIVerdict = require('../models/AIVerdict');
const logger = require('../utils/logger');

// Create queue with Redis connection
const claimQueue = new Queue('claim processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    timeout: 300000 // 5 minutes
  }
});

// Process AI claim analysis
claimQueue.process('ai-processing', async (job) => {
  try {
    const { claimId, claimText } = job.data;
    
    logger.info(`Processing claim ${claimId} with AI`);
    
    // Get claim details
    const claim = await Claim.findById(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }
    
    // Process with AI
    const aiResult = await processClaimWithAI(claimText);
    
    // Save AI verdict
    const aiVerdict = await AIVerdict.create({
      claim_id: claimId,
      verdict: aiResult.verdict,
      confidence_score: aiResult.confidence,
      explanation: aiResult.explanation,
      evidence_sources: aiResult.sources,
      ai_model_version: process.env.AI_MODEL_VERSION
    });
    
    // Update claim with AI verdict
    await Claim.update(claimId, {
      ai_verdict_id: aiVerdict.id,
      status: 'ai_approved'
    });
    
    logger.info(`AI processing completed for claim ${claimId}`);
    
    return { 
      claimId, 
      verdict: aiResult.verdict, 
      confidence: aiResult.confidence 
    };
    
  } catch (error) {
    logger.error(`AI processing failed for job ${job.id}:`, error);
    throw error;
  }
});

// Add job to queue
const addToQueue = (type, data, options = {}) => {
  return claimQueue.add(type, data, options);
};

// Queue event handlers
claimQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed successfully`);
});

claimQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

claimQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

module.exports = {
  claimQueue,
  addToQueue
};