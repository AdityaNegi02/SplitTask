const Groq = require('groq-sdk');

class AIService {
  constructor() {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  GROQ_API_KEY not found. Using fallback.');
      this.client = null;
    } else {
      this.client = new Groq({ apiKey });
      console.log('✅ Groq AI (LLaMA 3) initialized successfully');
    }
  }

  async analyzeTask(task) {
    console.log('🔍 [AI Service] analyzeTask called');
    console.log('   Task:', task.title);
    console.log('   Groq client available:', !!this.client);

    if (!this.client) {
      console.log('⚠️  Using fallback analysis');
      return this.getFallbackAnalysis(task);
    }

    try {
      const prompt = `Analyze this background task and provide insights:

Task Title: "${task.title}"
Description: "${task.description || 'No description'}"
Current Priority: ${task.priority}

Respond with this EXACT JSON format:
{
  "complexity": "low/medium/high",
  "estimatedTime": <number in seconds>,
  "recommendedPriority": "low/medium/high",
  "reasoning": "<brief explanation>",
  "tags": ["tag1", "tag2"]
}

Consider:
- Urgent/critical/emergency words = high priority
- Large scale (1000+, bulk) = high complexity
- Cleanup/archive tasks = low priority
- Payment/security tasks = high priority

Return ONLY the JSON object, nothing else.`;

      console.log('🤖 [AI Service] Calling Groq API...');

      const completion = await this.client.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a task scheduler AI. Always respond with valid JSON only, no markdown, no explanation, just the JSON object.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1  // Low temperature for consistent JSON output
      });

      console.log('✅ [AI Service] Groq responded');

      const responseText = completion.choices[0].message.content;

      console.log('📝 [AI Service] Raw response:', responseText);

      // Clean response
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```\n?/g, '');
      }

      // Parse JSON
      const analysis = JSON.parse(cleanJson.trim());

      console.log('🤖 Groq AI Analysis:', analysis);

      return analysis;
    } catch (error) {
      console.error('❌ Groq AI error:', error.message);
      return this.getFallbackAnalysis(task);
    }
  }

  getFallbackAnalysis(task) {
    const title = task.title.toLowerCase();

    const isUrgent = /urgent|critical|emergency|asap|immediate/i.test(task.title);
    const hasScale = /\d{3,}|bulk|mass|all|many/i.test(task.title);

    let complexity = 'medium';
    if (isUrgent || hasScale) complexity = 'high';
    else if (/clean|archive|remove|delete/i.test(title)) complexity = 'low';

    let recommendedPriority = task.priority;
    if (isUrgent && task.priority !== 'high') recommendedPriority = 'high';
    else if (!isUrgent && /clean|archive|backup/i.test(title)) recommendedPriority = 'low';

    const estimatedTime = complexity === 'high' ? 10 : complexity === 'medium' ? 15 : 20;

    const tags = [];
    if (/email|mail|send/i.test(title)) tags.push('email');
    if (/payment|transaction|refund/i.test(title)) tags.push('payment', 'financial');
    if (/urgent|critical/i.test(title)) tags.push('urgent');
    if (/\d{3,}/i.test(title)) tags.push('bulk');

    return {
      complexity,
      estimatedTime,
      recommendedPriority,
      reasoning: `Fallback: ${isUrgent ? 'Urgent task detected' : 'Standard task'}`,
      tags
    };
  }

  async shouldRetry(task, error, attemptNumber) {
    if (!this.client) {
      return {
        shouldRetry: attemptNumber < 3,
        waitSeconds: Math.pow(2, attemptNumber),
        reasoning: 'Exponential backoff (fallback)'
      };
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a task scheduler AI. Respond with valid JSON only.'
          },
          {
            role: 'user',
            content: `Task "${task.title}" failed with error: "${error.message}". 
Attempt: ${attemptNumber}/3. Priority: ${task.priority}.

Should we retry? Respond with JSON:
{"shouldRetry": true/false, "waitSeconds": <number>, "reasoning": "<explanation>"}`
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      });

      const responseText = completion.choices[0].message.content;

      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```\n?/g, '');
      }

      const decision = JSON.parse(cleanJson.trim());

      console.log('🤖 Groq AI Retry Decision:', decision);

      return decision;
    } catch (err) {
      console.error('❌ Groq retry error:', err.message);
      return {
        shouldRetry: attemptNumber < 3,
        waitSeconds: Math.pow(2, attemptNumber),
        reasoning: 'Exponential backoff (fallback)'
      };
    }
  }

  getModelInfo() {
    return {
      provider: 'Groq',
      model: 'LLaMA 3 8B',
      status: this.client ? 'active' : 'fallback',
      capabilities: ['task-analysis', 'retry-strategy']
    };
  }
}

module.exports = new AIService();