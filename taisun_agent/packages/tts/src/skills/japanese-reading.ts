/**
 * Japanese Reading Skill
 *
 * 日本語テキストをTTS用に前処理するスキル
 * Issue #21 の日本語読み上げルールを実装
 */

import type { JapaneseReadingRule, JapanesePreprocessOptions } from "../types.js";

/**
 * 数字の読み方変換ルール
 */
export const NUMBER_READING_RULES: JapaneseReadingRule[] = [
  // 年
  { pattern: /(\d{4})年/g, reading: "$1ねん", category: "number" },
  // 円
  { pattern: /(\d+)億円/g, reading: "$1おくえん", category: "number" },
  { pattern: /(\d+)万円/g, reading: "$1まんえん", category: "number" },
  { pattern: /(\d+)千円/g, reading: "$1せんえん", category: "number" },
  { pattern: /(\d+)円/g, reading: "$1えん", category: "number" },
  // パーセント
  { pattern: /(\d+)%/g, reading: "$1パーセント", category: "number" },
  // ヶ月
  { pattern: /1ヶ月/g, reading: "いっかげつ", category: "number" },
  { pattern: /(\d+)ヶ月/g, reading: "$1かげつ", category: "number" },
  // 日間
  { pattern: /2日間/g, reading: "ふつかかん", category: "number" },
  { pattern: /(\d+)日間/g, reading: "$1にちかん", category: "number" },
  // 大
  { pattern: /7大/g, reading: "ななだい", category: "number" },
];

/**
 * 英語略語の読み方変換ルール
 */
export const ABBREVIATION_READING_RULES: JapaneseReadingRule[] = [
  { pattern: /\bAI\b/g, reading: "えーあい", category: "abbreviation" },
  { pattern: /\bSNS\b/g, reading: "えすえぬえす", category: "abbreviation" },
  { pattern: /\bWEB\b/gi, reading: "うぇぶ", category: "abbreviation" },
  { pattern: /\bLINE\b/g, reading: "らいん", category: "abbreviation" },
  { pattern: /\bGPTs?\b/g, reading: "じーぴーてぃーず", category: "abbreviation" },
  { pattern: /\bKindle\b/gi, reading: "きんどる", category: "abbreviation" },
  { pattern: /\bYouTube\b/gi, reading: "ゆーちゅーぶ", category: "abbreviation" },
  { pattern: /\bX\b/g, reading: "えっくす", category: "abbreviation" },
  { pattern: /\bLP\b/g, reading: "えるぴー", category: "abbreviation" },
  { pattern: /\bVSL\b/g, reading: "ぶいえすえる", category: "abbreviation" },
  { pattern: /\bAPI\b/g, reading: "えーぴーあい", category: "abbreviation" },
  { pattern: /\bPDF\b/g, reading: "ぴーでぃーえふ", category: "abbreviation" },
  { pattern: /\bURL\b/g, reading: "ゆーあーるえる", category: "abbreviation" },
  { pattern: /\bQR\b/g, reading: "きゅーあーる", category: "abbreviation" },
  { pattern: /\bCTA\b/g, reading: "しーてぃーえー", category: "abbreviation" },
  { pattern: /\bROI\b/g, reading: "あーるおーあい", category: "abbreviation" },
  { pattern: /\bKPI\b/g, reading: "けーぴーあい", category: "abbreviation" },
];

/**
 * 四字熟語の読み方変換ルール
 */
export const IDIOM_READING_RULES: JapaneseReadingRule[] = [
  { pattern: /虎視眈々/g, reading: "こしたんたん", category: "idiom" },
  { pattern: /門外不出/g, reading: "もんがいふしゅつ", category: "idiom" },
  { pattern: /下剋上/g, reading: "げこくじょう", category: "idiom" },
  { pattern: /一石二鳥/g, reading: "いっせきにちょう", category: "idiom" },
  { pattern: /一網打尽/g, reading: "いちもうだじん", category: "idiom" },
  { pattern: /起死回生/g, reading: "きしかいせい", category: "idiom" },
];

/**
 * ビジネス用語の読み方変換ルール
 */
export const BUSINESS_READING_RULES: JapaneseReadingRule[] = [
  { pattern: /先行者利益/g, reading: "せんこうしゃりえき", category: "business" },
  { pattern: /累計売上/g, reading: "るいけいうりあげ", category: "business" },
  { pattern: /緊急開催/g, reading: "きんきゅうかいさい", category: "business" },
  { pattern: /期間限定/g, reading: "きかんげんてい", category: "business" },
  { pattern: /先着限定/g, reading: "せんちゃくげんてい", category: "business" },
  { pattern: /無料公開/g, reading: "むりょうこうかい", category: "business" },
  { pattern: /独自開発/g, reading: "どくじかいはつ", category: "business" },
  { pattern: /完全網羅/g, reading: "かんぜんもうら", category: "business" },
  { pattern: /徹底解説/g, reading: "てっていかいせつ", category: "business" },
  { pattern: /実績公開/g, reading: "じっせきこうかい", category: "business" },
];

/**
 * 数字を日本語読みに変換
 */
export function convertNumberToJapanese(num: number): string {
  const units = ["", "万", "億", "兆"];
  const digits = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];
  const tens = ["", "じゅう", "にじゅう", "さんじゅう", "よんじゅう", "ごじゅう", "ろくじゅう", "ななじゅう", "はちじゅう", "きゅうじゅう"];
  const hundreds = ["", "ひゃく", "にひゃく", "さんびゃく", "よんひゃく", "ごひゃく", "ろっぴゃく", "ななひゃく", "はっぴゃく", "きゅうひゃく"];
  const thousands = ["", "せん", "にせん", "さんぜん", "よんせん", "ごせん", "ろくせん", "ななせん", "はっせん", "きゅうせん"];

  if (num === 0) return "ぜろ";
  if (num < 0) return "まいなす" + convertNumberToJapanese(-num);

  let result = "";
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 10000;
    if (chunk > 0) {
      let chunkStr = "";
      const ones = chunk % 10;
      const tensPlace = Math.floor((chunk % 100) / 10);
      const hundredsPlace = Math.floor((chunk % 1000) / 100);
      const thousandsPlace = Math.floor(chunk / 1000);

      if (thousandsPlace > 0) chunkStr += thousands[thousandsPlace];
      if (hundredsPlace > 0) chunkStr += hundreds[hundredsPlace];
      if (tensPlace > 0) chunkStr += tens[tensPlace];
      if (ones > 0 && tensPlace === 0) chunkStr += digits[ones];

      result = chunkStr + units[unitIndex] + result;
    }
    num = Math.floor(num / 10000);
    unitIndex++;
  }

  return result;
}

/**
 * 全てのルールを適用してテキストを前処理
 */
export function preprocessJapaneseText(
  text: string,
  options: JapanesePreprocessOptions = {}
): string {
  let result = text;

  // 数字変換
  if (options.convertNumbers !== false) {
    for (const rule of NUMBER_READING_RULES) {
      if (typeof rule.pattern === "string") {
        result = result.split(rule.pattern).join(rule.reading);
      } else {
        result = result.replace(rule.pattern, rule.reading);
      }
    }
  }

  // 英語略語変換
  if (options.convertAbbreviations !== false) {
    for (const rule of ABBREVIATION_READING_RULES) {
      if (typeof rule.pattern === "string") {
        result = result.split(rule.pattern).join(rule.reading);
      } else {
        result = result.replace(rule.pattern, rule.reading);
      }
    }
  }

  // 四字熟語
  for (const rule of IDIOM_READING_RULES) {
    if (typeof rule.pattern === "string") {
      result = result.split(rule.pattern).join(rule.reading);
    } else {
      result = result.replace(rule.pattern, rule.reading);
    }
  }

  // ビジネス用語
  for (const rule of BUSINESS_READING_RULES) {
    if (typeof rule.pattern === "string") {
      result = result.split(rule.pattern).join(rule.reading);
    } else {
      result = result.replace(rule.pattern, rule.reading);
    }
  }

  // カスタムルール
  if (options.customRules) {
    for (const rule of options.customRules) {
      if (typeof rule.pattern === "string") {
        result = result.split(rule.pattern).join(rule.reading);
      } else {
        result = result.replace(rule.pattern, rule.reading);
      }
    }
  }

  return result;
}

