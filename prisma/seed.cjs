(async () => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: { email: 'admin@example.com', displayName: 'Admin', source: 'local' }
    });
    await prisma.();
    console.log('Seed done');
  } catch (e) {
    console.error('Seed failed', e);
    process.exit(1);
  }
})();
