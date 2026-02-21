import fs from 'fs';
import path from 'path';

/**
 * Nexus Self-Registration Client.
 *
 * On startup, the plugin registers itself with the Nexus platform by sending
 * its manifest to the self-registration API. This ensures the plugin's metadata
 * (has_web_ui, ui_path, endpoint, capabilities) is always up-to-date in the
 * marketplace database.
 *
 * This eliminates the need for manual SQL updates when deploying a new plugin.
 */
export class NexusRegistration {
  private nexusApiUrl: string;
  private nexusApiKey: string;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor() {
    this.nexusApiUrl = process.env.NEXUS_API_URL || 'https://api.adverant.ai';
    this.nexusApiKey = process.env.NEXUS_API_KEY || '';
    this.maxRetries = parseInt(process.env.NEXUS_REGISTRATION_RETRIES || '5', 10);
    this.retryDelayMs = parseInt(process.env.NEXUS_REGISTRATION_RETRY_DELAY || '5000', 10);
  }

  /**
   * Register this plugin with the Nexus marketplace.
   * Reads nexus.manifest.json and POSTs it to the self-registration endpoint.
   * Retries with exponential backoff if the Nexus API isn't ready yet.
   */
  async register(): Promise<void> {
    const manifest = this.loadManifest();

    if (!manifest) {
      console.log(JSON.stringify({
        level: 'warn',
        msg: 'nexus_registration_skipped',
        reason: 'nexus.manifest.json not found',
      }));
      return;
    }

    // Build registration payload
    const payload = {
      name: manifest.name,
      display_name: manifest.display_name || manifest.name,
      description: manifest.description || '',
      version: manifest.version || '1.0.0',
      category: manifest.category || 'development',
      execution_mode: manifest.nexus?.executionMode || 'mcp_container',
      capabilities: manifest.nexus?.capabilities || [],
      permissions: manifest.nexus?.permissions || [],
      // UI metadata
      has_web_ui: manifest.ui?.enabled !== false,
      ui_path: manifest.ui?.path || '/',
      // API metadata
      api_base_path: manifest.api?.basePath || '/api/v1',
      api_endpoints: manifest.api?.endpoints || [],
      // WebSocket
      websocket_enabled: manifest.websocket?.enabled || false,
      websocket_path: manifest.websocket?.path || '/ws',
      // Resources
      resources: manifest.resources || {},
      // Self-reported endpoint (K8s service URL)
      endpoint: this.getSelfEndpoint(),
      // Port
      port: parseInt(process.env.PORT || '8080', 10),
      // Health check paths
      health_check_path: manifest.nexus?.entrypoint?.healthCheck || '/health',
      readiness_check_path: manifest.nexus?.entrypoint?.readinessCheck || '/ready',
      // Tags
      tags: manifest.tags || [],
      // Repository
      repository: manifest.repository || '',
      homepage: manifest.homepage || '',
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.nexusApiUrl}/api/v1/marketplace/self-register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.nexusApiKey}`,
            'X-Plugin-Self-Register': 'true',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(JSON.stringify({
            level: 'info',
            msg: 'nexus_registered',
            plugin: manifest.name,
            plugin_id: data.plugin_id,
          }));
          return;
        }

        const errorText = await response.text();
        console.warn(JSON.stringify({
          level: 'warn',
          msg: 'nexus_registration_failed',
          attempt,
          status: response.status,
          error: errorText,
        }));
      } catch (err) {
        console.warn(JSON.stringify({
          level: 'warn',
          msg: 'nexus_registration_error',
          attempt,
          error: err instanceof Error ? err.message : String(err),
        }));
      }

      if (attempt < this.maxRetries) {
        // Exponential backoff: 5s, 10s, 20s, 40s, 80s
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
        console.log(JSON.stringify({
          level: 'info',
          msg: 'nexus_registration_retry',
          next_attempt: attempt + 1,
          delay_ms: delay,
        }));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Registration failed after all retries - non-fatal, plugin still works
    console.warn(JSON.stringify({
      level: 'warn',
      msg: 'nexus_registration_gave_up',
      max_retries: this.maxRetries,
      note: 'Plugin will continue running but may not appear in marketplace. Ensure NEXUS_API_URL and NEXUS_API_KEY are correct.',
    }));
  }

  /**
   * Load and parse the nexus.manifest.json file.
   */
  private loadManifest(): Record<string, any> | null {
    const manifestPaths = [
      path.join(__dirname, '..', '..', 'nexus.manifest.json'),
      path.join(__dirname, '..', 'nexus.manifest.json'),
      path.join(process.cwd(), 'nexus.manifest.json'),
    ];

    for (const manifestPath of manifestPaths) {
      try {
        if (fs.existsSync(manifestPath)) {
          const content = fs.readFileSync(manifestPath, 'utf-8');
          return JSON.parse(content);
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Determine this plugin's K8s service endpoint.
   * In K8s, the service DNS follows the pattern:
   *   http://svc-{plugin-name}.{namespace}.svc.cluster.local:{port}
   */
  private getSelfEndpoint(): string {
    // If explicitly set (e.g., by K8s ConfigMap)
    if (process.env.PLUGIN_ENDPOINT) {
      return process.env.PLUGIN_ENDPOINT;
    }

    // Build from K8s naming conventions
    const pluginName = process.env.PLUGIN_NAME || '{{PLUGIN_NAME}}';
    const namespace = process.env.K8S_NAMESPACE || 'nexus';
    const port = process.env.PORT || '8080';

    return `http://svc-${pluginName}.${namespace}.svc.cluster.local:${port}`;
  }
}
