type Conversation = { id: string; status: 'open'|'assigned'|'closed'; createdAt: string; updatedAt: string };
type Message = { id: string; conversationId: string; senderId?: string|null; role: 'user'|'agent'|'system'|'bot'; content: string; clientGeneratedId?: string; createdAt: string; seq?: number };
type RouteDecision = { id: string; conversationId: string; modelVersion: string; promptId: string; intent: string; confidence: number; destinationType: string; destinationId?: string|null; isShadow: boolean; createdAt: string };
type Subscription = { id: string; userId: string; endpoint: string; keys: any; createdAt: string; updatedAt: string };
type User = { id: string; email: string; displayName: string; avatarUrl?: string|null; active: boolean; source: string; createdAt: string; updatedAt: string };
type SyncLog = { id: string; type: string; status: string; details: any; createdAt: string };

async function getPrisma(): Promise<any | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    // Dynamic import to avoid requiring generated client when DB is not configured
    const mod: any = await import('@prisma/client');
    if (!(globalThis as any).__prisma) {
      (globalThis as any).__prisma = new mod.PrismaClient();
    }
    return (globalThis as any).__prisma as any;
  } catch {
    return null;
  }
}

const mem = {
  conversations: new Map<string, Conversation>(),
  messages: [] as Message[],
  decisions: [] as RouteDecision[],
  subs: [] as Subscription[],
  users: [] as User[],
  syncLogs: [] as SyncLog[],
};

// Per-conversation sequence pointers (in-memory). Prisma path derives seq from row order.
const memSeqPointers = new Map<string, number>();

export async function createConversation(): Promise<Conversation> {
  const now = new Date().toISOString();
  const prisma = await getPrisma();
  if (prisma) {
    const c = await prisma.conversation.create({ data: { status: 'open' } });
    return { id: c.id, status: c.status as any, createdAt: (c as any).createdAt?.toISOString?.() || now, updatedAt: (c as any).updatedAt?.toISOString?.() || now };
  }
  const id = cryptoRandomId();
  const c: Conversation = { id, status: 'open', createdAt: now, updatedAt: now };
  mem.conversations.set(id, c);
  return c;
}

export async function addMessage(input: Omit<Message,'id'|'createdAt'>): Promise<Message> {
  const now = new Date().toISOString();
  const prisma = await getPrisma();
  if (prisma) {
    try {
      const m = await prisma.message.create({ data: { ...input } });
      // Derive seq as count of rows for conversation after insert
      let seq = 1;
      try { seq = await prisma.message.count({ where: { conversationId: m.conversationId } }); } catch {}
      return { id: m.id, conversationId: m.conversationId, senderId: (m as any).senderId ?? null, role: m.role as any, content: m.content, clientGeneratedId: (m as any).clientGeneratedId, createdAt: (m as any).createdAt?.toISOString?.() || now, seq };
    } catch (e) {
      // On unique violation, return existing row
      if ((input as any).clientGeneratedId) {
        const m = await prisma.message.findFirst({ where: { conversationId: input.conversationId, clientGeneratedId: (input as any).clientGeneratedId } });
        if (m) {
          let seq = 1;
          try { seq = await prisma.message.count({ where: { conversationId: m.conversationId, createdAt: { lte: (m as any).createdAt } } }); } catch {}
          return { id: m.id, conversationId: m.conversationId, senderId: (m as any).senderId ?? null, role: m.role as any, content: m.content, clientGeneratedId: (m as any).clientGeneratedId, createdAt: (m as any).createdAt?.toISOString?.() || now, seq };
        }
      }
      throw e;
    }
  }
  // In-memory idempotency by clientGeneratedId
  if ((input as any).clientGeneratedId) {
    const found = mem.messages.find(x => x.conversationId === input.conversationId && x.clientGeneratedId === (input as any).clientGeneratedId);
    if (found) return found;
  }
  const nextSeq = (memSeqPointers.get(input.conversationId) || 0) + 1;
  memSeqPointers.set(input.conversationId, nextSeq);
  const m: Message = { id: cryptoRandomId(), ...input, createdAt: now, seq: nextSeq } as Message;
  mem.messages.push(m);
  return m;
}

