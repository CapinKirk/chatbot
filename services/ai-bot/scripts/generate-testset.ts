#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';

const support = ['bug', 'error', 'help', 'issue', 'crash', 'broken'];
const sales = ['price', 'buy', 'quote', 'demo', 'sales'];
const billing = ['invoice', 'billing', 'charge', 'refund', 'receipt', 'payment'];
const unknown = ['hello', 'good morning', 'how are you', 'what is up', 'tell me more', 'general question'];

function gen(intents: Array<{ label: string; words: string[] }>, per = 125) {
  const out: Array<{ text: string; intent: string }> = [];
  for (const { label, words } of intents) {
    for (let i = 0; i < per; i++) {
      const w = words[Math.floor(Math.random() * words.length)];
      const prefix = [
        'I need', 'Please', 'Can you', 'Could you', 'I want to', 'We have', 'There is', 'My account has'
      ][Math.floor(Math.random() * 8)];
      const tail = [
        'ASAP', 'now', 'today', 'soon', 'please', 'thanks'
      ][Math.floor(Math.random() * 6)];
      const text = `${prefix} ${w} ${tail}`;
      out.push({ text, intent: label });
    }
  }
  return out;
}

const items = gen([
  { label: 'support', words: support },
  { label: 'sales', words: sales },
  { label: 'billing', words: billing },
  { label: 'unknown', words: unknown },
]);

const target = path.join(process.cwd(), 'services', 'ai-bot', 'testset.json');
fs.writeFileSync(target, JSON.stringify(items, null, 2), 'utf8');
console.log('Wrote', target, 'items=', items.length);

