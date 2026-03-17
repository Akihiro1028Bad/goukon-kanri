import { EventStatus, Gender, PaymentStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_EVENTS = 100;
const PARTICIPANTS_PER_EVENT = 10;
const TARGET_PARTICIPANTS = TARGET_EVENTS * PARTICIPANTS_PER_EVENT;

const AREAS = ["渋谷", "新宿", "銀座", "六本木", "恵比寿", "品川", "池袋", "表参道"];
const VENUES = [
  "ダイニングバーABC",
  "レストランXYZ",
  "イタリアンバルMON",
  "居酒屋ひまわり",
  "ビストロラメール",
  "和食処さくら",
  "BAR LOUNGE",
  "カフェダイニングSOL",
  "焼肉テラス",
  "ワインバーVIN",
];
const ORGANIZERS = ["田中", "鈴木", "佐藤", "高橋", "伊藤"];
const NAMES_MALE = [
  "田中太郎",
  "鈴木一郎",
  "佐藤健太",
  "山田大輔",
  "高橋翔太",
  "伊藤誠",
  "渡辺隆",
  "中村拓也",
  "小林裕太",
  "加藤雅人",
];
const NAMES_FEMALE = [
  "田中花子",
  "鈴木美咲",
  "佐藤愛",
  "山田さくら",
  "高橋めぐみ",
  "伊藤優子",
  "渡辺真理",
  "中村彩",
  "小林麻衣",
  "加藤千尋",
];
const THEMES = ["春の出会い", "夏のパーティー", "秋の味覚", "年末スペシャル", "グルメ会", null];
const OCCUPATIONS = ["IT系", "医療系", "金融系", "クリエイター", null];
const START_TIMES = ["18:00", "18:30", "19:00", "19:30", "20:00"];

function pick<T>(arr: T[], indexSeed: number): T {
  return arr[indexSeed % arr.length];
}

function padNumber(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

function buildEventStatus(index: number): EventStatus {
  if (index % 10 === 0) {
    return EventStatus.CANCELLED;
  }
  if (index % 3 === 0) {
    return EventStatus.SCHEDULED;
  }
  return EventStatus.COMPLETED;
}

async function main() {
  console.log("Seeding database...");

  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();

  const year = new Date().getFullYear();
  const monthEventCounts = Array.from({ length: 12 }, (_, monthIndex) => {
    const base = Math.floor(TARGET_EVENTS / 12);
    const extra = monthIndex < TARGET_EVENTS % 12 ? 1 : 0;
    return base + extra;
  });

  let createdEvents = 0;
  for (let month = 1; month <= 12; month++) {
    const eventsInMonth = monthEventCounts[month - 1];

    for (let sequence = 1; sequence <= eventsInMonth; sequence++) {
      createdEvents += 1;
      const day = ((createdEvents - 1) % 28) + 1;
      const eventId = `${year}-${padNumber(month, 2)}-${padNumber(sequence, 3)}`;

      const maleCapacity = 5 + (createdEvents % 3);
      const femaleCapacity = 5 + ((createdEvents + 1) % 3);
      const maleFee = 5000 + (createdEvents % 3) * 1000;
      const femaleFee = 3500 + (createdEvents % 3) * 500;
      const status = buildEventStatus(createdEvents);

      const event = await prisma.event.create({
        data: {
          eventId,
          date: new Date(year, month - 1, day),
          startTime: pick(START_TIMES, createdEvents),
          venueName: pick(VENUES, createdEvents),
          mapUrl: `https://maps.google.com/?q=${encodeURIComponent(pick(VENUES, createdEvents))}`,
          organizer: pick(ORGANIZERS, createdEvents),
          area: pick(AREAS, createdEvents),
          maleCapacity,
          femaleCapacity,
          maleFee,
          femaleFee,
          theme: pick(THEMES, createdEvents),
          targetOccupation: pick(OCCUPATIONS, createdEvents),
          status,
          venueCost: 12000 + (createdEvents % 8) * 1000,
          matchCount: status === EventStatus.COMPLETED ? createdEvents % 4 : 0,
          expectedCashback: (createdEvents % 6) * 1000,
          actualCashback: status === EventStatus.COMPLETED ? (createdEvents % 5) * 1000 : 0,
          memo: createdEvents % 5 === 0 ? "シードデータ" : null,
        },
      });

      for (let i = 0; i < PARTICIPANTS_PER_EVENT; i++) {
        const gender = i < PARTICIPANTS_PER_EVENT / 2 ? Gender.MALE : Gender.FEMALE;
        const isPaid = (createdEvents + i) % 4 !== 0;

        await prisma.participant.create({
          data: {
            eventId: event.eventId,
            name: gender === Gender.MALE ? pick(NAMES_MALE, createdEvents + i) : pick(NAMES_FEMALE, createdEvents + i),
            gender,
            fee: gender === Gender.MALE ? maleFee : femaleFee,
            paymentStatus: isPaid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
            paymentDate: isPaid ? new Date(year, month - 1, day) : null,
            paymentConfirmedBy: isPaid ? "管理者" : null,
            memo: i === 0 ? "初回参加" : null,
          },
        });

      }
    }
  }

  const eventCount = await prisma.event.count();
  const participantCount = await prisma.participant.count();

  if (eventCount !== TARGET_EVENTS || participantCount !== TARGET_PARTICIPANTS) {
    throw new Error(
      `Unexpected seed counts. events=${eventCount} participants=${participantCount}`
    );
  }

  console.log(`Seeded ${eventCount} events and ${participantCount} participants.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
