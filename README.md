# DevTeam — ระบบจัดการงานสำหรับทีมพัฒนา

ระบบจัดการงาน (Task Management) แบบ Full-Stack สำหรับทีมพัฒนาซอฟต์แวร์ รองรับ Kanban Board, Sprint Management, Team Calendar, Real-time Notifications และอื่นๆ

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)

---

## 📋 สารบัญ

- [ฟีเจอร์หลัก](#-ฟีเจอร์หลัก)
- [เทคโนโลยีที่ใช้](#-เทคโนโลยีที่ใช้)
- [ความต้องการของระบบ](#-ความต้องการของระบบ)
- [การติดตั้งและเริ่มต้นใช้งาน](#-การติดตั้งและเริ่มต้นใช้งาน)
- [วิธีใช้งาน](#-วิธีใช้งาน)
- [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
- [API Endpoints](#-api-endpoints)
- [บัญชีทดสอบ](#-บัญชีทดสอบ)

---

## ✨ ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 🔐 **ระบบสมาชิก** | สมัคร / เข้าสู่ระบบ พร้อมเลือกตำแหน่งและแผนก, JWT Authentication |
| 📋 **Kanban Board** | ลากย้ายงานข้ามสถานะ (Todo → In Progress → Review → Done) |
| 🏃 **Sprint Management** | สร้าง Sprint, กำหนดเป้าหมาย, ย้ายงานเข้า/ออก Sprint |
| 👥 **จัดการทีม** | สร้างทีม, เพิ่ม/ลบสมาชิก, เชิญสมาชิกใหม่, กำหนด Lead/Member |
| 📅 **Team Calendar** | ปฏิทินทีม, ลากงานเพื่อเปลี่ยนวันครบกำหนด |
| 📊 **Dashboard** | สถิติภาพรวม, Activity Feed, กราฟความคืบหน้า |
| 📁 **โปรเจกต์** | สร้าง/ลบโปรเจกต์, ดูความคืบหน้า, กรองงานตามโปรเจกต์ |
| 🔔 **Notifications** | แจ้งเตือนแบบ Real-time ผ่าน Socket.IO |
| 💬 **ความคิดเห็น** | คอมเมนต์ในแต่ละ Task |
| ⏱️ **Time Tracking** | จับเวลาการทำงาน Start/Stop |
| 🌐 **สองภาษา** | ไทย 🇹🇭 / อังกฤษ 🇬🇧 สลับได้ทันที |
| 📱 **Responsive** | ใช้งานได้ทั้งเดสก์ท็อปและมือถือ |

---

## 🛠 เทคโนโลยีที่ใช้

### Frontend
- **React 19** + **TypeScript 5.9**
- **Vite 7** — Dev server & build tool
- **Tailwind CSS 3.4** — Utility-first CSS
- **shadcn/ui** + **Radix UI** — UI Components (40+ components)
- **Socket.IO Client** — Real-time notifications
- **Sonner** — Toast notifications

### Backend
- **Express 5** — Web framework
- **Prisma 6** — ORM
- **PostgreSQL** — Database
- **JWT** — Authentication
- **bcrypt** — Password hashing
- **Socket.IO** — WebSocket
- **Helmet** + **Rate Limit** — Security

---

## 📦 ความต้องการของระบบ

- **Node.js** 20.x ขึ้นไป
- **npm** 10.x ขึ้นไป
- **PostgreSQL** 14 ขึ้นไป (หรือใช้ผ่าน Docker / Cloud service เช่น Supabase, Neon)

---

## 🚀 การติดตั้งและเริ่มต้นใช้งาน

### 1. Clone โปรเจกต์

```bash
git clone <repository-url>
cd Todolist
```

### 2. ติดตั้ง Dependencies

```bash
# Frontend
npm install

# Backend
cd server
npm install
```

### 3. ตั้งค่า Database

สร้างไฟล์ `server/.env` :

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/todolist"
JWT_SECRET="your-secret-key-change-this"
```

> ⚠️ เปลี่ยน `USER`, `PASSWORD` เป็นข้อมูล PostgreSQL ของคุณ

จากนั้นสร้าง Database schema และ Seed ข้อมูลทดสอบ:

```bash
cd server
npx prisma db push     # สร้างตาราง
npm run db:seed         # เพิ่มข้อมูลตัวอย่าง
```

### 4. รันโปรเจกต์

เปิด **2 Terminal** พร้อมกัน:

```bash
# Terminal 1 — Backend (port 3001)
cd server
npm run dev

# Terminal 2 — Frontend (port 5173)
npm run dev
```

### 5. เปิดใช้งาน

เปิดเบราว์เซอร์ไปที่ **http://localhost:5173**

---

## 📖 วิธีใช้งาน

### 🔐 สมัครสมาชิก / เข้าสู่ระบบ

1. เปิดหน้าเว็บ → เห็นหน้า **Login**
2. **สมัครสมาชิกใหม่**: คลิกแท็บ "สมัครสมาชิก" → กรอก ชื่อ, อีเมล, รหัสผ่าน, เลือก**ตำแหน่ง** (Developer/Designer/Tester/Manager) และ**แผนก** → กด "สมัครสมาชิก"
3. **เข้าสู่ระบบ**: กรอกอีเมลและรหัสผ่าน → กด "เข้าสู่ระบบ"
4. หรือใช้ **บัญชีทดสอบ** ที่ด้านล่าง (รหัสผ่าน: `password123`)

### 📊 Dashboard

- หลังล็อกอินจะเข้าสู่หน้า Dashboard
- ดูสถิติภาพรวม: จำนวนงานทั้งหมด, เสร็จแล้ว, กำลังทำ, Overdue
- ดู **Activity Feed** กิจกรรมล่าสุดของทีม
- ดู **Kanban Board** ย่อสำหรับงานล่าสุด

### 📋 จัดการงาน (Tasks)

1. คลิก **"งาน"** ที่ Sidebar ซ้าย
2. **สร้างงานใหม่**: คลิกปุ่ม **"+"** ในคอลัมน์สถานะที่ต้องการ → กรอกรายละเอียด → กด Save
3. **ย้ายสถานะ**: ลากการ์ดงานจากคอลัมน์หนึ่งไปอีกคอลัมน์ (Todo → In Progress → Review → Done)
4. **แก้ไขงาน**: คลิกที่การ์ดงาน → แก้ไขรายละเอียด, กำหนดผู้รับผิดชอบ, วันครบกำหนด, Priority, Labels
5. **ลบงาน**: คลิกไอคอนถังขยะในการ์ดงาน
6. **จับเวลา**: คลิกปุ่ม ▶️ เพื่อเริ่มจับเวลา, ⏹ เพื่อหยุด
7. **Subtasks**: เพิ่ม Subtask ในหน้ารายละเอียดงาน, ติ๊กเมื่อเสร็จ
8. **กรองงาน**: ใช้ Filter Panel เพื่อกรองตามสถานะ, Priority, ผู้รับผิดชอบ, Labels

### 📁 โปรเจกต์

1. คลิก **"โปรเจกต์"** ที่ Sidebar
2. **สร้างโปรเจกต์ใหม่**: คลิก "สร้างโปรเจกต์ใหม่" → กรอกชื่อ → กด "สร้าง"
3. **เข้าดูงานในโปรเจกต์**: คลิกที่การ์ดโปรเจกต์ → ดูเฉพาะงานในโปรเจกต์นั้น
4. **ลบโปรเจกต์**: คลิก ⋮ → "ลบโปรเจกต์" → ยืนยัน

### 🏃 Sprint

1. คลิก **"Sprint"** ที่ Sidebar
2. **สร้าง Sprint ใหม่**: คลิก "New Sprint" → ตั้งชื่อ, เป้าหมาย, วันเริ่ม/สิ้นสุด
3. **เพิ่มงานเข้า Sprint**: ลากงานเข้า Sprint หรือเลือกจาก Backlog
4. **ดูความคืบหน้า**: ดูสถิติ Todo/In Progress/Review/Done ในแต่ละ Sprint

### 👥 จัดการทีม

1. คลิก **"ทีม"** ที่ Sidebar
2. **ดูสมาชิก**: เห็นสมาชิกทั้งหมดพร้อมสถิติ (งานที่ทำ, เวลาที่ใช้)
3. **สร้างทีมใหม่**: คลิก "สร้างทีม" → ตั้งชื่อ, คำอธิบาย, เลือกสี
4. **เพิ่มสมาชิกเข้าทีม**:
   - คลิก **"เพิ่มสมาชิก"** → แท็บ **"เพิ่มผู้ใช้ที่มีอยู่"** → เลือกทีม → เลือกผู้ใช้ → เลือกบทบาท (Lead/Member) → กด "เพิ่มสมาชิก"
   - หรือแท็บ **"เชิญสมาชิกใหม่"** → กรอก ชื่อ, อีเมล, รหัสผ่าน, ตำแหน่ง, แผนก → เลือกทีม (ถ้าต้องการ) → กด "เชิญสมาชิกใหม่"
5. **ลบสมาชิกออกจากทีม**: คลิกไอคอนถังขยะข้างชื่อสมาชิก → ยืนยัน
6. **ลบทีม**: คลิกไอคอนถังขยะข้างชื่อทีม → ยืนยัน
7. **เพิ่ม/ลบจากการ์ด**: Hover ที่การ์ดสมาชิก → คลิก ⋮ → เลือกทีมที่ต้องการเพิ่ม/ลบ

### 📅 ปฏิทิน

1. คลิก **"ปฏิทิน"** ที่ Sidebar
2. ดูงาน, การประชุม, Deadline บนปฏิทิน
3. **เปลี่ยนวันครบกำหนด**: ลากงานไปวางบนวันที่ใหม่

### 📈 รายงาน

1. คลิก **"รายงาน"** ที่ Sidebar
2. ดูกราฟและสถิติภาพรวมของทีม

### ⚙️ ตั้งค่า

1. คลิก **"ตั้งค่า"** ที่ Sidebar
2. **แก้ไขโปรไฟล์**: เปลี่ยนชื่อ, อีเมล, อวาตาร์
3. **เปลี่ยนภาษา**: สลับระหว่างไทย 🇹🇭 / อังกฤษ 🇬🇧
4. **เปลี่ยนธีม**: สลับโหมดมืด/สว่าง (ถ้ามี)

### 🔔 การแจ้งเตือน

- คลิกไอคอน 🔔 มุมขวาบน
- ดูการแจ้งเตือนทั้งหมด: งานที่ถูก assign, ความคิดเห็นใหม่, Deadline ใกล้ถึง
- แจ้งเตือนแบบ Real-time ผ่าน WebSocket

### ⌨️ Keyboard Shortcuts

- กด **`?`** เพื่อดูรายการ Shortcut ทั้งหมด
- **Ctrl+Z** — Undo
- **Ctrl+Y** — Redo

---

## 📂 โครงสร้างโปรเจกต์

```
Todolist/
├── index.html                  # Entry point
├── package.json                # Frontend dependencies
├── vite.config.ts              # Vite config + API proxy
├── tailwind.config.js          # Tailwind CSS config
├── src/
│   ├── main.tsx                # React entry
│   ├── App.tsx                 # Main app + routing
│   ├── components/
│   │   ├── dashboard/          # StatsCards, ActivityFeed, DashboardHeader
│   │   ├── tasks/              # KanbanBoard, TaskCard, TaskFilterPanel, CommentSection
│   │   ├── projects/           # ProjectList
│   │   ├── team/               # TeamMembers (สร้างทีม, เพิ่ม/ลบสมาชิก)
│   │   ├── calendar/           # TeamCalendar
│   │   ├── sprints/            # SprintBoard
│   │   ├── modals/             # TaskModal
│   │   ├── notifications/      # NotificationPanel
│   │   ├── layout/             # Sidebar, MobileNav
│   │   └── ui/                 # shadcn/ui components (40+)
│   ├── contexts/               # AuthContext
│   ├── hooks/                  # useStore, useNotifications, useUndoRedo
│   ├── i18n/                   # en.ts, th.ts, LanguageContext
│   ├── pages/                  # LoginPage, ReportsPage, SettingsPage
│   ├── types/                  # TypeScript interfaces
│   └── lib/                    # Utilities
│
└── server/
    ├── package.json            # Backend dependencies
    ├── prisma/
    │   ├── schema.prisma       # Database schema
    │   └── seed.ts             # Seed data
    └── src/
        ├── index.ts            # Express + Socket.IO server
        ├── middleware/          # JWT auth middleware
        ├── lib/                # Prisma client, Socket.IO, config
        └── routes/             # API routes
            ├── auth.ts         # Login / Register
            ├── users.ts        # CRUD Users
            ├── teams.ts        # CRUD Teams
            ├── projects.ts     # CRUD Projects
            ├── tasks.ts        # CRUD Tasks
            ├── sprints.ts      # CRUD Sprints
            ├── events.ts       # Calendar Events
            ├── comments.ts     # Task Comments
            ├── activities.ts   # Activity Feed
            ├── notifications.ts # Notifications
            ├── stats.ts        # Dashboard Stats
            └── profile.ts      # Profile Update
```

---

## 🔌 API Endpoints

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/auth/register` | สมัครสมาชิก |
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| GET | `/api/auth/me` | ดูข้อมูลตัวเอง |
| GET | `/api/users` | รายชื่อสมาชิกทั้งหมด |
| GET | `/api/tasks` | รายการงานทั้งหมด |
| POST | `/api/tasks` | สร้างงานใหม่ |
| PATCH | `/api/tasks/:id` | แก้ไขงาน |
| DELETE | `/api/tasks/:id` | ลบงาน |
| GET | `/api/projects` | รายการโปรเจกต์ |
| POST | `/api/projects` | สร้างโปรเจกต์ |
| DELETE | `/api/projects/:id` | ลบโปรเจกต์ |
| GET | `/api/teams` | รายการทีม |
| POST | `/api/teams` | สร้างทีม |
| PATCH | `/api/teams/:id` | แก้ไขทีม / จัดการสมาชิก |
| DELETE | `/api/teams/:id` | ลบทีม |
| GET | `/api/sprints` | รายการ Sprint |
| POST | `/api/sprints` | สร้าง Sprint |
| GET | `/api/events` | Calendar Events |
| GET | `/api/stats` | สถิติ Dashboard |
| GET | `/api/activities` | Activity Feed |
| GET | `/api/notifications` | การแจ้งเตือน |
| PATCH | `/api/profile` | อัปเดตโปรไฟล์ |

---

## 🧪 บัญชีทดสอบ

หลังจากรัน `npm run db:seed` จะมีบัญชีทดสอบพร้อมใช้งาน (รหัสผ่านทุกบัญชี: **`password123`**):

| ชื่อ | อีเมล | ตำแหน่ง |
|------|--------|---------|
| สมชาย ใจดี | somchai@devteam.com | Admin |
| ปริญญา วงศ์สวัสดิ์ | parinya@devteam.com | Manager |
| วิชัย พัฒนาดี | wichai@devteam.com | Developer |
| สุภาพร ออกแบบเก่ง | supaporn@devteam.com | Designer |
| กมลชนก ทดสอบเทพ | kamolchanok@devteam.com | Tester |
| ณัฐพล โค้ดเร็ว | natthaphon@devteam.com | Developer |

---

## 📝 Scripts ที่มี

### Frontend

```bash
npm run dev       # รัน dev server (port 5173)
npm run build     # Build สำหรับ production
npm run preview   # Preview production build
npm run lint      # ตรวจสอบ code ด้วย ESLint
```

### Backend

```bash
cd server
npm run dev       # รัน dev server (port 3001)
npm run build     # Compile TypeScript
npm run start     # รัน production build
npm run db:push   # สร้าง/อัปเดต database schema
npm run db:seed   # เพิ่มข้อมูลตัวอย่าง
npm run db:studio # เปิด Prisma Studio (จัดการ DB ผ่าน GUI)
```

---

## 📄 License

MIT
