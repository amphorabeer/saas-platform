# Spare Ribs HACCP — სრული მართვის სისტემა

## რაც შედის / What's included

**4 CCP მონიტორინგი:**
- CCP-1: Sous-Vide (≥74°C / ≥12სთ)
- CCP-2: Blast Chilling (≤4°C / ≤90წთ)
- CCP-3: შენახვა (0–4°C / ≤-18°C)
- CCP-4: CIP სანიტ. (NaOH 1.5–2% / PAA 150–200ppm)

**ჟ ურნალები / Journals:** F-001, F-002, F-003, F-004, F-005, F-006, F-007

**სისტემა / System:** შ. აუდ. (60 შეკ.) | ანგ. | Dashboard

---

## სტ. / Structure

```
spare-ribs-haccp/
├── prisma/
│   ├── schema.prisma       ← DB (User, HaccpLog, CA, RawMat, Lab, Audit)
│   └── seed.ts             ← Demo user
├── src/
│   ├── types/index.ts      ← CCP ლიმ. + checkCCP1–4 + ვ.
│   ├── lib/prisma.ts       ← Prisma client
│   ├── app/
│   │   ├── layout.tsx      ← Root layout (Noto Georgian font)
│   │   ├── page.tsx        ← → /dashboard
│   │   ├── globals.css     ← Tailwind + custom classes
│   │   ├── (app)/
│   │   │   ├── layout.tsx  ← Sidebar nav
│   │   │   ├── dashboard/  ← Dashboard + alerts
│   │   │   ├── ccp-1/      ← CCP-1 log + /new
│   │   │   ├── ccp-2/      ← CCP-2 log + /new
│   │   │   ├── ccp-3/      ← CCP-3 log + /new
│   │   │   ├── ccp-4/      ← CCP-4 log + /new
│   │   │   ├── raw-materials/ ← F-005 + /new
│   │   │   ├── lab-tests/  ← F-007 + /new
│   │   │   ├── corrective-actions/ ← F-006 + /new
│   │   │   ├── audit/      ← 60-item checklist
│   │   │   └── reports/    ← Charts + PDF export
│   │   └── api/haccp/
│   │       ├── monitoring/ ← POST/GET — all CCPs
│   │       ├── raw-materials/
│   │       ├── lab-tests/
│   │       ├── corrective-actions/
│   │       ├── audit/
│   │       └── stats/
│   └── components/
│       └── CcpForm.tsx     ← Universal form — CCP-1,2,3,4
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## გ. / Setup

### 1. დ. / Install
```bash
cd spare-ribs-haccp
npm install
```

### 2. .env
```bash
cp .env.example .env
# DATABASE_URL შ. / Edit DATABASE_URL
```

### 3. Neon DB (უფ. / free tier)
1. neon.tech → ახ. პ. / new project
2. "spare-ribs-haccp" DB
3. Connection string → `.env`

### 4. Prisma
```bash
npm run db:push     # schema → DB
npm run db:seed     # demo user
```

### 5. გ. / Run
```bash
npm run dev
# http://localhost:3010
# Login: admin@sparerib.ge / admin123
```

---

## Vercel Deploy

```bash
npm i -g vercel
vercel

# Env vars:
# DATABASE_URL
# NEXTAUTH_SECRET  (openssl rand -base64 32)
# NEXTAUTH_URL     (https://your-domain.vercel.app)
```

---

## გ. / Routes

| URL | გ. / Page |
|-----|-----------|
| `/dashboard` | Dashboard + CCP სტ. |
| `/ccp-1` | CCP-1 Sous-Vide ჟ ურ. |
| `/ccp-1/new` | ახ. F-001 ჩ. |
| `/ccp-2` | CCP-2 Blast Chill ჟ ურ. |
| `/ccp-2/new` | ახ. F-002 ჩ. |
| `/ccp-3` | CCP-3 შ. ტ. ჟ ურ. |
| `/ccp-3/new` | ახ. F-003 ჩ. |
| `/ccp-4` | CCP-4 CIP ჟ ურ. |
| `/ccp-4/new` | ახ. F-004 ჩ. |
| `/raw-materials` | ნ-ლ. F-005 სია |
| `/raw-materials/new` | ახ. F-005 |
| `/lab-tests` | Lab F-007 სია |
| `/lab-tests/new` | ახ. F-007 |
| `/corrective-actions` | F-006 სია |
| `/corrective-actions/new` | ახ. F-006 |
| `/audit` | შ. აუდ. 60-შეკ. |
| `/reports` | ანგ. + PDF |

---

## შ. ნ. / Next steps

- [ ] NextAuth login გ. / Login page
- [ ] PDF ა. (@react-pdf/renderer)
- [ ] Email/SMS შ. გ-ხ. / Notifications on deviations  
- [ ] Recall workflow (Salmonella/Listeria)
- [ ] Barcode/QR LOT scanning
- [ ] Multi-user roles (Admin / Manager / Operator)
