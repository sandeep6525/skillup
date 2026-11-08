import prisma from '../src/config/prisma';

async function cleanupDuplicates() {
  const materials = await prisma.learningMaterial.findMany({
    orderBy: { createdAt: 'asc' },
    include: { purchases: true, payments: true },
  });

  const seen = new Map<string, (typeof materials)[0]>();
  const toDeleteIds: string[] = [];

  for (const m of materials) {
    const key = `${m.courseId || 'standalone'}::${m.title.trim().toLowerCase()}`;
    if (seen.has(key)) {
      const keeper = seen.get(key)!;
      // Reassign any purchases or payments from m to keeper if any exist
      if (m.purchases.length > 0) {
        for (const p of m.purchases) {
          const existingKeeperPurchase = await prisma.materialPurchase.findUnique({
            where: { materialId_userId: { materialId: keeper.id, userId: p.userId } },
          });
          if (!existingKeeperPurchase) {
            await prisma.materialPurchase.update({
              where: { id: p.id },
              data: { materialId: keeper.id },
            });
          } else {
            await prisma.materialPurchase.delete({ where: { id: p.id } });
          }
        }
      }
      if (m.payments.length > 0) {
        await prisma.payment.updateMany({
          where: { materialId: m.id },
          data: { materialId: keeper.id },
        });
      }
      toDeleteIds.push(m.id);
    } else {
      seen.set(key, m);
    }
  }

  console.log('Duplicate material IDs to clean up:', toDeleteIds.length);
  if (toDeleteIds.length > 0) {
    await prisma.learningMaterial.deleteMany({
      where: { id: { in: toDeleteIds } },
    });
  }
  console.log('Cleanup completed successfully. Remaining unique materials in database:', seen.size);
}

cleanupDuplicates()
  .catch((err) => {
    console.error('Error cleaning duplicates:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
