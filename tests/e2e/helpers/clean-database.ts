import { PrismaClient } from "@prisma/client";

const testDatabaseUrl =
  process.env.PLAYWRIGHT_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test";

/**
 * テストDBの全データを削除する。
 * E2Eテストの beforeEach で呼び出し、リトライ時のデータ残留を防ぐ。
 * 外部キー制約の順序に従い、子テーブルから削除する。
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = new PrismaClient({
    datasourceUrl: testDatabaseUrl,
  });

  try {
    await prisma.$connect();

    // event_todos テーブルが存在しない場合もあるため、raw SQL で安全に削除
    await prisma.$executeRawUnsafe(
      'DELETE FROM "event_todos" WHERE TRUE'
    ).catch(() => {
      // テーブルが存在しない場合は無視
    });

    await prisma.participant.deleteMany();
    await prisma.event.deleteMany();
  } finally {
    await prisma.$disconnect();
  }
}
