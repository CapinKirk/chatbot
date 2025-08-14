export type MessageRole = 'user' | 'agent' | 'system' | 'bot';

export interface Conversation {
  id: string;
  status: 'open' | 'assigned' | 'closed';
}

export interface MessageInput {
  conversationId: string;
  content: string;
}

export interface RouteDecision {
  intent: 'support' | 'sales' | 'billing' | 'unknown';
  confidence: number;
  destination: { type: 'user' | 'queue' | 'triage'; id?: string };
  modelVersion: string;
  promptId: string;
}


