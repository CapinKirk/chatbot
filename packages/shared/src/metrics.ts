import { z } from 'zod';

export type LabeledItem = { text: string; intent: 'support'|'sales'|'billing'|'unknown' };
export type Prediction = { intent: 'support'|'sales'|'billing'|'unknown'; confidence: number };

export type Classifier = (text: string) => Prediction;

export type Confusion = Record<string, Record<string, number>>;

export type PerIntentMetrics = Record<string, { tp: number; fp: number; fn: number; tn: number; precision: number; recall: number; f1: number }>;

export type EvalResult = {
  total: number;
  accuracy: number;
  perIntent: PerIntentMetrics;
  confusion: Confusion;
  unknownAUROC: number;
  proposedUnknownThreshold: number;
};

export function evaluateDataset(items: LabeledItem[], classify: Classifier): EvalResult {
  const intents = ['support','sales','billing','unknown'];
  const confusion: Confusion = Object.fromEntries(intents.map(i=> [i, Object.fromEntries(intents.map(j=> [j, 0]))]));
  const per: PerIntentMetrics = Object.fromEntries(intents.map(i=> [i, { tp:0, fp:0, fn:0, tn:0, precision:0, recall:0, f1:0 }]));

  const scores: Array<{ score: number; trueUnknown: boolean }> = [];

  let correct = 0;
  for (const it of items) {
    const p = classify(it.text);
    if (p.intent === it.intent) correct++;
    confusion[it.intent][p.intent]++;
    for (const k of intents) {
      if (k === it.intent) {
        if (k === p.intent) per[k].tp++; else per[k].fn++;
      } else {
        if (k === p.intent) per[k].fp++; else per[k].tn++;
      }
    }
    // For AUROC on unknown vs known
    const knownScore = p.intent === 'unknown' ? 1 - p.confidence : p.confidence;
    const trueUnknown = it.intent === 'unknown';
    scores.push({ score: knownScore, trueUnknown });
  }

  for (const k of intents) {
    const m = per[k];
    m.precision = safeDiv(m.tp, (m.tp + m.fp));
    m.recall = safeDiv(m.tp, (m.tp + m.fn));
    m.f1 = f1(m.precision, m.recall);
  }

  const unknownAUROC = computeAUROC(scores);
  const proposedUnknownThreshold = proposeUnknownThreshold(scores, 0.95);

  return {
    total: items.length,
    accuracy: safeDiv(correct, items.length),
    perIntent: per,
    confusion,
    unknownAUROC,
    proposedUnknownThreshold,
  };
}

export function computeAUROC(points: Array<{ score: number; trueUnknown: boolean }>): number {
  // Sort descending by score; compute ROC via thresholds at all unique scores
  const sorted = [...points].sort((a,b)=> b.score - a.score);
  const P = sorted.filter(p=> p.trueUnknown).length;
  const N = sorted.length - P;
  if (P === 0 || N === 0) return 0.5;
  let tp = 0, fp = 0, lastScore = Infinity;
  let auc = 0, prevFPR = 0, prevTPR = 0;
  for (const p of sorted) {
    if (p.score !== lastScore) {
      const tpr = tp / P;
      const fpr = fp / N;
      auc += trapezoid(prevFPR, prevTPR, fpr, tpr);
      prevTPR = tpr; prevFPR = fpr; lastScore = p.score;
    }
    if (p.trueUnknown) tp++; else fp++;
  }
  const tpr = tp / P; const fpr = fp / N;
  auc += trapezoid(prevFPR, prevTPR, fpr, tpr);
  return clamp01(auc);
}

export function proposeUnknownThreshold(points: Array<{ score: number; trueUnknown: boolean }>, targetPrecision: number): number {
  // Sweep thresholds 0..1 to find minimal threshold achieving precision target on unknown
  let best = 0.5;
  for (let t = 0; t <= 100; t++) {
    const thr = t / 100;
    let tp = 0, fp = 0;
    for (const p of points) {
      const predictedUnknown = p.score >= thr;
      if (predictedUnknown && p.trueUnknown) tp++;
      else if (predictedUnknown && !p.trueUnknown) fp++;
    }
    const precision = safeDiv(tp, tp + fp);
    if (precision >= targetPrecision) { best = thr; break; }
  }
  return best;
}

function trapezoid(x1: number, y1: number, x2: number, y2: number): number {
  return (x2 - x1) * (y1 + y2) / 2;
}

function safeDiv(a: number, b: number): number { return b === 0 ? 0 : a / b; }
function f1(p: number, r: number): number { return (p+r) === 0 ? 0 : 2*p*r/(p+r); }
function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }


