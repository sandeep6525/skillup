import { prisma } from '../src/config/prisma';

async function seed() {
  const partners = [
    {
      name: 'Google',
      logoUrl: '/uploads/partners/google-logo.svg',
      websiteUrl: 'https://careers.google.com',
      description: 'Global Cloud & Search Technology Partner',
      displayOrder: 1,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Microsoft',
      logoUrl: '/uploads/partners/microsoft-logo.svg',
      websiteUrl: 'https://careers.microsoft.com',
      description: 'Enterprise AI & Azure Computing Collaborator',
      displayOrder: 2,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Amazon',
      logoUrl: '/uploads/partners/amazon-logo.svg',
      websiteUrl: 'https://amazon.jobs',
      description: 'Cloud Infrastructure & High-Scale Systems Partner',
      displayOrder: 3,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Meta',
      logoUrl: '/uploads/partners/meta-logo.svg',
      websiteUrl: 'https://metacareers.com',
      description: 'Distributed Infrastructure & React Ecosystem Partner',
      displayOrder: 4,
      isActive: true,
      isFeatured: false,
    },
    {
      name: 'Netflix',
      logoUrl: '/uploads/partners/netflix-logo.svg',
      websiteUrl: 'https://jobs.netflix.com',
      description: 'Streaming Systems & Microservices Engineering',
      displayOrder: 5,
      isActive: true,
      isFeatured: false,
    },
    {
      name: 'Intel',
      logoUrl: '/uploads/partners/intel-logo.svg',
      websiteUrl: 'https://jobs.intel.com',
      description: 'High Performance & Silicon Architecture Collaborator',
      displayOrder: 6,
      isActive: true,
      isFeatured: false,
    },
    {
      name: 'IBM',
      logoUrl: '/uploads/partners/ibm-logo.svg',
      websiteUrl: 'https://www.ibm.com/employment',
      description: 'Enterprise Hybrid Cloud & Quantum Research',
      displayOrder: 7,
      isActive: true,
      isFeatured: false,
    },
    {
      name: 'Oracle',
      logoUrl: '/uploads/partners/oracle-logo.svg',
      websiteUrl: 'https://www.oracle.com/careers',
      description: 'Enterprise Database & Autonomous Cloud Systems',
      displayOrder: 8,
      isActive: true,
      isFeatured: false,
    },
  ];

  for (const p of partners) {
    const existing = await prisma.partner.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.partner.create({ data: p });
    }
  }
  console.log('Seed completed successfully');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
