#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SalesforceDeployer {
  constructor(options = {}) {
    this.targetOrg = options.targetOrg || 'default';
    this.distDir = options.distDir || './dist';
    this.verbose = options.verbose || false;
    this.validateOnly = options.validateOnly || false;
  }

  /**
   * Check if Salesforce CLI is installed
   */
  checkSalesforceCLI() {
    try {
      execSync('sf --version', { stdio: 'pipe' });
      console.log('✅ Salesforce CLI found');
      return true;
    } catch (error) {
      console.error('❌ Salesforce CLI not found. Please install it first:');
      console.error('   npm install -g @salesforce/cli');
      return false;
    }
  }

  /**
   * Check if target org is authenticated
   */
  checkOrgAuth() {
    try {
      const result = execSync(`sf org list --json`, { stdio: 'pipe' });
      const orgsData = JSON.parse(result.toString());
      
      // Combine all org arrays from the result
      const allOrgs = [
        ...(orgsData.result?.other || []),
        ...(orgsData.result?.nonScratchOrgs || []),
        ...(orgsData.result?.devHubs || []),
        ...(orgsData.result?.scratchOrgs || [])
      ];
      
      const targetOrg = allOrgs.find(org => org.alias === this.targetOrg || org.username === this.targetOrg);
      
      if (targetOrg) {
        console.log(`✅ Target org found: ${targetOrg.username} (${targetOrg.alias || 'no alias'})`);
        console.log(`   Status: ${targetOrg.connectedStatus}`);
        return true;
      } else {
        console.error(`❌ Target org "${this.targetOrg}" not found`);
        console.error('Available orgs:');
        allOrgs.forEach(org => {
          console.error(`  - ${org.username} (${org.alias || 'no alias'}) - ${org.connectedStatus}`);
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking org authentication:', error.message);
      return false;
    }
  }

  /**
   * Create sfdx-project.json if it doesn't exist
   */
  createProjectConfig() {
    const projectConfigPath = path.join(process.cwd(), 'sfdx-project.json');
    
    if (!fs.existsSync(projectConfigPath)) {
      const config = {
        "packageDirectories": [
          {
            "path": "dist",
            "default": true
          }
        ],
        "namespace": "",
        "sfdcLoginUrl": "https://login.salesforce.com",
        "sourceApiVersion": "58.0",
        "packageAliases": {}
      };
      
      fs.writeFileSync(projectConfigPath, JSON.stringify(config, null, 2));
      console.log('✅ Created sfdx-project.json');
    } else {
      console.log('✅ sfdx-project.json already exists');
    }
  }

  /**
   * Deploy components to Salesforce org
   */
  deploy() {
    try {
      console.log(`🚀 Deploying LWC components to org: ${this.targetOrg}`);
      
      // Build deployment command
      let command = `sf project deploy start --source-dir ${this.distDir} --target-org ${this.targetOrg}`;
      
      if (this.validateOnly) {
        command += ' --dry-run';
        console.log('🔍 Running validation only (dry-run)');
      }
      
      if (this.verbose) {
        command += ' --verbose';
      }
      
      console.log(`📦 Executing: ${command}`);
      
      // Execute deployment
      const result = execSync(command, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      if (this.validateOnly) {
        console.log('✅ Validation completed successfully');
      } else {
        console.log('✅ Deployment completed successfully');
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run full deployment process
   */
  async run() {
    console.log('🚀 Salesforce LWC Deployment Script');
    console.log('=====================================');
    
    // Check prerequisites
    if (!this.checkSalesforceCLI()) {
      process.exit(1);
    }
    
    if (!this.checkOrgAuth()) {
      console.log('\n💡 To authenticate an org, run:');
      console.log(`   sf org login web --alias ${this.targetOrg}`);
      process.exit(1);
    }
    
    // Create project config
    this.createProjectConfig();
    
    // Deploy components
    const result = this.deploy();
    
    return result;
  }
}

module.exports = SalesforceDeployer;
