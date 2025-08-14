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
  modelVersion: z.string(),
  promptId: z.string(),
  intent: z.enum(['support','sales','billing','unknown']),
  confidence: z.number().min(0).max(1),
  destinationType: z.enum(['user','queue','triage']),
  destinationId: z.string().uuid().nullable(),
  createdAt: z.string().datetime().optional(),
});

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() })
});

export const ClassifyRequestSchema = z.object({ text: z.string().min(1) });
export const ClassifyResponseSchema = z.object({
  intent: z.enum(['support','sales','billing','unknown']),
  confidence: z.number().min(0).max(1),
  destination: z.union([
    z.object({ type: z.literal('triage') }),
    z.object({ type: z.literal('queue'), id: z.string() }),
    z.object({ type: z.literal('user'), id: z.string().uuid() })
  ]),
  modelVersion: z.string(),
  promptId: z.string()
});


