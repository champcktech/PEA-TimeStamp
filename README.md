# TimeMark GPS Electrical Survey Camera ⚡
แอปถ่ายภาพและวิดีโอประทับเวลา วันที่ พิกัด GPS (Lat/Long) และที่อยู่ลงในไฟล์โดยตรง สำหรับงานสำรวจระบบไฟฟ้า (PEA/MEA) และงานภาคสนาม

---

## 🚀 วิธีนำโปรเจกต์ไป Deploy บน Vercel

โปรเจกต์นี้ได้รับการตั้งค่าไฟล์ `vercel.json` เรียบร้อยแล้ว พร้อมสำหรับนำขึ้น Vercel ได้ทันที โดย Vercel จะสร้าง **HTTPS (SSL)** ให้อัตโนมัติ ซึ่งจำเป็นต่อการเปิดใช้งานกล้องมือถือและ GPS

### วิธีที่ 1: Deploy ผ่าน GitHub (แนะนำ สะดวกที่สุด)
1. นำโค้ดทั้งหมดขึ้น GitHub Repository ของคุณ
2. เข้าไปที่ [Vercel Dashboard](https://vercel.com/dashboard)
3. กดปุ่ม **"Add New..."** ➔ **"Project"**
4. เลือก Repository ของคุณ แล้วกด **"Import"**
5. ตรวจสอบการตั้งค่า (Vercel จะตรวจพบอัตโนมัติ):
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. กดปุ่ม **"Deploy"** แล้วรอประมาณ 30 วินาที จะได้ URL ใช้งานทันที (เช่น `https://your-app.vercel.app`)

---

### วิธีที่ 2: Deploy ผ่าน Vercel CLI บนคอมพิวเตอร์
หากติดตั้ง Node.js บนเครื่องคอมพิวเตอร์แล้ว:
```bash
# 1. ติดตั้ง Vercel CLI
npm install -g vercel

# 2. สั่ง Deploy
vercel

# 3. สั่งขึ้น Production
vercel --prod
```

---

## 📱 ข้อควรรู้ในการใช้งานบนมือถือผ่าน Vercel
- **ต้องใช้งานผ่าน HTTPS เท่านั้น**: Vercel มี SSL ให้ฟรีอยู่แล้ว ทำให้เบราว์เซอร์บนมือถือ (Safari บน iOS หรือ Chrome บน Android) อนุญาตให้เปิดกล้องและดึงพิกัด GPS ได้ทันที
- **เพิ่มเป็น Web App บนหน้าจอมือถือ (PWA/Add to Home Screen)**:
  - **iPhone (Safari)**: กดปุ่ม Share (แชร์) ➔ เลือก "เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)"
  - **Android (Chrome)**: กดจุดสามจุดมุมบนขวา ➔ เลือก "ติดตั้งแอป" หรือ "เพิ่มไปยังหน้าจอหลัก"
  - จะได้ไอคอนแอปบนหน้าจอมือถือ กดเปิดแล้วทำงานเต็มหน้าจอ (Fullscreen) เหมือนแอปในตัวเครื่องทันที
