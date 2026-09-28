<div align="center">

# ⚗️ CHEM10 AI

### Nền tảng Ôn tập Hóa học 10 thông minh

*Chuẩn chương trình GDPT 2018 · Chấm bài Server-side · Bảo mật đáp án tuyệt đối*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## 🎯 Giới thiệu

**CHEM10 AI** là nền tảng học tập trực tuyến tích hợp trí tuệ nhân tạo, được thiết kế đặc biệt cho môn Hóa học lớp 10 theo chương trình Giáo dục phổ thông 2018. Hệ thống cung cấp ngân hàng câu hỏi phong phú, tự động tạo đề kiểm tra, và chấm bài bảo mật phía server — đảm bảo đáp án không bao giờ bị lộ ra phía client.

### ✨ Tính năng nổi bật

| Tính năng | Mô tả |
|-----------|-------|
| 🧪 **Ngân hàng câu hỏi** | 7 chương Hóa 10 GDPT 2018 · Trắc nghiệm, Đúng/Sai, Tự luận ngắn |
| 🤖 **Tạo đề AI** | Gemini AI tự động sinh câu hỏi theo chương, mức độ và chủ đề |
| 🔒 **Chấm bài Server-side** | Đáp án chỉ tồn tại trên server — học sinh không thể gian lận |
| 👥 **Phân quyền 3 tầng** | ADMIN · TEACHER · STUDENT với Firestore Security Rules |
| 📊 **Báo cáo chi tiết** | Thống kê kết quả, điểm số, phân tích theo từng câu |
| 📝 **Xuất đề Word/Excel** | Tạo file đề thi và đáp án chuẩn định dạng |
| 🏫 **Quản lý lớp học** | Tạo lớp, giao bài, theo dõi tiến độ học sinh |
| ⚡ **Real-time** | Cập nhật kết quả tức thì với Firebase Firestore |

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                    CHEM10 AI SYSTEM                     │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │   React 19   │    │  Express.js  │    │ Firebase  │  │
│  │  TypeScript  │◄──►│   Server     │◄──►│ Firestore │  │
│  │  Tailwind 4  │    │  (Port 3000) │    │   Auth    │  │
│  └──────────────┘    └──────────────┘    └───────────┘  │
│         │                   │                           │
│         │            ┌──────┴──────┐                    │
│         │            │  Gemini AI  │                    │
│         │            │  (API Key)  │                    │
│         └────────────┴─────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

**Luồng chấm bài bảo mật:**
```
Student Submit ──► Express Server ──► Firestore answerKeys
                        │
                   (So sánh đáp án)
                        │
                   ◄── Trả điểm (không trả đáp án)
```

---

## 🚀 Cài đặt & Chạy

### Yêu cầu

- **Node.js** ≥ 18.x
- **npm** hoặc **bun**
- Tài khoản **Firebase** với Firestore enabled
- **Gemini API Key** từ [Google AI Studio](https://aistudio.google.com/apikey)

### Bước 1 — Clone và cài dependencies

```bash
git clone <repo-url>
cd CHEM10

npm install
# hoặc
bun install
```

### Bước 2 — Cấu hình Firebase

Sao chép file cấu hình mẫu và điền thông tin Firebase của bạn:

```bash
cp firebase-applet-config.json.example firebase-applet-config.json
```

Chỉnh sửa [`firebase-applet-config.json`](./firebase-applet-config.json):

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

### Bước 3 — Cấu hình biến môi trường

Tạo file `.env.local` từ template:

```bash
cp .env.example .env.local
```

Chỉnh sửa `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=http://localhost:3000
```

### Bước 4 — Deploy Firestore Security Rules

```bash
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules
```

### Bước 5 — Chạy development server

```bash
npm run dev
```

Mở trình duyệt tại: **http://localhost:3000** 🎉

---

## 📦 Các lệnh có sẵn

```bash
npm run dev       # Chạy server development (Vite + Express)
npm run build     # Build production bundle
npm run start     # Chạy server production (từ dist/)
npm run lint      # Kiểm tra lỗi TypeScript
npm run preview   # Preview build production
npm run clean     # Xóa thư mục dist/
```

---

## 📁 Cấu trúc thư mục

```
CHEM10/
├── src/
│   ├── App.tsx              # Root component, routing
│   ├── components/          # UI components (Teacher, Student, Admin)
│   ├── context/             # React Context (Auth, App state)
│   ├── data/                # Dữ liệu tĩnh (chương trình học)
│   ├── lib/                 # Firebase, Gemini AI clients
│   ├── services/            # Firestore services
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helper utilities
├── server.ts                # Express server (chấm bài, API)
├── firestore.rules          # Firestore Security Rules
├── firebase-applet-config.json  # Firebase config (cần điền)
├── .env.example             # Template biến môi trường
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── snapshots/               # Production snapshots backup
```

---

## 🔐 Bảo mật

- **Zero Answer-Key Exposure**: Đáp án (`answerKeys` collection) chỉ được đọc bởi server Express — học sinh không bao giờ nhận được đáp án thực
- **Firestore Rules**: Phân quyền nghiêm ngặt theo role `ADMIN`, `TEACHER`, `STUDENT`
- **Server-side Grading**: Toàn bộ logic chấm điểm xử lý tại server, kết quả trả về là điểm số (không phải đáp án)
- **Environment Variables**: API keys không được commit vào git

---

## 📚 Nội dung chương trình

Hệ thống bao gồm **7 chương** Hóa học 10 chuẩn GDPT 2018:

1. **Chương 1** — Nhập môn Hóa học
2. **Chương 2** — Nguyên tử
3. **Chương 3** — Bảng tuần hoàn các nguyên tố hóa học
4. **Chương 4** — Liên kết hóa học
5. **Chương 5** — Năng lượng hóa học
6. **Chương 6** — Tốc độ phản ứng hóa học
7. **Chương 7** — Nguyên tố nhóm VIIA (Halogen)

---

## 🤝 Đóng góp

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit changes: `git commit -m 'feat: mô tả tính năng'`
4. Push: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

## 📄 License

MIT License — Xem file [LICENSE](./LICENSE) để biết thêm chi tiết.

---

<div align="center">

**CHEM10 AI** · Built with ❤️ for Vietnamese Chemistry Education

*React 19 · TypeScript · Firebase · Gemini AI · Vite*

</div>
