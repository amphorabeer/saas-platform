import { PrismaClient } from '../prisma/generated/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface ChunkData {
  museumId: string;
  tourId: string;
  stopId: string | null;
  language: string;
  title: string;
  content: string;
  chunkIndex: number;
  keywords: string[];
  hallName: string | null;
  stopNumber: number | null;
}

async function seed() {
  const inputFile = process.argv[2] || './chunks.json';

  console.log('🏛️  GeoGuide RAG - Seeding chunks...');
  console.log(`📁 Input: ${inputFile}`);

  const raw = fs.readFileSync(inputFile, 'utf-8');
  const data = JSON.parse(raw);

  console.log(`📊 Total chunks: ${data.totalChunks}`);

  // Clear existing
  await prisma.geoGuideChunk.deleteMany();
  console.log('🗑️  Cleared existing chunks');

  // Batch insert
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < data.chunks.length; i += BATCH_SIZE) {
    const batch = data.chunks.slice(i, i + BATCH_SIZE);

    await prisma.geoGuideChunk.createMany({
      data: batch.map((c: ChunkData) => ({
        tourId: c.tourId,
        stopId: c.stopId,
        museumId: c.museumId,
        language: c.language,
        title: c.title,
        content: c.content,
        chunkIndex: c.chunkIndex,
        keywords: c.keywords,
        hallName: c.hallName,
        stopNumber: c.stopNumber,
      })),
    });

    inserted += batch.length;
    if (inserted % 500 === 0 || inserted === data.chunks.length) {
      console.log(`  ✅ ${inserted}/${data.chunks.length}`);
    }
  }

  const count = await prisma.geoGuideChunk.count();
  console.log(`\n✅ Done! ${count} chunks in DB`);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
