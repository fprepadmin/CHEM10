import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  UnderlineType
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * Generates and downloads the standard chemistry question import Word (.docx) template:
 * Mau_Nhap_Cau_Hoi_Hoa_10.docx
 * Following GDPT 2018 Chemistry curriculum, demonstrating 4 cognitive levels (NB, TH, VD, VDC)
 * across 7 themes and practical topics.
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
            children: [
              new TextRun({
                text: 'FILE MẪU CHUẨN NHẬP DỮ LIỆU CÂU HỎI VÀO HỆ THỐNG CHEM10 AI',
                bold: true,
                color: '1E3A8A'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),

          // Header Instruction Box
          new Paragraph({
            children: [
              new TextRun({
                text: 'HƯỚNG DẪN ĐỊNH DẠNG & QUY TẮC PHÂN LOẠI 4 MỨC ĐỘ NHẬN THỨC',
                bold: true,
                color: '1E3A8A'
              })
            ],
            spacing: { before: 100, after: 80 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Quy ước 4 mức độ nhận thức (CT GDPT 2018 môn Hóa học):',
                bold: true
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '  • BIẾT (_NB_ / [NB]): ', bold: true, color: '059669' }),
              new TextRun({ text: 'Nhớ, nhận diện, kể tên, viết công thức/cấu hình e, quy tắc octet, số hạt cơ bản, tái hiện kiến thức trực tiếp.' })
            ],
            spacing: { after: 30 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '  • HIỂU (_TH_ / [TH]): ', bold: true, color: '0284C7' }),
              new TextRun({ text: 'Trình bày, mô tả bản chất, so sánh, phân loại, giải thích hiện tượng/xu hướng biến đổi tuần hoàn/liên kết hóa học.' })
            ],
            spacing: { after: 30 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '  • VẬN DỤNG (_VD_ / [VD]): ', bold: true, color: 'D97706' }),
              new TextRun({ text: 'Áp dụng công thức, tính số mol, khối lượng, thể tích khí, nồng độ, ΔrH°₂₉₈, tốc độ phản ứng, cân bằng phản ứng oxi hóa - khử.' })
            ],
            spacing: { after: 30 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '  • VẬN DỤNG CAO (_VDC_ / [VDC]): ', bold: true, color: 'DC2626' }),
              new TextRun({ text: 'Đề xuất giải pháp, thiết kế phương án thí nghiệm, biện luận hợp chất/cấu tạo, giải quyết vấn đề thực tiễn phức hợp/mới.' })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '2. Cách đánh dấu đáp án đúng:',
                bold: true
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '  • Trắc nghiệm 4 lựa chọn: ' }),
              new TextRun({
                text: 'GẠCH CHÂN (Underline - Ctrl+U)',
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                color: '059669'
              }),
              new TextRun({ text: ' phương án đúng (A, B, C hoặc D) hoặc ghi "Đáp án: A".' })
            ],
            spacing: { after: 30 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '  • Đúng / Sai 4 ý: Mệnh đề ' }),
              new TextRun({
                text: 'GẠCH CHÂN = ĐÚNG',
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                color: '059669'
              }),
              new TextRun({ text: '; không gạch chân = ' }),
              new TextRun({ text: 'SAI', bold: true, color: 'DC2626' }),
              new TextRun({ text: '.' })
            ],
            spacing: { after: 30 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '  • Trả lời ngắn: Ghi ' }),
              new TextRun({ text: '"Đáp án: ..."', bold: true, color: '1E3A8A' }),
              new TextRun({ text: ' ngay sau nội dung câu hỏi (ví dụ: Đáp án: 0,1 mol).' })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '3. Bảo toàn nguyên vẹn: ',
                bold: true
              }),
              new TextRun({
                text: 'Hệ thống tự động bảo toàn 100% công thức hóa học (H₂SO₄, CaCO₃, Fe³⁺, 1s²2s²2p⁶, ΔrH°₂₉₈, KMnO₄).'
              })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),

          // ==================== CÂU 1: BIẾT (Chủ đề 1 - Cấu tạo nguyên tử) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 1._NB_', bold: true, color: '059669' }),
              new TextRun({ text: '\nKể tên các loại hạt cơ bản cấu tạo nên hầu hết các nguyên tử trong tự nhiên là' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. Proton, neutron và electron',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({ text: 'B. Chỉ gồm proton và electron', spacing: { after: 40 } }),
          new Paragraph({ text: 'C. Chỉ gồm neutron và electron', spacing: { after: 40 } }),
          new Paragraph({ text: 'D. Chỉ gồm proton và neutron', spacing: { after: 60 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'Hầu hết các nguyên tử đều được cấu tạo từ 3 loại hạt cơ bản: proton (hạt nhân), neutron (hạt nhân) và electron (lớp vỏ).' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 2: BIẾT (Chủ đề 2 - Bảng tuần hoàn) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 2._NB_', bold: true, color: '059669' }),
              new TextRun({ text: '\nNguyên tử Sodium (Na) có Z = 11. Cấu hình electron của nguyên tử Na ở trạng thái cơ bản là' })
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
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({ text: 'B. 1s²2s²2p⁶3s²', spacing: { after: 40 } }),
          new Paragraph({ text: 'C. 1s²2s²2p⁶3p¹', spacing: { after: 40 } }),
          new Paragraph({ text: 'D. 1s²2s²2p⁵3s²', spacing: { after: 60 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'Với Z = 11, electron được điền theo thứ tự phân mức năng lượng: 1s²2s²2p⁶3s¹.' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 3: BIẾT (Chủ đề 3 - Liên kết hóa học) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 3._NB_', bold: true, color: '059669' }),
              new TextRun({ text: '\nTheo quy tắc octet, khi hình thành liên kết hóa học, các nguyên tử có xu hướng nhường, nhận hoặc góp chung electron để đạt được cấu hình electron bền vững giống khí hiếm gần nhất với bao nhiêu electron ở lớp ngoài cùng?' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({ text: 'A. 2 electron', spacing: { after: 40 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'B. 8 electron (hoặc 2 electron đối với Helium)',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({ text: 'C. 10 electron', spacing: { after: 40 } }),
          new Paragraph({ text: 'D. 18 electron', spacing: { after: 60 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'Quy tắc octet phát biểu rằng các nguyên tử có xu hướng đạt cấu hình bền vững với 8 electron lớp ngoài cùng (giống khí hiếm, trừ He có 2e).' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 4: HIỂU (Chủ đề 2 - Bảng tuần hoàn) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 4._TH_', bold: true, color: '0284C7' }),
              new TextRun({ text: '\nGiải thích vì sao bán kính nguyên tử của các nguyên tố nhóm A giảm dần từ trái sang phải trong cùng một chu kỳ.' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. Do điện tích hạt nhân tăng dần trong khi số lớp electron không đổi làm lực hút giữa hạt nhân và electron lớp ngoài cùng tăng',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({ text: 'B. Do số lớp electron của các nguyên tử tăng dần', spacing: { after: 40 } }),
          new Paragraph({ text: 'C. Do độ âm điện của các nguyên tử giảm dần', spacing: { after: 40 } }),
          new Paragraph({ text: 'D. Do khối lượng nguyên tử giảm dần', spacing: { after: 60 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'Trong cùng chu kì, đi từ trái sang phải, Z tăng dần nhưng số lớp electron giữ nguyên, điện tích hiệu dụng tăng hút electron mạnh hơn về phía hạt nhân, làm bán kính giảm.' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 5: HIỂU (Chủ đề 3 - Liên kết hóa học) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 5._TH_', bold: true, color: '0284C7' }),
              new TextRun({ text: '\nGiải thích bản chất của liên kết ion trong phân tử Sodium chloride (NaCl).' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. Là liên kết được hình thành do lực hút tĩnh điện giữa các ion mang điện tích trái dấu (Na⁺ và Cl⁻)',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({ text: 'B. Là liên kết được hình thành do sự góp chung các cặp electron', spacing: { after: 40 } }),
          new Paragraph({ text: 'C. Là liên kết được hình thành do lực hút giữa các phân tử phân cực', spacing: { after: 40 } }),
          new Paragraph({ text: 'D. Là liên kết được hình thành do tương tác van der Waals', spacing: { after: 60 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'Na nhường 1e thành Na⁺, Cl nhận 1e thành Cl⁻. Hai ion Na⁺ và Cl⁻ hút nhau bằng lực hút tĩnh điện tạo thành mạng tinh thể NaCl.' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 6: HIỂU (Chủ đề 4 - Oxi hóa khử) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 6._TH_', bold: true, color: '0284C7' }),
              new TextRun({ text: '\nCho các phát biểu sau về phản ứng oxi hóa - khử:' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'a) Chất khử là chất nhường electron và có số oxi hóa tăng sau phản ứng.',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              }),
              new TextRun({ text: '    (← Gạch chân = ĐÚNG)', italics: true, color: '6B7280' })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'b) Quá trình oxi hóa là quá trình nhận electron.',
                italics: true,
                color: '9CA3AF'
              }),
              new TextRun({ text: '    (← Không gạch chân = SAI)', italics: true, color: '9CA3AF' })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'c) Phản ứng oxi hóa - khử luôn có sự thay đổi số oxi hóa của một số nguyên tố.',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              }),
              new TextRun({ text: '    (← Gạch chân = ĐÚNG)', italics: true, color: '6B7280' })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'd) Chất oxi hóa là chất nhường electron.',
                italics: true,
                color: '9CA3AF'
              }),
              new TextRun({ text: '    (← Không gạch chân = SAI)', italics: true, color: '9CA3AF' })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'b) Sai vì quá trình oxi hóa là quá trình nhường electron. d) Sai vì chất oxi hóa là chất nhận electron.' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 7: VẬN DỤNG (Chủ đề 4 - Oxi hóa khử) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 7._VD_', bold: true, color: 'D97706' }),
              new TextRun({ text: '\nCân bằng phương trình phản ứng oxi hóa – khử sau bằng phương pháp thăng bằng electron: Fe + HNO₃ → Fe(NO₃)₃ + NO + H₂O. Tổng hệ số cân bằng nguyên tối giản của các chất trong phương trình là' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. 9',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({ text: 'B. 10', spacing: { after: 40 } }),
          new Paragraph({ text: 'C. 8', spacing: { after: 40 } }),
          new Paragraph({ text: 'D. 12', spacing: { after: 60 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'Fe + 4HNO₃ → Fe(NO₃)₃ + NO + 2H₂O. Tổng hệ số tối giản = 1 + 4 + 1 + 1 + 2 = 9.' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 8: VẬN DỤNG (Chủ đề 5 - Năng lượng hóa học) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 8._VD_', bold: true, color: 'D97706' }),
              new TextRun({ text: '\nCho phản ứng tổng hợp Ammonia: N₂(g) + 3H₂(g) ⇌ 2NH₃(g) có ΔrH°₂₉₈ = -92 kJ. Tính nhiệt lượng tỏa ra khi tổng hợp được 34 gam khí NH₃.' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. 92 kJ',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({ text: 'B. 184 kJ', spacing: { after: 40 } }),
          new Paragraph({ text: 'C. 46 kJ', spacing: { after: 40 } }),
          new Paragraph({ text: 'D. 276 kJ', spacing: { after: 60 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'n_NH₃ = 34 / 17 = 2 mol. Theo phương trình nhiệt phản ứng, tạo thành 2 mol NH₃ tỏa ra đúng 92 kJ nhiệt lượng.' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 9: VẬN DỤNG (Chủ đề 7 - Halogen) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 9._VD_', bold: true, color: 'D97706' }),
              new TextRun({ text: '\nHòa tan hoàn toàn 2,4 gam Magnesium (Mg) vào dung dịch hydrochloric acid (HCl) dư thu được V lít khí H₂ (đo ở điều kiện chuẩn 25 °C, 1 bar). Tính giá trị của V (biết ở đkc 1 mol khí chiếm 24,79 lít).' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. 2,479 lít',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({ text: 'B. 4,958 lít', spacing: { after: 40 } }),
          new Paragraph({ text: 'C. 1,2395 lít', spacing: { after: 40 } }),
          new Paragraph({ text: 'D. 22,4 lít', spacing: { after: 60 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'n_Mg = 2,4 / 24 = 0,1 mol. Mg + 2HCl → MgCl₂ + H₂ => n_H₂ = 0,1 mol => V = 0,1 * 24,79 = 2,479 lít.' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 10: VẬN DỤNG (Chủ đề 6 - Tốc độ phản ứng - Trả lời ngắn) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 10._VD_', bold: true, color: 'D97706' }),
              new TextRun({ text: '\nCho phản ứng: 2N₂O₅(g) → 4NO₂(g) + O₂(g). Sau 100 giây đầu tiên, nồng độ N₂O₅ giảm từ 0,020 M xuống còn 0,016 M. Tính tốc độ trung bình của phản ứng theo nồng độ N₂O₅ trong khoảng thời gian trên (đơn vị: M/s).' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Đáp án: ', bold: true }),
              new TextRun({
                text: '0,00002 M/s',
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'v_tb = - (1/2) * (ΔC / Δt) = - (1/2) * ((0,016 - 0,020) / 100) = 0,00002 M/s (hoặc 2.10⁻⁵ M/s).' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 11: VẬN DỤNG CAO (Chủ đề 1 & 2 - Biện luận hợp chất) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 11._VDC_', bold: true, color: 'DC2626' }),
              new TextRun({ text: '\nTổng số hạt proton, neutron và electron trong phân tử M₂X₃ là 152 hạt, trong đó số hạt mang điện nhiều hơn số hạt không mang điện là 48 hạt. Số hạt mang điện trong nguyên tử M nhiều hơn số hạt mang điện trong nguyên tử X là 22 hạt. Biện luận xác định công thức phân tử của hợp chất M₂X₃.' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. Fe₂O₃',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({ text: 'B. Al₂O₃', spacing: { after: 40 } }),
          new Paragraph({ text: 'C. Cr₂O₃', spacing: { after: 40 } }),
          new Paragraph({ text: 'D. Fe₂S₃', spacing: { after: 60 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'Lập hệ 4 phương trình hạt: 4Z_M + 6Z_X + 2N_M + 3N_X = 152; (4Z_M + 6Z_X) - (2N_M + 3N_X) = 48 => 4Z_M + 6Z_X = 100 và 2Z_M - 2Z_X = 22 => Z_M = 26 (Fe), Z_X = 8 (O). Vậy công thức phân tử là Fe₂O₃.' })
            ],
            spacing: { after: 160 }
          }),

          // ==================== CÂU 12: VẬN DỤNG CAO (Chuyên đề Cháy nổ & Thực tiễn) ====================
          new Paragraph({
            children: [
              new TextRun({ text: 'CÂU 12._VDC_', bold: true, color: 'DC2626' }),
              new TextRun({ text: '\nĐề xuất giải pháp an toàn và hạn chế tối đa nguy cơ cháy nổ trong một kho chứa hóa chất có lưu trữ các chất oxi hóa mạnh (như KMnO₄, KClO₃) và các chất khử mạnh (như bột kim loại Mg, Al, bột lưu huỳnh S) dựa trên các nguyên tắc hóa học.' })
            ],
            spacing: { before: 140, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'A. Bảo quản riêng biệt cách ly các chất oxi hóa và chất khử, kiểm soát nghiêm ngặt độ ẩm, thông gió thoáng mát và trang bị hệ thống dập lửa bột khô/CO₂ phù hợp',
                underline: { type: UnderlineType.SINGLE },
                bold: true,
                color: '059669'
              })
            ],
            spacing: { after: 40 }
          }),
          new Paragraph({ text: 'B. Trộn lẫn các chất để giảm mật độ tiếp xúc với không khí', spacing: { after: 40 } }),
          new Paragraph({ text: 'C. Dùng nước tưới liên tục lên tất cả các bao chứa bột kim loại để làm mát', spacing: { after: 40 } }),
          new Paragraph({ text: 'D. Lưu trữ trong kho kín không có lối thông gió để tránh thất thoát nhiệt', spacing: { after: 60 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Lời giải: ', bold: true }),
              new TextRun({ text: 'Chất oxi hóa mạnh và chất khử mạnh khi tiếp xúc gần dễ phát sinh phản ứng tỏa nhiệt dữ dội gây nổ. Bột kim loại hoạt động (Mg, Al) tuyệt đối không dùng nước dập vì tạo H₂ gây nổ. Do đó phải cách ly, thông gió và dùng bình chữa cháy chuyên dụng.' })
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
