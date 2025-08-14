(async () => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: { email: 'admin@example.com', displayName: 'Admin', source: 'local' }
    });
    // Create a demo conversation with a greeting
    const conv = await prisma.conversation.create({ data: { status: 'open' } });
    await prisma.message.create({ data: { conversationId: conv.id, role: 'user', content: 'Hello, I need help', senderId: null } });
    await prisma.message.create({ data: { conversationId: conv.id, role: 'agent', content: 'Thanks! An agent will be with you shortly.', senderId: admin.id } });
    console.log('Seed done');
  } catch (e) {
    console.error('Seed failed', e);
    process.exit(1);
  }
})();
