/**
 * Internal MCP Client - Communicates with internal MCP servers via stdio
 *
 * M4: Minimal implementation for chrome/puppeteer integration
 */

import { spawn, ChildProcess } from 'child_process';
import { InternalMcpDefinition } from '../router/types';
import { getMcpByName } from './registry';
import { safeJSONParse } from '../../utils/safe-json';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface McpClientOptions {
  timeout?: number; // ms
}

/**
 * MCP Client for stdio transport
 */
export class McpClient {
  private definition: InternalMcpDefinition;
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests: Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (reason: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private buffer = '';
  private options: McpClientOptions;

  constructor(definition: InternalMcpDefinition, options: McpClientOptions = {}) {
    this.definition = definition;
    this.options = {
      timeout: options.timeout || 30000, // 30s default
    };
  }

  /**
   * Get client for named MCP
   */
  static forMcp(name: string, options?: McpClientOptions): McpClient | null {
    const definition = getMcpByName(name);
    if (!definition) {
      return null;
    }
    return new McpClient(definition, options);
  }

  /**
   * Check if MCP is available (enabled)
   */
  isAvailable(): boolean {
    return this.definition.enabled;
  }

  /**
   * Start the MCP server process
   */
  async start(): Promise<void> {
    if (this.process) {
      return; // Already started
    }

    if (!this.definition.enabled) {
      throw new Error(`MCP ${this.definition.name} is not enabled`);
    }

    if (!this.definition.command) {
      throw new Error(`MCP ${this.definition.name} has no command configured`);
    }

    return new Promise((resolve, reject) => {
      try {
        const proc = spawn(
          this.definition.command!,
          this.definition.args || [],
          {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env },
          }
        );

        this.process = proc;

        proc.stdout?.on('data', (data: Buffer) => {
          this.handleData(data.toString());
        });

        proc.stderr?.on('data', (data: Buffer) => {
          console.error(`[${this.definition.name}] stderr:`, data.toString());
        });

        proc.on('error', (err) => {
          this.cleanup();
          reject(new Error(`Failed to start MCP ${this.definition.name}: ${err.message}`));
        });

        proc.on('close', (code) => {
          this.cleanup();
          if (code !== 0) {
            console.error(`[${this.definition.name}] exited with code ${code}`);
          }
        });

        // Wait briefly for process to start
        setTimeout(resolve, 500);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Stop the MCP server process
   */
  stop(): void {
    this.cleanup();
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args?: Record<string, unknown>): Promise<unknown> {
    if (!this.process) {
      throw new Error(`MCP ${this.definition.name} not started. Call start() first.`);
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name,
        arguments: args || {},
      },
    };

    return this.sendRequest(request);
  }

  /**
   * List available tools
   */
  async listTools(): Promise<unknown> {
    if (!this.process) {
      throw new Error(`MCP ${this.definition.name} not started. Call start() first.`);
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method: 'tools/list',
    };

    return this.sendRequest(request);
  }

  /**
   * Send JSON-RPC request and wait for response
   */
  private sendRequest(request: JsonRpcRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request ${request.id} timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);

      this.pendingRequests.set(request.id, { resolve, reject, timeout });

      const message = JSON.stringify(request) + '\n';
      this.process?.stdin?.write(message);
    });
  }

  /**
   * Handle incoming data from the MCP server
   */
  private handleData(data: string): void {
    this.buffer += data;

    // Process complete lines
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line) {
        // Security: Use safe JSON parser to prevent prototype pollution
        const response = safeJSONParse<JsonRpcResponse>(line);
        if (response && response.jsonrpc === '2.0' && typeof response.id === 'number') {
          this.handleResponse(response);
        } else if (line.startsWith('{')) {
          // Likely JSON but failed validation
          console.debug(`[${this.definition.name}] Invalid JSON-RPC response:`, line.substring(0, 100));
        } else {
          // Not JSON, might be a notification or log
          console.debug(`[${this.definition.name}] Non-JSON output:`, line);
        }
      }
    }
  }

  /**
   * Handle JSON-RPC response
   */
  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn(`Received response for unknown request ${response.id}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response.result);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Clear pending requests
    for (const [, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error('MCP client shutdown'));
    }
    this.pendingRequests.clear();

    // Kill process
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

/**
 * Singleton clients for each MCP
 */
const clients: Map<string, McpClient> = new Map();

/**
 * Get or create client for named MCP
 */
export function getClient(name: string): McpClient | null {
  if (clients.has(name)) {
    return clients.get(name)!;
  }

  const client = McpClient.forMcp(name);
  if (client) {
    clients.set(name, client);
  }
  return client;
}

/**
 * Stop all clients
 */
export function stopAllClients(): void {
  for (const client of clients.values()) {
    client.stop();
  }
  clients.clear();
}
