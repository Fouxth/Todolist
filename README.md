# DevTeam — ระบบจัดการงานสำหรับทีมพัฒนา

ระบบจัดการงาน (Task Management) แบบ Full-Stack สำหรับทีมพัฒนาซอฟต์แวร์ รองรับ Kanban Board, Sprint Management, Team Calendar, Real-time Chat & Notifications และอื่นๆ

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio)

---

## 📋 สารบัญ

- [ภาพรวมระบบ](#-ภาพรวมระบบ)
- [สถาปัตยกรรม](#-สถาปัตยกรรม)
- [ฟีเจอร์หลัก](#-ฟีเจอร์หลัก)
- [เทคโนโลยีที่ใช้](#-เทคโนโลยีที่ใช้)
- [โครงสร้างฐานข้อมูล](#-โครงสร้างฐานข้อมูล)
- [ระบบสิทธิ์การใช้งาน](#-ระบบสิทธิ์การใช้งาน)
- [ความต้องการของระบบ](#-ความต้องการของระบบ)
- [การติดตั้งและเริ่มต้นใช้งาน](#-การติดตั้งและเริ่มต้นใช้งาน)
- [วิธีใช้งาน](#-วิธีใช้งาน)
- [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
- [API Endpoints](#-api-endpoints)
- [Security](#-security)
- [Scripts](#-scripts)

---

## 🧭 ภาพรวมระบบ

DevTeam เป็นแอปพลิเคชันจัดการงานแบบ **Real-time** ออกแบบมาสำหรับทีมพัฒนาซอฟต์แวร์ที่ต้องการเครื่องมือครบวงจรในที่เดียว ระบบรองรับการทำงานร่วมกันแบบหลายคนพร้อมกัน ผ่านระบบ WebSocket โดยมีฟีเจอร์หลักได้แก่

- **Kanban Board** สำหรับติดตามสถานะงาน
- **Sprint Management** สำหรับวางแผนการทำงานแบบ Agile
- **Team Chat** สำหรับสื่อสารภายในโปรเจกต์
- **Real-time Notifications** แจ้งเตือนเมื่อมีการเปลี่ยนแปลง
- **Time Tracking** จับเวลาการทำงานในแต่ละ Task
- **Team Calendar** วางแผน Deadline และนัดประชุม

---

## 🏗 สถาปัตยกรรม

```
┌─────────────────────────────────────────────────┐
│              Frontend (Vite + React)             │
│    Port 5173 (dev)  /  Vercel (production)      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ AuthCtx  │  │ i18n Ctx │  │ useStore hook │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│         REST API calls + Socket.IO               │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────────┐
│         Backend (Express 5 + Socket.IO)          │
│                  Port 3001                       │
│                                                  │
│  ┌─────────────┐  ┌────────────┐  ┌──────────┐  │
│  │ JWT Auth MW │  │ Rate Limit │  │  Helmet  │  │
│  └─────────────┘  └────────────┘  └──────────┘  │
│                                                  │
│  Routes: auth / tasks / projects / teams /       │
│          sprints / events / chats / notifications│
└──────────────────────┬──────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼──────────────────────────┐
│              PostgreSQL Database                 │
│  Users, Tasks, Projects, Teams, Sprints,         │
│  Chats, Notifications, TimeTracking, ...         │
└─────────────────────────────────────────────────┘
```

### การสื่อสาร Real-time (Socket.IO)

- Client ส่ง JWT token ตอน handshake เพื่อยืนยันตัวตน
- Server แบ่ง Room ตาม `user:{userId}` เพื่อส่งการแจ้งเตือนเฉพาะบุคคล
- Socket Events ที่ใช้: `notification`, `chat:message`, `task:updated`, `task:created`, `task:deleted`

---

## ✨ ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 🔐 **ระบบสมาชิก** | สมัคร / เข้าสู่ระบบ, JWT Authentication, เลือกตำแหน่งและแผนก |
| 📋 **Kanban Board** | ลากย้ายงานข้ามสถานะ (Todo → In Progress → Review → Done) พร้อม Undo/Redo |
| 🏃 **Sprint Management** | สร้าง Sprint, กำหนดเป้าหมาย, ย้ายงานเข้า/ออก Sprint |
| 👥 **จัดการทีม** | สร้างทีม, เพิ่ม/ลบสมาชิก, กำหนดบทบาท Lead/Member |
| 📅 **Team Calendar** | ปฏิทินทีม, ลากงานเพื่อเปลี่ยนวันครบกำหนด |
| 📊 **Dashboard** | สถิติภาพรวม, Activity Feed, กราฟความคืบหน้า |
| 📁 **โปรเจกต์** | สร้าง/ลบโปรเจกต์, ติดตามความคืบหน้า |
| 🔔 **Notifications** | แจ้งเตือน Real-time ผ่าน Socket.IO (assign, comment, deadline) |
| 💬 **Team Chat** | แชทแบบ Direct Message และ Project Channel แบบ Real-time |
| ⏱️ **Time Tracking** | จับเวลาการทำงาน Start/Stop, ดูเวลาที่ใช้ต่อ Task |
| 📎 **File Attachments** | แนบไฟล์ในงาน, ดาวน์โหลดไฟล์ |
| 🔗 **Task Dependencies** | กำหนด dependency ระหว่างงาน (blocks / related) |
| ✅ **Subtasks** | แยกงานย่อยในแต่ละ Task พร้อมติ๊กเสร็จ |
| 📝 **Markdown** | รองรับ Markdown ในคำอธิบายงาน |
| 🔁 **Recurring Tasks** | งานที่เกิดซ้ำแบบ Daily, Weekly, Monthly, Custom |
| 🌐 **สองภาษา** | ไทย 🇹🇭 / อังกฤษ 🇬�� สลับได้ทันที |
| 📱 **Responsive** | ใช้งานได้ทั้งเดสก์ท็อปและมือถือ |
| ⌨️ **Keyboard Shortcuts** | กด `?` เพื่อดู Shortcut ทั้งหมด |

---

## 🛠 เทคโนโลยีที่ใช้

### Frontend
| เทคโนโลยี | เวอร์ชัน | บทบาท |
|---|---|---|
| React | 19 | UI Framework |
| TypeScript | 5.9 | Type Safety |
| Vite | 7 | Dev server & Build tool |
| Tailwind CSS | 3.4 | Utility-first CSS |
| shadcn/ui + Radix UI | — | UI Components (40+) |
| Socket.IO Client | 4 | Real-time connection |
| Sonner | — | Toast notifications |
| Lucide React | — | Icon library |

### Backend
| เทคโนโลยี | เวอร์ชัน | บทบาท |
|---|---|---|
| Express | 5 | Web framework |
| Prisma | 6 | ORM |
| PostgreSQL | 14+ | Database |
| Socket.IO | 4 | WebSocket server |
| JWT (jsonwebtoken) | — | Authentication |
| bcrypt | — | Password hashing |
| Helmet | — | HTTP security headers |
| express-rate-limit | — | Rate limiting |
| Multer | — | File upload |
| Nodemailer | — | Email (deadline alerts) |

---

## 🗃 โครงสร้างฐานข้อมูล

ระบบใช้ **PostgreSQL** ผ่าน **Prisma ORM** โดยมี 16 Models ดังนี้

```
User
 ├── TaskAssignee      (งานที่ได้รับมอบหมาย)
 ├── Comment           (ความคิดเห็น)
 ├── Attachment        (ไฟล์แนบ)
 ├── TimeEntry         (ประวัติจับเวลา)
 ├── CalendarEvent     (กิจกรรมในปฏิทิน)
 ├── Activity          (Log กิจกรรม)
 ├── TeamMember        (สมาชิกทีม)
 ├── Notification      (การแจ้งเตือน)
 ├── ChatMember        (สมาชิกห้องแชท)
 └── ChatMessage       (ข้อความแชท)

Project
 ├── Task[]            (งานในโปรเจกต์)
 ├── Sprint[]          (Sprint ของโปรเจกต์)
 ├── Team[]            (ทีมในโปรเจกต์)
 ├── CalendarEvent[]   (กิจกรรมในปฏิทิน)
 └── Chat[]            (ห้องแชทของโปรเจกต์)

Task
 ├── TaskAssignee[]    (ผู้รับผิดชอบ — หลายคนได้)
 ├── TaskTag[]         (Labels/Tags)
 ├── Subtask[]         (งานย่อย)
 ├── Comment[]         (ความคิดเห็น)
 ├── Attachment[]      (ไฟล์แนบ)
 ├── TimeTracking      (การจับเวลา)
 ├── TaskDependency[]  (dependency กับงานอื่น)
 └── CalendarEvent[]   (กิจกรรมที่เชื่อมกับงาน)

Chat
 ├── ChatMember[]      (สมาชิกห้องแชท)
 └── ChatMessage[]     (ข้อความ — รองรับ Reply)
```

### Task Status Flow
```
todo  →  in-progress  →  review  →  done
```

### Task Priority Levels
```
low  <  medium  <  high  <  urgent
```

---

## 🔑 ระบบสิทธิ์การใช้งาน

ระบบแบ่งบทบาทผู้ใช้เป็น 5 ระดับ:

| Role | สิทธิ์ |
|---|---|
| **admin** | จัดการทุกอย่างในระบบ, ลบโปรเจกต์, จัดการสมาชิก |
| **manager** | สร้าง/แก้ไขโปรเจกต์, จัดการทีม, มอบหมายงาน |
| **developer** | สร้าง/แก้ไขงาน, คอมเมนต์, จับเวลา |
| **designer** | สร้าง/แก้ไขงาน, คอมเมนต์, จับเวลา |
| **tester** | สร้าง/แก้ไขงาน, คอมเมนต์, จับเวลา |

ทุก API route ต้องผ่าน **JWT Authentication Middleware** โดย token มีอายุ **7 วัน**

---

## 📦 ความต้องการของระบบ

- **Node.js** 20.x ขึ้นไป
- **npm** 10.x ขึ้นไป
- **PostgreSQL** 14 ขึ้นไป (หรือใช้ผ่าน Docker / Cloud เช่น Supabase, Neon)

---

## 🚀 การติดตั้งและเริ่มต้นใช้งาน

### 1. Clone โปรเจกต์

```bash
git clone https://github.com/Fouxth/Todolist.git
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

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `server/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/todolist"
JWT_SECRET="your-secret-key-change-this-in-production"
PORT=3001
NODE_ENV="development"
```

> ⚠️ เปลี่ยน `USER` และ `PASSWORD` เป็นข้อมูล PostgreSQL ของคุณ  
> ⚠️ ใน production ให้ใช้ `JWT_SECRET` ที่ซับซ้อนและเก็บเป็นความลับเสมอ

### 4. สร้างฐานข้อมูล

```bash
cd server
npx prisma db push    # สร้างตารางทั้งหมดตาม schema
npm run db:seed       # เพิ่มข้อมูลตัวอย่าง (optional)
```

### 5. รันโปรเจกต์

เปิด **2 Terminal** พร้อมกัน:

```bash
# Terminal 1 — Backend (port 3001)
cd server
npm run dev

# Terminal 2 — Frontend (port 5173)
npm run dev
```

### 6. เปิดใช้งาน

เปิดเบราว์เซอร์ไปที่ **http://localhost:5173**

---

## 📖 วิธีใช้งาน

### 🔐 สมัครสมาชิก / เข้าสู่ระบบ

1. เปิดหน้าเว็บ → เห็นหน้า **Login**
2. **สมัครสมาชิกใหม่**: คลิกแท็บ "สมัครสมาชิก" → กรอก ชื่อ, อีเมล, รหัสผ่าน → เลือก **ตำแหน่ง** (Developer / Designer / Tester / Manager) และ **แผนก** → กด "สมัครสมาชิก"
3. **เข้าสู่ระบบ**: กรอกอีเมลและรหัสผ่าน → กด "เข้าสู่ระบบ"
4. ระบบจะจำ session ไว้ **7 วัน** ไม่ต้องล็อกอินใหม่ทุกครั้ง

---

### 📊 Dashboard

- หลังล็อกอินจะเข้าสู่หน้า **Dashboard** โดยอัตโนมัติ
- ดูสถิติภาพรวม: จำนวนงานทั้งหมด, เสร็จแล้ว, กำลังทำ, Overdue
- ดู **Activity Feed** — กิจกรรมล่าสุดของทุกคนในทีม
- ดู **Kanban Board** ย่อสำหรับงานที่ถูก assign ให้ตัวเอง

---

### 📋 จัดการงาน (Kanban Board)

1. คลิก **"งาน"** ที่ Sidebar ซ้าย
2. **สร้างงานใหม่**: คลิกปุ่ม **"+"** ที่ Header หรือในคอลัมน์สถานะที่ต้องการ
3. **กรอกรายละเอียดงาน**:
   - ชื่องาน, คำอธิบาย (รองรับ Markdown)
   - Priority: `low` / `medium` / `high` / `urgent`
   - ผู้รับผิดชอบ (assign หลายคนได้), วันครบกำหนด
   - โปรเจกต์, ทีม, Sprint, Labels/Tags
   - Subtasks, ไฟล์แนบ
4. **ย้ายสถานะ**: ลากการ์ดงานจากคอลัมน์หนึ่งไปอีกคอลัมน์
5. **Undo/Redo**: กด `Ctrl+Z` / `Ctrl+Y` เพื่อยกเลิก/ทำซ้ำการย้ายงาน
6. **แก้ไขงาน**: คลิกที่การ์ดงานเพื่อเปิดรายละเอียด
7. **ลบงาน**: คลิกไอคอนถังขยะในการ์ดงาน
8. **จับเวลา**: คลิก ▶️ เพื่อเริ่มจับเวลา, ⏹ เพื่อหยุด
9. **กรองงาน**: คลิกปุ่ม Filter เพื่อกรองตามสถานะ, Priority, ผู้รับผิดชอบ, Labels

#### Task Dependencies
- ในหน้ารายละเอียดงาน สามารถเพิ่ม dependency กับงานอื่นได้
- ประเภท: **blocks** (งานนี้บล็อกงานนั้น) หรือ **related** (งานที่เกี่ยวข้อง)

#### Recurring Tasks
- ตั้งงานให้เกิดซ้ำแบบ Daily, Weekly, Monthly หรือ Custom ได้

---

### 📁 โปรเจกต์

1. คลิก **"โปรเจกต์"** ที่ Sidebar
2. **สร้างโปรเจกต์ใหม่**: คลิก "สร้างโปรเจกต์ใหม่" → กรอกชื่อ, คำอธิบาย, กำหนดสี → กด "สร้าง"
3. **เข้าดูงานในโปรเจกต์**: คลิกที่การ์ดโปรเจกต์ → จะกรองแสดงเฉพาะงานในโปรเจกต์นั้น
4. ดู **Progress Bar** แสดงเปอร์เซ็นต์ความคืบหน้า (งานที่ `done` / งานทั้งหมด)
5. **ลบโปรเจกต์**: คลิก ⋮ → "ลบโปรเจกต์" → ยืนยัน *(งาน, Sprint ทั้งหมดในโปรเจกต์จะถูกลบด้วย)*

---

### 🏃 Sprint

1. คลิก **"Sprint"** ที่ Sidebar
2. **สร้าง Sprint ใหม่**: คลิก "New Sprint" → ตั้งชื่อ, เป้าหมาย (Goal), วันเริ่ม/สิ้นสุด, เลือกโปรเจกต์
3. **สถานะ Sprint**: `planning` → `active` → `completed`
4. **เพิ่มงานเข้า Sprint**: ลากงานจาก Backlog เข้า Sprint หรือเลือกผ่านหน้า Task
5. **ดูความคืบหน้า**: ดูสถิติ Todo / In Progress / Review / Done ในแต่ละ Sprint

---

### 👥 จัดการทีม

1. คลิก **"ทีม"** ที่ Sidebar
2. **สร้างทีมใหม่**: คลิก "สร้างทีม" → ตั้งชื่อ, คำอธิบาย, เลือกสีและโปรเจกต์
3. **เพิ่มสมาชิกเข้าทีม**:
   - คลิก **"เพิ่มสมาชิก"** → แท็บ **"เพิ่มผู้ใช้ที่มีอยู่"** → เลือกทีม → เลือกผู้ใช้ → เลือกบทบาท (Lead / Member)
   - หรือแท็บ **"เชิญสมาชิกใหม่"** → กรอกข้อมูลเพื่อสร้างบัญชีใหม่พร้อมเพิ่มเข้าทีม
4. **ลบสมาชิกออกจากทีม**: คลิกไอคอนถังขยะข้างชื่อสมาชิก → ยืนยัน
5. **ลบทีม**: คลิกไอคอนถังขยะข้างชื่อทีม → ยืนยัน
6. ดูสถิติสมาชิก: จำนวนงานที่ทำ, เวลาที่ใช้ทั้งหมด

---

### 📅 ปฏิทิน (Team Calendar)

1. คลิก **"ปฏิทิน"** ที่ Sidebar
2. ดูงาน Deadline, การประชุม, Reminders บนปฏิทิน
3. **เพิ่มกิจกรรม**: คลิกที่วันที่บนปฏิทิน → กรอกรายละเอียด, เลือกประเภท (task / meeting / deadline / reminder), เพิ่ม Attendees
4. **เปลี่ยนวันครบกำหนด**: ลากงานไปวางบนวันที่ใหม่บนปฏิทิน
5. ผู้ใช้ที่ถูกเพิ่มเป็น Attendees จะได้รับการแจ้งเตือน

---

### 💬 Team Chat

1. คลิกไอคอน 💬 ที่มุมขวาล่าง
2. **Direct Message**: แชทส่วนตัวกับสมาชิกในทีม 1:1
3. **Project Channel**: ห้องแชทสำหรับแต่ละโปรเจกต์
4. **Reply**: Hover ที่ข้อความ → คลิก "Reply" เพื่อตอบกลับ
5. ข้อความมาถึงแบบ Real-time ผ่าน Socket.IO

---

### 🔔 การแจ้งเตือน

- คลิกไอคอน 🔔 มุมขวาบน Header
- ประเภทการแจ้งเตือน:
  - **task_assigned** — มีงานถูก assign ให้คุณ
  - **task_completed** — งานที่คุณสร้างถูกทำเสร็จแล้ว
  - **comment** — มีคอมเมนต์ใหม่ในงานของคุณ
  - **mention** — มีคนกล่าวถึงคุณ
  - **due_soon** — งานกำลังจะถึง Deadline
- แจ้งเตือนแบบ Real-time โดยไม่ต้อง Refresh หน้าเว็บ
- คลิก **"อ่านทั้งหมด"** เพื่อ mark ว่าอ่านแล้วทุกรายการ

---

### 📈 รายงาน

1. คลิก **"รายงาน"** ที่ Sidebar
2. ดูกราฟและสถิติภาพรวม: งานตาม Priority, ความคืบหน้าของทีม, เวลาที่ใช้

---

### ⚙️ ตั้งค่า

1. คลิก **"ตั้งค่า"** ที่ Sidebar
2. **แก้ไขโปรไฟล์**: เปลี่ยนชื่อ, อีเมล, อวาตาร์, ตำแหน่ง, แผนก
3. **เปลี่ยนภาษา**: สลับระหว่างไทย 🇹🇭 / อังกฤษ 🇬🇧
4. **สถานะออนไลน์**: online / busy / away / offline

---

### ⌨️ Keyboard Shortcuts

| Shortcut | การทำงาน |
|---|---|
| `?` | แสดงรายการ Shortcut ทั้งหมด |
| `Ctrl+Z` | Undo (ยกเลิกการย้ายงาน) |
| `Ctrl+Y` | Redo (ทำซ้ำการย้ายงาน) |
| `N` | สร้างงานใหม่ (เมื่ออยู่ในหน้างาน) |

---

## 📂 โครงสร้างโปรเจกต์

```
Todolist/
├── index.html                  # Entry point
├── package.json                # Frontend dependencies
├── vite.config.ts              # Vite config + API proxy (/api → :3001)
├── tailwind.config.js          # Tailwind CSS config
├── components.json             # shadcn/ui config
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service Worker
│
├── src/
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Root component + routing
│   ├── components/
│   │   ├── ai/                 # AISuggestions
│   │   ├── calendar/           # TeamCalendar
│   │   ├── chat/               # ChatPanel, ChatWindow
│   │   ├── dashboard/          # StatsCards, ActivityFeed, DashboardHeader
│   │   ├── layout/             # Sidebar, MobileNav
│   │   ├── modals/             # TaskModal, EventModal
│   │   ├── notifications/      # NotificationPanel
│   │   ├── projects/           # ProjectList
│   │   ├── sprints/            # SprintBoard
│   │   ├── tasks/              # KanbanBoard, TaskCard, TaskFilterPanel
│   │   │                       # CommentSection, FileAttachments
│   │   │                       # TimeTracker, TaskDependencies, MarkdownRenderer
│   │   ├── team/               # TeamMembers
│   │   └── ui/                 # shadcn/ui components (40+)
│   ├── contexts/
│   │   └── AuthContext.tsx     # JWT auth state
│   ├── hooks/
│   │   ├── useStore.ts         # Global state (tasks, projects, teams, etc.)
│   │   ├── useNotifications.tsx # Real-time notifications via Socket.IO
│   │   ├── useChats.ts         # Real-time chat via Socket.IO
│   │   ├── useAlerts.ts        # Alert system
│   │   ├── useUndoRedo.ts      # Undo/Redo for Kanban
│   │   └── useKeyboardShortcuts.tsx
│   ├── i18n/
│   │   ├── th.ts               # Thai translations
│   │   ├── en.ts               # English translations
│   │   └── LanguageContext.tsx # Language switcher
│   ├── pages/
│   │   ├── LoginPage.tsx       # Login / Register
│   │   ├── ProjectDetailPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── AlertDemoPage.tsx
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces ทั้งหมด
│   └── lib/
│       ├── utils.ts            # Utility functions
│       └── permissions.ts      # Role-based permission helpers
│
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── prisma/
    │   ├── schema.prisma       # Database schema (16 models)
    │   └── seed.ts             # Seed data
    ├── uploads/                # ไฟล์ที่ Upload ผ่าน Multer
    └── src/
        ├── index.ts            # Express + Socket.IO + HTTP server
        ├── middleware/
        │   └── auth.ts         # JWT verify middleware
        ├── lib/
        │   ├── prisma.ts       # Prisma client singleton
        │   ├── socket.ts       # Socket.IO instance helper
        │   ├── config.ts       # JWT_SECRET, JWT_EXPIRES_IN
        │   └── email.ts        # Deadline email alerts (Nodemailer)
        └── routes/
            ├── auth.ts         # POST /register, POST /login, GET /me
            ├── users.ts        # GET /users
            ├── tasks.ts        # CRUD Tasks + Subtasks + Tags + Assignees
            ├── projects.ts     # CRUD Projects
            ├── teams.ts        # CRUD Teams + Members
            ├── sprints.ts      # CRUD Sprints
            ├── events.ts       # CRUD Calendar Events
            ├── comments.ts     # CRUD Comments
            ├── attachments.ts  # Upload / Delete ไฟล์แนบ
            ├── activities.ts   # GET Activity Feed
            ├── notifications.ts # GET / PATCH Notifications
            ├── chats.ts        # CRUD Chats + Messages
            ├── stats.ts        # GET Dashboard Stats
            └── profile.ts      # PATCH Profile
```

---

## 🔌 API Endpoints

> ทุก endpoint (ยกเว้น `/api/auth/*`) ต้องส่ง Header: `Authorization: Bearer <token>`

### Authentication
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/auth/register` | สมัครสมาชิก |
| POST | `/api/auth/login` | เข้าสู่ระบบ (รับ JWT token) |
| GET | `/api/auth/me` | ดูข้อมูลผู้ใช้ปัจจุบัน |

### Users & Profile
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/users` | รายชื่อสมาชิกทั้งหมด |
| PATCH | `/api/profile` | อัปเดตโปรไฟล์ตัวเอง |

### Tasks
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/tasks` | รายการงานทั้งหมด |
| POST | `/api/tasks` | สร้างงานใหม่ |
| PATCH | `/api/tasks/:id` | แก้ไขงาน |
| DELETE | `/api/tasks/:id` | ลบงาน |

### Projects
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/projects` | รายการโปรเจกต์ |
| POST | `/api/projects` | สร้างโปรเจกต์ |
| PATCH | `/api/projects/:id` | แก้ไขโปรเจกต์ |
| DELETE | `/api/projects/:id` | ลบโปรเจกต์ |

### Teams
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/teams` | รายการทีม |
| POST | `/api/teams` | สร้างทีม |
| PATCH | `/api/teams/:id` | แก้ไขทีม / จัดการสมาชิก |
| DELETE | `/api/teams/:id` | ลบทีม |

### Sprints
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/sprints` | รายการ Sprint |
| POST | `/api/sprints` | สร้าง Sprint |
| PATCH | `/api/sprints/:id` | แก้ไข Sprint |
| DELETE | `/api/sprints/:id` | ลบ Sprint |

### Calendar & Chat
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/events` | รายการกิจกรรมในปฏิทิน |
| POST | `/api/events` | สร้างกิจกรรม |
| PATCH | `/api/events/:id` | แก้ไขกิจกรรม |
| DELETE | `/api/events/:id` | ลบกิจกรรม |
| GET | `/api/chats` | รายการห้องแชท |
| POST | `/api/chats` | สร้างห้องแชท |
| GET | `/api/chats/:id/messages` | ดึงข้อความในห้อง |
| POST | `/api/chats/:id/messages` | ส่งข้อความ |

### Dashboard & Notifications
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/stats` | สถิติ Dashboard |
| GET | `/api/activities` | Activity Feed |
| GET | `/api/notifications` | รายการการแจ้งเตือน |
| PATCH | `/api/notifications/:id` | Mark notification as read |

---

## 🔒 Security

- **JWT Authentication** — ทุก API request ต้องมี Bearer token, อายุ 7 วัน
- **bcrypt** — Hash รหัสผ่านก่อนบันทึกลงฐานข้อมูล (salt rounds: 10)
- **Helmet** — ตั้งค่า HTTP security headers อัตโนมัติ
- **Rate Limiting** — จำกัด request ต่อ IP เพื่อป้องกัน brute force
- **CORS** — อนุญาตเฉพาะ origin ที่กำหนด (localhost + vercel.app)
- **Socket.IO Auth** — ตรวจสอบ JWT ทุกครั้งที่ client เชื่อมต่อ WebSocket
- **Cascade Delete** — ลบข้อมูลที่เกี่ยวข้องอัตโนมัติเมื่อลบ Parent record

---

## 📝 Scripts

### Frontend

```bash
npm run dev       # รัน dev server (port 5173)
npm run build     # Build สำหรับ production (tsc + vite build)
npm run preview   # Preview production build
npm run lint      # ตรวจสอบ code ด้วย ESLint
```

### Backend

```bash
cd server
npm run dev          # รัน dev server ด้วย tsx watch (port 3001)
npm run build        # Compile TypeScript → JavaScript
npm run start        # รัน production build
npm run db:push      # Push schema ไปยัง Database (สร้าง/อัปเดตตาราง)
npm run db:seed      # เพิ่มข้อมูลตัวอย่างลง Database
npm run db:studio    # เปิด Prisma Studio — จัดการข้อมูล Database ผ่าน GUI
npm run db:reset     # ล้างข้อมูลทั้งหมดและ Seed ใหม่
```

---

## 📄 License

MIT
