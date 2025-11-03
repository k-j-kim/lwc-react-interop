#!/usr/bin/env node

const LWCWrapperGenerator = require('./lwcWrapperGenerator');
const path = require('path');

class LWCWrapperCLI {
  constructor() {
    this.args = process.argv.slice(2);
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const options = {
      componentName: 'appInterop',
      outputDir: './dist',
      help: false,
      version: false,
      generateReact: false,
      generateReactDOM: false,
      generateAll: false
    };

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      
      switch (arg) {
        case '--name':
        case '-n':
          options.componentName = this.args[++i];
          break;
        case '--output':
        case '-o':
          options.outputDir = this.args[++i];
          break;
        case '--react':
        case '-r':
          options.generateReact = true;
          break;
        case '--reactdom':
        case '-d':
          options.generateReactDOM = true;
          break;
        case '--all':
        case '-a':
          options.generateAll = true;
          break;
        case '--help':
        case '-h':
          options.help = true;
          break;
        case '--version':
        case '-v':
          options.version = true;
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
🚀 LWC React Wrapper Generator

Usage: node cli.js [options]

This generator creates LWC components for React integration.

Options:
      -n, --name <name>              LWC component name (default: appInterop)
  -o, --output <dir>             Output directory (default: ./dist)
  -r, --react                    Generate React import component
  -d, --reactdom                 Generate ReactDOM import component
  -a, --all                      Generate all components (wrapper + imports)
  -h, --help                     Show this help message
  -v, --version                  Show version information

Examples:
  # Generate wrapper with default name
  node cli.js

  # Generate wrapper with custom name
  node cli.js --name MyAppWrapper

  # Generate React import component
  node cli.js --react

  # Generate ReactDOM import component
  node cli.js --reactdom

  # Generate all components (wrapper + React + ReactDOM)
  node cli.js --all

  # Generate with custom output directory
  node cli.js -n MyAppWrapper -o ./my-lwc-components

Note: This generator always wraps the React App component from App.js
    `);
  }

  /**
   * Show version information
   */
  showVersion() {
    const packageJson = require('../package.json');
    console.log(`LWC React Wrapper Generator v${packageJson.version}`);
  }


  /**
   * Run the CLI
   */
  run() {
    const options = this.parseArgs();

    if (options.help) {
      this.showHelp();
      return;
    }

    if (options.version) {
      this.showVersion();
      return;
    }

    try {
      const generator = new LWCWrapperGenerator(options);
      let result;

      if (options.generateReact) {
        result = generator.generateReactImport();
      } else if (options.generateReactDOM) {
        result = generator.generateReactDOMImport();
      } else if (options.generateAll) {
        // Generate wrapper first
        const wrapperResult = generator.generate();
        if (!wrapperResult.success) {
          console.error(`❌ Wrapper generation failed: ${wrapperResult.error}`);
          process.exit(1);
        }
        
        // Generate React imports
        const importResults = generator.generateReactImports();
        console.log(`\n📊 Import Generation Summary:`);
        importResults.forEach(importResult => {
          if (importResult.success) {
            console.log(`✅ ${importResult.componentName} import component`);
          } else {
            console.log(`❌ ${importResult.componentName}: ${importResult.error}`);
          }
        });
        
        console.log(`\n🎉 All components generated successfully!`);
        return;
      } else {
        result = generator.generate();
      }

      if (!result.success) {
        console.error(`❌ Generation failed: ${result.error}`);
        process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Unexpected error: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new LWCWrapperCLI();
  cli.run();
}

module.exports = LWCWrapperCLI;
