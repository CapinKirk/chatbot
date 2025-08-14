import { z } from 'zod';

export const MessageRole = z.enum(['user','agent','system','bot']);

export const MessageSchema = z.object({
  id: z.string().uuid().optional(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid().nullable().optional(),
  role: MessageRole,
  content: z.string().min(1),
  createdAt: z.string().datetime().optional(),
});

export const ConversationSchema = z.object({
  id: z.string().uuid().optional(),
  status: z.enum(['open','assigned','closed']).default('open'),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const RouteDecisionSchema = z.object({
  id: z.string().uuid().optional(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  intent: z.enum(['support','sales','billing','unknown']),
  confidence: z.number().min(0).max(1),
  destinationType: z.enum(['user','queue','triage']),
  destinationId: z.string().uuid().nullable(),
  modelVersion: z.string(),
  promptId: z.string(),
  thresholdRoute: z.number().min(0).max(1),
  thresholdUnknown: z.number().min(0).max(1),
  mode: z.enum(['live','shadow']).default('live'),
  reason: z.enum(['ok','low_confidence','timeout','error','provider_rate_limited','manual_override']).default('ok'),
  createdAt: z.string().datetime().optional(),
});

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() })
});

export const SenderSchema = z.object({
  type: z.enum(['user','agent','system','bot']),
  id: z.string().uuid().nullable(),
});

export const AttachmentSchema = z.object({
  type: z.literal('url'),
  mime: z.string(),
  url: z.string().url(),
});

export const ClassifyRequestSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  tenantId: z.string().uuid(),
  sender: SenderSchema,
  text: z.string().min(1).max(4000),
  lang: z.union([z.literal('auto'), z.string()]).default('auto'),
  contentType: z.literal('text/plain').default('text/plain'),
  source: z.enum(['web','email','api']).default('api'),
  attachments: z.array(AttachmentSchema).optional().default([]),
  requestId: z.string().uuid().optional(),
  traceId: z.string().uuid().optional(),
  hints: z.object({
    preferredIntents: z.array(z.enum(['support','sales','billing'])).optional().default([]),
    priority: z.enum(['low','normal','high']).optional().default('normal'),
  }).optional().default({}),
});

export const ClassifyResponseSchema = z.object({
  intent: z.enum(['support','sales','billing','unknown']),
  confidence: z.number().min(0).max(1),
  destination: z.union([
    z.object({ type: z.literal('triage'), id: z.null() }),
    z.object({ type: z.literal('queue'), id: z.string().uuid() }),
    z.object({ type: z.literal('user'), id: z.string().uuid() })
  ]),
  modelVersion: z.string(),
  promptId: z.string(),
  thresholds: z.object({ route: z.number(), unknown: z.number() }),
  latencyMs: z.number().int().nonnegative(),
  requestId: z.string().uuid(),
  traceId: z.string().uuid(),
  explanations: z.object({
    features: z.array(z.string()).optional().default([]),
    notes: z.string().optional().default(''),
  }).optional().default({ features: [], notes: '' }),
});


