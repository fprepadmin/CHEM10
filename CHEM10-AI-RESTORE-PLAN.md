# CHEM10 AI – PRODUCTION RESTORE PLAN
**Snapshot Reference**: `CHEM10-AI-PRODUCTION-STABLE-2026-08-30`  
**Snapshot Timestamp**: `2026-08-30T10:17:00.000Z`  
**Database ID**: *(configure in firebase-applet-config.json)*

---

## 1. TỔNG QUAN VỀ BẢN SAO LƯU (BACKUP OVERVIEW)

Bản sao lưu này là trạng thái ổn định tuyệt đối (**Stable Baseline**) của hệ thống CHEM10 AI trước khi thực hiện nhập ngân hàng câu hỏi quy mô lớn. Bản sao lưu đảm bảo:
- Đã cách ly hoàn toàn `questions` và `answerKeys` (Zero Answer-Key Exposure).
- Đã kích hoạt cơ chế chấm điểm Server-side qua `/api/grade-submission`.
- Đã cấu hình và kiểm thử thành công Firestore Security Rules phân quyền 3 tầng: `ADMIN`, `TEACHER`, `STUDENT`.
- Dữ liệu 7 chương Hóa học 10 GDPT 2018 và hệ thống đề mẫu được lưu trữ an toàn.

---

## 2. CÁC THÀNH PHẦN ĐƯỢC SAO LƯU

| Thành phần | Vị trí Snapshot | Mô tả |
| :--- | :--- | :--- |
| **Source Code & Components** | `snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/src/` | Toàn bộ mã nguồn React + Vite + TypeScript |
| **Server-Side Grading Engine** | `snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/server.ts` | Backend Express chấm thi và bảo mật đáp án |
| **Firestore Security Rules** | `snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/firestore.rules` | Quy tắc bảo mật Firestore Production |
| **Firebase Blueprint & Config** | `snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/firebase-*` | Cấu hình database và schema Firestore |
| **Curriculum & Seeds Data** | `snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/data_seeds/` | Dữ liệu 7 chương và bộ câu hỏi mẫu đã tách đáp án |
| **Build & Tooling Configs** | `snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/package.json` | Cấu hình build esbuild + vite + tsconfig |

---

## 3. QUY TRÌNH PHỤC HỒI CHI TIẾT (STEP-BY-STEP RESTORATION)

Nếu việc nhập câu hỏi mới gặp sự cố hoặc xảy ra lỗi logic, thực hiện các bước sau để phục hồi về trạng thái snapshot này:

### Bước 1: Phục hồi Toàn bộ Mã Nguồn (Source Code)
```bash
# Sao chép đè mã nguồn từ snapshot về thư mục gốc
cp -r snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/src ./
cp snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/server.ts ./
cp snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/package.json ./
cp snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/tsconfig.json ./
cp snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/vite.config.ts ./
cp snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/index.html ./
cp snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/metadata.json ./
```

### Bước 2: Phục hồi Cấu hình Firebase & Security Rules
```bash
cp snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/firestore.rules ./
cp snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/firebase-blueprint.json ./
cp snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/firebase-applet-config.json ./
```
Triển khai lại Firestore Rules lên Cloud:
```bash
firebase deploy --only firestore:rules
```

### Bước 3: Phục hồi Dữ liệu & Hạt giống Hệ thống (Seed Data)
Nếu cần khôi phục lại bộ câu hỏi mẫu hoặc chương trình học chuẩn:
```bash
npx tsx scripts/export_seed_data.ts
```

### Bước 4: Kiểm tra & Build lại Hệ thống
```bash
# Kiểm tra lỗi cú pháp TypeScript
npm run lint

# Build production bundle
npm run build

# Khởi động lại dev/production server
npm run dev
```

---

## 4. KIỂM THỬ XÁC NHẬN SAU PHỤC HỒI (POST-RESTORE VERIFICATION)

Sau khi phục hồi, chạy các kiểm tra sau để xác nhận hệ thống hoạt động chính xác 100%:

1. **Kiểm tra Health Endpoint**:
   ```bash
   curl -s http://localhost:3000/api/health
   # Kết quả mong đợi: {"status":"ok",...}
   ```

2. **Kiểm tra Server-side Grading**:
   ```bash
   curl -s -X POST http://localhost:3000/api/grade-submission \
     -H "Content-Type: application/json" \
     -d '{"studentId":"test","studentEmail":"test@test.com","questionIds":["demo-q1"],"answers":{"demo-q1":"B"}}'
   # Kết quả mong đợi: {"success":true,"score":10,"correctCount":1,...}
   ```

3. **Kiểm tra Quyền Truy cập**:
   - Tài khoản Admin đăng nhập toàn quyền.
   - Tài khoản Học sinh không đọc được collection `answerKeys`.

---

## 5. THÔNG TIN LIÊN HỆ & BẢO TRÌ

- **Admin Chính**: *(configure in Firestore)*
- **Tình trạng Bản Sao Lưu**: 🟢 **VERIFIED STABLE & READY FOR ROLLBACK**
