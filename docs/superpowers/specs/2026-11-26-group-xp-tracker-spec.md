# Group XP Tracker — Specification

## Overview
เว็บแอปสำหรับจดคะแนนแยกตามกลุ่ม โดยผู้ดูแล (Admin) เป็นผู้สร้างบัญชีชั่วคราว (`username` + `password` + `ชื่อกลุ่ม`) ให้ผู้ใช้งานล็อกอินเข้ามาอัปเดตคะแนนและถ่ายรูปแนบหลักฐานได้เรื่อยๆ พร้อมเก็บประวัติการให้คะแนนแยกตาม user ใน Supabase

## Tech Stack
- **Framework:** Next.js (App Router, TypeScript, Tailwind CSS)
- **Database & Storage:** Supabase (PostgreSQL + Storage Bucket `evidence-photos`)
- **Testing:** Vitest (unit/API logic) + Playwright (E2E/UI smoke)
- **Deployment Target:** Vercel

## Roles & Authentication
1. **User (บัญชีชั่วคราว)**
   - ล็อกอินด้วย `username` + `password` ที่ Admin สร้างให้ (ไม่ใช้อีเมล)
   - 1 User ผูกตายตัวกับ 1 กลุ่ม (`group_name`)
   - Session เก็บใน HTTP-only HMAC-signed cookie และตรวจสอบสถานะ `is_active` กับฐานข้อมูล
2. **Admin**
   - ล็อกอินผ่าน `/admin/login` ด้วย `ADMIN_USERNAME` และ `ADMIN_PASSWORD` จาก environment variables

## Pages & Features
1. **Login (`/login`)**: ฟอร์ม username + password สำหรับผู้ใช้งานทั่วไป และลิงก์ไป `/admin/login`
2. **หน้าจดคะแนน (`/`)**:
   - **Top Bar**: มุมซ้ายบน = ชื่อโปรเจกต์ (`app_settings.project_name`), ตรงกลางบน = สถานะการบันทึก (`บันทึกแล้ว` / `กำลังบันทึก...` / `บันทึกไม่สำเร็จ`), มุมขวาบน = User icon (แสดง username, ชื่อกลุ่ม, ปุ่ม Logout)
   - **Navigation**: สลับระหว่าง `จดคะแนน` (`/`), `ถ่ายรูปหลักฐาน` (`/photos`), `ประวัติคะแนน` (`/history`)
   - **Head**: ชื่อกลุ่มของ user + คะแนน XP รวมทั้งหมด
   - **Category Boxes**: แสดงกล่องหมวดคะแนนพร้อมผลรวม XP ของหมวดนั้น และหัวข้อย่อยแต่ละข้อพร้อมปุ่มสลับ `ผ่าน` / `ไม่ผ่าน` และค่า XP
   - **Auto-save**: กดสลับปุ๊บ บันทึกลง `user_scores` และเพิ่มแถวใหม่ใน `score_history` อัตโนมัติทันที
3. **หน้าถ่ายรูปหลักฐาน (`/photos`)**:
   - รองรับถ่ายรูปจากกล้อง (`capture="environment"`) และเลือกไฟล์จากเครื่อง
   - บังคับกรอกชื่อรูป และเลือกหมวดคะแนนที่เกี่ยวข้องได้ (optional)
   - แสดงแกลเลอรีรูปของกลุ่มตัวเอง แก้ชื่อรูป และลบรูปได้
4. **หน้าประวัติคะแนน (`/history`)**:
   - แสดงรายการเปลี่ยนแปลงคะแนนของกลุ่มตัวเองเรียงจากล่าสุด
5. **หน้า Admin (`/admin`)**:
   - จัดการชื่อโปรเจกต์ (`project_name`)
   - CRUD บัญชีชั่วคราว (`username`, `password`, `group_name`, `is_active`)
   - CRUD หมวดคะแนน (`score_categories`) และหัวข้อย่อย (`score_items` + `xp`)
   - ดูสรุปคะแนนทุกกลุ่ม, ประวัติการให้คะแนนทั้งหมด, Export CSV, และดูรูปหลักฐานทั้งหมด
