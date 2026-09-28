import { Chapter, Question } from '../types';

export const ADMIN_EMAILS = ['muoint1311@gmail.com', 'muoint@fpt.edu.vn'];
export const ADMIN_EMAIL = 'muoint1311@gmail.com';

export const CHEMISTRY_10_CURRICULUM: Chapter[] = [
  {
    id: 'chuong-1',
    title: 'Chương 1: Cấu tạo nguyên tử',
    description: 'Thành phần nguyên tử, hạt nhân, vỏ electron, đồng vị, cấu hình electron',
    lessons: [
      {
        id: 'bai-1',
        title: 'Bài 1: Thành phần của nguyên tử',
        topics: ['Hạt proton, neutron, electron', 'Kích thước và khối lượng nguyên tử', 'Hạt nhân nguyên tử']
      },
      {
        id: 'bai-2',
        title: 'Bài 2: Nguyên tố hóa học',
        topics: ['Số hiệu nguyên tử (Z)', 'Số khối (A)', 'Đồng vị và nguyên tử khối trung bình']
      },
      {
        id: 'bai-3',
        title: 'Bài 3: Cấu trúc vỏ electron nguyên tử',
        topics: ['Lớp và phân lớp electron', 'Orbital nguyên tử (AO)', 'Cấu hình electron nguyên tử']
      }
    ]
  },
  {
    id: 'chuong-2',
    title: 'Chương 2: Bảng tuần hoàn các nguyên tố hóa học',
    description: 'Nguyên tắc sắp xếp, cấu tạo bảng tuần hoàn, quy luật biến đổi tuần hoàn',
    lessons: [
      {
        id: 'bai-4',
        title: 'Bài 4: Bảng tuần hoàn nguyên tố hóa học',
        topics: ['Ô nguyên tố, Chu kì, Nhóm A/B', 'Nguyên tố s, p, d, f']
      },
      {
        id: 'bai-5',
        title: 'Bài 5: Xu hướng biến đổi tính chất trong bảng tuần hoàn',
        topics: ['Bán kính nguyên tử', 'Độ âm điện', 'Tính kim loại, tính phi kim', 'Tính acid - base của oxide/hydroxide']
      },
      {
        id: 'bai-6',
        title: 'Bài 6: Định luật tuần hoàn và ý nghĩa của BTH',
        topics: ['Định luật tuần hoàn', 'Mối liên hệ giữa cấu hình e và vị trí, tính chất']
      }
    ]
  },
  {
    id: 'chuong-3',
    title: 'Chương 3: Liên kết hóa học',
    description: 'Quy tắc octet, liên kết ion, liên kết cộng hóa trị, liên kết hydrogen và van der Waals',
    lessons: [
      {
        id: 'bai-7',
        title: 'Bài 7: Quy tắc Octet',
        topics: ['Quy tắc bát tử', 'Sự tạo thành ion']
      },
      {
        id: 'bai-8',
        title: 'Bài 8: Liên kết ion',
        topics: ['Bản chất liên kết ion', 'Tinh thể ion và tính chất']
      },
      {
        id: 'bai-9',
        title: 'Bài 9: Liên kết cộng hóa trị',
        topics: ['Cặp electron chung', 'Công thức Lewis, electron, cấu tạo', 'Liên kết đơn, đôi, ba', 'Độ phân cực liên kết và phân tử']
      },
      {
        id: 'bai-10',
        title: 'Bài 10: Liên kết hydrogen và tương tác van der Waals',
        topics: ['Liên kết hydrogen liên phân tử', 'Tương tác van der Waals', 'Ảnh hưởng đến nhiệt độ sôi/nóng chảy']
      }
    ]
  },
  {
    id: 'chuong-4',
    title: 'Chương 4: Phản ứng oxi hóa - khử',
    description: 'Số oxi hóa, quá trình oxi hóa khử, cân bằng phản ứng oxi hóa khử',
    lessons: [
      {
        id: 'bai-11',
        title: 'Bài 11: Phản ứng oxi hóa - khử và số oxi hóa',
        topics: ['Quy tắc xác định số oxi hóa', 'Chất khử, chất oxi hóa', 'Quá trình khử, quá trình oxi hóa']
      },
      {
        id: 'bai-12',
        title: 'Bài 12: Cân bằng phản ứng oxi hóa - khử',
        topics: ['Phương pháp thăng bằng electron', 'Ý nghĩa thực tiễn phản ứng oxi hóa khử']
      }
    ]
  },
  {
    id: 'chuong-5',
    title: 'Chương 5: Năng lượng hóa học',
    description: 'Phản ứng tỏa nhiệt, thu nhiệt, enthalpy tạo thành chuẩn, biến thiên enthalpy',
    lessons: [
      {
        id: 'bai-13',
        title: 'Bài 13: Phản ứng tỏa nhiệt, thu nhiệt',
        topics: ['Biến thiên enthalpy phản ứng (ΔrH°₂₉₈)', 'Phản ứng tỏa nhiệt và thu nhiệt']
      },
      {
        id: 'bai-14',
        title: 'Bài 14: Tính biến thiên enthalpy của phản ứng hóa học',
        topics: ['Nhiệt tạo thành chuẩn (ΔfH°₂₉₈)', 'Năng lượng liên kết (Eb)', 'Tính toán theo ΔfH° và Eb']
      }
    ]
  },
  {
    id: 'chuong-6',
    title: 'Chương 6: Tốc độ phản ứng hóa học',
    description: 'Khái niệm tốc độ phản ứng, các yếu tố ảnh hưởng đến tốc độ phản ứng',
    lessons: [
      {
        id: 'bai-15',
        title: 'Bài 15: Tốc độ phản ứng hóa học',
        topics: ['Khái niệm tốc độ phản ứng', 'Tốc độ trung bình']
      },
      {
        id: 'bai-16',
        title: 'Bài 16: Các yếu tố ảnh hưởng đến tốc độ phản ứng',
        topics: ['Ảnh hưởng của nồng độ, nhiệt độ, áp suất', 'Diện tích tiếp xúc và chất xúc tác']
      }
    ]
  },
  {
    id: 'chuong-7',
    title: 'Chương 7: Nguyên tố nhóm Halogen (VIIA)',
    description: 'Tính chất vật lý, hóa học của Halogen, hợp chất hydrogen halide và hydrohalic acid',
    lessons: [
      {
        id: 'bai-17',
        title: 'Bài 17: Tính chất vật lý và hóa học các đơn chất nhóm VIIA',
        topics: ['Đơn chất F2, Cl2, Br2, I2', 'Tính oxi hóa mạnh của halogen']
      },
      {
        id: 'bai-18',
        title: 'Bài 18: Hydrogen halide và một số phản ứng của ion halide',
        topics: ['Hydrogen halide (HF, HCl, HBr, HI)', 'Tính acid và tính khử của ion halide', 'Nhận biết ion halide (Ag+)']
      }
    ]
  }
];

