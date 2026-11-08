# 🗄️ SPESIFIKASI TEKNIS: BACKEND 1 (DATABASE & CORE API)

- **Role**: `backend 1`
- **Owner Scope**: `backend/prisma/**`, `backend/src/controllers/**` (non-AI), `backend/src/routes/**` (non-AI), `backend/src/services/**` (non-AI), `backend/src/middleware/**`, `backend/src/lib/prisma.ts`, `backend/src/types/**`
- **Stack**: Node.js, Express v5, PostgreSQL, Prisma ORM v7, Zod v4, TypeScript

---

## 1. Skema Database Prisma (`backend/prisma/schema.prisma`)

Tabel inti yang harus disiapkan:

```prisma
model Room {
  id           String             @id @default(uuid())
  pin          String             @unique // 6-digit PIN acak unik
  title        String
  subject      String?
  targetGroups Int                @default(4)
  status       String             @default("LOBBY") // LOBBY, ACTIVE, FINISHED
  createdAt    DateTime           @default(now())
  participants RoomParticipant[]
  groups       Group[]
}

model RoomParticipant {
  id        String   @id @default(uuid())
  roomId    String
  name      String
  role      String   @default("STUDENT") // GURU, STUDENT
  joinedAt  DateTime @default(now())
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  groupId   String?
  group     Group?   @relation(fields: [groupId], references: [id])
}

model Group {
  id           String            @id @default(uuid())
  roomId       String
  groupNumber  Int
  name         String
  room         Room              @relation(fields: [roomId], references: [id], onDelete: Cascade)
  members      RoomParticipant[]
  messages     GroupMessage[]
}

model GroupMessage {
  id         String   @id @default(uuid())
  groupId    String
  senderName String
  content    String
  isAi       Boolean  @default(false)
  createdAt  DateTime @default(now())
  group      Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@index([groupId])
}

model PeerReport {
  id           String   @id @default(uuid())
  roomId       String
  groupId      String
  reporterName String
  reportedName String
  rating       Int      // 1 sampai 5
  feedback     String
  createdAt    DateTime @default(now())
}
```

---

## 2. Endpoint REST API Core

1. **`POST /api/rooms`**
   - Membuat room baru.
   - Menghasilkan 6-digit PIN unik acak (misal `Math.floor(100000 + Math.random() * 900000).toString()`).
2. **`GET /api/rooms/:pin`**
   - Validasi PIN dan mengembalikan data room untuk halaman join siswa.
3. **`POST /api/rooms/join`**
   - Menerima `{ pin, name }`, mendaftarkan siswa ke `RoomParticipant`.
4. **`GET /api/groups/:groupId/messages`**
   - Mengambil seluruh riwayat obrolan kelompok terurut berdasarkan waktu (`createdAt: 'asc'`).
5. **`POST /api/groups/:groupId/messages`**
   - Mengirim pesan sesama anggota manusia (non-AI).
6. **`POST /api/reports`**
   - Menyimpan laporan rahasia peer-review siswa.

---

## 3. Larangan Keras

- ❌ Dilarang menyentuh folder integrasi AI `backend/src/ai/**` (milik Backend 2).
- ❌ Dilarang menyentuh seluruh folder `frontend/**`.
