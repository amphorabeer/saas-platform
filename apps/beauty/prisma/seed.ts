import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding BeautySalon database...');

  // Create salon
  const salon = await prisma.salon.create({
    data: {
      name: 'Beauty Studio',
      slug: 'beauty-studio',
      address: 'ქ. თბილისი, რუსთაველის გამზ. 24',
      phone: '+995 555 12 34 56',
      email: 'info@beautystudio.ge',
      description: 'თანამედროვე სილამაზის სალონი თბილისის ცენტრში',
      plan: 'PROFESSIONAL',
      workingHours: {
        monday: { open: '09:00', close: '20:00', isOff: false },
        tuesday: { open: '09:00', close: '20:00', isOff: false },
        wednesday: { open: '09:00', close: '20:00', isOff: false },
        thursday: { open: '09:00', close: '20:00', isOff: false },
        friday: { open: '09:00', close: '20:00', isOff: false },
        saturday: { open: '10:00', close: '18:00', isOff: false },
        sunday: { open: '00:00', close: '00:00', isOff: true },
      },
    },
  });

  console.log(`✅ Salon created: ${salon.name}`);

  // Create owner
  const ownerPassword = await bcrypt.hash('admin123', 10);
  const owner = await prisma.staff.create({
    data: {
      salonId: salon.id,
      name: 'ნინო მაისურაძე',
      email: 'admin@beautystudio.ge',
      phone: '+995 555 12 34 56',
      role: 'OWNER',
      specialties: ['სტილისტი', 'კოლორისტი'],
      passwordHash: ownerPassword,
      pin: '1234',
      commissionType: 'NONE',
      commissionRate: 0,
    },
  });

  // Create specialists
  const specialists = [
    {
      name: 'მარიამ ჯავახიშვილი',
      email: 'mariam@beautystudio.ge',
      phone: '+995 555 11 11 11',
      role: 'SPECIALIST' as const,
      specialties: ['სტილისტი', 'კოლორისტი'],
      pin: '1111',
      commissionType: 'PERCENTAGE' as const,
      commissionRate: 40,
    },
    {
      name: 'ანა გელაშვილი',
      email: 'ana@beautystudio.ge',
      phone: '+995 555 22 22 22',
      role: 'SPECIALIST' as const,
      specialties: ['მანიკური', 'პედიკური'],
      pin: '2222',
      commissionType: 'PERCENTAGE' as const,
      commissionRate: 35,
    },
    {
      name: 'ეკა ბერიძე',
      email: 'eka@beautystudio.ge',
      phone: '+995 555 33 33 33',
      role: 'SPECIALIST' as const,
      specialties: ['კოსმეტოლოგი', 'მაკიაჟი'],
      pin: '3333',
      commissionType: 'PERCENTAGE' as const,
      commissionRate: 40,
    },
    {
      name: 'თამარ წიქარიშვილი',
      role: 'RECEPTIONIST' as const,
      email: 'tamar@beautystudio.ge',
      phone: '+995 555 44 44 44',
      specialties: [],
      pin: '4444',
      commissionType: 'NONE' as const,
      commissionRate: 0,
    },
  ];

  for (const spec of specialists) {
    const pwd = await bcrypt.hash('password123', 10);
    await prisma.staff.create({
      data: {
        salonId: salon.id,
        ...spec,
        passwordHash: pwd,
      },
    });
  }

  console.log('✅ Staff created');

  // Create schedules for all staff
  const allStaff = await prisma.staff.findMany({ where: { salonId: salon.id } });
  for (const s of allStaff) {
    for (let day = 0; day < 7; day++) {
      await prisma.staffSchedule.create({
        data: {
          staffId: s.id,
          dayOfWeek: day,
          startTime: day === 0 ? '00:00' : day === 6 ? '10:00' : '09:00',
          endTime: day === 0 ? '00:00' : day === 6 ? '18:00' : '20:00',
          isOff: day === 0,
        },
      });
    }
  }

  console.log('✅ Schedules created');

  // Create service categories
  const categories = await Promise.all([
    prisma.serviceCategory.create({
      data: { salonId: salon.id, name: 'თმის მოვლა', icon: '✂️', color: '#ec4899', sortOrder: 1 },
    }),
    prisma.serviceCategory.create({
      data: { salonId: salon.id, name: 'ფრჩხილების მოვლა', icon: '💅', color: '#8b5cf6', sortOrder: 2 },
    }),
    prisma.serviceCategory.create({
      data: { salonId: salon.id, name: 'სახის მოვლა', icon: '💆', color: '#3b82f6', sortOrder: 3 },
    }),
    prisma.serviceCategory.create({
      data: { salonId: salon.id, name: 'მაკიაჟი', icon: '💄', color: '#f59e0b', sortOrder: 4 },
    }),
    prisma.serviceCategory.create({
      data: { salonId: salon.id, name: 'სხეულის მოვლა', icon: '🧖', color: '#10b981', sortOrder: 5 },
    }),
  ]);

  console.log('✅ Categories created');

  // Create services
  const services = [
    // Hair
    { name: 'თმის შეჭრა (ქალი)', duration: 60, price: 40, categoryId: categories[0].id },
    { name: 'თმის შეჭრა (კაცი)', duration: 30, price: 20, categoryId: categories[0].id },
    { name: 'თმის შეღებვა', duration: 120, price: 80, categoryId: categories[0].id },
    { name: 'თმის ჩაშრობა', duration: 45, price: 30, categoryId: categories[0].id },
    { name: 'მელირება', duration: 150, price: 120, categoryId: categories[0].id },
    { name: 'კერატინი', duration: 180, price: 200, categoryId: categories[0].id },
    { name: 'ბოტოქსი თმისთვის', duration: 120, price: 150, categoryId: categories[0].id },
    // Nails
    { name: 'მანიკური (კლასიკური)', duration: 45, price: 25, categoryId: categories[1].id },
    { name: 'მანიკური (გელ-ლაქი)', duration: 60, price: 40, categoryId: categories[1].id },
    { name: 'პედიკური', duration: 60, price: 35, categoryId: categories[1].id },
    { name: 'ფრჩხილის გაგრძელება', duration: 90, price: 60, categoryId: categories[1].id },
    // Face
    { name: 'სახის წმენდა', duration: 60, price: 50, categoryId: categories[2].id },
    { name: 'სახის მასაჟი', duration: 30, price: 30, categoryId: categories[2].id },
    { name: 'ნიღაბი', duration: 45, price: 40, categoryId: categories[2].id },
    // Makeup
    { name: 'დღის მაკიაჟი', duration: 45, price: 50, categoryId: categories[3].id },
    { name: 'საღამოს მაკიაჟი', duration: 60, price: 70, categoryId: categories[3].id },
    { name: 'საქორწილო მაკიაჟი', duration: 90, price: 120, categoryId: categories[3].id },
    // Body
    { name: 'ეპილაცია (ფეხები)', duration: 45, price: 40, categoryId: categories[4].id },
    { name: 'ეპილაცია (ბიკინი)', duration: 30, price: 30, categoryId: categories[4].id },
    { name: 'სხეულის მასაჟი', duration: 60, price: 60, categoryId: categories[4].id },
  ];

  for (const svc of services) {
    await prisma.service.create({
      data: {
        salonId: salon.id,
        ...svc,
      },
    });
  }

  console.log('✅ Services created');

  // Create demo clients
  const clients = [
    { name: 'ლანა მერაბიშვილი', phone: '+995 555 10 10 10', email: 'lana@mail.ge' },
    { name: 'სოფო ხარაზიშვილი', phone: '+995 555 20 20 20' },
    { name: 'ნათია ნოზაძე', phone: '+995 555 30 30 30', email: 'natia@mail.ge' },
    { name: 'ირინე ლომიძე', phone: '+995 555 40 40 40' },
    { name: 'მაკა ბუჩუკური', phone: '+995 555 50 50 50' },
    { name: 'ქეთი ასათიანი', phone: '+995 555 60 60 60', email: 'keti@mail.ge' },
    { name: 'ნინო ჩხეიძე', phone: '+995 555 70 70 70' },
    { name: 'თეა გვარამია', phone: '+995 555 80 80 80' },
  ];

  for (const client of clients) {
    await prisma.client.create({
      data: { salonId: salon.id, ...client },
    });
  }

  console.log('✅ Clients created');

  console.log('\n🎉 Seeding complete!');
  console.log('📧 Login: admin@beautystudio.ge');
  console.log('🔑 Password: admin123');
  console.log('🔢 PIN: 1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
