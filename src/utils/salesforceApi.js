/**
 * Salesforce API Utility for React Static Apps
 *
 * This utility provides comprehensive Salesforce integration with support for:
 * - Development: Uses environment variables from sf org display
 * - Production: Falls back to sid cookie extraction
 * - UI API, GraphQL, and Einstein LLM Gateway operations
 */

const API_VERSION = "66.0"; // Project standard API version

/**
 * Get the Salesforce session ID (sid) cookie
 * This is the fallback method for production environments
 */
function getSidCookie() {
  if (typeof document === "undefined") {
    return null; // Server-side rendering
  }

  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("sid="))
      ?.split("=")[1] || null
  );
}

/**
 * Check if we're in LWC environment (running inside Salesforce)
 */
function isLWCEnvironment() {
  if (typeof window === "undefined") {
    return false;
  }
  
  // Check if we're in a Salesforce domain
  const hostname = window.location.hostname;
  return (
    hostname.includes("salesforce.com") || 
    hostname.includes("force.com") ||
    hostname.includes("cloudforce.com") ||
    hostname.includes("site.com") ||
    hostname.includes("pc-rnd.site.com")
  );
}

/**
 * Check if we're in development mode (running on localhost)
 * This is more reliable than environment variables which don't exist in deployed apps
 */
function isDevMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname.includes("code-builder.platform.salesforce.com") ||
    hostname.includes("code-builder-stg.platform.salesforce.com")
  );
}

/**
 * Get the Salesforce access token for API calls
 * Prioritizes development environment variable over cookie extraction
 */
export function getSalesforceToken() {
  // Development mode: Use environment variable if available
  if (isDevMode() && process.env.REACT_APP_SF_ACCESS_TOKEN) {
    return process.env.REACT_APP_SF_ACCESS_TOKEN;
  }

  // Production/deployed mode: Extract from cookie
  return getSidCookie();
}

/**
 * Get Salesforce instance URL for development proxy
 * Only used in development mode for CORS proxy configuration
 */
export function getSalesforceInstanceUrl() {
  // Only return instance URL in development for proxy setup
  if (isDevMode() && process.env.REACT_APP_SF_INSTANCE_URL) {
    return process.env.REACT_APP_SF_INSTANCE_URL;
  }

  // Production apps don't need instance URL (use relative paths)
  return null;
}

/**
 * Check if we're in development mode with token available
 */
export function isDevModeWithToken() {
  return isDevMode() && !!process.env.REACT_APP_SF_ACCESS_TOKEN;
}

/**
 * Get authentication headers for Salesforce API calls
 */
