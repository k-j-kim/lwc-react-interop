import { LightningElement } from 'lwc';
import React from 'c/react';
import ReactDOM from 'c/reactdom';

export default class {{COMPONENT_NAME}} extends LightningElement {
    _hasRendered = false;
    _reactInstance = null;
    _reactDOMInstance = null;
    _reactRoot = null;

    async renderedCallback() {
        // Only render once to avoid multiple renders
        if (!this._hasRendered) {
            try {
                console.log('🔧 LWC renderedCallback started');
                
                // Get React and ReactDOM instances from ES modules
                this._reactInstance = React;
                this._reactDOMInstance = ReactDOM;
                
                console.log('📦 React loaded:', !!this._reactInstance);
                console.log('📦 ReactDOM loaded:', !!this._reactDOMInstance);
                
                if (this._reactInstance && this._reactDOMInstance) {
                    console.log('🔓 Decoding and executing React bundle...');
                    
                    // Define process.env globally for the React bundle
                    if (!window.process) {
                        window.process = {
                            env: {
                                NODE_ENV: 'production',
                                REACT_APP_SF_ACCESS_TOKEN: undefined,
                                REACT_APP_SF_INSTANCE_URL: undefined,
                                REACT_APP_SF_USERNAME: '',
                                REACT_APP_SF_ORG_ALIAS: '',
                                REACT_APP_USE_MOCK_DATA: 'true'
                            }
                        };
                    }
                    
                    console.log('✅ process.env defined:', !!window.process);
                    
                    // Execute the compiled React component code
                    {{COMPILED_REACT_FUNC}}
                    
                    console.log('✅ Bundle executed');
                    console.log('🔍 Looking for ReactAppComponent on window...');
                    
                    // Get the React component from the global window object
                    const ReactAppComponent = window.ReactAppComponent;
                    
                    console.log('📦 ReactAppComponent found:', !!ReactAppComponent);
                    console.log('📦 ReactAppComponent type:', typeof ReactAppComponent);
                    
                    if (!ReactAppComponent) {
                        throw new Error('ReactAppComponent not found. Check webpack compilation.');
                    }
                    
                    console.log('🎯 Finding container element...');
                    
                    // Create React root and render
                    const container = this.template.querySelector('[data-id="app"]');
                    
                    if (!container) {
                        throw new Error('Container element with data-id="app" not found');
                    }
                    
                    console.log('✅ Container found, attaching shadow DOM...');
                    
                    const shadow = container.attachShadow({ mode: "open" });
                    
                    // Inject styles into shadow DOM instead of document head
                    console.log('🎨 Injecting styles...');
                    const styleElement = document.createElement('style');
                    styleElement.textContent = `{{COMPILED_STYLES}}`;
                    shadow.appendChild(styleElement);
                    
                    console.log('📦 Creating shadow container...');
                    const shadowContainer = document.createElement("div");
                    shadow.appendChild(shadowContainer);
                    
                    console.log('⚛️  Creating React element with shadow root support...');
                    
                    // Create React element and pass shadow root for MUI support
                    const app = this._reactInstance.createElement(ReactAppComponent, { shadowRoot: shadow });
                    
                    console.log('🎨 Creating React root and rendering...');
                    this._reactRoot = this._reactDOMInstance.createRoot(shadowContainer);
                    this._reactRoot.render(app);
                    
                    this._hasRendered = true;
                    console.log('✅ React app rendered successfully');
                } else {
                    console.error('❌ React or ReactDOM not available');
                    console.error('React:', this._reactInstance);
                    console.error('ReactDOM:', this._reactDOMInstance);
                }
            } catch (error) {
                console.error('❌ Error rendering React app:', error);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
        } else {
            console.log('⏭️  Already rendered, skipping');
        }
    }

    disconnectedCallback() {
        // Clean up React root when component is destroyed
        if (this._hasRendered && this._reactRoot) {
            try {
                this._reactRoot.unmount();
                console.log('✅ React app unmounted successfully');
            } catch (error) {
                console.error('❌ Error unmounting React app:', error);
            }
        }
    }
}
