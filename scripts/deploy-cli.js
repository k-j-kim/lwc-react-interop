#!/usr/bin/env node

const SalesforceDeployer = require('./deploy');

class DeployCLI {
  constructor() {
    this.args = process.argv.slice(2);
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const options = {
      targetOrg: 'default',
      distDir: './dist',
      verbose: false,
      validateOnly: false,
      help: false,
      list: false
    };

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      
      switch (arg) {
        case '--org':
        case '-o':
          options.targetOrg = this.args[++i];
          break;
        case '--dir':
        case '-d':
          options.distDir = this.args[++i];
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--validate':
        case '--dry-run':
          options.validateOnly = true;
          break;
        case '--list':
        case '-l':
          options.list = true;
          break;
        case '--help':
        case '-h':
          options.help = true;
          break;
        default:
          if (arg.startsWith('-')) {
            console.error(`❌ Unknown option: ${arg}`);
            this.showHelp();
            process.exit(1);
          }
      }
    }

    return options;
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
🚀 Salesforce LWC Deployment CLI

Usage: node deploy-cli.js [options]

Options:
  -o, --org <org>              Target Salesforce org (default: default)
  -d, --dir <directory>        Source directory (default: ./dist)
  -v, --verbose                Verbose output
  --validate, --dry-run        Validate only (don't deploy)
  -l, --list                   List deployed components
  -h, --help                   Show this help message

Examples:
  # Deploy to default org
  node deploy-cli.js

  # Deploy to specific org
  node deploy-cli.js --org myorg

  # Validate only (dry-run)
  node deploy-cli.js --validate

  # Deploy with verbose output
  node deploy-cli.js --verbose

  # List deployed components
  node deploy-cli.js --list

Prerequisites:
  1. Install Salesforce CLI: npm install -g @salesforce/cli
  2. Authenticate org: sf org login web --alias myorg
  3. Generate LWC components: yarn generate-all
    `);
  }

  /**
   * Run the CLI
   */
  async run() {
    const options = this.parseArgs();

    if (options.help) {
      this.showHelp();
      return;
    }

    const deployer = new SalesforceDeployer(options);

    if (options.list) {
      // Just list components
      const result = deployer.listDeployedComponents();
      process.exit(result.success ? 0 : 1);
    } else {
      // Run full deployment
      const result = await deployer.run();
      process.exit(result.success ? 0 : 1);
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new DeployCLI();
  cli.run().catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
}

module.exports = DeployCLI;
