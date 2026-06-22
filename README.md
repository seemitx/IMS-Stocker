# 📦 Inventory Management System (IMS)

ระบบจัดการสต๊อกสินค้า เชื่อมต่อ Google Sheets ผ่าน Google Apps Script

---

## 🚀 ขั้นตอนการติดตั้ง

### ขั้นที่ 1: เตรียม Google Sheets

1. เปิด [Google Sheets](https://sheets.google.com) ใหม่
2. ตั้งชื่อ Spreadsheet เช่น `IMS Database`
3. **สำคัญ**: คัดลอก Spreadsheet ID จาก URL  
   ตัวอย่าง URL: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`**`/edit`

### ขั้นที่ 2: ติดตั้ง Google Apps Script

1. ใน Google Sheets คลิก **Extensions > Apps Script**
2. ลบโค้ดเดิมทั้งหมด แล้ว **วางโค้ดจาก `appscript/Code.gs`**
3. บันทึกโปรเจกต์ (Ctrl+S) ตั้งชื่อเช่น `IMS Backend`

### ขั้นที่ 3: Initialize Sheets (สร้างตาราง)

1. ใน Apps Script Editor คลิก **Run > Run function > initSheets**
2. อนุญาต Permission ที่ขอ
3. รัน function `initSheets` จะสร้าง Sheet: Products, StockIn, StockOut, Users ให้อัตโนมัติ
4. Sheet Users จะมี account เริ่มต้น:
   - **admin** / admin1234 (สิทธิ์ผู้ดูแลระบบ)
   - **staff** / staff1234 (สิทธิ์พนักงาน)

### ขั้นที่ 4: Deploy Web App

1. คลิก **Deploy > New Deployment**
2. คลิก **Select type > Web App**
3. กรอกข้อมูล:
   - **Description**: IMS API v1
   - **Execute as**: Me
   - **Who has access**: Anyone *(สำคัญมาก!)*
4. คลิก **Deploy**
5. **คัดลอก Web App URL** ที่ได้ (จะมีรูปแบบ `https://script.google.com/macros/s/AKfycbxUjY1WtbWLInpAK0yQAcm3CSUEGkoodd6WoOWWXMH4sPPaX-is6u9AQgr0Bfoln8P5/exec`)

### ขั้นที่ 5: ตั้งค่า Frontend

1. เปิดไฟล์ `js/api.js`
2. แก้ไขบรรทัดที่ 6:
   ```javascript
   const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
   ```
   เปลี่ยน `YOUR_DEPLOYMENT_ID` เป็น URL ที่ได้จาก Step 4

### ขั้นที่ 6: เปิดเว็บไซต์

- เปิดไฟล์ `login.html` ในเบราว์เซอร์
- หรืออัปโหลดทั้งโฟลเดอร์ขึ้น Web Hosting
- Login ด้วย **admin / admin1234**

---

## 📁 โครงสร้างโปรเจกต์

```
inventory/
├── login.html          # หน้า Login
├── index.html          # Dashboard
├── products.html       # จัดการสินค้า
├── stock-in.html       # รับสินค้าเข้า
├── stock-out.html      # เบิกสินค้าออก
├── reports.html        # รายงาน
│
├── css/
│   ├── style.css       # ธีมหลัก + Layout + Dark Mode
│   ├── dashboard.css   # Dashboard เฉพาะ
│   └── table.css       # ตาราง + Toolbar
│
├── js/
│   ├── api.js          # API connector + Helpers
│   ├── layout.js       # Sidebar + Topbar shared
│   ├── dashboard.js    # Dashboard logic
│   ├── products.js     # Product CRUD
│   ├── stockin.js      # Stock In logic
│   ├── stockout.js     # Stock Out logic
│   └── report.js       # Reports + Export
│
└── appscript/
    └── Code.gs         # Google Apps Script (Backend)
```

---

## 🔑 บัญชีเริ่มต้น

| Username | Password  | บทบาท        |
|----------|-----------|--------------|
| admin    | admin1234 | ผู้ดูแลระบบ  |
| staff    | staff1234 | พนักงาน      |

> ⚠️ **แนะนำ**: เปลี่ยนรหัสผ่านใน Google Sheets Sheet "Users" หลังติดตั้ง

---

## ✨ ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| 🔐 Login System | Session-based, Admin/Staff roles |
| 📊 Dashboard | สถิติ real-time, กราฟ 7 วัน, แจ้งเตือนสินค้าใกล้หมด |
| 📦 Products | CRUD ครบ, ค้นหา/กรอง, Pagination |
| 📥 Stock In | รับสินค้า, อัปเดตยอดอัตโนมัติ, ประวัติ |
| 📤 Stock Out | เบิกสินค้า, ป้องกันยอดติดลบ, ประวัติ |
| 📋 Reports | สรุปสต๊อก/รับ/เบิก, Export CSV + PDF |
| 🌙 Dark Mode | Toggle ได้ บันทึก preference |
| 📱 Responsive | รองรับ Mobile / Tablet / Desktop |

---

## 🔧 การอัปเดต Apps Script

เมื่อแก้ไข `Code.gs`:
1. บันทึกไฟล์ (Ctrl+S)
2. **Deploy > Manage Deployments**
3. คลิก Edit (ดินสอ) บน Deployment ที่มีอยู่
4. เปลี่ยน Version เป็น **New version**
5. คลิก **Deploy**

---

## 🌐 Hosting Options

| ตัวเลือก | วิธี |
|---------|-----|
| Local | เปิด `login.html` โดยตรง (บางเบราว์เซอร์อาจมีปัญหา CORS) |
| GitHub Pages | Push โฟลเดอร์ขึ้น GitHub, เปิด Pages |
| Netlify | Drag & drop โฟลเดอร์ที่ [netlify.com/drop](https://netlify.com/drop) |
| Any web server | อัปโหลดไฟล์ทั้งหมดผ่าน FTP |

> **หมายเหตุ**: เนื่องจาก Google Apps Script รองรับ CORS แล้ว ไม่จำเป็นต้องมี backend เพิ่มเติม

---

## ❓ แก้ปัญหาที่พบบ่อย

**Q: Login แล้วขึ้น "เกิดข้อผิดพลาดในการเชื่อมต่อ"**  
A: ตรวจสอบ `API_URL` ใน `js/api.js` ว่าถูกต้อง และ Deploy ตั้ง "Anyone" แล้ว

**Q: ข้อมูลไม่บันทึกลง Sheets**  
A: Run `initSheets` ใน Apps Script อีกครั้ง แล้ว Re-deploy

**Q: หน้าเว็บขาวเปล่า**  
A: เปิด Developer Console (F12) ดู Error, ตรวจสอบ path ของ CSS/JS ถูกต้อง

**Q: Export PDF ไม่มีภาษาไทย**  
A: ต้องมี font Sarabun ซึ่งดึงจาก Google Fonts (ต้องเชื่อมต่ออินเทอร์เน็ต)
