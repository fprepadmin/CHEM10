<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=32&pause=1000&color=0EA5E9&center=true&vCenter=true&width=600&lines=CHEM10+AI;N%E1%BB%81n+t%E1%BA%A3ng+%C3%94n+t%E1%BA%ADp+H%C3%B3a+h%E1%BB%8Dc+10" alt="CHEM10 AI" />

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-%233178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-%2361DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12-%23FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6-%23646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-%234285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Groq](https://img.shields.io/badge/Groq-AI-%23F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)

<br/>

> Nền tảng ôn tập Hóa học 10 tích hợp trí tuệ nhân tạo · Chuẩn chương trình GDPT 2018  
> Chấm bài Server-side bảo mật · Phân quyền 3 tầng · Tạo đề tự động bằng AI

</div>

---

## Giới thiệu

**CHEM10 AI** là nền tảng học tập trực tuyến dành riêng cho môn Hóa học lớp 10 theo chương trình Giáo dục phổ thông 2018. Hệ thống tích hợp ngân hàng câu hỏi đa dạng, cơ chế tạo đề tự động bằng Gemini AI, và kiến trúc chấm bài Server-side đảm bảo đáp án không bao giờ tiếp cận được phía client.

### Tính năng nổi bật

| Tính năng | Mô tả |
|:----------|:------|
| ![bank](https://img.shields.io/badge/-Ngân_hàng_câu_hỏi-0ea5e9?style=flat-square&logoColor=white) | 7 chương Hóa 10 GDPT 2018 — Trắc nghiệm, Đúng/Sai 4 ý, Tự luận ngắn, Tính toán, Cân bằng PTHH |
| ![ai](https://img.shields.io/badge/-Tạo_đề_bằng_AI-7c3aed?style=flat-square&logoColor=white) | Gemini AI sinh câu hỏi theo chương, mức độ nhận thức và chủ đề tuỳ chỉnh |
| ![secure](https://img.shields.io/badge/-Chấm_bài_Server--side-16a34a?style=flat-square&logoColor=white) | Đáp án chỉ tồn tại trên server — học sinh không thể gian lận qua network requests |
| ![rbac](https://img.shields.io/badge/-Phân_quyền_3_tầng-dc2626?style=flat-square&logoColor=white) | ADMIN · TEACHER · STUDENT với Firestore Security Rules nghiêm ngặt |
| ![report](https://img.shields.io/badge/-Báo_cáo_chi_tiết-0369a1?style=flat-square&logoColor=white) | Thống kê điểm số, phân tích năng lực theo chương và mức độ nhận thức |
| ![export](https://img.shields.io/badge/-Xuất_Word_/_Excel-166534?style=flat-square&logoColor=white) | Tạo file đề thi `.docx` và bảng điểm `.xlsx` chuẩn định dạng |
| ![class](https://img.shields.io/badge/-Quản_lý_lớp_học-9333ea?style=flat-square&logoColor=white) | Tạo lớp, giao bài có thời hạn, theo dõi tiến độ từng học sinh |
| ![realtime](https://img.shields.io/badge/-Real--time_Firestore-f97316?style=flat-square&logoColor=white) | Cập nhật kết quả tức thì, đồng bộ đa thiết bị không cần tải lại trang |

---

## Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────┐
│                       CHEM10 AI SYSTEM                       │
│                                                              │
│   ┌───────────────┐    ┌────────────────┐    ┌───────────┐   │
│   │   React 19    │    │   Express.js   │    │ Firebase  │   │
│   │  TypeScript   │◄──►│    Server      │◄──►│ Firestore │   │
│   │  Tailwind 4   │    │  (Port 3000)   │    │   Auth    │   │
│   └───────────────┘    └────────────────┘    └───────────┘   │
│           │                    │                             │
│           │             ┌──────┴───────┐                     │
│           │             │  Gemini AI   │  ← Tạo câu hỏi      │
│           │             │  Groq AI     │  ← Phân tích HS     │
│           └─────────────┴──────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

**Luồng chấm bài Zero-Exposure:**
```
[Client] Nộp bài ──► [Express Server] Nhận answers
                              │
                    Fetch answerKeys từ Firestore
                              │
                    So sánh & tính điểm (server-only)
                              │
              ◄── Trả về score + details (KHÔNG trả đáp án)
```

---

## Yêu cầu hệ thống

- ![Node](https://img.shields.io/badge/Node.js-%3E%3D18.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)
- ![npm](https://img.shields.io/badge/npm_hoặc_bun-latest-CB3837?style=flat-square&logo=npm&logoColor=white)
- Tài khoản [Firebase](https://console.firebase.google.com/) với Firestore và Authentication được kích hoạt
- [Gemini API Key](https://aistudio.google.com/apikey) — miễn phí tại Google AI Studio
- [Groq API Key](https://console.groq.com/keys) — miễn phí, dùng cho tính năng phân tích năng lực học sinh

---

## Cài đặt

### Bước 1 — Clone và cài dependencies

```bash
git clone <repo-url>
cd CHEM10
npm install
```

### Bước 2 — Cấu hình Firebase

Điền thông tin project vào [`firebase-applet-config.json`](./firebase-applet-config.json):

```json
{
  "projectId": "your-firebase-project-id",
  "appId": "your-app-id",
  "apiKey": "your-firebase-web-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "firestoreDatabaseId": "your-database-id",
  "storageBucket": "your-project.firebasestorage.app",
  "messagingSenderId": "your-sender-id"
}
```

> Lấy thông tin tại: **Firebase Console** → Project Settings → Your apps → Web app config.

### Bước 3 — Cấu hình biến môi trường

```bash
cp .env.example .env.local
```

Chỉnh sửa `.env.local`:

```env
# Gemini AI — tạo câu hỏi tự động
GEMINI_API_KEY=your_gemini_api_key

# Groq AI — phân tích năng lực học sinh (nhiều keys cách nhau bởi dấu phẩy)
VITE_GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3

# URL ứng dụng
APP_URL=http://localhost:3000
```

### Bước 4 — Deploy Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules
```

### Bước 5 — Chạy development server

```bash
npm run dev
# Mở trình duyệt: http://localhost:3000
```

---

## Các lệnh NPM

| Lệnh | Mô tả |
|:-----|:------|
| `npm run dev` | Chạy server development — Vite HMR + Express đồng thời |
| `npm run build` | Build production bundle (Vite + esbuild) |
| `npm run start` | Chạy server production từ `dist/` |
| `npm run lint` | Kiểm tra lỗi TypeScript (`tsc --noEmit`) |
| `npm run preview` | Preview bản build production local |
| `npm run clean` | Xóa thư mục `dist/` để build sạch |

---

## Cấu trúc thư mục

```
CHEM10/
├── src/
│   ├── App.tsx                    # Root component, routing
│   ├── components/                # UI components (Teacher, Student, Admin)
│   ├── context/                   # React Context (Auth, App state)
│   ├── data/                      # Dữ liệu tĩnh (chương trình học)
│   ├── lib/                       # Firebase, Gemini AI clients
│   ├── services/                  # Firestore & AI services
│   ├── types/                     # TypeScript type definitions
│   └── utils/                     # Competency analyzer & helpers
├── server.ts                      # Express server — chấm bài, API endpoints
├── firestore.rules                # Firestore Security Rules (RBAC 3 tầng)
├── firebase-applet-config.json    # Firebase config (điền thông tin của bạn)
├── .env.example                   # Template biến môi trường
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
└── snapshots/                     # Production snapshots backup
```

---

## Bảo mật

[![Security](https://img.shields.io/badge/Zero_Answer--Key_Exposure-VERIFIED-16a34a?style=for-the-badge&logo=checkmarx&logoColor=white)]()

| Lớp bảo mật | Chi tiết |
|:------------|:---------|
| **Server-side Grading** | Toàn bộ logic chấm điểm ở server Express — client chỉ nhận điểm số, không nhận đáp án |
| **Firestore Rules** | Collection `answerKeys` bị deny tuyệt đối với role STUDENT ở mức database |
| **RBAC 3 tầng** | Quyền hạn được kiểm tra song song tại Firestore Rules và Express middleware |
| **Environment Secrets** | API keys chỉ tồn tại trong biến môi trường runtime, không commit vào git |
| **Assignment Validation** | Server xác minh bài giao còn hiệu lực trước khi chấm |
| **Audit Logging** | Mọi lần chấm bài được ghi log đầy đủ để kiểm tra khi cần |

---

## Nội dung chương trình

Hệ thống bao gồm **7 chương** Hóa học 10 chuẩn GDPT 2018:

| # | Chương | Nội dung chính |
|:-:|:-------|:---------------|
| 1 | Nhập môn Hóa học | Đối tượng nghiên cứu, phương pháp, an toàn thí nghiệm |
| 2 | Nguyên tử | Thành phần cấu tạo, mô hình nguyên tử, cấu hình electron |
| 3 | Bảng tuần hoàn | Cấu tạo, xu hướng tuần hoàn, ý nghĩa của bảng HTTH |
| 4 | Liên kết hóa học | Ion, cộng hóa trị, kim loại, hình học phân tử VSEPR |
| 5 | Năng lượng hóa học | Nhiệt phản ứng, enthalpy, phương trình nhiệt hóa học |
| 6 | Tốc độ phản ứng | Biểu thức tốc độ, yếu tố ảnh hưởng, ứng dụng thực tiễn |
| 7 | Nguyên tố nhóm VIIA | Halogen: F, Cl, Br, I — tính chất vật lý, hóa học và điều chế |

---

## Công nghệ sử dụng

[![React](https://img.shields.io/badge/React_19-Framework-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.8-Language-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_6-Build_Tool-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-Styling-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase_12-Database_%26_Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Express](https://img.shields.io/badge/Express.js-Backend-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-Question_Gen-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Groq](https://img.shields.io/badge/Groq_AI-Assessment-F55036?style=flat-square&logo=groq&logoColor=white)](https://groq.com/)
[![KaTeX](https://img.shields.io/badge/KaTeX-Math_Render-008080?style=flat-square&logo=latex&logoColor=white)](https://katex.org/)
[![Motion](https://img.shields.io/badge/Motion_12-Animations-FF0066?style=flat-square&logo=framer&logoColor=white)](https://motion.dev/)

---

## Đóng góp

```bash
# 1. Fork repository và tạo branch
git checkout -b feature/ten-tinh-nang

# 2. Commit với message rõ ràng
git commit -m "feat: mô tả tính năng"

# 3. Push và tạo Pull Request
git push origin feature/ten-tinh-nang
```

---

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

---

<div align="center">

[![Made with](https://img.shields.io/badge/Made_with-TypeScript_%26_React-3178C6?style=for-the-badge&logo=typescript&logoColor=white)]()

**Sản phẩm của cô Nguyễn Tuyền Muội**

*Trường THPT FPT · Môn Hóa học lớp 10 · Chương trình GDPT 2018*

</div>
