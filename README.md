# ระบบจดคะแนนแยกตามกลุ่ม (Group XP Tracker)

เว็บแอป Next.js + Supabase สำหรับจดคะแนน XP แยกตามกลุ่มด้วยบัญชี `username` ชั่วคราว พร้อมบันทึกอัตโนมัติ (Auto-save), เก็บประวัติการให้คะแนนทุกครั้ง และหน้าถ่ายรูปแนบหลักฐาน

## 1. ตั้งค่า Supabase
1. สร้างโปรเจกต์ใหม่ที่ [Supabase](https://supabase.com)
2. เปิด **SQL Editor** แล้วนำคำสั่งทั้งหมดในไฟล์ `supabase/schema.sql` ไปรัน
   - สร้างตารางทั้ง 7 ตาราง (`app_settings`, `temp_users`, `score_categories`, `score_items`, `user_scores`, `score_history`, `evidence_photos`)
   - สร้าง Storage Bucket ชื่อ `evidence-photos` (public)
3. ไปที่ **Project Settings → API** เพื่อคัดลอก:
   - `Project URL` (`NEXT_PUBLIC_SUPABASE_URL`)
   - `service_role` secret key (`SUPABASE_SERVICE_ROLE_KEY`)

## 2. ตั้งค่าไฟล์ Environment (`.env.local`)
คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่าจริง:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SESSION_SECRET=สุ่มรหัสยาวอย่างน้อย32ตัวอักษร
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ตั้งรหัสผ่านแอดมินของคุณ
```

## 3. รันบนเครื่อง (Development)
```bash
npm install
npm run dev
```
เปิดเบราว์เซอร์ไปที่:
- ผู้ดูแลระบบ (Admin): `http://localhost:3000/admin/login` — ใช้สร้าง `username` ชั่วคราว + ชื่อกลุ่ม, เพิ่มหมวดคะแนน/หัวข้อย่อย/XP และตั้งชื่อโปรเจกต์
- ผู้ใช้งาน (User): `http://localhost:3000/login` — ล็อกอินด้วยบัญชีที่ Admin สร้างไว้

## 4. ทดสอบและ Build
```bash
npm test
npm run build
```

## 5. Deploy บน Vercel
1. Push โค้ดขึ้น GitHub (`.env.local` ถูกกันไว้ใน `.gitignore` แล้ว)
2. Import repository ใน [Vercel](https://vercel.com)
3. ใส่ Environment Variables ทั้ง 5 ตัวจากขั้นตอนที่ 2 แล้วกด Deploy