export const DEMO_QUESTIONS: Question[] = [
  {
    id: 'demo-q1',
    grade: 10,
    chapterId: 'chuong-1',
    chapterTitle: 'Chương 1: Cấu tạo nguyên tử',
    lessonId: 'bai-1',
    lessonTitle: 'Bài 1: Thành phần của nguyên tử',
    topic: 'Hạt proton, neutron, electron',
    type: 'multiple_choice',
    level: 'nhan_biet',
    content: 'Hạt mang điện tích âm trong nguyên tử là loại hạt nào sau đây?',
    options: [
      { id: 'A', text: 'Proton' },
      { id: 'B', text: 'Neutron' },
      { id: 'C', text: 'Electron' },
      { id: 'D', text: 'Hạt nhân' }
    ],
    correctAnswer: 'C',
    explanation: 'Electron (e) mang điện tích âm (-1,602 × 10⁻¹⁹ C hay -1), proton (p) mang điện tích dương (+1), neutron (n) không mang điện.',
    keywords: ['electron', 'điện tích', 'hạt cơ bản'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q2',
    grade: 10,
    chapterId: 'chuong-1',
    chapterTitle: 'Chương 1: Cấu tạo nguyên tử',
    lessonId: 'bai-3',
    lessonTitle: 'Bài 3: Cấu trúc vỏ electron nguyên tử',
    topic: 'Cấu hình electron nguyên tử',
    type: 'multiple_choice',
    level: 'thong_hieu',
    content: 'Nguyên tử kim loại Sodium (Na) có số hiệu nguyên tử Z = 11. Cấu hình electron của nguyên tử Na là:',
    options: [
      { id: 'A', text: '1s² 2s² 2p⁶ 3s¹' },
      { id: 'B', text: '1s² 2s² 2p⁶ 3s²' },
      { id: 'C', text: '1s² 2s² 2p⁵ 3s²' },
      { id: 'D', text: '1s² 2s² 2p⁶' }
    ],
    correctAnswer: 'A',
    explanation: 'Với Z = 11, các electron được phân bố lần lượt theo thứ tự mức năng lượng: 1s² 2s² 2p⁶ 3s¹.',
    keywords: ['cấu hình electron', 'sodium', 'Z=11'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q3',
    grade: 10,
    chapterId: 'chuong-1',
    chapterTitle: 'Chương 1: Cấu tạo nguyên tử',
    lessonId: 'bai-2',
    lessonTitle: 'Bài 2: Nguyên tố hóa học',
    topic: 'Đồng vị và nguyên tử khối trung bình',
    type: 'true_false',
    level: 'thong_hieu',
    content: 'Xét các phát biểu sau đây về nguyên tố hóa học và đồng vị:',
    options: [
      { id: 'a', text: 'Các đồng vị của cùng một nguyên tố có cùng số proton nhưng khác nhau về số neutron.' },
      { id: 'b', text: 'Số khối A bằng tổng số proton và số electron trong hạt nhân.' },
      { id: 'c', text: 'Đồng vị là các nguyên tử có cùng điện tích hạt nhân.' },
      { id: 'd', text: 'Số hiệu nguyên tử Z luôn bằng số đơn vị điện tích hạt nhân.' }
    ],
    correctAnswer: [true, false, true, true],
    explanation: 'Ý b sai vì Số khối A = số proton (Z) + số neutron (N), electron nằm ở lớp vỏ nguyên tử không nằm trong hạt nhân.',
    keywords: ['đồng vị', 'số khối', 'hạt nhân'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q4',
    grade: 10,
    chapterId: 'chuong-2',
    chapterTitle: 'Chương 2: Bảng tuần hoàn các nguyên tố hóa học',
    lessonId: 'bai-5',
    lessonTitle: 'Bài 5: Xu hướng biến đổi tính chất trong bảng tuần hoàn',
    topic: 'Bán kính nguyên tử',
    type: 'multiple_choice',
    level: 'van_dung',
    content: 'Trong một chu kì, theo chiều tăng dần của điện tích hạt nhân từ trái sang phải, bán kính nguyên tử của các nguyên tố nói chung:',
    options: [
      { id: 'A', text: 'Tăng dần do số electron tăng.' },
      { id: 'B', text: 'Giảm dần do lực hút giữa hạt nhân với các electron lớp ngoài cùng tăng.' },
      { id: 'C', text: 'Không đổi vì có cùng số lớp electron.' },
      { id: 'D', text: 'Biến đổi không theo quy luật.' }
    ],
    correctAnswer: 'B',
    explanation: 'Trong cùng một chu kì, số lớp e không đổi nhưng điện tích hạt nhân tăng dần, lực hút giữa hạt nhân và electron lớp ngoài cùng tăng làm bán kính nguyên tử giảm dần.',
    keywords: ['bán kính nguyên tử', 'chu kì', 'quy luật tuần hoàn'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q5',
    grade: 10,
    chapterId: 'chuong-3',
    chapterTitle: 'Chương 3: Liên kết hóa học',
    lessonId: 'bai-8',
    lessonTitle: 'Bài 8: Liên kết ion',
    topic: 'Bản chất liên kết ion',
    type: 'short_answer',
    level: 'nhan_biet',
    content: 'Nhập công thức phân tử hợp chất ion được tạo thành bởi kim loại Magnesium (Mg, hóa trị II) và phi kim Chlorine (Cl, hóa trị I).',
    correctAnswer: 'MgCl2',
    explanation: 'Ion Mg²⁺ kết hợp với 2 ion Cl⁻ để tạo thành tinh thể hợp chất ion trung hòa điện có công thức MgCl₂.',
    keywords: ['liên kết ion', 'MgCl2', 'công thức hóa học'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q6',
    grade: 10,
    chapterId: 'chuong-4',
    chapterTitle: 'Chương 4: Phản ứng oxi hóa - khử',
    lessonId: 'bai-11',
    lessonTitle: 'Bài 11: Phản ứng oxi hóa - khử và số oxi hóa',
    topic: 'Quy tắc xác định số oxi hóa',
    type: 'short_answer',
    level: 'thong_hieu',
    content: 'Số oxi hóa của nguyên tử Lưu huỳnh (S) trong phân tử H₂SO₄ là bao nhiêu? (Nhập dấu + kèm theo giá trị, ví dụ: +6)',
    correctAnswer: '+6',
    explanation: 'Trong H₂SO₄: H có số oxi hóa +1, O có số oxi hóa -2. Gọi x là số oxi hóa của S: 2*(+1) + x + 4*(-2) = 0 => 2 + x - 8 = 0 => x = +6.',
    keywords: ['số oxi hóa', 'H2SO4', 'Lưu huỳnh'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q7',
    grade: 10,
    chapterId: 'chuong-4',
    chapterTitle: 'Chương 4: Phản ứng oxi hóa - khử',
    lessonId: 'bai-12',
    lessonTitle: 'Bài 12: Cân bằng phản ứng oxi hóa - khử',
    topic: 'Phương pháp thăng bằng electron',
    type: 'equation_balance',
    level: 'van_dung',
    content: 'Cân bằng phản ứng oxi hóa khử sau bằng phương pháp thăng bằng electron và xác định tổng hệ số cân bằng các chất (tối giản, số nguyên):\nFe + HNO₃ (loãng) → Fe(NO₃)₃ + NO + H₂O',
    options: [
      { id: 'A', text: '1 + 4 → 1 + 1 + 2 (Tổng hệ số = 9)' },
      { id: 'B', text: '2 + 8 → 2 + 2 + 4 (Tổng hệ số = 18)' },
      { id: 'C', text: '1 + 6 → 1 + 1 + 3 (Tổng hệ số = 12)' },
      { id: 'D', text: '3 + 8 → 3 + 2 + 4 (Tổng hệ số = 20)' }
    ],
    correctAnswer: 'A',
    explanation: 'Quá trình oxi hóa: Fe⁰ → Fe³⁺ + 3e (nhân 1)\nQuá trình khử: N⁺⁵ + 3e → N⁺² (NO) (nhân 1)\nPhương trình: Fe + 4HNO₃ → Fe(NO₃)₃ + NO + 2H₂O. Tổng hệ số = 1 + 4 + 1 + 1 + 2 = 9.',
    keywords: ['cân bằng electron', 'Fe + HNO3', 'tổng hệ số'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q8',
    grade: 10,
    chapterId: 'chuong-7',
    chapterTitle: 'Chương 7: Nguyên tố nhóm Halogen (VIIA)',
    lessonId: 'bai-18',
    lessonTitle: 'Bài 18: Hydrogen halide và một số phản ứng của ion halide',
    topic: 'Nhận biết ion halide (Ag+)',
    type: 'identification',
    level: 'nhan_biet',
    content: 'Thuốc thử đặc trưng dùng để nhận biết dung dịch chứa ion Chloride (Cl⁻) trong phòng thí nghiệm là dung dịch nào sau đây?',
    options: [
      { id: 'A', text: 'Dung dịch BaCl₂ (tạo kết tủa trắng)' },
      { id: 'B', text: 'Dung dịch AgNO₃ (tạo kết tủa trắng AgCl không tan trong acid mạnh)' },
      { id: 'C', text: 'Dung dịch NaOH (tạo kết tủa xanh)' },
      { id: 'D', text: 'Quỳ tím chuyển sang màu đỏ' }
    ],
    correctAnswer: 'B',
    explanation: 'Ion Cl⁻ phản ứng với dung dịch AgNO₃ tạo kết tủa trắng bạc chloride (AgCl): Ag⁺ + Cl⁻ → AgCl↓ (màu trắng).',
    keywords: ['nhận biết', 'ion Cl-', 'AgNO3'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q9',
    grade: 10,
    chapterId: 'chuong-5',
    chapterTitle: 'Chương 5: Năng lượng hóa học',
    lessonId: 'bai-13',
    lessonTitle: 'Bài 13: Phản ứng tỏa nhiệt, thu nhiệt',
    topic: 'Biến thiên enthalpy phản ứng (ΔrH°₂₉₈)',
    type: 'multiple_choice',
    level: 'nhan_biet',
    content: 'Phản ứng nào sau đây là phản ứng tỏa nhiệt?',
    options: [
      { id: 'A', text: 'Phản ứng nung đá vôi (CaCO₃ → CaO + CO₂)' },
      { id: 'B', text: 'Phản ứng đốt cháy than (C + O₂ → CO₂)' },
      { id: 'C', text: 'Phản ứng quang hợp của cây xanh' },
      { id: 'D', text: 'Phản ứng nhiệt phân Cu(OH)₂' }
    ],
    correctAnswer: 'B',
    explanation: 'Phản ứng đốt cháy nhiên liệu (than, củi, xăng dầu) là phản ứng tỏa nhiệt kèm phát sáng (ΔrH°₂₉₈ < 0). Các phản ứng nung, nhiệt phân, quang hợp đều là phản ứng thu nhiệt.',
    keywords: ['phản ứng tỏa nhiệt', 'đốt cháy than', 'enthalpy'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q10',
    grade: 10,
    chapterId: 'chuong-5',
    chapterTitle: 'Chương 5: Năng lượng hóa học',
    lessonId: 'bai-14',
    lessonTitle: 'Bài 14: Tính biến thiên enthalpy của phản ứng hóa học',
    topic: 'Tính toán theo ΔfH° và Eb',
    type: 'calculation',
    level: 'van_dung',
    content: 'Cho phản ứng: CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(l)\nBiết nhiệt tạo thành chuẩn ΔfH°₂₉₈ (kJ/mol) của CH₄(g), CO₂(g) và H₂O(l) lần lượt là: -74,8; -393,5; -285,8.\nBiến thiên enthalpy chuẩn của phản ứng đốt cháy 1 mol khí methane là:',
    options: [
      { id: 'A', text: '-890,3 kJ' },
      { id: 'B', text: '+890,3 kJ' },
      { id: 'C', text: '-604,5 kJ' },
      { id: 'D', text: '-965,1 kJ' }
    ],
    correctAnswer: 'A',
    explanation: 'Áp dụng công thức: ΔrH°₂₉₈ = [ΔfH°(CO₂) + 2*ΔfH°(H₂O)] - [ΔfH°(CH₄) + 2*ΔfH°(O₂)] = [-393,5 + 2*(-285,8)] - [-74,8 + 0] = -965,1 + 74,8 = -890,3 kJ.',
    keywords: ['tính enthalpy', 'nhiệt tạo thành chuẩn', 'methane'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q11',
    grade: 10,
    chapterId: 'chuong-6',
    chapterTitle: 'Chương 6: Tốc độ phản ứng hóa học',
    lessonId: 'bai-16',
    lessonTitle: 'Bài 16: Các yếu tố ảnh hưởng đến tốc độ phản ứng',
    topic: 'Ảnh hưởng của nồng độ, nhiệt độ, áp suất',
    type: 'multiple_choice',
    level: 'thong_hieu',
    content: 'Để bảo quản thực phẩm được tươi lâu hơn trong tủ lạnh, người ta đã áp dụng yếu tố nào ảnh hưởng đến tốc độ phản ứng phân hủy?',
    options: [
      { id: 'A', text: 'Tăng diện tích tiếp xúc' },
      { id: 'B', text: 'Giảm nhiệt độ để làm chậm tốc độ phản ứng oxi hóa và hoạt động vi khuẩn' },
      { id: 'C', text: 'Tăng nồng độ chất phản ứng' },
      { id: 'D', text: 'Sử dụng chất xúc tác' }
    ],
    correctAnswer: 'B',
    explanation: 'Khi giảm nhiệt độ, tốc độ các phản ứng sinh hóa, thối rữa và hoạt động enzyme của vi sinh vật giảm mạnh, giúp thức ăn lâu hỏng.',
    keywords: ['tốc độ phản ứng', 'nhiệt độ', 'bảo quản thực phẩm'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  },
  {
    id: 'demo-q12',
    grade: 10,
    chapterId: 'chuong-6',
    chapterTitle: 'Chương 6: Tốc độ phản ứng hóa học',
    lessonId: 'bai-16',
    lessonTitle: 'Bài 16: Các yếu tố ảnh hưởng đến tốc độ phản ứng',
    topic: 'Diện tích tiếp xúc và chất xúc tác',
    type: 'true_false',
    level: 'van_dung',
    content: 'Xét các biện pháp sau làm tăng tốc độ phản ứng khi hòa tan đá vôi (CaCO₃) trong dung dịch HCl 1M:',
    options: [
      { id: 'a', text: 'Đập nhỏ khối đá vôi thành bột mịn trước khi cho vào axit.' },
      { id: 'b', text: 'Đun nóng nhẹ dung dịch phản ứng.' },
      { id: 'c', text: 'Thêm nước cất vào làm loãng dung dịch HCl xuống 0,5M.' },
      { id: 'd', text: 'Khuấy đều hỗn hợp phản ứng trong cốc.' }
    ],
    correctAnswer: [true, true, false, true],
    explanation: 'a: đúng (tăng diện tích tiếp xúc); b: đúng (tăng nhiệt độ làm tăng tốc độ); c: sai (giảm nồng độ làm giảm tốc độ); d: đúng (khuấy làm tăng tần số va chạm hiệu quả).',
    keywords: ['yếu tố tốc độ', 'đá vôi + HCl', 'diện tích tiếp xúc'],
    createdBy: 'admin',
    creatorEmail: 'muoint@fpt.edu.vn',
    createdAt: new Date().toISOString(),
    status: 'DEMO'
  }
];

// Canonical Chapter definitions & normalization helper
export const CANONICAL_CHAPTER_NAMES: Record<string, string> = {
  'chuong-1': 'Chương 1. Cấu tạo nguyên tử',
  'chuong-2': 'Chương 2. Bảng tuần hoàn các nguyên tố hóa học',
  'chuong-3': 'Chương 3. Liên kết hóa học',
  'chuong-4': 'Chương 4. Phản ứng oxi hóa – khử',
  'chuong-5': 'Chương 5. Năng lượng hóa học',
  'chuong-6': 'Chương 6. Tốc độ phản ứng hóa học',
  'chuong-7': 'Chương 7. Nguyên tố nhóm Halogen',
};

export const UNCLASSIFIED_CHAPTER_ID = 'unclassified';

/**
 * Normalizes any variation of chapter identifier to standard 'chuong-1'..'chuong-7'
 * Returns 'unclassified' if not recognized.
 */
export function normalizeChapterId(raw?: string | null): string {
  if (!raw) return UNCLASSIFIED_CHAPTER_ID;
  const s = String(raw).trim().toLowerCase();
  
  if (s === '1' || s === 'chuong-1' || s === 'chuong_1' || s === 'chapter_1' || s === 'chapter-1' || s.includes('nguyên tử') || s.includes('chương 1') || s.includes('chuong 1')) {
    return 'chuong-1';
  }
  if (s === '2' || s === 'chuong-2' || s === 'chuong_2' || s === 'chapter_2' || s === 'chapter-2' || s.includes('tuần hoàn') || s.includes('bth') || s.includes('chương 2') || s.includes('chuong 2')) {
    return 'chuong-2';
  }
  if (s === '3' || s === 'chuong-3' || s === 'chuong_3' || s === 'chapter_3' || s === 'chapter-3' || s.includes('liên kết') || s.includes('chương 3') || s.includes('chuong 3')) {
    return 'chuong-3';
  }
  if (s === '4' || s === 'chuong-4' || s === 'chuong_4' || s === 'chapter_4' || s === 'chapter-4' || s.includes('oxi hóa') || s.includes('oxh') || s.includes('chương 4') || s.includes('chuong 4')) {
    return 'chuong-4';
  }
  if (s === '5' || s === 'chuong-5' || s === 'chuong_5' || s === 'chapter_5' || s === 'chapter-5' || s.includes('năng lượng') || s.includes('enthalpy') || s.includes('nhiệt') || s.includes('chương 5') || s.includes('chuong 5')) {
    return 'chuong-5';
  }
  if (s === '6' || s === 'chuong-6' || s === 'chuong_6' || s === 'chapter_6' || s === 'chapter-6' || s.includes('tốc độ') || s.includes('chương 6') || s.includes('chuong 6')) {
    return 'chuong-6';
  }
  if (s === '7' || s === 'chuong-7' || s === 'chuong_7' || s === 'chapter_7' || s === 'chapter-7' || s.includes('halogen') || s.includes('viia') || s.includes('chương 7') || s.includes('chuong 7')) {
    return 'chuong-7';
  }

  // Check against full list
  const found = CHEMISTRY_10_CURRICULUM.find(c => c.id === s || c.title.toLowerCase() === s);
  if (found) return found.id;

  return UNCLASSIFIED_CHAPTER_ID;
}

export function getChapterNumber(chapterId?: string): number | null {
  const norm = normalizeChapterId(chapterId);
  const match = norm.match(/chuong-(\d)/);
  return match ? parseInt(match[1], 10) : null;
}

export function getChapterTitle(chapterId?: string): string {
  const norm = normalizeChapterId(chapterId);
  if (norm === UNCLASSIFIED_CHAPTER_ID) return 'Chưa phân loại';
  return CANONICAL_CHAPTER_NAMES[norm] || 'Chương học Hóa 10';
}