export async function listMessages(conversationId: string, sinceIso?: string, sinceSeq?: number): Promise<Message[]> {
  const prisma = await getPrisma();
  if (prisma) {
    const where: any = { conversationId };
    if (sinceIso) where.createdAt = { gt: new Date(sinceIso) };
    const rows = await prisma.message.findMany({ where, orderBy: { createdAt: 'asc' } });
    let seq = 0;
    const mapped = rows.map((m: any) => ({ id: m.id, conversationId: m.conversationId, senderId: m.senderId ?? null, role: m.role, content: m.content, createdAt: m.createdAt?.toISOString?.() || new Date().toISOString(), seq: ++seq }));
    if (sinceSeq && sinceSeq > 0) return mapped.filter((r: any) => (r.seq || 0) > sinceSeq);
    return mapped;
  }
  let rows = mem.messages.filter(m => m.conversationId === conversationId);
  if (sinceIso) rows = rows.filter(m => m.createdAt > sinceIso);
  if (sinceSeq && sinceSeq > 0) rows = rows.filter(m => (m.seq || 0) > sinceSeq);
  return rows.sort((a,b)=> (a.seq || 0) - (b.seq || 0));
}

export async function saveDecision(input: Omit<RouteDecision,'id'|'createdAt'>): Promise<RouteDecision> {
  const now = new Date().toISOString();
  const prisma = await getPrisma();
  if (prisma) {
    const d = await prisma.routeDecision.create({ data: { ...input } });
    return { id: d.id, conversationId: d.conversationId, modelVersion: d.modelVersion, promptId: d.promptId, intent: d.intent, confidence: d.confidence, destinationType: d.destinationType, destinationId: d.destinationId as any, isShadow: !!(d as any).isShadow, createdAt: (d as any).createdAt?.toISOString?.() || now };
  }
  const d: RouteDecision = { id: cryptoRandomId(), ...input, createdAt: now } as RouteDecision;
  mem.decisions.push(d);
  return d;
}

export async function addSubscription(userId: string, endpoint: string, keys: any): Promise<Subscription> {
  const now = new Date().toISOString();
  const prisma = await getPrisma();
  if (prisma) {
    const s = await prisma.notificationSubscription.create({ data: { userId, endpoint, keys } });
    return { id: s.id, userId: s.userId, endpoint: s.endpoint, keys: s.keys as any, createdAt: (s as any).createdAt?.toISOString?.() || now, updatedAt: (s as any).updatedAt?.toISOString?.() || now };
  }
  const s: Subscription = { id: cryptoRandomId(), userId, endpoint, keys, createdAt: now, updatedAt: now };
  mem.subs.push(s);
  return s;
}

export async function listSubscriptions(): Promise<Array<Pick<Subscription, 'endpoint' | 'keys'>>> {
  const prisma = await getPrisma();
  if (prisma) {
    const rows = await prisma.notificationSubscription.findMany({ select: { endpoint: true, keys: true } });
    return rows.map((r: any) => ({ endpoint: r.endpoint, keys: r.keys }));
  }
  return mem.subs.map(s => ({ endpoint: s.endpoint, keys: s.keys }));
}

export async function listUsers(): Promise<Array<Pick<User,'id'|'email'|'displayName'|'avatarUrl'|'active'|'source'>>> {
  const prisma = await getPrisma();
  if (prisma) {
    const rows = await prisma.user.findMany({});
    return rows.map((u: any)=> ({ id: u.id, email: u.email, displayName: u.displayName, avatarUrl: u.avatarUrl ?? null, active: !!u.active, source: u.source }));
  }
  return mem.users.map(u=> ({ id: u.id, email: u.email, displayName: u.displayName, avatarUrl: u.avatarUrl ?? null, active: u.active, source: u.source }));
}

