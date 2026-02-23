const { Client } = require('pg');
const crypto = require('crypto');

// bcrypt-compatible hash using raw crypto (no dependency needed)
// For production, use bcryptjs. This generates bcrypt hashes.
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  console.log('⚠️  bcryptjs not found, install with: npm install bcryptjs');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_wgSAC1UQBzY9@ep-withered-block-agcojulz-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

function cuid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 25);
}

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('✅ Connected to database');

  // Create salon
  const salonId = cuid();
  await client.query(`
    INSERT INTO "salons" ("id","name","slug","address","phone","email","description","plan","workingHours","isActive")
    VALUES ($1,$2,$3,$4,$5,$6,$7,'PROFESSIONAL',$8,true)
    ON CONFLICT ("slug") DO NOTHING
  `, [
    salonId,
    'Beauty Studio',
    'beauty-studio',
    'ქ. თბილისი, რუსთაველის გამზ. 24',
    '+995 555 12 34 56',
    'info@beautystudio.ge',
    'თანამედროვე სილამაზის სალონი თბილისის ცენტრში',
    JSON.stringify({
      monday: { open: '09:00', close: '20:00', isOff: false },
      tuesday: { open: '09:00', close: '20:00', isOff: false },
      wednesday: { open: '09:00', close: '20:00', isOff: false },
      thursday: { open: '09:00', close: '20:00', isOff: false },
      friday: { open: '09:00', close: '20:00', isOff: false },
      saturday: { open: '10:00', close: '18:00', isOff: false },
      sunday: { open: '00:00', close: '00:00', isOff: true },
    }),
  ]);
  console.log('✅ Salon created');

  // Staff
  const staffData = [
    { name:'ნინო მაისურაძე', email:'admin@beautystudio.ge', phone:'+995 555 12 34 56', role:'OWNER', specialties:['სტილისტი','კოლორისტი'], pin:'1234', password:'admin123', commType:'NONE', commRate:0 },
    { name:'მარიამ ჯავახიშვილი', email:'mariam@beautystudio.ge', phone:'+995 555 11 11 11', role:'SPECIALIST', specialties:['სტილისტი','კოლორისტი'], pin:'1111', password:'password123', commType:'PERCENTAGE', commRate:40 },
    { name:'ანა გელაშვილი', email:'ana@beautystudio.ge', phone:'+995 555 22 22 22', role:'SPECIALIST', specialties:['მანიკური','პედიკური'], pin:'2222', password:'password123', commType:'PERCENTAGE', commRate:35 },
    { name:'ეკა ბერიძე', email:'eka@beautystudio.ge', phone:'+995 555 33 33 33', role:'SPECIALIST', specialties:['კოსმეტოლოგი','მაკიაჟი'], pin:'3333', password:'password123', commType:'PERCENTAGE', commRate:40 },
    { name:'თამარ წიქარიშვილი', email:'tamar@beautystudio.ge', phone:'+995 555 44 44 44', role:'RECEPTIONIST', specialties:[], pin:'4444', password:'password123', commType:'NONE', commRate:0 },
  ];

  const staffIds = [];
  for (const s of staffData) {
    const id = cuid();
    staffIds.push(id);
    const hash = await bcrypt.hash(s.password, 10);
    await client.query(`
      INSERT INTO "staff" ("id","salonId","name","email","phone","role","specialties","pin","passwordHash","commissionType","commissionRate","isActive")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)
    `, [id, salonId, s.name, s.email, s.phone, s.role, s.specialties, s.pin, hash, s.commType, s.commRate]);
  }
  console.log('✅ Staff created');

  // Schedules
  for (const staffId of staffIds) {
    for (let day = 0; day < 7; day++) {
      await client.query(`
        INSERT INTO "staff_schedules" ("id","staffId","dayOfWeek","startTime","endTime","isOff")
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [cuid(), staffId, day,
          day === 0 ? '00:00' : day === 6 ? '10:00' : '09:00',
          day === 0 ? '00:00' : day === 6 ? '18:00' : '20:00',
          day === 0]);
    }
  }
  console.log('✅ Schedules created');

  // Categories
  const catData = [
    { name:'თმის მოვლა', icon:'✂️', color:'#ec4899', sort:1 },
    { name:'ფრჩხილების მოვლა', icon:'💅', color:'#8b5cf6', sort:2 },
    { name:'სახის მოვლა', icon:'💆', color:'#3b82f6', sort:3 },
    { name:'მაკიაჟი', icon:'💄', color:'#f59e0b', sort:4 },
    { name:'სხეულის მოვლა', icon:'🧖', color:'#10b981', sort:5 },
  ];
  const catIds = [];
  for (const c of catData) {
    const id = cuid();
    catIds.push(id);
    await client.query(`
      INSERT INTO "service_categories" ("id","salonId","name","icon","color","sortOrder")
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [id, salonId, c.name, c.icon, c.color, c.sort]);
  }
  console.log('✅ Categories created');

  // Services
  const svcData = [
    { name:'თმის შეჭრა (ქალი)', dur:60, price:40, cat:0 },
    { name:'თმის შეჭრა (კაცი)', dur:30, price:20, cat:0 },
    { name:'თმის შეღებვა', dur:120, price:80, cat:0 },
    { name:'თმის ჩაშრობა', dur:45, price:30, cat:0 },
    { name:'მელირება', dur:150, price:120, cat:0 },
    { name:'კერატინი', dur:180, price:200, cat:0 },
    { name:'ბოტოქსი თმისთვის', dur:120, price:150, cat:0 },
    { name:'მანიკური (კლასიკური)', dur:45, price:25, cat:1 },
    { name:'მანიკური (გელ-ლაქი)', dur:60, price:40, cat:1 },
    { name:'პედიკური', dur:60, price:35, cat:1 },
    { name:'ფრჩხილის გაგრძელება', dur:90, price:60, cat:1 },
    { name:'სახის წმენდა', dur:60, price:50, cat:2 },
    { name:'სახის მასაჟი', dur:30, price:30, cat:2 },
    { name:'ნიღაბი', dur:45, price:40, cat:2 },
    { name:'დღის მაკიაჟი', dur:45, price:50, cat:3 },
    { name:'საღამოს მაკიაჟი', dur:60, price:70, cat:3 },
    { name:'საქორწილო მაკიაჟი', dur:90, price:120, cat:3 },
    { name:'ეპილაცია (ფეხები)', dur:45, price:40, cat:4 },
    { name:'ეპილაცია (ბიკინი)', dur:30, price:30, cat:4 },
    { name:'სხეულის მასაჟი', dur:60, price:60, cat:4 },
  ];
  for (const s of svcData) {
    await client.query(`
      INSERT INTO "services" ("id","salonId","categoryId","name","duration","price","isActive")
      VALUES ($1,$2,$3,$4,$5,$6,true)
    `, [cuid(), salonId, catIds[s.cat], s.name, s.dur, s.price]);
  }
  console.log('✅ Services created (20)');

  // Clients
  const clientData = [
    { name:'ლანა მერაბიშვილი', phone:'+995 555 10 10 10', email:'lana@mail.ge' },
    { name:'სოფო ხარაზიშვილი', phone:'+995 555 20 20 20', email:null },
    { name:'ნათია ნოზაძე', phone:'+995 555 30 30 30', email:'natia@mail.ge' },
    { name:'ირინე ლომიძე', phone:'+995 555 40 40 40', email:null },
    { name:'მაკა ბუჩუკური', phone:'+995 555 50 50 50', email:null },
    { name:'ქეთი ასათიანი', phone:'+995 555 60 60 60', email:'keti@mail.ge' },
    { name:'ნინო ჩხეიძე', phone:'+995 555 70 70 70', email:null },
    { name:'თეა გვარამია', phone:'+995 555 80 80 80', email:null },
  ];
  for (const c of clientData) {
    await client.query(`
      INSERT INTO "clients" ("id","salonId","name","phone","email","isActive")
      VALUES ($1,$2,$3,$4,$5,true)
    `, [cuid(), salonId, c.name, c.phone, c.email]);
  }
  console.log('✅ Clients created (8)');

  console.log('\n🎉 Seeding complete!');
  console.log('📧 Login: admin@beautystudio.ge');
  console.log('🔑 Password: admin123');
  console.log('🔢 PIN: 1234');

  await client.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
