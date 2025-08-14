#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { evaluateDataset, LabeledItem } from '../src/metrics';

function main() {
  const root = process.cwd();
  const testsetPath = path.join(root, 'services', 'ai-bot', 'testset.json');
  const raw = fs.readFileSync(testsetPath, 'utf8');
  const items: LabeledItem[] = JSON.parse(raw);

  // Stub classifier consistent with ai-bot
  const classify = (text: string) => {
    const t = text.toLowerCase();
    let intent: 'support'|'sales'|'billing'|'unknown' = 'unknown';
    if (/(bug|error|help|issue|crash|broken)/.test(t)) intent = 'support';
    else if (/(price|buy|quote|demo|sales)/.test(t)) intent = 'sales';
    else if (/(invoice|billing|charge|refund|receipt|payment)/.test(t)) intent = 'billing';
    const confidence = intent === 'unknown' ? 0.4 : 0.9;
    return { intent, confidence };
  };

  const res = evaluateDataset(items, classify);
  const outDir = path.join(root, 'docs', 'ai', 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const now = new Date().toISOString().slice(0,10);
  const md = renderMarkdown(res, now);
  const outPath = path.join(outDir, `${now}.md`);
  fs.writeFileSync(outPath, md, 'utf8');

  const overallOk = res.accuracy >= 0.92;
  const unknownPrecision = res.perIntent['unknown'].precision;
  const unknownOk = unknownPrecision >= 0.95;
  if (!overallOk || !unknownOk) {
    console.error(`Eval gate failed: accuracy=${res.accuracy.toFixed(3)} unknownPrecision=${unknownPrecision.toFixed(3)}`);
    process.exit(1);
  }
  console.log(`Eval passed: ${outPath}`);
}

function renderMarkdown(res: ReturnType<typeof evaluateDataset>, date: string): string {
  const lines: string[] = [];
  lines.push(`# AI Eval Report — ${date}`);
  lines.push('');
  lines.push(`- Total: ${res.total}`);
  lines.push(`- Accuracy: ${(res.accuracy*100).toFixed(2)}%`);
  lines.push(`- Unknown AUROC: ${(res.unknownAUROC*100).toFixed(2)}%`);
  lines.push(`- Proposed Unknown Threshold: ${res.proposedUnknownThreshold.toFixed(2)}`);
  lines.push('');
  lines.push('## Per-Intent Metrics');
  for (const [k, m] of Object.entries(res.perIntent)) {
    lines.push(`- ${k}: P=${(m.precision*100).toFixed(1)}% R=${(m.recall*100).toFixed(1)}% F1=${(m.f1*100).toFixed(1)}%`);
  }
  lines.push('');
  lines.push('## Confusion Matrix');
  const intents = Object.keys(res.confusion);
  lines.push(['intent', ...intents].join(','));
  for (const i of intents) {
    lines.push([i, ...intents.map(j=> String(res.confusion[i][j]))].join(','));
  }
  return lines.join('\n');
}

main();
