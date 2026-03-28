/**
 * Naive Bayes Classifier
 *
 * 特徴量の頻度カウント × リスクレベル
 * ラプラス平滑化
 * <0.5ms 推論
 */

import * as fs from 'fs';
import * as path from 'path';
import { RiskLevel, ExecutionRecord } from '../types';
import { getFeatureExtractor } from './feature-extractor';

const DEFAULT_MODEL_DIR = path.join(__dirname, '..', '..', '..', '.claude', 'hooks', 'data');
const MODEL_FILE = 'ml-model-bayes.json';
const LAPLACE_ALPHA = 1.0;

interface ClassStats {
  count: number;
  featureSums: number[];
}

interface BayesModel {
  version: number;
  trainedAt: number;
  sampleCount: number;
  classes: Record<RiskLevel, ClassStats>;
}

export class NaiveBayesClassifier {
  private model: BayesModel | null = null;
  private readonly modelPath: string;
  private readonly extractor = getFeatureExtractor();

  constructor(modelDir?: string) {
    const dir = modelDir || DEFAULT_MODEL_DIR;
    this.modelPath = path.join(dir, MODEL_FILE);
  }

  train(records: ExecutionRecord[]): void {
    if (records.length === 0) return;

    const classes: Record<RiskLevel, ClassStats> = {
      low: { count: 0, featureSums: new Array(22).fill(0) },
      medium: { count: 0, featureSums: new Array(22).fill(0) },
      high: { count: 0, featureSums: new Array(22).fill(0) },
    };

    for (const record of records) {
      const riskLevel = record.riskLevel;
      if (!classes[riskLevel]) continue;

      classes[riskLevel].count++;
      const features = this.extractor.toArray(record.features);
      for (let i = 0; i < features.length; i++) {
        classes[riskLevel].featureSums[i] += features[i];
      }
    }

    this.model = {
      version: 1,
      trainedAt: Date.now(),
      sampleCount: records.length,
      classes,
    };
  }

  predict(features: number[]): { riskLevel: RiskLevel; confidence: number } {
    if (!this.model || this.model.sampleCount === 0) {
      return { riskLevel: 'medium', confidence: 0 };
    }

    const totalSamples = this.model.sampleCount;
    const numFeatures = features.length;
    const scores: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };

    for (const level of ['low', 'medium', 'high'] as RiskLevel[]) {
      const cls = this.model.classes[level];
      const prior = (cls.count + LAPLACE_ALPHA) / (totalSamples + 3 * LAPLACE_ALPHA);
      let logProb = Math.log(prior);

      for (let i = 0; i < numFeatures; i++) {
        const featureProb = (cls.featureSums[i] + LAPLACE_ALPHA) /
          (cls.count + 2 * LAPLACE_ALPHA);

        if (features[i] > 0.5) {
          logProb += Math.log(featureProb);
        } else {
          logProb += Math.log(1 - featureProb);
        }
      }

      scores[level] = logProb;
    }

    let bestLevel: RiskLevel = 'medium';
    let bestScore = -Infinity;
    for (const level of ['low', 'medium', 'high'] as RiskLevel[]) {
      if (scores[level] > bestScore) {
        bestScore = scores[level];
        bestLevel = level;
      }
    }

    const maxScore = bestScore;
    let sumExp = 0;
    for (const level of ['low', 'medium', 'high'] as RiskLevel[]) {
      sumExp += Math.exp(scores[level] - maxScore);
    }
    const confidence = Math.round((1 / sumExp) * 100);

    return { riskLevel: bestLevel, confidence: Math.min(100, confidence) };
  }

  save(): void {
    if (!this.model) return;

    const dir = path.dirname(this.modelPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.modelPath, JSON.stringify(this.model), 'utf8');
  }

  load(): boolean {
    if (!fs.existsSync(this.modelPath)) return false;

    try {
      const content = fs.readFileSync(this.modelPath, 'utf8');
      this.model = JSON.parse(content) as BayesModel;
      return true;
    } catch {
      return false;
    }
  }

  get isTrained(): boolean {
    return this.model !== null && this.model.sampleCount > 0;
  }

  get sampleCount(): number {
    return this.model?.sampleCount ?? 0;
  }
}

let bayesInstance: NaiveBayesClassifier | null = null;

export function getNaiveBayes(modelDir?: string): NaiveBayesClassifier {
  if (!bayesInstance) {
    bayesInstance = new NaiveBayesClassifier(modelDir);
  }
  return bayesInstance;
}

export function resetNaiveBayes(): void {
  bayesInstance = null;
}
