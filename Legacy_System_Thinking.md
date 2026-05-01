# Legacy System Thinking

---

## คำถามที่ 1: "น้องจะเริ่มจากตรงไหน"

### 3 วันแรกจะทำอะไร

---

**วันที่ 1: ทำความรู้จักระบบ**

ขอถามลูกค้าก่อนเลยว่าปกติใช้งานอะไรบ้าง แล้วขอ access แบบ read-only ก่อน และขอ clone ระบบมาไว้ใน environment ของตัวเองด้วย เพื่อจะได้ลองดูได้เต็มที่โดยไม่ต้องกังวลว่าจะพัง production
สิ่งที่จะทำ:
- ดู directory structure, config files, PHP version, framework ที่ใช้
- หาดู error log และ access log ย้อนหลัง 7-30 วัน
- หาไฟล์แปลกที่พี่พูดถึง — ดูว่าอยู่ที่ไหน, ชื่ออะไร, timestamp สร้างเมื่อไหร่

จบวันที่ 1: รู้ว่ามีอะไรอยู่ในระบบ และไฟล์แปลกนั้นน่าเป็นห่วงแค่ไหน

---

**วันที่ 2: จัดลำดับความสำคัญของปัญหา**


- ไฟล์แปลก — น่าเป็นห่วงมากที่สุดใน 3 เรื่อง ถ้าเป็น malware จริงข้อมูลลูกค้าอาจรั่วอยู่ทุกวันโดยที่ไม่มีใครรู้

- เว็บช้าถัดมา — ดู query log, response time, ว่าช้าทุก page หรือแค่บางส่วน อาจเกี่ยวกับไฟล์แปลกด้วย

- Feature ใหม่ค่อยว่ากัน — ยังไม่มีข้อมูลพอที่จะรู้ว่าแตะส่วนไหนแล้วจะพัง

---

**วันที่ 3: สรุปและเตรียม safety net**

- จดว่าอะไร error อยู่แล้วก่อนที่เราจะแตะ
- ตรวจสอบว่ามี backup ไหม และ restore ได้จริงไหม
- เตรียม report สรุปให้พี่

---

### ใช้ AI ยังไง — ตัวอย่าง Prompt

**Prompt 1: ทำความเข้าใจ error log**

```
I'm investigating a legacy PHP system with no documentation.
Here are the most frequent errors from the last 7 days of error logs:
Please explain what each error means, which ones are most critical,
and what might be causing them.
```

**Prompt 2: อ่านโค้ดที่ไม่มีเอกสาร**

```
This is a function from a legacy PHP system with no comments or documentation.
Please explain what this code does, what inputs it expects, what it returns,
and whether there are any potential bugs or security risks I should be aware of.
```

---

### ถ้ามีเรื่องที่ไม่รู้ จะถามใคร

- **ถามพี่ในทีม** — ที่บอกว่าช้าพี่คิดว่าช้าจากอะไร hardware หรือ software การแบ่งงาน
- **ถาม AI** — สำหรับอ่านโค้ดที่ไม่เข้าใจ, explain error message, หา pattern
- **ถามลูกค้า** — ถ้าต้องรู้ business logic เช่น "ไฟล์ใน folder นี้ควรมีแค่รูปภาพ ใช่ไหม" ลูกค้ารับความเสี่ยงได้มากแค่ไหน มีแผนที่จะ upgrade server ไหม ถ้าต้องปิด server จะปิดได้นานแค่ไหน

---

### เรื่องที่กังวล

- ถ้า clone มาแล้วแต่ไฟล์แปลกจะเข้าเครื่องตัวเองไหม
- อาจใช้เวลานานในการทวนความรู้ PHP 

---

### จบ 3 วัน จะส่งมอบอะไรให้พี่

- System Overview — tech stack, PHP version, framework, dependencies หลัก
- Log Summary — error ที่พบบ่อย, hypothesis ว่าเว็บช้าเพราะอะไร
- ไฟล์แปลก — path, timestamp, ขนาดไฟล์, และความเห็นว่าคืออะไร
- คำถามที่ยังไม่รู้ — รายการสิ่งที่ต้องขุดต่อหรือต้องถามลูกค้าเพิ่ม
- Risk Assessment — อะไรที่อันตรายที่สุด และแนะนำให้ทำอะไรก่อน

---

## คำถามที่ 2: เจอไฟล์แปลก จะทำยังไง ไฟล์ .php ใน folder images/ ที่โค้ดถูก obfuscate

### คิดว่าคืออะไร

ไฟล์ .php ที่อยู่ใน folder images/ และโค้ดถูก obfuscate อาจจะเป็น malware attacker upload ขึ้น server เพื่อรัน command หรือดูไฟล์ผ่าน browser ได้โดยไม่ต้อง SSH

- ไฟล์ .php ไม่ควรอยู่ใน folder images/ เลย
- dev ปกติที่ไหนจะ obfuscate file ตัวเอง -- ถ้าซ่อนก็แปลว่ามีอะไรที่ไม่อยากให้อ่านออก
- อยู่ใน folder ที่มักให้ write permission เพื่อ upload รูป ซึ่งเป็นช่องโหว่ที่ attacker ใช้บ่อย

---

### ลบได้เลยไหม — ยังไม่ลบ

เหตุผล:

- ยังไม่รู้ว่าเข้ามาได้ยังไง — ถ้าลบโดยไม่รู้ช่องโหว่ attacker ก็ upload ใหม่ได้อีก
- ต้องเก็บหลักฐานก่อน — เก็บ hash ของไฟล์, บันทึก timestamp, เก็บ copy ไว้วิเคราะห์
- ต้องรู้ว่ามีแค่ไฟล์เดียวไหม — อาจมีหลายไฟล์

### สิ่งที่จะทำก่อนลบ

รายงานพี่และลูกค้าก่อนทำอะไรต่อ — ควรถามฝ่าย cyber security เพื่อช่วยตัดสินใจกับหัวหน้างาน เช่น แจ้ง users หรือพิจารณา take down ชั่วคราว

---

### สรุป

ไม่ลบทันทีเพราะการลบโดยไม่เข้าใจไม่ได้เป็นการแก้ปัญหาและอาจทำลายหลักฐานที่ต้องการ สิ่งที่ทำก่อนคือ document, หาว่ามีไฟล์อื่นอีกไหม, แล้วรายงานคนที่ต้องตัดสินใจต่อไป
