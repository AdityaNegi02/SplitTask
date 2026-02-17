require('dotenv').config();
const aiService = require('./services/aiService');

async function testGroq() {
  console.log('🧪 Testing Groq AI (LLaMA 3)...\n');

  const testTasks = [
    {
      title: 'URGENT: Process 5000 payment refunds',
      description: 'Critical financial task',
      priority: 'medium'
    },
    {
      title: 'Clean up old temporary log files',
      description: 'Remove logs older than 30 days',
      priority: 'high'
    },
    {
      title: 'Send welcome email to 1000 new users',
      description: 'Email new signups today',
      priority: 'low'
    }
  ];

  for (const task of testTasks) {
    console.log('\n─────────────────────────────────');
    console.log('📝 Task:', task.title);
    console.log('   Your Priority:', task.priority.toUpperCase());

    const result = await aiService.analyzeTask(task);

    console.log('\n🤖 AI Analysis:');
    console.log('   Complexity:', result.complexity.toUpperCase());
    console.log('   Estimated Time:', result.estimatedTime, 'seconds');
    console.log('   AI Recommended Priority:', result.recommendedPriority.toUpperCase());
    console.log('   Reasoning:', result.reasoning);
    console.log('   Tags:', result.tags.join(', ') || 'none');

    if (result.reasoning.includes('Fallback') || result.reasoning.includes('fallback')) {
      console.log('\n   ⚠️  Using FALLBACK (check API key)');
    } else {
      console.log('\n   ✅ REAL GROQ AI RESPONSE!');
    }

    if (result.recommendedPriority !== task.priority) {
      console.log(`   🔄 Priority: ${task.priority.toUpperCase()} → ${result.recommendedPriority.toUpperCase()}`);
    }
  }

  console.log('\n─────────────────────────────────');
  console.log('✅ Groq test complete!\n');
}

testGroq();