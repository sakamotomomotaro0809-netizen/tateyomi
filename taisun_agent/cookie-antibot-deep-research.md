# Cookie ブロック・アンチボット対策 徹底調査レポート

**調査日**: 2026-02-09
**対象**: Chrome DevTools MCP + storageState 方式における Cookie ブロック・アンチボット検出対策

---

## 目次

1. [Cookie ブロックの種類と対策](#1-cookie-ブロックの種類と対策)
2. [アンチボットシステムの検出メカニズムと回避方法](#2-アンチボットシステムの検出メカニズムと回避方法)
3. [フィンガープリント偽装の具体的コード](#3-フィンガープリント偽装の具体的コード)
4. [Playwright Stealth ツール比較](#4-playwright-stealth-ツール比較)
5. [プロキシ・IP対策](#5-プロキシip対策)
6. [段階的フォールバック戦略](#6-段階的フォールバック戦略)
7. [Crawl4AI / Crawlee のアンチボット機能比較](#7-crawl4ai--crawlee-のアンチボット機能比較)
8. [最終推奨: url-all v4 ベスト構成](#8-最終推奨-url-all-v4-ベスト構成)

---

## 1. Cookie ブロックの種類と対策

### 一覧表

| Cookie ブロックパターン | 原因 | 検出方法 | 対策 | storageState への影響 |
|---|---|---|---|---|
| **SameSite=Strict** | クロスサイトリクエストで Cookie が送信されない | リクエストヘッダーに Cookie がない | 同一オリジンからアクセスする。`context.addCookies()` で `sameSite: 'Strict'` を明示的に設定。ファーストパーティとして操作する | 中: storageState で保存可能だが、クロスサイトでは送信されない |
| **SameSite=Lax** | POST/PUT 等のクロスサイトリクエストでブロック | フォーム送信時に Cookie が欠落 | GET リクエストでのナビゲーションを使用。storageState に `sameSite: 'Lax'` を保持 | 低: GET ナビゲーションでは送信される |
| **Secure 属性** | HTTPS 以外で Cookie が送信されない | HTTP でアクセス時に Cookie がない | 必ず HTTPS でアクセスする。Playwright の `ignoreHTTPSErrors: true` と組み合わせ | 低: HTTPS を使えば問題なし |
| **HttpOnly** | JavaScript (`document.cookie`) からアクセス不可 | JS で Cookie を読めない | Playwright の `context.cookies()` API はHttpOnly Cookie を取得可能。storageState() も HttpOnly を含む。ただし一部バグあり（Issue #5215） | 中: storageState で保存・復元可能だが、JS からの直接操作は不可 |
| **Cookie 同意バナー (GDPR)** | 同意未承認でトラッキング Cookie がブロック | 機能制限、Cookie がセットされない | `context.addCookies()` で同意 Cookie を事前注入。例: `{name: 'cookie_consent', value: 'accepted', domain: '.example.com'}` | 高: 同意 Cookie がないとセッション Cookie 自体がセットされない場合がある |
| **Cookie 有効期限切れ** | storageState 内の Cookie の `expires` が過去 | 401/403 レスポンス、リダイレクト | Cookie の `expires` を更新してから注入。定期的に storageState を更新するワークフロー構築 | 高: 期限切れ Cookie は無効。再ログインが必要 |
| **動的 Cookie / セッション ID** | アクセスごとに Cookie が変更される | Cookie のセッション ID 不一致 | storageState を使わず、毎回新規セッションでログイン。または CDP でリアルタイム Cookie を取得 | 極高: storageState が即座に陳腐化する |
| **Cookie 暗号化/署名** | サーバー側で Cookie の改ざん検知 | 401/403、セッション無効 | Cookie を改変せずそのまま使用。storageState の Cookie を改ざんしない。有効期限内に使用 | 中: Cookie を変更しなければ問題なし |
| **Cookie 数制限** | ブラウザの Cookie 上限（ドメインあたり50個、全体で約3000個） | 古い Cookie がドロップされる | 不要な Cookie を削除。重要な Cookie を優先的にセット | 低: 通常は問題にならない |

### storageState における Cookie 管理のベストプラクティス

```javascript
// storageState から Cookie を読み込み、期限切れを自動更新
async function loadFreshStorageState(stateFile) {
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  const now = Date.now() / 1000;

  const freshCookies = state.cookies.map(cookie => {
    // 期限切れ Cookie の expires を延長（ただしセッション Cookie は除く）
    if (cookie.expires > 0 && cookie.expires < now) {
      return {
        ...cookie,
        expires: now + 86400 // 24時間延長
      };
    }
    return cookie;
  });

  return { ...state, cookies: freshCookies };
}

// GDPR 同意 Cookie を事前注入
async function injectConsentCookies(context, domain) {
  await context.addCookies([
    {
      name: 'cookie_consent',
      value: 'all_accepted',
      domain: domain,
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax'
    },
    {
      name: 'gdpr_accepted',
      value: '1',
      domain: domain,
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax'
    }
  ]);
}
```

---

## 2. アンチボットシステムの検出メカニズムと回避方法

### 主要アンチボットシステム比較表

| システム | 検出メカニズム | 回避難易度 | 回避方法 | 主要OSSツール |
|---|---|---|---|---|
| **Cloudflare Turnstile / Bot Management** | JS Challenge、TLS フィンガープリント（JA3/JA4）、IP レピュテーション、Cookie チャレンジ、行動分析 | ★★★☆☆ | Stealth Plugin + Residential Proxy + 人間的行動シミュレーション。rebrowser-patches が Runtime.Enable リークを修正 | [cloudflare-bypass-playwright](https://github.com/bskybt/cloudflare-bypass-playwright), [CloudflareBypassForScraping](https://github.com/sarperavci/CloudflareBypassForScraping), [turnaround](https://github.com/Body-Alhoha/turnaround) |
| **Akamai Bot Manager** | センサーデータ（暗号化ペイロード）、JA3/JA4 TLS フィンガープリント、IP 分類（DC/Residential/Mobile）、HTTP/2 フィンガープリント、ヘッダー順序検証、行動分析 | ★★★★☆ | TLS フィンガープリント一致（curl-impersonate）、Residential Proxy 必須、ヘッダー順序の正確な再現、sensor data の正確なエミュレーション | Scrapfly, ScraperAPI（商用）。OSS では困難 |
| **PerimeterX (HUMAN)** | マウスムーブメント追跡、スクロール速度、クリックパターン、タイミング分析、Canvas/WebGL フィンガープリント、ML 行動プロファイリング | ★★★★☆ | ghost-cursor でマウス軌道を人間的に、行動パターンのランダム化、フィンガープリント一致、Residential Proxy | [ghost-cursor](https://github.com/nicedayfor/ghost-cursor), Patchright |
| **DataDome** | リアルタイム AI/ML 判定、Canvas/WebGL/フォント フィンガープリント、TLS フィンガープリント（JA3）、行動分析（クリック/スクロール/タイピング）、IP レピュテーション | ★★★★★ | 多層アプローチ必須: TLS 偽装 + Stealth Browser + Residential Proxy + 人間的行動。大規模回避は「事実上不可能」（DataDome 公式見解） | rebrowser-patches（部分的）、商用サービス推奨 |
| **reCAPTCHA Enterprise** | Canvas/WebGL/AudioContext フィンガープリント、マウスムーブメント、行動スコアリング（11段階）、Cookie 追跡、WAF 連携 | ★★★★☆ | CAPTCHA ソルバーサービス（2Captcha: $1.16/1000回、Anti-Captcha）、AI プラットフォーム（Skyvern: 85%+）。ステルスプラグイン単独では成功率 40-60% | [2captcha](https://2captcha.com), [anti-captcha](https://anti-captcha.com), [NopeCHA](https://github.com/NopeCHALLC/nopecha-extension) |
| **hCaptcha Enterprise** | 画像分類チャレンジ、行動分析、デバイスフィンガープリント、プライバシー重視（Cookie 最小化） | ★★★☆☆ | CAPTCHA ソルバーサービス、AI 画像認識。NopeCHA 拡張（AI モデル搭載）が効果的 | [NopeCHA](https://github.com/NopeCHALLC/nopecha-extension)（0.5.0 で hCaptcha AI モデル追加） |

### 検出シグナルの詳細分類

| 検出カテゴリ | 具体的なシグナル | 重要度 |
|---|---|---|
| **CDP リーク** | `Runtime.enable` の有効化検知、`Console.enable` の検知、`pptr:` ソース URL、ユーティリティワールド名 | 最高 |
| **JS プロパティ** | `navigator.webdriver === true`、`window.chrome` の不在、`Permissions.query` の異常 | 高 |
| **TLS フィンガープリント** | JA3/JA4 ハッシュ不一致、cipher suite の順序、TLS 拡張の欠如 | 高 |
| **HTTP フィンガープリント** | HTTP/2 フィンガープリント、ヘッダー順序、Accept-Language/Encoding の不一致 | 中 |
| **Canvas/WebGL** | Canvas 描画ハッシュ、WebGL レンダラー/ベンダー、WebGL パラメータ | 中 |
| **行動パターン** | マウス軌道の直線性、クリック間隔の均一性、スクロール速度の一定さ | 高 |
| **IP レピュテーション** | データセンター IP、VPN/Proxy 検知、地理的不一致 | 高 |
| **タイミング** | JS 実行時間の差異（ヘッドレスは高速すぎる）、ページ間ナビゲーション速度 | 中 |

---

## 3. フィンガープリント偽装の具体的コード

### 3.1 Navigator Properties 偽装

```javascript
// Playwright の addInitScript で注入
await page.addInitScript(() => {
  // navigator.webdriver を削除
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined
  });

  // hardwareConcurrency を現実的な値に
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8
  });

  // deviceMemory を設定
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => 8
  });

  // platform を偽装
  Object.defineProperty(navigator, 'platform', {
    get: () => 'Win32'
  });

  // languages を設定
  Object.defineProperty(navigator, 'languages', {
    get: () => ['ja-JP', 'ja', 'en-US', 'en']
  });

  // plugins を偽装（Chrome の標準プラグイン）
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
      ];
      plugins.length = 3;
      return plugins;
    }
  });

  // mimeTypes を偽装
  Object.defineProperty(navigator, 'mimeTypes', {
    get: () => {
      const mimeTypes = [
        { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
      ];
      mimeTypes.length = 1;
      return mimeTypes;
    }
  });
});
```

### 3.2 WebGL フィンガープリント偽装

```javascript
await page.addInitScript(() => {
  // WebGL レンダラー/ベンダー情報の偽装
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    // UNMASKED_VENDOR_WEBGL
    if (param === 0x9245) return 'Intel Inc.';
    // UNMASKED_RENDERER_WEBGL
    if (param === 0x9246) return 'Intel Iris OpenGL Engine';
    // VENDOR
    if (param === 0x1F00) return 'WebKit';
    // RENDERER
    if (param === 0x1F01) return 'WebKit WebGL';
    return getParameter.apply(this, [param]);
  };

  // WebGL2 も同様に偽装
  if (typeof WebGL2RenderingContext !== 'undefined') {
    const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(param) {
      if (param === 0x9245) return 'Intel Inc.';
      if (param === 0x9246) return 'Intel Iris OpenGL Engine';
      if (param === 0x1F00) return 'WebKit';
      if (param === 0x1F01) return 'WebKit WebGL';
      return getParameter2.apply(this, [param]);
    };
  }

  // getExtension の WEBGL_debug_renderer_info を制御
  const origGetExtension = WebGLRenderingContext.prototype.getExtension;
  WebGLRenderingContext.prototype.getExtension = function(name) {
    if (name === 'WEBGL_debug_renderer_info') {
      return {
        UNMASKED_VENDOR_WEBGL: 0x9245,
        UNMASKED_RENDERER_WEBGL: 0x9246
      };
    }
    return origGetExtension.apply(this, [name]);
  };
});
```

### 3.3 Canvas フィンガープリント偽装

```javascript
await page.addInitScript(() => {
  // Canvas toDataURL にノイズを注入
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    const context = this.getContext('2d');
    if (context) {
      // 微小なノイズピクセルを追加（目に見えないが、ハッシュが変わる）
      const imageData = context.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        // RGB値に微小なノイズ（0 or 1）を追加
        imageData.data[i] = imageData.data[i] ^ (Math.random() > 0.99 ? 1 : 0);
      }
      context.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.apply(this, args);
  };

  // Canvas toBlob にも同様のノイズ
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
    const context = this.getContext('2d');
    if (context) {
      const imageData = context.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = imageData.data[i] ^ (Math.random() > 0.99 ? 1 : 0);
      }
      context.putImageData(imageData, 0, 0);
    }
    return originalToBlob.apply(this, [callback, ...args]);
  };

  // getImageData にもノイズ
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function(...args) {
    const imageData = originalGetImageData.apply(this, args);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = imageData.data[i] ^ (Math.random() > 0.995 ? 1 : 0);
    }
    return imageData;
  };
});
```

### 3.4 AudioContext フィンガープリント偽装

```javascript
await page.addInitScript(() => {
  // AudioContext の getFloatFrequencyData にノイズ注入
  const originalGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
  AnalyserNode.prototype.getFloatFrequencyData = function(array) {
    originalGetFloatFrequencyData.apply(this, [array]);
    // 微小なノイズを追加
    for (let i = 0; i < array.length; i++) {
      array[i] = array[i] + (Math.random() * 0.0001 - 0.00005);
    }
  };

  // createOscillator のオーバーライド
  const origCreateOscillator = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function() {
    const oscillator = origCreateOscillator.apply(this);
    // frequency の微調整
    const origFrequency = oscillator.frequency;
    return oscillator;
  };

  // OfflineAudioContext の startRendering にノイズ
  if (typeof OfflineAudioContext !== 'undefined') {
    const originalStartRendering = OfflineAudioContext.prototype.startRendering;
    OfflineAudioContext.prototype.startRendering = function() {
      return originalStartRendering.apply(this).then(buffer => {
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] = channelData[i] + (Math.random() * 0.0001 - 0.00005);
        }
        return buffer;
      });
    };
  }
});
```

### 3.5 Font フィンガープリント対策

```javascript
await page.addInitScript(() => {
  // FontFace API の偽装は困難だが、CSS ベースのフォント検出を妨害
  // 一般的なフォントリストを返す
  if (typeof document.fonts !== 'undefined') {
    const originalCheck = document.fonts.check.bind(document.fonts);
    document.fonts.check = function(font, text) {
      // よく使われるシステムフォントは全て "ある" と報告
      const commonFonts = [
        'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
        'Verdana', 'Courier New', 'Tahoma', 'Trebuchet MS'
      ];
      for (const cf of commonFonts) {
        if (font.includes(cf)) return true;
      }
      return originalCheck(font, text);
    };
  }
});
```

### 3.6 Screen / Viewport 偽装

```javascript
// Playwright の Context 作成時に設定
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  screen: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  hasTouch: false,
  isMobile: false,
});

// addInitScript でも補完
await page.addInitScript(() => {
  Object.defineProperty(screen, 'width', { get: () => 1920 });
  Object.defineProperty(screen, 'height', { get: () => 1080 });
  Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
  Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
  Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
  Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
});
```

### 3.7 Timezone / Locale 偽装

```javascript
// Playwright Context で設定
const context = await browser.newContext({
  timezoneId: 'Asia/Tokyo',
  locale: 'ja-JP',
});

// addInitScript で補完
await page.addInitScript(() => {
  // Intl API の偽装
  const originalDateTimeFormat = Intl.DateTimeFormat;
  const DateTimeFormat = function(...args) {
    if (args.length === 0 || args[0] === undefined) {
      args[0] = 'ja-JP';
    }
    return new originalDateTimeFormat(...args);
  };
  DateTimeFormat.prototype = originalDateTimeFormat.prototype;
  Object.defineProperty(Intl, 'DateTimeFormat', { value: DateTimeFormat });

  // Date.prototype.getTimezoneOffset を偽装 (JST = UTC+9 = -540分)
  Date.prototype.getTimezoneOffset = function() { return -540; };
});
```

### 3.8 User-Agent 偽装

```javascript
// Context レベルで設定
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
});

// User-Agent Client Hints の偽装
await page.addInitScript(() => {
  // navigator.userAgentData を偽装
  Object.defineProperty(navigator, 'userAgentData', {
    get: () => ({
      brands: [
        { brand: 'Not A(Brand', version: '99' },
        { brand: 'Google Chrome', version: '121' },
        { brand: 'Chromium', version: '121' }
      ],
      mobile: false,
      platform: 'Windows',
      getHighEntropyValues: async (hints) => ({
        architecture: 'x86',
        bitness: '64',
        fullVersionList: [
          { brand: 'Not A(Brand', version: '99.0.0.0' },
          { brand: 'Google Chrome', version: '121.0.6167.85' },
          { brand: 'Chromium', version: '121.0.6167.85' }
        ],
        mobile: false,
        model: '',
        platform: 'Windows',
        platformVersion: '15.0.0',
        uaFullVersion: '121.0.6167.85'
      })
    })
  });
});
```

---

## 4. Playwright Stealth ツール比較

### 主要ツール一覧

| ツール名 | GitHub Stars | 最終更新 | 対応アンチボット | 検出回避率 | 言語 | 特徴 |
|---|---|---|---|---|---|---|
| **[Patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright)** | 2,300 | 2026-02-06 | Cloudflare, Kasada, Akamai, DataDome, Fingerprint.com, CreepJS | ★★★★★ | Node.js / Python / .NET | Playwright フォーク。ソースレベルで CDP リークを修正。Runtime.enable を完全排除 |
| **[rebrowser-patches](https://github.com/rebrowser/rebrowser-patches)** | 1,200 | 2026-02-09 | Cloudflare, DataDome | ★★★★☆ | Node.js | Playwright/Puppeteer へのパッチ。Runtime.Enable リーク修正。patch/unpatch が容易 |
| **[Camoufox](https://github.com/daijro/camoufox)** | 5,100 | 2025 (メンテナンス停滞) | Cloudflare, DataDome, Imperva, reCAPTCHA, Fingerprint.com | ★★★★☆ | Python | Firefox ベースの完全カスタムビルド。C++ レベルでフィンガープリント偽装。メンテナー療養中 |
| **[playwright-extra + stealth](https://www.npmjs.com/package/playwright-extra)** | - | メンテナンス停滞 | 基本的なヘッドレス検出 | ★★☆☆☆ | Node.js | puppeteer-extra-plugin-stealth の Playwright 版。12か月以上更新なし。低レベル検出には弱い |
| **[fingerprint-suite](https://github.com/apify/fingerprint-suite)** | 1,900 | 2026-02-03 | フィンガープリントベースの検出全般 | ★★★☆☆ | Node.js (TypeScript) | Apify 製。ベイジアンネットワークで現実的なフィンガープリントを生成。Playwright/Puppeteer 対応 |
| **[playwright-with-fingerprints](https://www.npmjs.com/package/playwright-with-fingerprints)** | - | アクティブ | フィンガープリント検出 | ★★★☆☆ | Node.js | FingerprintSwitcher サービスと連携。無料枠あり |
| **[NopeCHA](https://github.com/NopeCHALLC/nopecha-extension)** | - | 2025-11 (v0.5.0) | reCAPTCHA, hCaptcha, Turnstile | ★★★☆☆ | ブラウザ拡張 | AI モデルで CAPTCHA を解決。Playwright に拡張として組み込み可能 |
| **[CDP-Patches](https://github.com/Kaliiiiiiiiii-Vinyzu/CDP-Patches)** | - | アクティブ | CDP リーク検出 | ★★★★☆ | OS レベル | OS レベルで CDP リークをパッチ。Playwright/Selenium/Puppeteer 全てに対応 |

### url-all v4 への統合推奨度

| ツール | 統合推奨度 | 理由 |
|---|---|---|
| **Patchright** | ★★★★★ 最優先 | Playwright の API 互換性を維持しつつ、最も広範なアンチボットを回避。Node.js 対応。アクティブメンテナンス |
| **rebrowser-patches** | ★★★★☆ 次善 | 既存の Playwright コードにパッチとして適用可能。unpatch も容易 |
| **fingerprint-suite** | ★★★★☆ 補完 | Patchright/rebrowser と併用。フィンガープリント生成で検出回避率を向上 |
| **NopeCHA** | ★★★☆☆ CAPTCHA 対策 | CAPTCHA が出現した場合のフォールバック |
| **Camoufox** | ★★☆☆☆ 非推奨 | Python のみ。メンテナンス不安。Node.js 統合が困難 |

---

## 5. プロキシ・IP対策

### プロキシサービス比較

| サービス | Residential IP数 | 料金 (per GB) | 成功率 | 応答速度 | Playwright 統合 | 特徴 |
|---|---|---|---|---|---|---|
| **[Bright Data](https://brightdata.com)** | 7,200万+ | $10.50/GB | 99.7% | 0.7秒 | Scraping Browser (Playwright互換) | 業界最大手。120+ のノーコードスクレイパー。CAPTCHA 自動解決 |
| **[Oxylabs](https://oxylabs.io)** | 1億+ | $10.00/GB | 99.95% | 0.6秒 | Web Unblocker API | 最高の成功率と応答速度。OxyCopilot AI アシスタント |
| **[Decodo (旧 SmartProxy)](https://decodo.com)** | 1.25億+ | $2.20 - $7.50/GB | 99.68% | 0.54秒 | 標準プロキシ設定 | コスパ最強。エントリーレベルに最適 |
| **[ScraperAPI](https://scraperapi.com)** | - | $49/月 (10万リクエスト) | 99.99% (Akamai) | - | API ベース | Akamai バイパスに特化。API 一つで完結 |
| **[Scrapfly](https://scrapfly.io)** | - | 従量課金 | 96% (DataDome) | - | API ベース | DataDome/Cloudflare に強い。JavaScript レンダリング対応 |

### Playwright でのプロキシ設定

```javascript
// Residential Proxy の設定
const browser = await chromium.launch({
  proxy: {
    server: 'http://gate.smartproxy.com:7777',
    username: 'user-residential-country-jp',
    password: 'password'
  }
});

// Rotating Proxy（リクエストごとに IP 変更）
const browser = await chromium.launch({
  proxy: {
    server: 'http://gate.smartproxy.com:10000',
    username: 'user-residential-country-jp-session-' + Math.random().toString(36),
    password: 'password'
  }
});
```

### 無料代替手段

| 方法 | IP 数 | 信頼性 | 速度 | 用途 |
|---|---|---|---|---|
| **Tor** | 数千 | 低 (多くのサイトでブロック) | 非常に遅い | 最終手段のみ |
| **公開プロキシリスト** | 変動 | 極低 (すぐにブロック) | 不安定 | テスト用のみ。本番使用禁止 |

---

## 6. 段階的フォールバック戦略

### 戦略設計図

```
Level 0: 通常の Playwright MCP
├── 成功 → 完了
└── 失敗（403/CAPTCHA/ブロック）→ Level 1

Level 1: + storageState（Cookie 復元）
├── 成功 → 完了
└── 失敗 → Level 2

Level 2: + Patchright / rebrowser-patches（CDP リーク修正 + フィンガープリント偽装）
├── 成功 → 完了
└── 失敗 → Level 3

Level 3: + Residential Proxy（IP レピュテーション向上）
├── 成功 → 完了
└── 失敗 → Level 4

Level 4: + Chrome DevTools MCP（実ブラウザ利用）
├── 成功 → 完了
└── 失敗 → Level 5

Level 5: + 手動介入（CAPTCHA/2FA 手動処理）
├── 成功 → 完了
└── 失敗 → エラーレポート
```

### 各レベルの詳細実装

#### Level 0: 通常の Playwright MCP

```javascript
// 基本的な Playwright アクセス
async function level0_basicAccess(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo'
  });
  const page = await context.newPage();
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  return { success: response.status() === 200, page, browser };
}
```

**突破可能**: 基本的なアンチボット未導入サイト、静的サイト

#### Level 1: + storageState

```javascript
async function level1_withStorageState(url, storageStatePath) {
  const browser = await chromium.launch({ headless: true });
  const freshState = await loadFreshStorageState(storageStatePath);
  const context = await browser.newContext({
    storageState: freshState,
    userAgent: 'Mozilla/5.0 ...',
    viewport: { width: 1920, height: 1080 }
  });
  // GDPR 同意 Cookie も注入
  const domain = new URL(url).hostname;
  await injectConsentCookies(context, domain);

  const page = await context.newPage();
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  return { success: response.status() === 200, page, browser };
}
```

**突破可能**: ログイン必須サイト（Cookie ベース認証）、GDPR バナーのあるサイト

#### Level 2: + Patchright / Stealth

```javascript
// patchright を使用（Playwright の API 互換フォーク）
// npm install patchright
import { chromium } from 'patchright';
import { FingerprintGenerator } from 'fingerprint-generator';
import { FingerprintInjector } from 'fingerprint-injector';

async function level2_withStealth(url, storageStatePath) {
  const fingerprintGenerator = new FingerprintGenerator({
    devices: ['desktop'],
    operatingSystems: ['windows'],
    browsers: [{ name: 'chrome', minVersion: 119 }]
  });
  const fingerprint = fingerprintGenerator.getFingerprint();

  const browser = await chromium.launch({
    headless: false, // ヘッドレス検出を回避
    args: [
      '--disable-blink-features=AutomationControlled',
      '--enable-webgl',
      '--use-gl=swiftshader',
      '--enable-accelerated-2d-canvas'
    ]
  });

  const freshState = storageStatePath
    ? await loadFreshStorageState(storageStatePath)
    : undefined;

  const context = await browser.newContext({
    storageState: freshState,
    userAgent: fingerprint.fingerprint.navigator.userAgent,
    viewport: {
      width: fingerprint.fingerprint.screen.width,
      height: fingerprint.fingerprint.screen.height
    },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo'
  });

  // フィンガープリント注入
  const injector = new FingerprintInjector();
  await injector.attachFingerprintToPlaywright(context, fingerprint);

  const page = await context.newPage();
  // 人間的な行動シミュレーション
  await simulateHumanBehavior(page);
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  return { success: response.status() === 200, page, browser };
}

// 人間的行動シミュレーション
async function simulateHumanBehavior(page) {
  // ランダムな遅延
  await page.waitForTimeout(1000 + Math.random() * 2000);
  // マウスの自然な動き
  await page.mouse.move(
    100 + Math.random() * 500,
    100 + Math.random() * 300,
    { steps: 10 + Math.floor(Math.random() * 20) }
  );
  // 軽いスクロール
  await page.mouse.wheel(0, 100 + Math.random() * 200);
  await page.waitForTimeout(500 + Math.random() * 1000);
}
```

**突破可能**: Cloudflare Turnstile (JS Challenge)、基本的な Fingerprint.com 検出、CreepJS、Sannysoft

#### Level 3: + Residential Proxy

```javascript
async function level3_withProxy(url, storageStatePath) {
  const browser = await chromium.launch({
    headless: false,
    proxy: {
      server: 'http://gate.smartproxy.com:7777',
      username: `user-residential-country-jp-session-${Date.now()}`,
      password: process.env.PROXY_PASSWORD
    },
    args: [
      '--disable-blink-features=AutomationControlled'
    ]
  });
  // Level 2 と同じステルス設定 + プロキシ
  // ...（fingerprint-suite + 行動シミュレーション）
}
```

**突破可能**: Akamai Bot Manager（部分的）、IP レピュテーションベースのブロック、地理的制限

#### Level 4: + Chrome DevTools MCP（実ブラウザ）

```javascript
// 実際に起動している Chrome に接続
// Chrome を --remote-debugging-port=9222 で起動済みの前提
async function level4_withRealBrowser(url) {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts[0]; // 既存のブラウザコンテキスト
  const page = await context.newPage();

  // 実ブラウザなので、TLS フィンガープリント、
  // 拡張機能、キャッシュ等が全て本物
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  return { success: response.status() === 200, page, browser };
}
```

**突破可能**: DataDome（部分的）、PerimeterX/HUMAN（部分的）、TLS フィンガープリント検出

#### Level 5: + 手動介入

```javascript
async function level5_withManualIntervention(url) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  await page.goto(url);

  // CAPTCHA/2FA 待機
  console.log('手動で CAPTCHA/2FA を解決してください...');
  console.log('完了したら Enter を押してください');

  // ユーザーが手動で解決するまで待機
  await page.waitForFunction(() => {
    // CAPTCHA が消えたことを確認（サイト固有のセレクター）
    return !document.querySelector('.captcha-container, [data-testid="captcha"]');
  }, { timeout: 300000 }); // 5分タイムアウト

  // 解決後の storageState を保存（次回用）
  const state = await context.storageState({ path: 'auth-state.json' });

  return { success: true, page, browser };
}
```

**突破可能**: 全てのアンチボットシステム（人間が介入するため）

### フォールバック統合コード

```javascript
async function accessWithFallback(url, options = {}) {
  const levels = [
    { name: 'Level 0: Basic', fn: () => level0_basicAccess(url) },
    { name: 'Level 1: StorageState', fn: () => level1_withStorageState(url, options.storageState) },
    { name: 'Level 2: Stealth', fn: () => level2_withStealth(url, options.storageState) },
    { name: 'Level 3: Proxy', fn: () => level3_withProxy(url, options.storageState) },
    { name: 'Level 4: Real Browser', fn: () => level4_withRealBrowser(url) },
    { name: 'Level 5: Manual', fn: () => level5_withManualIntervention(url) }
  ];

  // startLevel から開始（前回の成功レベルを記憶可能）
  const startLevel = options.startLevel || 0;

  for (let i = startLevel; i < levels.length; i++) {
    try {
      console.log(`Attempting ${levels[i].name}...`);
      const result = await levels[i].fn();
      if (result.success) {
        console.log(`Success at ${levels[i].name}`);
        return { ...result, level: i };
      }
    } catch (error) {
      console.error(`${levels[i].name} failed:`, error.message);
    }
  }

  throw new Error('All access levels exhausted');
}
```

### アンチボットシステム別の最低必要レベル

| アンチボットシステム | 最低レベル | 推奨レベル | 備考 |
|---|---|---|---|
| なし（基本サイト） | Level 0 | Level 0 | - |
| Cookie ベース認証 | Level 1 | Level 1 | storageState で十分 |
| 基本的なヘッドレス検出 | Level 2 | Level 2 | Patchright で対応 |
| Cloudflare JS Challenge | Level 2 | Level 2-3 | Patchright + 行動シミュレーション |
| Cloudflare Turnstile | Level 2-3 | Level 3 | Residential Proxy が有効 |
| Fingerprint.com | Level 2 | Level 2 | fingerprint-suite が有効 |
| Akamai Bot Manager | Level 3 | Level 3-4 | Residential Proxy + TLS 偽装必須 |
| PerimeterX / HUMAN | Level 3-4 | Level 4 | 行動分析が厳しい |
| DataDome | Level 4 | Level 4-5 | 大規模回避はほぼ不可能 |
| reCAPTCHA Enterprise | Level 5 (or ソルバー) | Level 5 | CAPTCHA ソルバーサービス or 手動 |
| hCaptcha Enterprise | Level 5 (or ソルバー) | Level 5 | NopeCHA or 手動 |

---

## 7. Crawl4AI / Crawlee のアンチボット機能比較

| 機能 | Crawl4AI (58k Stars, Python) | Crawlee (20k Stars, JS/Python) |
|---|---|---|
| **ステルスモード** | `enable_stealth=True` で有効化。navigator.webdriver 削除、プラグインエミュレーション | fingerprint-suite 統合（デフォルト有効） |
| **非検出ブラウザ** | `UndetectedAdapter()` でディープレベルパッチ。CDP 検出を回避 | Camoufox 統合サポート (`handleCloudflareChallenge`) |
| **フィンガープリント生成** | 内蔵（限定的） | fingerprint-suite（ベイジアンネットワークベース、高精度） |
| **プロキシ対応** | あり | あり（セッション管理付き） |
| **Cloudflare 対策** | UndetectedAdapter で対応 | Camoufox + handleCloudflareChallenge |
| **DataDome 対策** | UndetectedAdapter で部分対応 | fingerprint-suite + Camoufox |
| **セッション管理** | 基本的 | 高度（自動ローテーション） |
| **行動シミュレーション** | 基本的な待機時間設定 | なし（外部ライブラリに依存） |
| **LLM 統合** | ネイティブ（Markdown 変換、チャンキング） | Apify 経由で可能 |
| **メンテナンス状況** | アクティブ (v0.8.x) | アクティブ (Python v1.0, JS 安定) |

### 判定

**アンチボット回避力**: Crawl4AI > Crawlee（UndetectedAdapter がより深いレベルで対策）

**フィンガープリント精度**: Crawlee > Crawl4AI（fingerprint-suite のベイジアンネットワーク生成が高精度）

**Node.js 環境 (url-all v4)**: **Crawlee が有利**（ネイティブ JS 対応、fingerprint-suite 統合）

**Python 環境**: **Crawl4AI が有利**（UndetectedAdapter + LLM ネイティブ統合）

---

## 8. 最終推奨: url-all v4 ベスト構成

### 推奨アーキテクチャ

```
url-all v4 アンチボット対策スタック
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Layer 1: Patchright (Playwright API互換フォーク)
  └── CDP リーク修正 (Runtime.enable 排除)
  └── AutomationControlled フラグ無効化

Layer 2: fingerprint-suite (Apify)
  └── ベイジアンネットワークによるフィンガープリント生成
  └── Navigator, WebGL, Canvas, Screen 偽装
  └── ヘッダー生成 (header-generator)

Layer 3: 行動シミュレーション
  └── ghost-cursor (自然なマウス軌道)
  └── ランダム遅延・スクロール
  └── ページ内インタラクション

Layer 4: Proxy Manager (オプション)
  └── Residential Proxy (Decodo/BrightData)
  └── セッション管理・IP ローテーション

Layer 5: CAPTCHA Handler (フォールバック)
  └── NopeCHA 拡張 (AI ソルバー)
  └── 2Captcha API (人力ソルバー)
  └── 手動介入モード
```

### 具体的な npm パッケージ構成

```json
{
  "dependencies": {
    "patchright": "latest",
    "fingerprint-generator": "^2.1.80",
    "fingerprint-injector": "^2.1.80",
    "header-generator": "^2.1.80",
    "ghost-cursor": "^1.3.0"
  },
  "optionalDependencies": {
    "2captcha": "^3.0.0"
  }
}
```

### コスト見積り

| 構成 | 月額コスト | 対応レベル | 推奨用途 |
|---|---|---|---|
| Patchright + fingerprint-suite のみ | $0 (OSS) | Level 0-2 | 個人利用、基本的なスクレイピング |
| + Decodo Residential Proxy | ~$30/月 (5GB) | Level 0-3 | 中規模スクレイピング |
| + BrightData Scraping Browser | ~$100/月 | Level 0-4 | 商用利用 |
| + 2Captcha | ~$3/月 (1000 CAPTCHA) | Level 0-5 | CAPTCHA 頻出サイト |

### 法的・倫理的注意点

1. **robots.txt の遵守**: 自動化による大規模アクセスは robots.txt を確認すること
2. **利用規約**: 各サイトの利用規約でスクレイピングが禁止されている場合は遵守
3. **個人情報保護**: GDPR/個人情報保護法に基づく個人データの収集には法的根拠が必要
4. **アクセス頻度**: サーバーに過度な負荷をかけないレート制限の実装
5. **認証バイパス**: 不正アクセス防止法に抵触する可能性あり。自分のアカウントの自動化に限定
6. **CAPTCHA ソルバー**: CAPTCHA は「人間であることの証明」を目的としており、回避は利用規約違反の可能性
7. **商用利用**: 収集データの商用利用はサイトのライセンスを確認

---

## ソース

### Cookie 管理
- [Managing Cookies using Playwright | BrowserStack](https://www.browserstack.com/guide/playwright-cookies)
- [Using Playwright's storageState for Persistent Authentication](https://medium.com/@byteAndStream/using-playwrights-storagestate-for-persistent-authentication-f5b7384995d6)
- [BrowserContext | Playwright](https://playwright.dev/docs/api/class-browsercontext)
- [Version 1.8.0 doesn't read secure cookies - Issue #5215](https://github.com/microsoft/playwright/issues/5215)
- [Set cookies in Playwright to bypass cookiepopups](https://www.programmablebrowser.com/posts/use-cookies-accept-consent/)

### アンチボットシステム
- [Cloudflare Bypass Playwright](https://github.com/HasData/cloudflare-bypass)
- [CloudflareBypassForScraping](https://github.com/sarperavci/CloudflareBypassForScraping)
- [How to Bypass Akamai when Web Scraping in 2026](https://scrapfly.io/blog/posts/how-to-bypass-akamai-anti-scraping)
- [How to Bypass PerimeterX in 2026](https://www.zenrows.com/blog/perimeterx-bypass)
- [How to Bypass DataDome: Complete Guide 2026](https://www.zenrows.com/blog/datadome-bypass)
- [DataDome Anti-detect tools](https://datadome.co/anti-detect-tools/)
- [CAPTCHA Bypass Methods for Browser Automation 2025](https://www.skyvern.com/blog/best-way-to-bypass-captcha-for-ai-browser-automation-september-2025/)

### ステルスツール
- [Patchright - Undetected Playwright Fork](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright)
- [rebrowser-patches](https://github.com/rebrowser/rebrowser-patches)
- [Camoufox Anti-detect Browser](https://github.com/daijro/camoufox)
- [fingerprint-suite by Apify](https://github.com/apify/fingerprint-suite)
- [playwright-extra on npm](https://www.npmjs.com/package/playwright-extra)
- [NopeCHA Extension](https://github.com/NopeCHALLC/nopecha-extension)
- [CDP-Patches](https://github.com/Kaliiiiiiiiii-Vinyzu/CDP-Patches)

### フィンガープリント偽装
- [Browser Fingerprint Spoofing Explained](https://www.browsercat.com/post/browser-fingerprint-spoofing-explained)
- [How to Make Playwright Undetectable | ScrapeOps](https://scrapeops.io/playwright-web-scraping-playbook/nodejs-playwright-make-playwright-undetectable/)
- [Avoiding Bot Detection with Playwright Stealth](https://brightdata.com/blog/how-tos/avoid-bot-detection-with-playwright-stealth)
- [From Puppeteer Stealth to Nodriver](https://blog.castle.io/from-puppeteer-stealth-to-nodriver-how-anti-detect-frameworks-evolved-to-evade-bot-detection/)

### プロキシ
- [Bright Data vs Oxylabs Comparison 2026](https://brightdata.com/blog/comparison/bright-data-vs-oxylabs)
- [Best Scraping Browsers '26: Bright Data vs Oxylabs vs Zyte](https://research.aimultiple.com/scraping-browser/)
- [10 Best Residential Proxy Providers in 2025](https://www.joinmassive.com/blog/best-residential-proxy-providers)

### クローラー
- [Crawl4AI Undetected Browser](https://docs.crawl4ai.com/advanced/undetected-browser/)
- [Crawlee: Avoid Getting Blocked](https://crawlee.dev/js/docs/guides/avoid-blocking)
- [How to use fingerprint-suite in 5 steps in 2026](https://roundproxies.com/blog/fingerprint-suite/)