export async function listConversations(limit = 20): Promise<Array<Pick<Conversation,'id'|'status'|'createdAt'|'updatedAt'>>> {
  const prisma = await getPrisma();
  if (prisma) {
    const rows = await prisma.conversation.findMany({ orderBy: { updatedAt: 'desc' }, take: limit });
    return rows.map((c: any)=> ({ id: c.id, status: c.status, createdAt: c.createdAt?.toISOString?.() || new Date().toISOString(), updatedAt: c.updatedAt?.toISOString?.() || new Date().toISOString() }));
  }
  return Array.from(mem.conversations.values()).sort((a,b)=> b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

export async function saveSyncLog(entry: Omit<SyncLog,'id'|'createdAt'>): Promise<SyncLog> {
  const now = new Date().toISOString();
  const prisma = await getPrisma();
  if (prisma) {
    const row = await prisma.syncLog.create({ data: { ...entry, details: entry.details as any } });
    return { id: row.id, type: row.type, status: row.status, details: row.details as any, createdAt: (row as any).createdAt?.toISOString?.() || now };
  }
  const row: SyncLog = { id: cryptoRandomId(), ...entry, createdAt: now };
  mem.syncLogs.push(row);
  return row;
}

export async function listSyncLogs(limit = 5): Promise<SyncLog[]> {
  const prisma = await getPrisma();
  if (prisma) {
    const rows = await prisma.syncLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    return rows.map((r: any)=> ({ id: r.id, type: r.type, status: r.status, details: r.details as any, createdAt: r.createdAt?.toISOString?.() || new Date().toISOString() }));
  }
  return mem.syncLogs.slice(-limit).reverse();
}

export async function upsertUsers(users: Array<Pick<User,'email'|'displayName'|'avatarUrl'|'active'|'source'>>): Promise<number> {
  const prisma = await getPrisma();
  if (prisma) {
    let count = 0;
    for (const u of users) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (existing) {
        await prisma.user.update({ where: { email: u.email }, data: { displayName: u.displayName, avatarUrl: u.avatarUrl ?? null, active: u.active, source: u.source } });
      } else {
        await prisma.user.create({ data: { email: u.email, displayName: u.displayName, avatarUrl: u.avatarUrl ?? null, active: u.active, source: u.source } });
      }
      count++;
    }
    return count;
  }
  // In-memory
  for (const u of users) {
    const idx = mem.users.findIndex(x => x.email === u.email);
    const now = new Date().toISOString();
    if (idx >= 0) {
      mem.users[idx] = { ...mem.users[idx], displayName: u.displayName, avatarUrl: u.avatarUrl ?? null, active: u.active, source: u.source, updatedAt: now } as any;
    } else {
      mem.users.push({ id: cryptoRandomId(), email: u.email, displayName: u.displayName, avatarUrl: u.avatarUrl ?? null, active: u.active, source: u.source, createdAt: now, updatedAt: now } as any);
    }
  }
  return users.length;
}

export async function createUser(input: Pick<User,'email'|'displayName'|'avatarUrl'|'active'|'source'>): Promise<User> {
  const now = new Date().toISOString();
  const prisma = await getPrisma();
  if (prisma) {
    const u = await prisma.user.create({ data: { email: input.email, displayName: input.displayName, avatarUrl: input.avatarUrl ?? null, active: input.active, source: input.source } });
    return { id: u.id, email: u.email, displayName: u.displayName, avatarUrl: (u as any).avatarUrl ?? null, active: !!u.active, source: u.source, createdAt: (u as any).createdAt?.toISOString?.() || now, updatedAt: (u as any).updatedAt?.toISOString?.() || now };
  }
  const u: User = { id: cryptoRandomId(), email: input.email, displayName: input.displayName, avatarUrl: input.avatarUrl ?? null, active: input.active, source: input.source, createdAt: now, updatedAt: now };
  mem.users.push(u);
  return u;
}

export async function updateUser(id: string, updates: Partial<Pick<User,'displayName'|'avatarUrl'|'active'>>): Promise<User | null> {
  const now = new Date().toISOString();
  const prisma = await getPrisma();
  if (prisma) {
    try {
      const u = await prisma.user.update({ where: { id }, data: { ...('displayName' in updates ? { displayName: updates.displayName } : {}), ...('avatarUrl' in updates ? { avatarUrl: updates.avatarUrl ?? null } : {}), ...('active' in updates ? { active: !!updates.active } : {}) } });
      return { id: u.id, email: u.email, displayName: u.displayName, avatarUrl: (u as any).avatarUrl ?? null, active: !!u.active, source: u.source, createdAt: (u as any).createdAt?.toISOString?.() || now, updatedAt: (u as any).updatedAt?.toISOString?.() || now };
    } catch {
      return null;
    }
  }
  const idx = mem.users.findIndex(u => u.id === id);
  if (idx < 0) return null;
  mem.users[idx] = { ...mem.users[idx], ...updates, updatedAt: now } as any;
  return mem.users[idx];
}

export async function searchUsers(query: string): Promise<Array<Pick<User,'id'|'email'|'displayName'|'avatarUrl'|'active'|'source'>>> {
  const prisma = await getPrisma();
  if (prisma) {
    const rows = await prisma.user.findMany({ where: { OR: [ { email: { contains: query, mode: 'insensitive' } }, { displayName: { contains: query, mode: 'insensitive' } } ] } });
    return rows.map((u: any)=> ({ id: u.id, email: u.email, displayName: u.displayName, avatarUrl: u.avatarUrl ?? null, active: !!u.active, source: u.source }));
  }
  const q = query.toLowerCase();
  return mem.users.filter(u => u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)).map(u=> ({ id: u.id, email: u.email, displayName: u.displayName, avatarUrl: u.avatarUrl ?? null, active: u.active, source: u.source }));
}

function cryptoRandomId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


