/**
 * Playwright CDP Unit Tests
 *
 * Tests CDP session management, actions, and backend switching.
 * playwright-core is mocked - no real Chrome connection.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// Mock net module before imports
const mockSocketInstance = {
  connect: jest.fn(),
  destroy: jest.fn(),
  on: jest.fn(),
};

jest.mock('net', () => ({
  Socket: jest.fn(() => mockSocketInstance),
}));

// Mock playwright-core
const mockPage = {
  goto: jest.fn(),
  title: jest.fn(),
  url: jest.fn(),
  evaluate: jest.fn(),
  close: jest.fn(),
};

const mockContext = {
  newPage: jest.fn().mockResolvedValue(mockPage),
};

const mockBrowser = {
  contexts: jest.fn().mockReturnValue([mockContext]),
  newContext: jest.fn().mockResolvedValue(mockContext),
  on: jest.fn(),
  close: jest.fn(),
};

jest.mock('playwright-core', () => ({
  chromium: {
    connectOverCDP: jest.fn().mockResolvedValue(mockBrowser),
  },
}));

import { chromium } from 'playwright-core';

describe('CDP Session Manager', () => {
  let connectCDP: typeof import('../../src/proxy-mcp/browser/cdp/session').connectCDP;
  let isCDPPortOpen: typeof import('../../src/proxy-mcp/browser/cdp/session').isCDPPortOpen;
  let clearConnectionCache: typeof import('../../src/proxy-mcp/browser/cdp/session').clearConnectionCache;
  let getCachedConnection: typeof import('../../src/proxy-mcp/browser/cdp/session').getCachedConnection;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Reset socket mock
    mockSocketInstance.connect.mockReset();
    mockSocketInstance.destroy.mockReset();
    mockSocketInstance.on.mockReset();

    // Reset browser mock
    mockBrowser.contexts.mockReturnValue([mockContext]);
    (chromium.connectOverCDP as jest.Mock).mockResolvedValue(mockBrowser);

    // Re-import after reset
    const sessionModule = require('../../src/proxy-mcp/browser/cdp/session');
    connectCDP = sessionModule.connectCDP;
    isCDPPortOpen = sessionModule.isCDPPortOpen;
    clearConnectionCache = sessionModule.clearConnectionCache;
    getCachedConnection = sessionModule.getCachedConnection;

    // Clear any cached connection
    clearConnectionCache();
  });

  describe('isCDPPortOpen', () => {
    it('should return true when port is open', async () => {
      mockSocketInstance.connect.mockImplementation(
        (_port: number, _host: string, callback: () => void) => {
          callback();
        }
      );

      const result = await isCDPPortOpen(9222);
      expect(result).toBe(true);
      expect(mockSocketInstance.connect).toHaveBeenCalledWith(
        9222,
        '127.0.0.1',
        expect.any(Function)
      );
    });

    it('should return false when port is closed (error)', async () => {
      mockSocketInstance.on.mockImplementation(
        (event: string, callback: (err?: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('ECONNREFUSED')), 10);
          }
        }
      );

      const result = await isCDPPortOpen(9222);
      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      jest.useFakeTimers();

      // Don't call connect callback (simulates hanging)
      mockSocketInstance.connect.mockImplementation(() => {});

      const promise = isCDPPortOpen(9222);

      // Fast-forward timeout
      jest.advanceTimersByTime(1100);

      const result = await promise;
      expect(result).toBe(false);
      expect(mockSocketInstance.destroy).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('connectCDP', () => {
    beforeEach(() => {
      // Setup port as open by default
      mockSocketInstance.connect.mockImplementation(
        (_port: number, _host: string, callback: () => void) => {
          callback();
        }
      );
    });

    it('should connect to Chrome via CDP', async () => {
      const connection = await connectCDP({ endpointUrl: 'http://127.0.0.1:9222' });

      // Connection should be established
      expect(connection.isConnected).toBe(true);
      expect(connection.browser).toBeDefined();
      expect(connection.context).toBeDefined();
    });

    it('should reuse existing context if available', async () => {
      mockBrowser.contexts.mockReturnValue([mockContext]);

      const connection = await connectCDP();

      expect(connection.context).toBe(mockContext);
      expect(mockBrowser.newContext).not.toHaveBeenCalled();
    });

    it('should create new context if none exist', async () => {
      mockBrowser.contexts.mockReturnValue([]);
      mockBrowser.newContext.mockResolvedValue(mockContext);

      const connection = await connectCDP();

      expect(connection.context).toBe(mockContext);
      expect(mockBrowser.newContext).toHaveBeenCalled();
    });

    it('should cache connection for reuse', async () => {
      const connection1 = await connectCDP();

      // Clear mock to check if called again
      (chromium.connectOverCDP as jest.Mock).mockClear();

      const connection2 = await connectCDP();

      expect(chromium.connectOverCDP).not.toHaveBeenCalled();
      expect(connection1).toBe(connection2);
    });

    it('should throw error if Chrome is not running', async () => {
      mockSocketInstance.connect.mockImplementation(() => {});
      mockSocketInstance.on.mockImplementation(
        (event: string, callback: (err?: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('ECONNREFUSED')), 10);
          }
        }
      );

      await expect(connectCDP()).rejects.toThrow('Chrome is not running');
    });
  });

  describe('getCachedConnection', () => {
    it('should return null when no connection cached', () => {
      clearConnectionCache();
      const cached = getCachedConnection();
      expect(cached).toBeNull();
    });
  });
});

describe('CDP Types', () => {
  let detectCaptchaOrLogin: typeof import('../../src/proxy-mcp/browser/cdp/types').detectCaptchaOrLogin;

  beforeEach(() => {
    const typesModule = require('../../src/proxy-mcp/browser/cdp/types');
    detectCaptchaOrLogin = typesModule.detectCaptchaOrLogin;
  });

  describe('detectCaptchaOrLogin', () => {
    it('should detect CAPTCHA in content', () => {
      const result = detectCaptchaOrLogin(
        'Test Page',
        'Please complete the captcha to continue',
        'https://example.com'
      );
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('captcha');
    });

    it('should detect reCAPTCHA in content', () => {
      const result = detectCaptchaOrLogin(
        'Test Page',
        'Please verify you are human with reCAPTCHA',
        'https://example.com'
      );
      expect(result.detected).toBe(true);
    });

    it('should detect hCaptcha in content', () => {
      const result = detectCaptchaOrLogin(
        'Test Page',
        'Complete hcaptcha challenge',
        'https://example.com'
      );
      expect(result.detected).toBe(true);
    });

    it('should detect login requirement', () => {
      const result = detectCaptchaOrLogin(
        'Login Required',
        'Please log in to continue',
        'https://example.com/login'
      );
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('login');
    });

    it('should detect sign in requirement', () => {
      const result = detectCaptchaOrLogin(
        'Sign In',
        'Please sign in to continue',
        'https://example.com/signin'
      );
      expect(result.detected).toBe(true);
    });

    it('should detect authentication requirement', () => {
      const result = detectCaptchaOrLogin(
        'Test Page',
        'Authentication required',
        'https://example.com'
      );
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('auth');
    });

    it('should detect bot/robot verification', () => {
      const result = detectCaptchaOrLogin(
        'Test Page',
        'Are you a robot? Prove you are human.',
        'https://example.com'
      );
      expect(result.detected).toBe(true);
    });

    it('should not detect on normal pages', () => {
      const result = detectCaptchaOrLogin(
        'Example Domain',
        'This domain is for use in illustrative examples in documents.',
        'https://example.com'
      );
      expect(result.detected).toBe(false);
    });

    it('should not detect on pages with normal login text', () => {
      const result = detectCaptchaOrLogin(
        'Welcome',
        'If you already have an account, you can login from the menu.',
        'https://example.com/welcome'
      );
      expect(result.detected).toBe(false);
    });
  });
});

describe('Web Skills Backend Type', () => {
  it('should have skills module with backend support', () => {
    const skillsModule = require('../../src/proxy-mcp/browser/skills');
    expect(skillsModule).toBeDefined();
    expect(typeof skillsModule.readUrl).toBe('function');
    expect(typeof skillsModule.extractLinks).toBe('function');
    expect(typeof skillsModule.captureDomMap).toBe('function');
    expect(typeof skillsModule.listTabsUrls).toBe('function');
  });
});

describe('listTabsViaCDP', () => {
  let listTabsViaCDP: typeof import('../../src/proxy-mcp/browser/cdp/actions').listTabsViaCDP;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Setup port as open
    mockSocketInstance.connect.mockImplementation(
      (_port: number, _host: string, callback: () => void) => {
        callback();
      }
    );

    // Reset browser mock with multiple pages
    const mockPage1 = {
      url: jest.fn().mockReturnValue('https://example.com/page1'),
      title: jest.fn().mockResolvedValue('Page 1'),
    };
    const mockPage2 = {
      url: jest.fn().mockReturnValue('https://example.com/page2'),
      title: jest.fn().mockResolvedValue('Page 2'),
    };

    const mockContextWithPages = {
      pages: jest.fn().mockReturnValue([mockPage1, mockPage2]),
      newPage: jest.fn().mockResolvedValue(mockPage),
    };

    mockBrowser.contexts.mockReturnValue([mockContextWithPages]);
    (chromium.connectOverCDP as jest.Mock).mockResolvedValue(mockBrowser);

    // Import actions
    const actionsModule = require('../../src/proxy-mcp/browser/cdp/actions');
    listTabsViaCDP = actionsModule.listTabsViaCDP;

    // Clear cached connection
    const sessionModule = require('../../src/proxy-mcp/browser/cdp/session');
    sessionModule.clearConnectionCache();
  });

  it('should list all open tabs successfully', async () => {
    const result = await listTabsViaCDP();

    expect(result.success).toBe(true);
    expect(result.data?.totalTabs).toBe(2);
    expect(result.data?.tabs).toHaveLength(2);
    expect(result.data?.tabs[0].url).toBe('https://example.com/page1');
    expect(result.data?.tabs[0].title).toBe('Page 1');
    expect(result.data?.tabs[1].url).toBe('https://example.com/page2');
    expect(result.data?.tabs[1].title).toBe('Page 2');
  });

  it('should handle connection errors', async () => {
    mockSocketInstance.connect.mockImplementation(() => {});
    mockSocketInstance.on.mockImplementation(
      (event: string, callback: (err?: Error) => void) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('ECONNREFUSED')), 10);
        }
      }
    );

    const result = await listTabsViaCDP();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to list tabs');
  });

  it('should return empty array when no tabs open', async () => {
    const emptyContext = {
      pages: jest.fn().mockReturnValue([]),
      newPage: jest.fn().mockResolvedValue(mockPage),
    };
    mockBrowser.contexts.mockReturnValue([emptyContext]);

    const result = await listTabsViaCDP();

    expect(result.success).toBe(true);
    expect(result.data?.totalTabs).toBe(0);
    expect(result.data?.tabs).toHaveLength(0);
  });
});

describe('CDP Actions', () => {
  let readUrlViaCDP: typeof import('../../src/proxy-mcp/browser/cdp/actions').readUrlViaCDP;
  let extractLinksViaCDP: typeof import('../../src/proxy-mcp/browser/cdp/actions').extractLinksViaCDP;
  let captureDOMMapViaCDP: typeof import('../../src/proxy-mcp/browser/cdp/actions').captureDOMMapViaCDP;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Setup port as open
    mockSocketInstance.connect.mockImplementation(
      (_port: number, _host: string, callback: () => void) => {
        callback();
      }
    );

    // Reset page mocks
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.title.mockResolvedValue('Test Page');
    mockPage.url.mockReturnValue('https://example.com');
    mockPage.evaluate.mockResolvedValue('Test content');
    mockPage.close.mockResolvedValue(undefined);

    // Reset browser mock
    mockBrowser.contexts.mockReturnValue([mockContext]);
    (chromium.connectOverCDP as jest.Mock).mockResolvedValue(mockBrowser);

    // Import actions
    const actionsModule = require('../../src/proxy-mcp/browser/cdp/actions');
    readUrlViaCDP = actionsModule.readUrlViaCDP;
    extractLinksViaCDP = actionsModule.extractLinksViaCDP;
    captureDOMMapViaCDP = actionsModule.captureDOMMapViaCDP;

    // Clear cached connection
    const sessionModule = require('../../src/proxy-mcp/browser/cdp/session');
    sessionModule.clearConnectionCache();
  });

  describe('readUrlViaCDP', () => {
    it('should read URL content successfully', async () => {
      mockPage.evaluate.mockResolvedValue('This is the page content');

      const result = await readUrlViaCDP('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('This is the page content');
      expect(result.data?.title).toBe('Test Page');
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should detect CAPTCHA and return requireHuman', async () => {
      mockPage.title.mockResolvedValue('Verify you are human');
      mockPage.evaluate.mockResolvedValue('Please complete the captcha');

      const result = await readUrlViaCDP('https://example.com');

      expect(result.success).toBe(false);
      expect(result.requireHuman).toBe(true);
      expect(result.humanReason).toBeDefined();
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      const result = await readUrlViaCDP('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read URL');
    });
  });

  describe('extractLinksViaCDP', () => {
    it('should extract links successfully', async () => {
      const mockLinks = [
        { href: 'https://example.com/page1', text: 'Page 1', title: undefined },
        { href: 'https://example.com/page2', text: 'Page 2', title: 'Second Page' },
      ];

      // First evaluate call is for content check, second for links
      mockPage.evaluate
        .mockResolvedValueOnce('Normal page content')
        .mockResolvedValueOnce(mockLinks);

      const result = await extractLinksViaCDP('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.links).toEqual(mockLinks);
      expect(result.data?.totalLinks).toBe(2);
    });

    it('should detect CAPTCHA during link extraction', async () => {
      mockPage.title.mockResolvedValue('Robot Check');
      mockPage.evaluate.mockResolvedValueOnce('prove you are not a robot');

      const result = await extractLinksViaCDP('https://example.com');

      expect(result.success).toBe(false);
      expect(result.requireHuman).toBe(true);
    });
  });

  describe('captureDOMMapViaCDP', () => {
    it('should capture DOM map successfully', async () => {
      const mockElements = [
        {
          tag: 'body',
          children: [{ tag: 'div', id: 'main', text: 'Hello' }],
        },
      ];

      mockPage.evaluate
        .mockResolvedValueOnce('Normal page content')
        .mockResolvedValueOnce(mockElements);

      const result = await captureDOMMapViaCDP('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.elements).toEqual(mockElements);
      expect(result.data?.totalElements).toBeGreaterThan(0);
    });

    it('should detect CAPTCHA during DOM capture', async () => {
      mockPage.title.mockResolvedValue('Security Check');
      mockPage.evaluate.mockResolvedValueOnce('hcaptcha verification needed');

      const result = await captureDOMMapViaCDP('https://example.com');

      expect(result.success).toBe(false);
      expect(result.requireHuman).toBe(true);
    });
  });
});
