const LWCWrapperGenerator = require('./lwcWrapperGenerator');

// Parse command line arguments
const args = process.argv.slice(2);
const componentNameIndex = args.indexOf('--componentName');
const componentName = componentNameIndex !== -1 && args[componentNameIndex + 1] 
  ? args[componentNameIndex + 1] 
  : 'appWrapper';

// Generate a single LWC wrapper for App.js
async function generateWrapper() {
  const generator = new LWCWrapperGenerator({
    componentName: componentName,
    outputDir: './dist'
  });

  try {
    const result = await generator.generate();

    if (result.success) {
      console.log(`✅ LWC wrapper "${componentName}" for App.js generated successfully!`);
      console.log(`📁 Output: ${result.outputDir}`);
    } else {
      console.error('❌ Generation failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  }
}

generateWrapper();
