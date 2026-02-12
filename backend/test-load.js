const axios = require('axios');

async function createTasks(count) {
  console.log(`Creating ${count} tasks...`);
  
  const priorities = ['high', 'medium', 'low'];
  
  for (let i = 1; i <= count; i++) {
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    
    try {
      await axios.post('http://localhost:5000/api/tasks', {
        title: `Test Task ${i}`,
        description: `Automated test task #${i}`,
        priority: priority
      });
      
      console.log(`✅ Created Task ${i} (${priority})`);
    } catch (error) {
      console.error(`❌ Error creating task ${i}`);
    }
    
    // Small delay to not overwhelm
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ Created ${count} tasks!`);
  
  // Check stats
  const stats = await axios.get('http://localhost:5000/api/stats');
  console.log('\n📊 Current Stats:');
  console.log(JSON.stringify(stats.data.stats, null, 2));
}

// Create 20 tasks
createTasks(20);