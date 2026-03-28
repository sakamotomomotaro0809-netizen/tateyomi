/**
 * Decision Tree Classifier
 *
 * ID3ベース、最大深度5
 * 情報利得によるスプリット
 * Bayes不確実ケース（<70%信頼度）のフォールバック
 * <0.5ms 推論
 */

import { RiskLevel, ExecutionRecord } from '../types';
import { getFeatureExtractor, FeatureExtractor } from './feature-extractor';

interface TreeNode {
  featureIndex: number | null;
  threshold: number;
  label: RiskLevel | null;
  left: TreeNode | null;
  right: TreeNode | null;
}

interface TrainingRow {
  features: number[];
  label: RiskLevel;
}

const MAX_DEPTH = 5;
const MIN_SAMPLES_SPLIT = 5;

export class DecisionTreeClassifier {
  private root: TreeNode | null = null;
  private readonly extractor: FeatureExtractor = getFeatureExtractor();
  private trainedSampleCount = 0;

  train(records: ExecutionRecord[]): void {
    if (records.length < MIN_SAMPLES_SPLIT) return;

    const rows: TrainingRow[] = records.map((r) => ({
      features: this.extractor.toArray(r.features),
      label: r.riskLevel,
    }));

    this.root = this.buildTree(rows, 0);
    this.trainedSampleCount = records.length;
  }

  predict(features: number[]): { riskLevel: RiskLevel; confidence: number } {
    if (!this.root) {
      return { riskLevel: 'medium', confidence: 0 };
    }

    return this.traverse(this.root, features);
  }

  private buildTree(rows: TrainingRow[], depth: number): TreeNode {
    if (depth >= MAX_DEPTH || rows.length < MIN_SAMPLES_SPLIT) {
      return this.createLeaf(rows);
    }

    const labelCounts = this.countLabels(rows);
    const uniqueLabels = Object.keys(labelCounts);
    if (uniqueLabels.length <= 1) {
      return this.createLeaf(rows);
    }

    const bestSplit = this.findBestSplit(rows);
    if (bestSplit.gain <= 0) {
      return this.createLeaf(rows);
    }

    const { leftRows, rightRows } = this.splitRows(
      rows,
      bestSplit.featureIndex,
      bestSplit.threshold
    );

    if (leftRows.length === 0 || rightRows.length === 0) {
      return this.createLeaf(rows);
    }

    return {
      featureIndex: bestSplit.featureIndex,
      threshold: bestSplit.threshold,
      label: null,
      left: this.buildTree(leftRows, depth + 1),
      right: this.buildTree(rightRows, depth + 1),
    };
  }

  private createLeaf(rows: TrainingRow[]): TreeNode {
    const counts = this.countLabels(rows);
    let bestLabel: RiskLevel = 'medium';
    let bestCount = 0;

    for (const [label, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        bestLabel = label as RiskLevel;
      }
    }

    return {
      featureIndex: null,
      threshold: 0,
      label: bestLabel,
      left: null,
      right: null,
    };
  }

  private traverse(node: TreeNode, features: number[]): { riskLevel: RiskLevel; confidence: number } {
    if (node.label !== null) {
      return { riskLevel: node.label, confidence: 70 };
    }

    if (node.featureIndex === null) {
      return { riskLevel: 'medium', confidence: 50 };
    }

    const value = features[node.featureIndex] ?? 0;
    if (value <= node.threshold) {
      return node.left ? this.traverse(node.left, features) : { riskLevel: 'medium', confidence: 50 };
    }
    return node.right ? this.traverse(node.right, features) : { riskLevel: 'medium', confidence: 50 };
  }

  private findBestSplit(rows: TrainingRow[]): { featureIndex: number; threshold: number; gain: number } {
    const numFeatures = rows[0].features.length;
    const parentEntropy = this.entropy(rows);
    let bestGain = -1;
    let bestFeatureIndex = 0;
    let bestThreshold = 0.5;

    for (let fi = 0; fi < numFeatures; fi++) {
      const threshold = 0.5;
      const { leftRows, rightRows } = this.splitRows(rows, fi, threshold);

      if (leftRows.length === 0 || rightRows.length === 0) continue;

      const leftWeight = leftRows.length / rows.length;
      const rightWeight = rightRows.length / rows.length;
      const gain = parentEntropy -
        leftWeight * this.entropy(leftRows) -
        rightWeight * this.entropy(rightRows);

      if (gain > bestGain) {
        bestGain = gain;
        bestFeatureIndex = fi;
        bestThreshold = threshold;
      }
    }

    return { featureIndex: bestFeatureIndex, threshold: bestThreshold, gain: bestGain };
  }

  private splitRows(
    rows: TrainingRow[],
    featureIndex: number,
    threshold: number
  ): { leftRows: TrainingRow[]; rightRows: TrainingRow[] } {
    const leftRows: TrainingRow[] = [];
    const rightRows: TrainingRow[] = [];

    for (const row of rows) {
      if (row.features[featureIndex] <= threshold) {
        leftRows.push(row);
      } else {
        rightRows.push(row);
      }
    }

    return { leftRows, rightRows };
  }

  private entropy(rows: TrainingRow[]): number {
    if (rows.length === 0) return 0;

    const counts = this.countLabels(rows);
    let ent = 0;

    for (const count of Object.values(counts)) {
      const p = count / rows.length;
      if (p > 0) {
        ent -= p * Math.log2(p);
      }
    }

    return ent;
  }

  private countLabels(rows: TrainingRow[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.label] = (counts[row.label] || 0) + 1;
    }
    return counts;
  }

  get isTrained(): boolean {
    return this.root !== null;
  }

  get sampleCount(): number {
    return this.trainedSampleCount;
  }
}

let treeInstance: DecisionTreeClassifier | null = null;

export function getDecisionTree(): DecisionTreeClassifier {
  if (!treeInstance) {
    treeInstance = new DecisionTreeClassifier();
  }
  return treeInstance;
}

export function resetDecisionTree(): void {
  treeInstance = null;
}
