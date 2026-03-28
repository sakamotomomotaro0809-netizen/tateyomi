#!/usr/bin/env node
/* istanbul ignore file */
/**
 * CDP Smoke Test CLI
 *
 * Verifies Playwright can connect to existing Chrome via CDP.
 * Opens example.com, gets title, then closes tab (keeps Chrome running).
 */

import { isCDPPortOpen, connectCDP } from './session';

const TEST_URL = 'https://example.com';
const DEFAULT_PORT = 9222;

async function runSmokeTest(): Promise<void> {
  console.log('CDP Smoke Test');
  console.log('==============');
  console.log('');

  // Check if Chrome is running
  const port = parseInt(process.env.CHROME_DEBUG_PORT || String(DEFAULT_PORT), 10);
  console.log(`Checking Chrome on port ${port}...`);

  const isOpen = await isCDPPortOpen(port);
  if (!isOpen) {
    console.error('');
    console.error('Chrome is not running in debug mode.');
    console.error('');
    console.error('Start Chrome first:');
    console.error('  npm run chrome:debug:start');
    console.error('');
    console.error('Or manually:');
    console.error('  # macOS');
    console.error(
      '  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\');
    console.error(`    --remote-debugging-port=${port} \\`);
    console.error('    --remote-debugging-address=127.0.0.1 \\');
    console.error('    --user-data-dir=$HOME/.chrome-debug-profile');
    console.error('');
    process.exit(1);
  }

  console.log('Chrome is running. Connecting via CDP...');

  try {
    const connection = await connectCDP({
      endpointUrl: `http://127.0.0.1:${port}`,
      timeout: 10000,
    });

    console.log('Connected successfully!');
    console.log('');

    // Open a new page
    console.log(`Opening ${TEST_URL}...`);
    const page = await connection.context.newPage();

    await page.goto(TEST_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const title = await page.title();
    const url = page.url();

    console.log('');
    console.log('Page loaded:');
    console.log(`  URL: ${url}`);
    console.log(`  Title: ${title}`);
    console.log('');

    // Close the tab (not the browser)
    console.log('Closing tab (Chrome stays open)...');
    await page.close();

    console.log('');
    console.log('Smoke test passed!');
    console.log('');
    console.log('Notes:');
    console.log('  - Chrome is still running (preserves login sessions)');
    console.log('  - CDP connection is cached for subsequent calls');
    console.log('  - Use web.read_url with backend=cdp to leverage this connection');
  } catch (err) {
    console.error('');
    console.error('Smoke test failed:', err);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Make sure Chrome was started with --remote-debugging-port');
    console.error('  2. Check that no firewall is blocking localhost connections');
    console.error('  3. Try restarting Chrome with: npm run chrome:debug:start');
    process.exit(1);
  } finally {
    // Note: We don't disconnect here to keep the cache warm
    // The browser stays open for session reuse
  }
}

// Run
runSmokeTest().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
