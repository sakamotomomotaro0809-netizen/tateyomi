#!/usr/bin/env node
/**
 * Deterministic Reference Analyzer
 *
 * 参考入力（画像/動画/ファイル/URL）を決定的に解析し、
 * sha256/寸法/メタデータ/特徴量を artifacts/reference_analysis.json に保存。
 *
 * Usage:
 *   node scripts/analyze_reference_asset.js --path /path/to/image.png
 *   node scripts/analyze_reference_asset.js --path /path/to/video.mp4
 *   node scripts/analyze_reference_asset.js --url https://example.com/image.png
 *
 * Output:
 *   artifacts/reference_analysis.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const OUTPUT_PATH = 'artifacts/reference_analysis.json';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.path && !args.url) {
    console.error('Usage: analyze_reference_asset.js --path <file> | --url <url>');
    process.exit(1);
  }

  const cwd = process.cwd();
  const outputPath = path.join(cwd, OUTPUT_PATH);

  // artifacts ディレクトリ作成
  const artifactsDir = path.dirname(outputPath);
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // 既存の分析結果を読み込み
  let existingAnalysis = { assets: [] };
  if (fs.existsSync(outputPath)) {
    try {
      existingAnalysis = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    } catch (e) {
      existingAnalysis = { assets: [] };
    }
  }

  let assetAnalysis;

  if (args.path) {
    assetAnalysis = await analyzeFile(args.path, args.id);
  } else if (args.url) {
    assetAnalysis = await analyzeUrl(args.url, args.id);
  }

  if (!assetAnalysis) {
    console.error('Failed to analyze asset');
    process.exit(1);
  }

  // 重複チェック（同じsha256があれば更新）
  const existingIndex = existingAnalysis.assets.findIndex(a => a.sha256 === assetAnalysis.sha256);
  if (existingIndex >= 0) {
    existingAnalysis.assets[existingIndex] = assetAnalysis;
    console.log(`Updated existing asset: ${assetAnalysis.asset_id}`);
  } else {
    existingAnalysis.assets.push(assetAnalysis);
    console.log(`Added new asset: ${assetAnalysis.asset_id}`);
  }

  existingAnalysis.last_updated = new Date().toISOString();

  // 保存
  fs.writeFileSync(outputPath, JSON.stringify(existingAnalysis, null, 2), 'utf8');
  console.log(`Saved to: ${outputPath}`);

  // 結果を出力
  console.log(JSON.stringify(assetAnalysis, null, 2));
}

/**
 * ファイルを解析
 */
async function analyzeFile(filePath, customId) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    return null;
  }

  const content = fs.readFileSync(absolutePath);
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  const stats = fs.statSync(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();

  const assetType = detectAssetType(ext);
  const assetId = customId || `${assetType}_${sha256.substring(0, 8)}`;

  const analysis = {
    asset_id: assetId,
    type: assetType,
    source: 'file',
    path: absolutePath,
    sha256: sha256,
    metadata: {
      filename: path.basename(absolutePath),
      extension: ext,
      size_bytes: stats.size,
      modified_at: stats.mtime.toISOString()
    },
    derived_features: {},
    timestamp: new Date().toISOString()
  };

  // タイプ別の特徴量抽出
  if (assetType === 'image') {
    analysis.derived_features = await extractImageFeatures(absolutePath);
  } else if (assetType === 'video') {
    analysis.derived_features = await extractVideoFeatures(absolutePath);
  }

  return analysis;
}

/**
 * URLを解析（メタデータのみ）
 */
async function analyzeUrl(url, customId) {
  const assetId = customId || `url_${crypto.createHash('sha256').update(url).digest('hex').substring(0, 8)}`;

  return {
    asset_id: assetId,
    type: 'url',
    source: 'url',
    url: url,
    sha256: crypto.createHash('sha256').update(url).digest('hex'),
    metadata: {
      url: url
    },
    derived_features: {},
    timestamp: new Date().toISOString()
  };
}

/**
 * 拡張子からアセットタイプを検出
 */
function detectAssetType(ext) {
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];

  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  return 'file';
}

/**
 * 画像の特徴量を抽出
 */
async function extractImageFeatures(filePath) {
  const features = {
    width: null,
    height: null,
    format: path.extname(filePath).toLowerCase().replace('.', '')
  };

  // file コマンドで寸法を取得（macOS/Linux）
  try {
    const output = execSync(`file "${filePath}"`, { encoding: 'utf8' });
    const sizeMatch = output.match(/(\d+)\s*x\s*(\d+)/);
    if (sizeMatch) {
      features.width = parseInt(sizeMatch[1], 10);
      features.height = parseInt(sizeMatch[2], 10);
    }
  } catch (e) {
    // file コマンドが使えない場合はスキップ
  }

  // PNG ヘッダーから寸法を取得（fallback）
  if (!features.width && filePath.toLowerCase().endsWith('.png')) {
    try {
      const buffer = fs.readFileSync(filePath);
      if (buffer.length > 24) {
        features.width = buffer.readUInt32BE(16);
        features.height = buffer.readUInt32BE(20);
      }
    } catch (e) {}
  }

  return features;
}

/**
 * 動画の特徴量を抽出
 */
async function extractVideoFeatures(filePath) {
  const features = {
    duration_sec: null,
    fps: null,
    frame_hashes_sampled: []
  };

  // ffprobe で情報取得（インストールされている場合）
  try {
    const output = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      { encoding: 'utf8' }
    );
    const info = JSON.parse(output);

    if (info.format && info.format.duration) {
      features.duration_sec = parseFloat(info.format.duration);
    }

    const videoStream = info.streams?.find(s => s.codec_type === 'video');
    if (videoStream) {
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/');
        features.fps = parseFloat(num) / parseFloat(den || 1);
      }
      features.width = videoStream.width;
      features.height = videoStream.height;
    }
  } catch (e) {
    // ffprobe が使えない場合はスキップ
  }

  return features;
}

/**
 * 引数パース
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--path' && argv[i + 1]) {
      args.path = argv[++i];
    } else if (argv[i] === '--url' && argv[i + 1]) {
      args.url = argv[++i];
    } else if (argv[i] === '--id' && argv[i + 1]) {
      args.id = argv[++i];
    }
  }
  return args;
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
