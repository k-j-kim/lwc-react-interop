const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const zlib = require('zlib');

class LWCWrapperGenerator {
  constructor(options = {}) {
    this.componentName = options.componentName || 'appInterop';
    this.reactComponentName = 'app'; // Always use app as the root component (lowercase for LWC)
    this.outputDir = options.outputDir || './dist';
    this.templateDir = path.join(__dirname, 'templates');
    this.srcDir = path.join(__dirname, '../src');
  }

  /**
   * Compile React components using webpack
   */
  async compileReactComponents() {
    return new Promise((resolve, reject) => {
      const tempDir = path.join(__dirname, '../temp-build');
      
      // Create a temporary entry file that exports the App component
      const tempEntryPath = path.join(tempDir, 'lwc-entry.js');
      const entryContent = `
import React from 'react';
import App from '../src/App.js';

// Wrap App to support MUI in Shadow DOM
function AppWrapper({ shadowRoot }) {
  // If shadowRoot is provided and MUI is used, set up emotion cache
  if (shadowRoot && typeof window !== 'undefined') {
    try {
      // Try to import emotion cache for MUI shadow DOM support
      const createCache = require('@emotion/cache').default;
      const CacheProvider = require('@emotion/react').CacheProvider;
      
      const cache = createCache({
        key: 'css',
        prepend: true,
        container: shadowRoot,
      });
      
      return React.createElement(CacheProvider, { value: cache }, 
        React.createElement(App)
      );
    } catch (e) {
      console.log('⚠️ @emotion/cache not available, using App without emotion cache');
      return React.createElement(App);
    }
  }
  
  return React.createElement(App);
}

// Export the wrapped App component for LWC usage
console.log('📦 Entry file executing, App:', App);
window.ReactAppComponent = AppWrapper;
console.log('✅ window.ReactAppComponent set:', !!window.ReactAppComponent);
      `;
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(tempEntryPath, entryContent);

      // Create webpack config for LWC compilation
      const webpackConfig = {
        mode: 'production',
        entry: tempEntryPath,
        output: {
          path: tempDir,
          filename: 'compiled-react.js',
          library: 'ReactAppBundle',
          libraryTarget: 'var',
          globalObject: 'this'
        },
        module: {
          rules: [
            {
              test: /\.(js|jsx)$/,
              exclude: /node_modules/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env', '@babel/preset-react'],
                },
              },
            },
            {
              test: /\.module\.css$/,
              use: [
                'style-loader',
                {
                  loader: 'css-loader',
                  options: {
                    modules: {
                      localIdentName: '[name]__[local]--[hash:base64:5]',
                    },
                  },
                },
              ],
            },
            {
              test: /\.css$/,
              exclude: /\.module\.css$/,
              use: ['style-loader', 'css-loader'],
            },
            {
              test: /\.(svg|png|jpg|jpeg|gif)$/,
              type: 'asset/inline', // Inline assets as base64 for shadow DOM
            },
          ],
        },
        resolve: {
          extensions: ['.js', '.jsx'],
        },
        externals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        },
        optimization: {
          minimize: true
        }
      };

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      webpack(webpackConfig, (err, stats) => {
        if (err || stats.hasErrors()) {
          const error = err || stats.compilation.errors[0];
          console.error('❌ Webpack compilation failed:', error);
          reject(error);
          return;
        }

        try {
          // Read the compiled JavaScript
          const compiledJSPath = path.join(tempDir, 'compiled-react.js');
          const compiledJS = fs.readFileSync(compiledJSPath, 'utf8');
          
          // Clean up temp directory
          fs.rmSync(tempDir, { recursive: true, force: true });
          
          console.log('✅ React components compiled successfully with webpack');
          resolve(compiledJS);
        } catch (readError) {
          console.error('❌ Error reading compiled output:', readError);
          reject(readError);
        }
      });
    });
  }

  /**
   * Recursively find all CSS files in a directory
   */
  findCSSFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Recursively search subdirectories
        this.findCSSFiles(filePath, fileList);
      } else if (file.endsWith('.css')) {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }

  /**
   * Compile CSS styles using webpack
   */
  async compileStyles() {
    return new Promise((resolve, reject) => {
      const tempDir = path.join(__dirname, '../temp-css-build');
      
      // Dynamically find all CSS files in src directory
      const srcDir = path.join(__dirname, '../src');
      const cssFiles = this.findCSSFiles(srcDir);
      
      // Generate import statements for all CSS files
      const cssImports = cssFiles.map(cssFile => {
        const relativePath = path.relative(tempDir, cssFile).replace(/\\/g, '/');
        return `import '${relativePath}';`;
      }).join('\n');
      
      console.log(`📝 Found ${cssFiles.length} CSS file(s) to compile`);
      
      // Create a temporary entry file that imports all CSS
      const tempEntryPath = path.join(tempDir, 'css-entry.js');
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(tempEntryPath, cssImports);

      const MiniCssExtractPlugin = require('mini-css-extract-plugin');

      const webpackConfig = {
        mode: 'production',
        entry: tempEntryPath,
        output: {
          path: tempDir,
          filename: 'styles-bundle.js',
        },
        module: {
          rules: [
            {
              test: /\.module\.css$/,
              use: [
                MiniCssExtractPlugin.loader,
                {
                  loader: 'css-loader',
                  options: {
                    modules: {
                      localIdentName: '[name]__[local]--[hash:base64:5]',
                    },
                  },
                },
              ],
            },
            {
              test: /\.css$/,
              exclude: /\.module\.css$/,
              use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
              test: /\.(svg|png|jpg|jpeg|gif)$/,
              type: 'asset/inline', // Inline assets as base64 for shadow DOM
            },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({
            filename: 'extracted-styles.css',
          }),
        ]
      };

      webpack(webpackConfig, (err, stats) => {
        if (err || stats.hasErrors()) {
          const error = err || stats.compilation.errors[0];
          console.error('❌ CSS compilation failed:', error);
          reject(error);
          return;
        }

        try {
          // Read the extracted CSS
          const extractedCSSPath = path.join(tempDir, 'extracted-styles.css');
          let cssContent = '';
          
          if (fs.existsSync(extractedCSSPath)) {
            cssContent = fs.readFileSync(extractedCSSPath, 'utf8');
          } else {
            // Fallback: read all CSS files directly from src directory
            const srcDir = path.join(__dirname, '../src');
            const cssFiles = this.findCSSFiles(srcDir);
            
            console.log(`📄 Using fallback: reading ${cssFiles.length} CSS file(s) directly`);
            
            cssFiles.forEach(cssFile => {
              if (fs.existsSync(cssFile)) {
                cssContent += fs.readFileSync(cssFile, 'utf8') + '\n';
              }
            });
          }
          
          // Clean up temp directory
          fs.rmSync(tempDir, { recursive: true, force: true });
          
          console.log('✅ CSS styles compiled successfully');
          resolve(cssContent);
        } catch (readError) {
          console.error('❌ Error reading compiled CSS:', readError);
          reject(readError);
        }
      });
    });
  }

  /**
   * Generate the LWC wrapper component
   */
  async generate() {
    try {
      this.createOutputDirectory();
      await this.generateJavaScriptFile();
      this.generateHTMLFile();
      this.generateMetaFile();
      this.generateCSSFile();
      
      console.log(`✅ LWC wrapper "${this.componentName}" generated successfully!`);
      console.log(`📁 Output directory: ${this.outputDir}`);
      console.log(`🔧 Component name: ${this.componentName}`);
      console.log(`⚛️  React component: App (compiled with webpack)`);
      
      return {
        success: true,
        outputDir: this.outputDir,
        componentName: this.componentName
      };
    } catch (error) {
      console.error('❌ Error generating LWC wrapper:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create the output directory structure
   */
  createOutputDirectory() {
    const lwcDir = path.join(this.outputDir, 'lwc');
    const componentDir = path.join(lwcDir, this.componentName);
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    if (!fs.existsSync(lwcDir)) {
      fs.mkdirSync(lwcDir, { recursive: true });
    }
    
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }
  }

  /**
   * Generate the JavaScript file for the LWC wrapper
   */
  async generateJavaScriptFile() {
    const template = this.getTemplate('lwcWrapper.js');
    const compiledReact = await this.compileReactComponents();
    const compiledStyles = await this.compileStyles();
    
    // Encode the compiled React code in base64
    const encodedReact = Buffer.from(compiledReact).toString('base64');
    
    // Split into chunks of ~800KB to stay well under 1MB limit per file
    const chunkSize = 800000;
    const chunks = [];
    for (let i = 0; i < encodedReact.length; i += chunkSize) {
      chunks.push(encodedReact.slice(i, i + chunkSize));
    }
    
    console.log(`📦 Splitting React bundle into ${chunks.length} chunk(s)`);
    
    // Generate chunk files
    const componentDir = path.join(this.outputDir, 'lwc', this.componentName);
    chunks.forEach((chunk, index) => {
      const chunkFileName = `${this.componentName}Chunk${index}.js`;
      const chunkContent = `// React Bundle Chunk ${index + 1}/${chunks.length}
export const chunk${index} = '${chunk}';
`;
      fs.writeFileSync(path.join(componentDir, chunkFileName), chunkContent);
    });
    
    // Create import statements for all chunks
    const chunkImports = chunks.map((_, index) => 
      `import { chunk${index} } from './${this.componentName}Chunk${index}';`
    ).join('\n');
    
    // Create code to concatenate all chunks
    const concatenateChunks = chunks.map((_, index) => `chunk${index}`).join(' + ');
    
    // Create a function that decodes and executes the concatenated chunks
    const compiledReactFunc = `
      // Concatenate all base64 chunks
      const encodedCode = ${concatenateChunks};
      
      // Decode base64 encoded React bundle
      const decodedCode = atob(encodedCode);
      
      // Execute the decoded code
      const scriptFunc = new Function('React', 'ReactDOM', decodedCode);
      scriptFunc(this._reactInstance, this._reactDOMInstance);
    `;
    
    const content = chunkImports + '\n' + template
      .replace(/{{COMPONENT_NAME}}/g, this.componentName)
      .replace(/{{REACT_COMPONENT_NAME}}/g, this.reactComponentName)
      .replace(/{{COMPILED_REACT_FUNC}}/g, compiledReactFunc)
      .replace(/{{COMPILED_STYLES}}/g, compiledStyles);
    
    const filePath = path.join(this.outputDir, 'lwc', this.componentName, `${this.componentName}.js`);
    fs.writeFileSync(filePath, content);
    
    console.log(`✅ Generated main file and ${chunks.length} chunk file(s)`);
  }

  /**
   * Generate the HTML template file
   */
  generateHTMLFile() {
    const template = this.getTemplate('lwcWrapper.html');
    const content = template.replace(/{{COMPONENT_NAME}}/g, this.componentName);
    
    const filePath = path.join(this.outputDir, 'lwc', this.componentName, `${this.componentName}.html`);
    fs.writeFileSync(filePath, content);
  }

  /**
   * Generate the meta.xml file
   */
  generateMetaFile() {
    const template = this.getTemplate('lwcWrapper-meta.xml');
    const content = template.replace(/{{COMPONENT_NAME}}/g, this.componentName);
    
    const filePath = path.join(this.outputDir, 'lwc', this.componentName, `${this.componentName}.js-meta.xml`);
    fs.writeFileSync(filePath, content);
  }

  /**
   * Generate the CSS file
   */
  generateCSSFile() {
    const template = this.getTemplate('lwcWrapper.css');
    const content = template.replace(/{{COMPONENT_NAME}}/g, this.componentName);
    
    const filePath = path.join(this.outputDir, 'lwc', this.componentName, `${this.componentName}.css`);
    fs.writeFileSync(filePath, content);
  }

  /**
   * Get template content from file
   */
  getTemplate(templateName) {
    const templatePath = path.join(this.templateDir, templateName);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }
    
    return fs.readFileSync(templatePath, 'utf8');
  }

  /**
   * Generate React LWC component
   */
  generateReactImport() {
    try {
      this.createOutputDirectory();
      this.generateReactLWCComponent();
      
      console.log(`✅ React LWC component generated successfully!`);
      console.log(`📁 Output directory: ${this.outputDir}`);
      console.log(`🔧 Component name: react`);
      
      return {
        success: true,
        outputDir: this.outputDir,
        componentName: 'react'
      };
    } catch (error) {
      console.error('❌ Error generating React LWC component:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate ReactDOM LWC component
   */
  generateReactDOMImport() {
    try {
      this.createOutputDirectory();
      this.generateReactDOMLWCComponent();
      
      console.log(`✅ ReactDOM LWC component generated successfully!`);
      console.log(`📁 Output directory: ${this.outputDir}`);
      console.log(`🔧 Component name: reactdom`);
      
      return {
        success: true,
        outputDir: this.outputDir,
        componentName: 'reactdom'
      };
    } catch (error) {
      console.error('❌ Error generating ReactDOM LWC component:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate all React imports (React + ReactDOM)
   */
  generateReactImports() {
    const results = [];
    
    // Generate React import
    const reactResult = this.generateReactImport();
    results.push(reactResult);
    
    // Generate ReactDOM import
    const domResult = this.generateReactDOMImport();
    results.push(domResult);
    
    return results;
  }

  /**
   * Generate React LWC component
   */
  generateReactLWCComponent() {
    const componentName = 'react';
    const lwcDir = path.join(this.outputDir, 'lwc');
    const componentDir = path.join(lwcDir, componentName);
    
    if (!fs.existsSync(lwcDir)) {
      fs.mkdirSync(lwcDir, { recursive: true });
    }
    
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }

    // Generate JavaScript file with embedded React library
    this.generateReactJSFile(componentDir);
    
    // Generate HTML file
    this.generateReactHTMLFile(componentDir);
    
    // Generate CSS file
    this.generateReactCSSFile(componentDir);
    
    // Generate meta file
    this.generateReactMetaFile(componentDir);
  }

  /**
   * Generate ReactDOM LWC component
   */
  generateReactDOMLWCComponent() {
    const componentName = 'reactdom';
    const lwcDir = path.join(this.outputDir, 'lwc');
    const componentDir = path.join(lwcDir, componentName);
    
    if (!fs.existsSync(lwcDir)) {
      fs.mkdirSync(lwcDir, { recursive: true });
    }
    
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }

    // Generate JavaScript file with embedded ReactDOM library
    this.generateReactDOMJSFile(componentDir);
    
    // Generate HTML file
    this.generateReactDOMHTMLFile(componentDir);
    
    // Generate CSS file
    this.generateReactDOMCSSFile(componentDir);
    
    // Generate meta file
    this.generateReactDOMMetaFile(componentDir);
  }

  /**
   * Generate React JavaScript file with embedded library
   */
  generateReactJSFile(componentDir) {
    try {
      const nodeModulesPath = path.join(__dirname, '../node_modules');
      const reactProdPath = path.join(nodeModulesPath, 'react/umd/react.production.min.js');
      
      let reactLibrary = '';
      if (fs.existsSync(reactProdPath)) {
        reactLibrary = fs.readFileSync(reactProdPath, 'utf8');
        console.log('📦 Embedded React production library');
      } else {
        console.warn('⚠️  React production library not found in node_modules');
        reactLibrary = '// React library not found';
      }
      
      const jsContent = `// Execute the React library code
${reactLibrary}

// Export React instance
export default window.React;`;
      
      const jsPath = path.join(componentDir, 'react.js');
      fs.writeFileSync(jsPath, jsContent);
      
    } catch (error) {
      console.error('❌ Error generating React JS file:', error.message);
    }
  }

  /**
   * Generate ReactDOM JavaScript file with embedded library
   */
  generateReactDOMJSFile(componentDir) {
    try {
      const nodeModulesPath = path.join(__dirname, '../node_modules');
      const reactDOMProdPath = path.join(nodeModulesPath, 'react-dom/umd/react-dom.production.min.js');
      
      let reactDOMLibrary = '';
      if (fs.existsSync(reactDOMProdPath)) {
        reactDOMLibrary = fs.readFileSync(reactDOMProdPath, 'utf8');
        console.log('📦 Embedded ReactDOM production library');
      } else {
        console.warn('⚠️  ReactDOM production library not found in node_modules');
        reactDOMLibrary = '// ReactDOM library not found';
      }
      
      const jsContent = `// Execute the ReactDOM library code
${reactDOMLibrary}

// Export ReactDOM instance
export default window.ReactDOM;`;
      
      const jsPath = path.join(componentDir, 'reactdom.js');
      fs.writeFileSync(jsPath, jsContent);
      
    } catch (error) {
      console.error('❌ Error generating ReactDOM JS file:', error.message);
    }
  }

  /**
   * Generate React HTML file
   */
  generateReactHTMLFile(componentDir) {
    const htmlContent = `<template>
    <!-- React ES module - no template needed -->
</template>`;
    
    const htmlPath = path.join(componentDir, 'react.html');
    fs.writeFileSync(htmlPath, htmlContent);
  }

  /**
   * Generate React CSS file
   */
  generateReactCSSFile(componentDir) {
    const cssContent = `.react-component {
    display: none;
}`;
    
    const cssPath = path.join(componentDir, 'react.css');
    fs.writeFileSync(cssPath, cssContent);
  }

  /**
   * Generate React meta file
   */
  generateReactMetaFile(componentDir) {
    const metaContent = `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <isExposed>false</isExposed>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
        <target>lightning__HomePage</target>
    </targets>
</LightningComponentBundle>`;
    
    const metaPath = path.join(componentDir, 'react.js-meta.xml');
    fs.writeFileSync(metaPath, metaContent);
  }

  /**
   * Generate ReactDOM HTML file
   */
  generateReactDOMHTMLFile(componentDir) {
    const htmlContent = `<template>
    <!-- ReactDOM ES module - no template needed -->
</template>`;
    
    const htmlPath = path.join(componentDir, 'reactdom.html');
    fs.writeFileSync(htmlPath, htmlContent);
  }

  /**
   * Generate ReactDOM CSS file
   */
  generateReactDOMCSSFile(componentDir) {
    const cssContent = `.reactdom-component {
    display: none;
}`;
    
    const cssPath = path.join(componentDir, 'reactdom.css');
    fs.writeFileSync(cssPath, cssContent);
  }

  /**
   * Generate ReactDOM meta file
   */
  generateReactDOMMetaFile(componentDir) {
    const metaContent = `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <isExposed>false</isExposed>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
        <target>lightning__HomePage</target>
    </targets>
</LightningComponentBundle>`;
    
    const metaPath = path.join(componentDir, 'reactdom.js-meta.xml');
    fs.writeFileSync(metaPath, metaContent);
  }

  /**
   * Generate React metadata file
   */
  generateReactMetadata(staticDir) {
    const metadataContent = `<?xml version="1.0" encoding="UTF-8"?>
<StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">
    <cacheControl>Public</cacheControl>
    <contentType>application/javascript</contentType>
    <description>React production library as ES module</description>
</StaticResource>`;
    
    const metadataPath = path.join(staticDir, 'react.resource-meta.xml');
    fs.writeFileSync(metadataPath, metadataContent);
    console.log('📄 Generated React metadata file');
  }

  /**
   * Generate ReactDOM metadata file
   */
  generateReactDOMMetadata(staticDir) {
    const metadataContent = `<?xml version="1.0" encoding="UTF-8"?>
<StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">
    <cacheControl>Public</cacheControl>
    <contentType>application/javascript</contentType>
    <description>ReactDOM production library as ES module</description>
</StaticResource>`;
    
    const metadataPath = path.join(staticDir, 'react-dom.resource-meta.xml');
    fs.writeFileSync(metadataPath, metadataContent);
    console.log('📄 Generated ReactDOM metadata file');
  }

  /**
   * Generate wrapper for multiple React components
   */
  async generateMultiple(components) {
    const results = [];
    
    for (const component of components) {
      const generator = new LWCWrapperGenerator({
        componentName: component.lwcName,
        reactComponentName: component.reactName,
        outputDir: this.outputDir
      });
      
      const result = await generator.generate();
      results.push({
        ...result,
        componentName: component.lwcName,
        reactComponentName: component.reactName
      });
    }
    
    return results;
  }
}

module.exports = LWCWrapperGenerator;
