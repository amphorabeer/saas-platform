/**
 * GeoGuide RAG - Add Additional Chunks (without deleting existing)
 * 
 * Usage: npx tsx scripts/seed-additional.ts ./chunks_additional.json
 */

import { PrismaClient } from '../prisma/generated/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function seed() {
  const inputFile = process.argv[2] || './chunks_additional.json';
  
  console.log('🏛️  Adding additional chunks...');
  
  const raw = fs.readFileSync(inputFile, 'utf-8');
  const data = JSON.parse(raw);
  
  console.log(`📊 New chunks: ${data.totalChunks}`);
  console.log(`🏛️  Museums: ${data.museums.join(', ')}`);

  // First remove old chunks for these specific museums+languages to avoid duplicates
  for (const museumId of data.museums) {
    const languages = [...new Set(data.chunks.filter((c: any) => c.museumId === museumId).map((c: any) => c.language))];
    for (const lang of languages) {
      const deleted = await prisma.geoGuideChunk.deleteMany({
        where: { museumId, language: lang as string }
      });
      console.log(`  🗑️  Removed ${deleted.count} old chunks for ${museumId} [${lang}]`);
    }
  }

  // Batch insert
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < data.chunks.length; i += BATCH_SIZE) {
    const batch = data.chunks.slice(i, i + BATCH_SIZE);
    
    await prisma.geoGuideChunk.createMany({
      data: batch.map((c: any) => ({
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
  }

  const total = await prisma.geoGuideChunk.count();
  console.log(`\n✅ Added ${inserted} new chunks. Total in DB: ${total}`);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
