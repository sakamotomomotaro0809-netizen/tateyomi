#!/usr/bin/env node
/**
 * Proxy MCP Smoke Test
 *
 * Verifies that the Proxy MCP server:
 * 1. Starts successfully
 * 2. Responds to MCP handshake (initialize)
 * 3. Returns tools list
 * 4. Responds to system_health tool call
 *
 * Exit codes:
 * 0 = Success
 * 1 = Failure
 */

const { spawn } = require('child_process');
const path = require('path');

const TIMEOUT_MS = 10000;

// JSON-RPC request helper
function jsonRpcRequest(method, params = {}, id = 1) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params,
  }) + '\n';
}

async function runSmokeTest() {
  const serverPath = path.resolve(__dirname, '../dist/proxy-mcp/server.js');

  console.error('[smoke] Starting Proxy MCP server...');

  const proc = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  let stdout = '';
  let stderr = '';
  let responses = [];

  proc.stdout.on('data', (data) => {
    stdout += data.toString();
    // Parse JSON-RPC responses
    const lines = stdout.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        responses.push(parsed);
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  });

  proc.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  // Helper to wait for response
  const waitForResponse = (id, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const found = responses.find((r) => r.id === id);
        if (found) {
          resolve(found);
        } else if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for response id=${id}`));
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  };

  try {
    // 1. Send initialize request
    console.error('[smoke] Sending initialize request...');
    proc.stdin.write(jsonRpcRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'smoke-test',
        version: '1.0.0',
      },
    }, 1));

    const initResponse = await waitForResponse(1);
    if (initResponse.error) {
      throw new Error(`Initialize failed: ${JSON.stringify(initResponse.error)}`);
    }
    console.error('[smoke] ✓ Initialize successful');
    console.error(`[smoke]   Server: ${initResponse.result?.serverInfo?.name} v${initResponse.result?.serverInfo?.version}`);

    // 2. Send initialized notification
    proc.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }) + '\n');

    // 3. List tools
    console.error('[smoke] Listing tools...');
    proc.stdin.write(jsonRpcRequest('tools/list', {}, 2));

    const toolsResponse = await waitForResponse(2);
    if (toolsResponse.error) {
      throw new Error(`tools/list failed: ${JSON.stringify(toolsResponse.error)}`);
    }
    const tools = toolsResponse.result?.tools || [];
    console.error(`[smoke] ✓ Found ${tools.length} tools`);
    tools.forEach((t) => console.error(`[smoke]   - ${t.name}`));

    // 4. Call system_health
    console.error('[smoke] Calling system_health...');
    proc.stdin.write(jsonRpcRequest('tools/call', {
      name: 'system_health',
      arguments: {},
    }, 3));

    const healthResponse = await waitForResponse(3);
    if (healthResponse.error) {
      throw new Error(`system_health failed: ${JSON.stringify(healthResponse.error)}`);
    }
    const healthContent = healthResponse.result?.content?.[0]?.text;
    if (healthContent) {
      const health = JSON.parse(healthContent);
      if (!health.success) {
        throw new Error(`system_health returned error: ${health.error}`);
      }
      console.error('[smoke] ✓ system_health OK');
      console.error(`[smoke]   Status: ${health.data?.status}`);
    }

    console.error('[smoke] ✓ All smoke tests passed!');
    proc.kill();
    process.exit(0);

  } catch (error) {
    console.error(`[smoke] ✗ FAILED: ${error.message}`);
    if (stderr) {
      console.error('[smoke] Server stderr:', stderr);
    }
    proc.kill();
    process.exit(1);
  }
}

// Timeout guard
const timeoutId = setTimeout(() => {
  console.error('[smoke] ✗ TIMEOUT: Test took too long');
  process.exit(1);
}, TIMEOUT_MS);

runSmokeTest().finally(() => {
  clearTimeout(timeoutId);
});
