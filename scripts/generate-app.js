#!/usr/bin/env node

/**
 * Generate and optionally deploy a React app with a custom name
 * Usage: node scripts/generate-app.js <componentName> [--deploy] [--org <orgAlias>]
 */

const { execSync } = require('child_process');
const path = require('path');

function executeCommand(command, description) {
  console.log(`\n${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: node scripts/generate-app.js <componentName> [options]

Arguments:
  <componentName>    Name for the LWC component (e.g., landingPage, dashboard, myApp)
                     Note: Must be a valid LWC component name (camelCase, no special chars)

Options:
  --deploy           Deploy to Salesforce after generation
  --org <alias>      Salesforce org alias (default: myorg)
  --open             Open the app in Salesforce after deployment
  --help, -h         Show this help message

Examples:
  # Generate a landing page component
  node scripts/generate-app.js landingPage

  # Generate and deploy a dashboard
  node scripts/generate-app.js dashboard --deploy

  # Generate, deploy, and open in browser
  node scripts/generate-app.js myApp --deploy --open

  # Use a different org
  node scripts/generate-app.js landingPage --deploy --org prod
`);
    process.exit(0);
  }

  const componentName = args[0];
  const shouldDeploy = args.includes('--deploy');
  const shouldOpen = args.includes('--open');
  const orgIndex = args.indexOf('--org');
  const orgAlias = orgIndex !== -1 && args[orgIndex + 1] ? args[orgIndex + 1] : 'default';

  // Validate component name
  if (!/^[a-z][a-zA-Z0-9]*$/.test(componentName)) {
    console.error('❌ Invalid component name. Must be camelCase starting with lowercase letter.');
    process.exit(1);
  }

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Generating React App: ${componentName.padEnd(37)} ║
╚════════════════════════════════════════════════════════════╝
`);

  // Step 1: Generate React wrapper component
  console.log(`📦 Component Name: ${componentName}`);
  console.log(`🎯 Salesforce Org: ${orgAlias}`);
  console.log(`🚀 Deploy: ${shouldDeploy ? 'Yes' : 'No'}`);
  console.log(`🌐 Open in browser: ${shouldOpen ? 'Yes' : 'No'}`);

  if (!executeCommand(
    `node scripts/generate-single.js --componentName ${componentName}`,
    '🔨 Generating LWC wrapper component'
  )) {
    process.exit(1);
  }

  // Step 2: Generate React and ReactDOM if not already generated
  console.log('\n📚 Ensuring React and ReactDOM components are available...');
  executeCommand('node scripts/cli.js --react', '📦 Generating React component');
  executeCommand('node scripts/cli.js --reactdom', '📦 Generating ReactDOM component');

  // Step 3: Deploy if requested
  if (shouldDeploy) {
    if (!executeCommand(
      `node scripts/deploy-cli.js --org ${orgAlias}`,
      '🚀 Deploying to Salesforce'
    )) {
      process.exit(1);
    }
  }

  // Step 4: Open in browser if requested
  if (shouldOpen && shouldDeploy) {
    console.log('\n🌐 Opening in browser...');
    const appPath = `/lightning/app/c__${componentName}`;
    executeCommand(
      `sf org open --target-org ${orgAlias} --path "${appPath}"`,
      '🌐 Opening Salesforce org'
    );
  }

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  ✅ Generation Complete!                                    ║
╚════════════════════════════════════════════════════════════╝

📁 Component Location: dist/lwc/${componentName}/

${shouldDeploy ? `✅ Deployed to org: ${orgAlias}` : '⏭️  To deploy, run: yarn deploy --org ' + orgAlias}`);
}

main();


