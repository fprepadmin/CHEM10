import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  UnderlineType
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * Generates and downloads the standard chemistry question import Word (.docx) template:
 * Mau_Nhap_Cau_Hoi_Hoa_10.docx
 * Following GDPT 2018 Chemistry curriculum and Underline answer marking convention.
 */
export async function downloadSampleWordTemplate(): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Document Header
          new Paragraph({
            text: 'BỘ ĐỀ THI & ÔN TẬP HÓA HỌC 10 - CHƯƠNG TRÌNH GDPT 2018',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: 'FILE MẪU CHUẨN NHẬP DỮ LIỆU TỰ ĐỘNG VÀO HỆ THỐNG CHEM10 AI',
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),

          // Header Instruction Box (Section 15)
          new Paragraph({
            children: [
              new TextRun({
                text: 'HƯỚNG DẪN NHẬP CÂU HỎI',
                bold: true,
                color: '1E3A8A'
              })
            ],
            spacing: { before: 100, after: 80 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Câu trắc nghiệm: ',
                bold: true
              }),
              new TextRun({
                text: 'phương án đúng A, B, C hoặc D phải được '
              }),
              new TextRun({
                text: 'GẠCH CHÂN (Underline - Ctrl+U)',
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                color: 'DC2626'
              }),
              new TextRun({
                text: '.'
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '2. Câu Đúng/Sai: ',
                bold: true
              }),
              new TextRun({
                text: 'mệnh đề a, b, c hoặc d được '
              }),
              new TextRun({
                text: 'GẠCH CHÂN = ĐÚNG',
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                color: '059669'
              }),
              new TextRun({
                text: '; không gạch chân = '
              }),
              new TextRun({
                text: 'SAI',
                bold: true,
                color: 'DC2626'
              }),
              new TextRun({
                text: '.'
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '3. Câu trả lời ngắn: ',
                bold: true
              }),
              new TextRun({
                text: 'ghi đáp án ngay sau chữ '
              }),
              new TextRun({
                text: '"Đáp án:"',
                bold: true,
                color: '1E3A8A'
              }),
              new TextRun({
                text: ' (ví dụ: Đáp án: 0,1 mol hoặc Đáp án: +7).'
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '4. Không tự ghi đáp án theo cách khác ',
                bold: true
              }),
              new TextRun({
                text: 'nếu muốn hệ thống nhận diện tự động.'
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '5. Không thay đổi số liệu, công thức và nội dung ',
                bold: true
              }),
              new TextRun({
                text: 'câu hỏi trong quá trình import (bảo toàn H₂SO₄, CaCO₃, Fe³⁺, 1s²2s²2p⁶3s¹, ΔrH°₂₉₈, 2H₂ + O₂ → 2H₂O).'
              })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),

          // --- MẪU 1: CÂU TRẮC NGHIỆM 4 PHƯƠNG ÁN (A GẠCH CHÂN) ---
          new Paragraph({
            children: [
              new TextRun({
                text: 'Câu 1. ',
                bold: true
              }),
              new TextRun({
                text: 'Nguyên tử X có số hiệu nguyên tử bằng 11. Cấu hình electron của X ở trạng thái cơ bản là'
              })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. 1s²2s²2p⁶3s¹',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              }),
              new TextRun({
                text: '    (← Phương án đúng được gạch chân)',
                italics: true,
                color: '6B7280'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            text: 'B. 1s²2s²2p⁶3s²',
            spacing: { after: 40 }
          }),
          new Paragraph({
            text: 'C. 1s²2s²2p⁶3p¹',
            spacing: { after: 40 }
          }),
          new Paragraph({
            text: 'D. 1s²2s²2p⁶3p²',
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'X có Z = 11: 1s²2s²2p⁶3s¹. Nguyên tố thuộc chu kì 3, nhóm IA (Sodium - Na).' })
            ],
            spacing: { after: 160 }
          }),

          // --- MẪU 1B: CÂU TRẮC NGHIỆM (B GẠCH CHÂN) ---
          new Paragraph({
            children: [
              new TextRun({
                text: 'Câu 2. ',
                bold: true
              }),
              new TextRun({
                text: 'Cho phản ứng nhiệt phân hoàn toàn đá vôi: CaCO₃(s) → CaO(s) + CO₂(g) có biến thiên Enthalpy chuẩn ΔrH°₂₉₈ = +178,29 kJ. Kết luận nào sau đây là ĐÚNG?'
              })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            text: 'A. Đây là phản ứng tỏa nhiệt do ΔrH°₂₉₈ > 0',
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'B. Đây là phản ứng thu nhiệt do ΔrH°₂₉₈ > 0',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              }),
              new TextRun({
                text: '    (← Phương án đúng được gạch chân)',
                italics: true,
                color: '6B7280'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            text: 'C. Tổng năng lượng của các chất phản ứng lớn hơn tổng năng lượng của sản phẩm',
            spacing: { after: 40 }
          }),
          new Paragraph({
            text: 'D. Phản ứng xảy ra tự phát mãnh liệt ở điều kiện nhiệt độ phòng',
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'Phản ứng có biến thiên Enthalpy chuẩn ΔrH°₂₉₈ > 0 là phản ứng thu nhiệt.' })
            ],
            spacing: { after: 160 }
          }),

          // --- MẪU 2: CÂU ĐÚNG / SAI (a & c GẠCH CHÂN = ĐÚNG, b & d KHÔNG GẠCH CHÂN = SAI) ---
          new Paragraph({
            children: [
              new TextRun({
                text: 'Câu 3. ',
                bold: true
              }),
              new TextRun({
                text: 'Cho các phát biểu sau về cấu tạo nguyên tử:'
              })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'a) Nguyên tử được cấu tạo từ proton, neutron và electron.',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              }),
              new TextRun({
                text: '    (← Gạch chân = ĐÚNG)',
                italics: true,
                color: '6B7280'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'b) Electron mang điện tích dương.'
              }),
              new TextRun({
                text: '    (← Không gạch chân = SAI)',
                italics: true,
                color: '9CA3AF'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'c) Hạt nhân nguyên tử mang điện tích dương.',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              }),
              new TextRun({
                text: '    (← Gạch chân = ĐÚNG)',
                italics: true,
                color: '6B7280'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'd) Neutron mang điện tích âm.'
              }),
              new TextRun({
                text: '    (← Không gạch chân = SAI)',
                italics: true,
                color: '9CA3AF'
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'b) Sai vì electron mang điện tích âm (-1). d) Sai vì neutron không mang điện.' })
            ],
            spacing: { after: 160 }
          }),

          // --- MẪU 3: CÂU TRẢ LỜI NGẮN (ĐÁP ÁN: 0,1 MOL) ---
          new Paragraph({
            children: [
              new TextRun({
                text: 'Câu 4. ',
                bold: true
              }),
              new TextRun({
                text: 'Tính số mol của 5,6 gam Fe. Biết Fe có khối lượng mol là 56 g/mol.'
              })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Đáp án: ', bold: true }),
              new TextRun({
                text: '0,1 mol',
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'n = m / M = 5,6 / 56 = 0,1 mol.' })
            ],
            spacing: { after: 160 }
          }),

          // --- MẪU 3B: CÂU TRẢ LỜI NGẮN (ĐÁP ÁN: 0,25 MOL) ---
          new Paragraph({
            children: [
              new TextRun({
                text: 'Câu 5. ',
                bold: true
              }),
              new TextRun({
                text: 'Hòa tan hoàn toàn 6,0 gam Magnesium (Mg) vào dung dịch hydrochloric acid (HCl) dư thu được V lít khí H₂ (ở đkc). Biết Mg có khối lượng mol là 24 g/mol. Tính số mol của kim loại Magnesium đã phản ứng.'
              })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Đáp án: ', bold: true }),
              new TextRun({
                text: '0,25 mol',
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'n_Mg = m / M = 6,0 / 24 = 0,25 mol.' })
            ],
            spacing: { after: 160 }
          }),

          // --- MẪU 4: CÔNG THỨC HÓA HỌC BẢO TOÀN (H₂SO₄, NaOH, CaCO₃, Fe₂O₃, NH₄NO₃, CH₃COOH) ---
          new Paragraph({
            children: [
              new TextRun({
                text: 'Câu 6. ',
                bold: true
              }),
              new TextRun({
                text: 'Trong các chất sau: H₂SO₄, NaOH, CaCO₃, Fe₂O₃, NH₄NO₃, CH₃COOH, chất nào là acid mạnh phân li hoàn toàn trong nước?'
              })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. H₂SO₄',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            text: 'B. NaOH',
            spacing: { after: 40 }
          }),
          new Paragraph({
            text: 'C. CaCO₃',
            spacing: { after: 40 }
          }),
          new Paragraph({
            text: 'D. CH₃COOH',
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'H₂SO₄ là acid vô cơ mạnh. NaOH là base mạnh. CH₃COOH là acid hữu cơ yếu.' })
            ],
            spacing: { after: 160 }
          }),

          // --- MẪU 5: PHƯƠNG TRÌNH HÓA HỌC OXI HÓA KHỬ ---
          new Paragraph({
            children: [
              new TextRun({
                text: 'Câu 7. ',
                bold: true
              }),
              new TextRun({
                text: 'Trong phản ứng: 2KMnO₄ + 16HCl → 2KCl + 2MnCl₂ + 5Cl₂ + 8H₂O, vai trò của HCl là'
              })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            text: 'A. Chỉ đóng vai trò là chất oxi hóa',
            spacing: { after: 40 }
          }),
          new Paragraph({
            text: 'B. Chỉ đóng vai trò là chất khử',
            spacing: { after: 40 }
          }),
          new Paragraph({
            text: 'C. Chỉ đóng vai trò làm môi trường acid',
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'D. Vừa là chất khử, vừa làm môi trường',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'Có 10 phân tử HCl là chất khử tạo 5Cl₂ và 6 phân tử HCl tạo muối MnCl₂ và KCl (môi trường).' })
            ],
            spacing: { after: 160 }
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'Mau_Nhap_Cau_Hoi_Hoa_10.docx');
}