/**
 * テキストを適切な長さのセグメントに分割
 */
export function segmentText(
  text: string,
  options: {
    maxSeconds?: number;
    moraPerSecond?: number;
  } = {}
): string[] {
  const maxSeconds = options.maxSeconds || 30;
  const moraPerSecond = options.moraPerSecond || 6;
  const maxMora = maxSeconds * moraPerSecond;

  // 句点で分割
  const sentences = text.split(/(?<=[。！？\n])/);
  const segments: string[] = [];
  let currentSegment = "";
  let currentMora = 0;

  for (const sentence of sentences) {
    const sentenceMora = estimateMoraCount(sentence);

    if (currentMora + sentenceMora > maxMora && currentSegment) {
      segments.push(currentSegment.trim());
      currentSegment = sentence;
      currentMora = sentenceMora;
    } else {
      currentSegment += sentence;
      currentMora += sentenceMora;
    }
  }

  if (currentSegment.trim()) {
    segments.push(currentSegment.trim());
  }

  return segments;
}

/**
 * テキストのモーラ数を推定
 */
export function estimateMoraCount(text: string): number {
  // ひらがな・カタカナは1モーラ
  // 漢字は平均2モーラと仮定
  // 記号は0モーラ

  let count = 0;

  for (const char of text) {
    const code = char.charCodeAt(0);

    // ひらがな (0x3040-0x309F)
    if (code >= 0x3040 && code <= 0x309f) {
      // 小文字は0.5モーラ扱い
      if ("ぁぃぅぇぉっゃゅょゎ".includes(char)) {
        count += 0.5;
      } else {
        count += 1;
      }
    }
    // カタカナ (0x30A0-0x30FF)
    else if (code >= 0x30a0 && code <= 0x30ff) {
      if ("ァィゥェォッャュョヮ".includes(char)) {
        count += 0.5;
      } else if (char === "ー") {
        count += 1; // 長音
      } else {
        count += 1;
      }
    }
    // 漢字 (0x4E00-0x9FFF)
    else if (code >= 0x4e00 && code <= 0x9fff) {
      count += 2; // 平均2モーラ
    }
    // 半角英数字
    else if (/[a-zA-Z0-9]/.test(char)) {
      count += 0.5; // 概算
    }
  }

  return Math.ceil(count);
}

/**
 * セールスコピーの感情パラメータ推奨値
 */
export const EMOTION_PRESETS = {
  /** 問題提起（Pain） - やや低め、共感 */
  pain: {
    temperature: 0.75,
    topK: 25,
    topP: 0.88,
    description: "問題提起：やや低め、共感を込めて、ゆっくりめ",
  },
  /** 転換（Bridge） - 希望を感じさせる */
  bridge: {
    temperature: 0.8,
    topK: 30,
    topP: 0.9,
    description: "転換：希望を感じさせる上昇、徐々に速度を上げる",
  },
  /** 権威付け（Authority） - 自信に満ちた声 */
  authority: {
    temperature: 0.78,
    topK: 28,
    topP: 0.88,
    description: "権威付け：自信に満ちた声、落ち着いたペース",
  },
  /** ベネフィット（Benefit） - 明るく期待感 */
  benefit: {
    temperature: 0.85,
    topK: 35,
    topP: 0.92,
    description: "ベネフィット：明るく、期待感を煽る、やや速め",
  },
  /** CTA（Call to Action） - 緊急性 */
  cta: {
    temperature: 0.88,
    topK: 38,
    topP: 0.9,
    description: "CTA：緊急性、切迫感、メリハリをつける",
  },
  /** デフォルト - バランス */
  default: {
    temperature: 0.8,
    topK: 30,
    topP: 0.9,
    description: "デフォルト：バランスの取れた設定",
  },
} as const;

export type EmotionPreset = keyof typeof EMOTION_PRESETS;
