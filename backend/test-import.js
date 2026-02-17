console.log('Testing aiService import...\n');

try {
  const aiService = require('./services/aiService');
  
  console.log('✅ aiService imported successfully');
  console.log('Type:', typeof aiService);
  console.log('Has analyzeTask:', typeof aiService.analyzeTask);
  console.log('Has shouldRetry:', typeof aiService.shouldRetry);
  console.log('Has getModelInfo:', typeof aiService.getModelInfo);
  
  if (typeof aiService.analyzeTask === 'function') {
    console.log('\n✅ ALL GOOD! aiService.analyzeTask is a function!\n');
  } else {
    console.log('\n❌ ERROR: aiService.analyzeTask is NOT a function!\n');
  }
} catch (error) {
  console.error('❌ Error importing aiService:', error.message);
  console.error('\nFull error:', error);
}