export function getSalesforceHeaders() {
  const token = getSalesforceToken();

  // In LWC environment, we don't need explicit auth headers
  // The session is handled by the platform
  if (isLWCEnvironment()) {
    return {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
  }

  if (!token) {
    throw new Error(
      "No Salesforce session available (sid cookie not found). Make sure you're logged into Salesforce."
    );
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}

/**
 * Enhanced fetch wrapper for Salesforce API calls
 * Uses relative URLs which work in both development (via proxy) and production (Lightning context)
 */
export async function salesforceFetch(endpoint, options = {}) {
  const token = getSalesforceToken();

  // Skip token check in LWC environment (running inside Salesforce)
  if (!token && !isLWCEnvironment()) {
    const errorMessage = isDevMode()
      ? "Development token not available. Try restarting with: npm run dev:static-app"
      : "No Salesforce session available (sid cookie not found). Make sure you're logged into Salesforce.";
    throw new Error(errorMessage);
  }

  // Always use relative URLs - works in both dev (proxy) and production (Lightning context)
  const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Merge headers
  const headers = {
    ...getSalesforceHeaders(),
    ...options.headers
  };

  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Include cookies for session management
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Salesforce API failed: ${response.status} ${text}`);
  }

  return response;
}

/**
 * Legacy API fetch utility (maintained for backward compatibility)
 * @deprecated Use salesforceFetch() instead for enhanced functionality
 */
export async function salesforceApiFetch(endpoint, options = {}) {
  const token = getSalesforceToken();

  // Skip token check in LWC environment (running inside Salesforce)
  if (!token && !isLWCEnvironment()) {
    throw new Error("No Salesforce session available (sid cookie not found)");
  }

  const url = endpoint.startsWith("/")
    ? endpoint
    : `/services/data/v${API_VERSION}/${endpoint}`;

  const headers = isLWCEnvironment() && !token
    ? {
        Accept: "application/json",
        ...options.headers
      }
    : {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...options.headers
      };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Include cookies for session management
  });

  if (!response.ok) {
    throw new Error(
      `Salesforce API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Fetch current user information from Salesforce
 * Enhanced with new authentication system
 * @returns {Promise<{id: string, name: string}|null>} User info or null if no session
 */
export async function fetchCurrentUser() {
  const token = getSalesforceToken();

  if (!token) {
    console.log("No authentication token available, aborting user data fetch");
    return null;
  }

  try {
    const userInfoResponse = await salesforceFetch(
      "/services/oauth2/userinfo",
      {
        method: "GET"
      }
    );

    const userInfo = await userInfoResponse.json();
    const userId = userInfo.user_id;

    if (!userId) {
      throw new Error("No user ID found in user info");
    }

    const response = await salesforceFetch(
      `/services/data/v${API_VERSION}/ui-api/records/${userId}?fields=User.Name,User.FirstName,User.LastName,User.SmallPhotoUrl,User.FullPhotoUrl`
    );

    const data = await response.json();

    if (!data.fields) {
      throw new Error("No user data found in UI API response");
    }

    const name =
      data.fields.Name?.value ||
      (data.fields.FirstName?.value && data.fields.LastName?.value
        ? `${data.fields.FirstName.value} ${data.fields.LastName.value}`
        : data.fields.FirstName?.value ||
          data.fields.LastName?.value ||
          "User");

    const photoUrl =
      data.fields.SmallPhotoUrl?.value ||
      data.fields.FullPhotoUrl?.value ||
      null;

    return {
      id: userId,
      name: name,
      photoUrl: photoUrl
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}

/**
 * UI API Operations
 * Convenient methods for common Salesforce UI API operations
 */
export const sfUIApi = {
  // Get record
  async getRecord(recordId) {
    const response = await salesforceFetch(
      `/services/data/v${API_VERSION}/ui-api/records/${recordId}`
    );
    return response.json();
  },

  // Create record
  async createRecord(objectApiName, fields) {
    const response = await salesforceFetch(
      `/services/data/v${API_VERSION}/ui-api/records`,
      {
        method: "POST",
        body: JSON.stringify({ apiName: objectApiName, fields })
      }
    );
    return response.json();
  },

  // Update record
  async updateRecord(recordId, fields) {
    const response = await salesforceFetch(
      `/services/data/v${API_VERSION}/ui-api/records/${recordId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ fields })
      }
    );
    return response.json();
  },

  // Delete record
  async deleteRecord(recordId) {
    await salesforceFetch(
      `/services/data/v${API_VERSION}/ui-api/records/${recordId}`,
      {
        method: "DELETE"
      }
    );
    return true;
  }
};

/**
 * GraphQL Operations
 * Convenient methods for Salesforce GraphQL queries
 */
export const sfGraphQL = {
  async query(query, variables = {}) {
    const response = await salesforceFetch(
      `/services/data/v${API_VERSION}/graphql`,
      {
        method: "POST",
        body: JSON.stringify({ query, variables })
      }
    );

    const json = await response.json();

    if (Array.isArray(json.errors) && json.errors.length) {
      throw new Error(json.errors.map((e) => e.message).join("; "));
    }

    return json.data;
  }
};

/**
 * Einstein LLM Gateway Operations
 * Convenient methods for AI/generative features
 */
export const sfEinstein = {
  async generateContent({ prompt, model = "gpt-4", signal }) {
    const response = await salesforceFetch(
      `/services/data/v${API_VERSION}/einstein/llm/prompt/generations`,
      {
        method: "POST",
        body: JSON.stringify({
          additionalConfig: {
            applicationName: "PromptTemplateGenerationsInvocable",
            model
          },
          promptTextorId: prompt
        }),
        signal
      }
    );

    const data = await response.json();
    const text = data?.generations?.[0]?.text || "";
    return text;
  }
};

/**
 * Create a Salesforce record using UI API
 * Standalone function for easy import
 */
export async function sfCreate(objectApiName, fields) {
  try {
    console.log("sfCreate called with:", { objectApiName, fields });
    const response = await salesforceFetch(
      `/services/data/v${API_VERSION}/ui-api/records`,
      {
        method: "POST",
        body: JSON.stringify({ apiName: objectApiName, fields })
      }
    );
    console.log("sfCreate response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("sfCreate error response:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("sfCreate success result:", result);
    return result;
  } catch (error) {
    console.error("sfCreate error:", error);
    throw error;
  }
}

/**
 * Development utilities
 * Helpful tools for debugging and development
 */
export const devUtils = {
  // Get current authentication info
  getAuthInfo() {
    return {
      devMode: isDevMode(),
      tokenAvailable: !!getSalesforceToken(),
      instanceUrl: getSalesforceInstanceUrl(),
      hostname:
        typeof window !== "undefined" ? window.location.hostname : "unknown",
      username: process.env.REACT_APP_SF_USERNAME || "Unknown",
      orgAlias: process.env.REACT_APP_SF_ORG_ALIAS || "Unknown"
    };
  },

  // Debug authentication setup
  debugAuth() {
    const info = this.getAuthInfo();
    console.group("🔐 Salesforce Authentication Debug");
    console.log("Development Mode:", info.devMode);
    console.log("Token Available:", info.tokenAvailable);
    console.log("Instance URL:", info.instanceUrl);
    console.log("Username:", info.username);
    console.log("Org Alias:", info.orgAlias);
    console.groupEnd();
    return info;
  }
};
