# LWC React Interop

Convert React applications into Lightning Web Components (LWC) for Salesforce deployment.

## Project Structure

The React app entry point is `src/App.js`. This is the main component that gets rendered when the app runs. Modify `App.js` to build your React application, and it will be automatically converted to an LWC component when you generate and deploy.

## Quick Start

### Local Development

Start the local development server to preview your React app:

```bash
yarn start
```

This starts a webpack dev server at `http://localhost:3000` with hot module replacement.

### Generate LWC Component

Generate a Lightning Web Component from your React app:

```bash
yarn generate:app <componentName>
```

**Examples:**

```bash
# Generate a component named "dashboard"
yarn generate:app dashboard

# Generate and deploy to Salesforce
yarn generate:app dashboard --deploy

# Generate, deploy, and open in browser
yarn generate:app dashboard --deploy --open

# Deploy to a specific org
yarn generate:app dashboard --deploy --org myorg
```

**Options:**
- `--deploy` - Deploy to Salesforce after generation
- `--org <alias>` - Salesforce org alias (default: default)
- `--open` - Open the app in Salesforce after deployment

**Note:** Component names must be valid LWC names (camelCase, no special characters).

