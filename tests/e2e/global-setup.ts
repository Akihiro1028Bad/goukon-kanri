import { PrismaClient } from "@prisma/client";

async function globalSetup() {
  const testDatabaseUrl =
    process.env.PLAYWRIGHT_DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test";

  const prisma = new PrismaClient({
    datasourceUrl: testDatabaseUrl,
  });

  await prisma.$connect();
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.$disconnect();
}

export default globalSetup;
