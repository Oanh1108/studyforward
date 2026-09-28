// TOEIC Part Drill Dataset
export interface Part1Question {
  id: string;
  type: "part1";
  sceneTitle: string;
  sceneDescription: string;
  icon: string;
  options: { key: "A" | "B" | "C" | "D"; text: string; isCorrect: boolean; translation: string }[];
  explanation: string;
}

export interface Part2Question {
  id: string;
  type: "part2";
  questionAudio: string;
  questionTranslation: string;
  options: { key: "A" | "B" | "C"; text: string; isCorrect: boolean; translation: string }[];
  explanation: string;
  trapNote: string;
}

export interface Part3Conversation {
  id: string;
  type: "part3";
  title: string;
  scenario: string;
  audioDialogue: { speaker: string; text: string; vi: string }[];
  questions: {
    question: string;
    options: { key: "A" | "B" | "C" | "D"; text: string; isCorrect: boolean }[];
    explanation: string;
  }[];
}

export interface Part4Talk {
  id: string;
  type: "part4";
  title: string;
  category: string;
  audioMonologue: { text: string; vi: string }[];
  questions: {
    question: string;
    options: { key: "A" | "B" | "C" | "D"; text: string; isCorrect: boolean }[];
    explanation: string;
  }[];
}

export type ToeicYear = "2023" | "2024" | "2026";

export const TOEIC_YEARS_CONFIG: {
  year: ToeicYear;
  title: string;
  badge: string;
  desc: string;
  color: string;
  activeColor: string;
  icon: string;
}[] = [
  {
    year: "2023",
    title: "ETS TOEIC 2023",
    badge: "10 Đề chuẩn ETS",
    desc: "Bộ đề thi chuẩn Format ETS 2023 quen thuộc, bám sát đề thi thật.",
    color: "hover:border-blue-400 bg-[var(--bg-card)]",
    activeColor: "border-blue-500 bg-blue-600 text-white shadow-md ring-2 ring-blue-400/25",
    icon: "📘",
  },
  {
    year: "2024",
    title: "ETS TOEIC 2024",
    badge: "Xu hướng mới",
    desc: "Bộ đề ETS 2024 cập nhật giọng đọc đa quốc gia (Mỹ, Anh, Úc, Canada).",
    color: "hover:border-amber-400 bg-[var(--bg-card)]",
    activeColor: "border-amber-500 bg-amber-600 text-white shadow-md ring-2 ring-amber-400/25",
    icon: "📙",
  },
  {
    year: "2026",
    title: "ETS TOEIC 2026",
    badge: "Dự đoán & Nâng cao",
    desc: "Bộ đề dự đoán với chủ đề công nghệ, AI, tự động hóa và kinh tế số.",
    color: "hover:border-purple-400 bg-[var(--bg-card)]",
    activeColor: "border-purple-500 bg-purple-600 text-white shadow-md ring-2 ring-purple-400/25",
    icon: "📗",
  },
];

// Dữ liệu Part 2 Test 01 (Trích xuất từ Test_01-Part2.mp3 gồm 25 câu: Câu 7 - Câu 31)
export const PART2_TEST01_QUESTIONS: Part2Question[] = [
  {
    id: "p2-q07",
    type: "part2",
    questionAudio: "Where is the conference being held?",
    questionTranslation: "Hội nghị đang được tổ chức ở đâu?",
    options: [
      { key: "A", text: "A three-day vacation.", isCorrect: false, translation: "Một kỳ nghỉ kéo dài ba ngày." },
      { key: "B", text: "At the Riverview Hotel.", isCorrect: true, translation: "Tại khách sạn Riverview." },
      { key: "C", text: "In the supply cabinet.", isCorrect: false, translation: "Trong tủ đựng văn phòng phẩm." },
    ],
    explanation: "Câu hỏi bắt đầu bằng từ để hỏi 'Where' (ở đâu) nhằm hỏi địa điểm diễn ra hội nghị. Phương án (B) 'At the Riverview Hotel' trả lời trực tiếp về địa điểm tổ chức.",
    trapNote: "Phương án C ('In the supply cabinet') cũng chỉ nơi chốn nhưng phi logic vì hội nghị không thể tổ chức trong tủ đồ; phương án A trả lời cho câu hỏi thời lượng 'How long'.",
  },
  {
    id: "p2-q08",
    type: "part2",
    questionAudio: "When does the warehouse manager arrive?",
    questionTranslation: "Khi nào thì người quản lý kho đến?",
    options: [
      { key: "A", text: "Sure, no problem.", isCorrect: false, translation: "Chắc chắn rồi, không vấn đề gì." },
      { key: "B", text: "About 12 shipping boxes.", isCorrect: false, translation: "Khoảng 12 thùng hàng." },
      { key: "C", text: "Not until this afternoon.", isCorrect: true, translation: "Phải đến tận chiều nay." },
    ],
    explanation: "Câu hỏi bắt đầu bằng 'When' hỏi thời điểm người quản lý kho tới. Cấu trúc 'Not until + mốc thời gian' (Mãi cho đến...) là cách trả lời kinh điển trong bài thi TOEIC.",
    trapNote: "Bẫy Yes/No đối với câu hỏi Wh-: Không trả lời Sure/Yes/No cho câu hỏi 'When' (loại A). Phương án B trả lời cho số lượng 'How many'.",
  },
  {
    id: "p2-q09",
    type: "part2",
    questionAudio: "There's a nice park nearby, right?",
    questionTranslation: "Gần đây có một công viên rất đẹp, đúng không?",
    options: [
      { key: "A", text: "Did you order paper for the copier?", isCorrect: false, translation: "Bạn đã đặt giấy cho máy photocopy chưa?" },
      { key: "B", text: "Yes, it's next to Greendale Lake.", isCorrect: true, translation: "Đúng vậy, nó nằm cạnh hồ Greendale." },
      { key: "C", text: "They're in the parking garage.", isCorrect: false, translation: "Họ đang ở trong nhà để xe." },
    ],
    explanation: "Câu hỏi đuôi/xác nhận thông tin. Đáp án (B) xác nhận 'Yes' và bổ sung thêm vị trí cụ thể của công viên ('next to Greendale Lake').",
    trapNote: "Bẫy từ vựng phát âm tương tự / cùng gốc: 'parking garage' (nhà để xe) có từ 'park' giống với danh từ 'park' (công viên) trong câu hỏi.",
  },
  {
    id: "p2-q10",
    type: "part2",
    questionAudio: "Who sent the meeting minutes to the accounting department?",
    questionTranslation: "Ai đã gửi biên bản cuộc họp tới phòng kế toán vậy?",
    options: [
      { key: "A", text: "Our office assistant.", isCorrect: true, translation: "Trợ lý văn phòng của chúng ta." },
      { key: "B", text: "They have a savings account.", isCorrect: false, translation: "Họ có một tài khoản tiết kiệm." },
      { key: "C", text: "Cash and credit cards.", isCorrect: false, translation: "Tiền mặt và thẻ tín dụng." },
    ],
    explanation: "Câu hỏi bắt đầu bằng 'Who' hỏi về người/chủ thể thực hiện hành động gửi biên bản cuộc họp. Đáp án (A) 'Our office assistant' (trợ lý văn phòng) chỉ đối tượng người phù hợp nhất.",
    trapNote: "Bẫy từ liên quan trường nghĩa: Cụm 'accounting department' (phòng kế toán) dẫn dụ người nghe chọn các từ liên quan đến tiền bạc như 'savings account' hay 'credit cards'.",
  },
  {
    id: "p2-q11",
    type: "part2",
    questionAudio: "I'd like to know what you think of our new finance analyst.",
    questionTranslation: "Tôi muốn biết bạn nghĩ gì về chuyên viên phân tích tài chính mới của chúng ta.",
    options: [
      { key: "A", text: "I've prepared the decorations for tomorrow.", isCorrect: false, translation: "Tôi đã chuẩn bị đồ trang trí cho ngày mai." },
      { key: "B", text: "He seems very competent.", isCorrect: true, translation: "Anh ấy có vẻ rất có năng lực." },
      { key: "C", text: "It's finally stopped raining.", isCorrect: false, translation: "Cuối cùng thì trời cũng tạnh mưa rồi." },
    ],
    explanation: "Câu trần thuật hỏi nhận xét, quan điểm về một nhân viên mới ('what you think of...'). Phương án (B) 'He seems very competent' (Anh ấy có vẻ rất thạo việc/năng lực) đưa ra nhận xét chính xác.",
    trapNote: "Câu trần thuật (Statement) đòi hỏi hiểu toàn diện ngữ cảnh câu thay vì chỉ nghe từ khóa đầu câu.",
  },
  {
    id: "p2-q12",
    type: "part2",
    questionAudio: "Let's go on the company retreat.",
    questionTranslation: "Chúng ta hãy cùng tham gia chuyến dã ngoại của công ty đi.",
    options: [
      { key: "A", text: "Oh, did he?", isCorrect: false, translation: "Ồ, anh ấy đã làm vậy sao?" },
      { key: "B", text: "Yes, that's a good idea.", isCorrect: true, translation: "Được đấy, đó là một ý kiến hay." },
      { key: "C", text: "He tried to solve that problem.", isCorrect: false, translation: "Anh ấy đã cố gắng giải quyết vấn đề đó." },
    ],
    explanation: "Câu rủ rê/đề xuất 'Let's...'. Đáp án (B) 'Yes, that's a good idea' là câu hưởng ứng đề xuất vô cùng tự nhiên và lịch sự.",
    trapNote: "Bẫy đại từ không tương thích: A và C dùng đại từ 'he' không phù hợp với chủ ngữ rủ rê chung 'Let's' (chúng ta hãy).",
  },
  {
    id: "p2-q13",
    type: "part2",
    questionAudio: "What time can I pick up my glasses?",
    questionTranslation: "Mấy giờ thì tôi có thể đến lấy kính mắt của mình?",
    options: [
      { key: "A", text: "No, it's not very heavy.", isCorrect: false, translation: "Không, nó không nặng lắm." },
      { key: "B", text: "About 20 meters.", isCorrect: false, translation: "Khoảng 20 mét." },
      { key: "C", text: "We close at 6:00.", isCorrect: true, translation: "Chúng tôi đóng cửa lúc 6 giờ." },
    ],
    explanation: "Câu hỏi 'What time' hỏi về thời gian. Câu trả lời gián tiếp 'We close at 6:00' ngụ ý khách hàng có thể ghé lấy bất cứ lúc nào trước giờ đóng cửa.",
    trapNote: "Bẫy câu trả lời gián tiếp: Câu hỏi thời gian thường không trả lời trực tiếp giờ chính xác mà đưa ra mốc giờ giới hạn. Loại A vì có 'No' cho câu hỏi Wh-.",
  },
  {
    id: "p2-q14",
    type: "part2",
    questionAudio: "The sales team knows how to use the tracking software, don't they?",
    questionTranslation: "Đội ngũ kinh doanh biết cách sử dụng phần mềm theo dõi rồi, phải không?",
    options: [
      { key: "A", text: "It's on the lower shelf.", isCorrect: false, translation: "Nó ở trên kệ phía dưới." },
      { key: "B", text: "A 12:30 departure.", isCorrect: false, translation: "Một chuyến khởi hành lúc 12:30." },
      { key: "C", text: "I haven't seen them using it yet.", isCorrect: true, translation: "Tôi vẫn chưa thấy họ dùng nó bao giờ." },
    ],
    explanation: "Câu hỏi đuôi xác nhận hiểu biết của nhóm bán hàng. Đáp án (C) trả lời khéo léo rằng người nói chưa từng thấy họ sử dụng, ngụ ý là có thể họ chưa biết hoặc chưa bắt đầu dùng.",
    trapNote: "Kiểu trả lời 'không chắc chắn / chưa từng thấy / chưa rõ' rất hay xuất hiện làm đáp án đúng trong đề TOEIC mới.",
  },
  {
    id: "p2-q15",
    type: "part2",
    questionAudio: "Are you going to the hardware store on Mill Street?",
    questionTranslation: "Bạn có định đến cửa hàng kim khí ở phố Mill không?",
    options: [
      { key: "A", text: "That store hasn't opened yet.", isCorrect: true, translation: "Cửa hàng đó vẫn chưa khai trương đâu." },
      { key: "B", text: "The blue package you sent me.", isCorrect: false, translation: "Gói hàng màu xanh bạn gửi cho tôi." },
      { key: "C", text: "Some nails and a hammer.", isCorrect: false, translation: "Một ít đinh và một cái búa." },
    ],
    explanation: "Câu hỏi Yes/No về việc đến một cửa hàng. Đáp án (A) nêu lý do gián tiếp cửa hàng chưa mở cửa, ngụ ý sẽ không đi.",
    trapNote: "Bẫy từ liên quan chủ đề: C nhắc đến 'nails and hammer' (đinh và búa) thuộc dụng cụ cơ khí để đánh lừa người chỉ nghe lỏm từ 'hardware store'.",
  },
  {
    id: "p2-q16",
    type: "part2",
    questionAudio: "Would you be able to write the introduction for the workshop?",
    questionTranslation: "Bạn có thể viết lời giới thiệu cho buổi hội thảo được không?",
    options: [
      { key: "A", text: "That was a great book.", isCorrect: false, translation: "Đó là một cuốn sách tuyệt vời." },
      { key: "B", text: "OK, I'd be happy to.", isCorrect: true, translation: "Được chứ, tôi rất sẵn lòng." },
      { key: "C", text: "He doesn't have any more.", isCorrect: false, translation: "Anh ấy không còn cái nào nữa." },
    ],
    explanation: "Lời đề nghị/nhờ vả lịch sự 'Would you be able to...?'. Đáp án (B) 'OK, I'd be happy to' là câu nhận lời giúp đỡ quen thuộc.",
    trapNote: "Loại A vì thì quá khứ nói về quyển sách không liên quan; loại C vì chủ ngữ 'He' lạc quẻ.",
  },
  {
    id: "p2-q17",
    type: "part2",
    questionAudio: "I picked up some flowers for Tunji's retirement party.",
    questionTranslation: "Tôi đã mua một ít hoa cho bữa tiệc nghỉ hưu của Tunji.",
    options: [
      { key: "A", text: "No, pick any day.", isCorrect: false, translation: "Không, chọn ngày nào cũng được." },
      { key: "B", text: "That was thoughtful.", isCorrect: true, translation: "Bạn thật là chu đáo." },
      { key: "C", text: "A delivery driver.", isCorrect: false, translation: "Một tài xế giao hàng." },
    ],
    explanation: "Câu trần thuật kể về hành động tinh tế của mình. Đáp án (B) 'That was thoughtful' (Bạn thật chu đáo/tốt bụng) thể hiện phản xạ giao tiếp chuẩn mực.",
    trapNote: "Bẫy lặp từ/từ đồng âm: Phương án A lặp từ 'pick' nhưng mang nghĩa 'chọn lựa' (pick a day).",
  },
  {
    id: "p2-q18",
    type: "part2",
    questionAudio: "Which meeting room did you tell the interns to go to?",
    questionTranslation: "Bạn đã bảo các thực tập sinh đến phòng họp nào vậy?",
    options: [
      { key: "A", text: "The Jefferson Room.", isCorrect: true, translation: "Phòng Jefferson." },
      { key: "B", text: "The meeting was fun, thanks.", isCorrect: false, translation: "Cuộc họp rất vui, cảm ơn nhé." },
      { key: "C", text: "Yes, it's a conference call.", isCorrect: false, translation: "Vâng, đó là một cuộc gọi hội nghị." },
    ],
    explanation: "Câu hỏi 'Which meeting room' (phòng họp nào). Phương án (A) 'The Jefferson Room' chỉ đích danh tên phòng họp cần tìm.",
    trapNote: "Bẫy Yes/No: Câu hỏi Wh- không bao giờ trả lời bằng 'Yes' (loại ngay C). Phương án B lặp từ 'meeting' nhưng sai nội dung.",
  },
  {
    id: "p2-q19",
    type: "part2",
    questionAudio: "Is your dental appointment next Tuesday?",
    questionTranslation: "Lịch hẹn nha sĩ của bạn là vào thứ Ba tuần tới phải không?",
    options: [
      { key: "A", text: "You can borrow mine.", isCorrect: false, translation: "Bạn có thể mượn của tôi." },
      { key: "B", text: "I'll have to check my calendar.", isCorrect: true, translation: "Tôi sẽ phải kiểm tra lại lịch đã." },
      { key: "C", text: "Yes, it was a good meeting.", isCorrect: false, translation: "Vâng, đó là một cuộc họp tốt." },
    ],
    explanation: "Hỏi về lịch hẹn cụ thể. Đáp án (B) 'I'll have to check my calendar' (Để tôi xem lại lịch) thể hiện phản hồi tự nhiên khi chưa nhớ chính xác.",
    trapNote: "Các câu nói kiểm tra lại thông tin như 'check my calendar / ask my supervisor' rất hay là đáp án đúng trong TOEIC.",
  },
  {
    id: "p2-q20",
    type: "part2",
    questionAudio: "Why aren't there any brochures in the lobby?",
    questionTranslation: "Tại sao không có tờ rơi quảng cáo nào ở sảnh chờ vậy?",
    options: [
      { key: "A", text: "No, I haven't received my confirmation email yet.", isCorrect: false, translation: "Không, tôi vẫn chưa nhận được email xác nhận." },
      { key: "B", text: "My winter coat.", isCorrect: false, translation: "Áo khoác mùa đông của tôi." },
      { key: "C", text: "Because someone just took the last one.", isCorrect: true, translation: "Bởi vì ai đó vừa lấy đi tờ cuối cùng rồi." },
    ],
    explanation: "Câu hỏi 'Why' hỏi lý do. Phương án (C) bắt đầu bằng 'Because' và giải thích nguyên nhân rõ ràng (ai đó vừa lấy cuốn cuối cùng).",
    trapNote: "Loại A vì câu hỏi Why phủ định không trả lời trực tiếp bằng 'No' như thế. B không liên quan.",
  },
  {
    id: "p2-q21",
    type: "part2",
    questionAudio: "What's the process for submitting my expense report?",
    questionTranslation: "Quy trình nộp báo cáo chi phí như thế nào vậy?",
    options: [
      { key: "A", text: "You send it to the finance department.", isCorrect: true, translation: "Bạn gửi nó cho phòng tài chính." },
      { key: "B", text: "The end of the day.", isCorrect: false, translation: "Cuối ngày hôm nay." },
      { key: "C", text: "That's correct.", isCorrect: false, translation: "Đúng rồi đó." },
    ],
    explanation: "Hỏi về các bước/quy trình gửi tài liệu. Đáp án (A) hướng dẫn cụ thể hành động: gửi bản báo cáo cho bộ phận tài chính.",
    trapNote: "Phương án B trả lời cho mốc thời gian hạn chót (When), không trả lời cho câu hỏi quy trình (process).",
  },
  {
    id: "p2-q22",
    type: "part2",
    questionAudio: "Do you sell your products online or in stores?",
    questionTranslation: "Bạn bán sản phẩm qua mạng hay tại các cửa hàng?",
    options: [
      { key: "A", text: "About 20% off.", isCorrect: false, translation: "Giảm giá khoảng 20%." },
      { key: "B", text: "A product demonstration.", isCorrect: false, translation: "Buổi trình diễn sản phẩm." },
      { key: "C", text: "Only online.", isCorrect: true, translation: "Chỉ bán trên mạng thôi." },
    ],
    explanation: "Câu hỏi lựa chọn 'A or B' (online hay in stores). Đáp án (C) chọn phương án thứ nhất kèm trạng từ giới hạn: 'Only online'.",
    trapNote: "Bẫy lặp từ: B lặp từ 'product'. A nói về giảm giá không giải quyết câu hỏi hình thức bán hàng.",
  },
  {
    id: "p2-q23",
    type: "part2",
    questionAudio: "How often do you charge this device?",
    questionTranslation: "Bao lâu thì bạn sạc thiết bị này một lần?",
    options: [
      { key: "A", text: "Whenever the light turns red.", isCorrect: true, translation: "Bất cứ khi nào đèn báo chuyển sang màu đỏ." },
      { key: "B", text: "A wireless one.", isCorrect: false, translation: "Một cái loại không dây." },
      { key: "C", text: "At the hardware store.", isCorrect: false, translation: "Tại cửa hàng kim khí." },
    ],
    explanation: "Câu hỏi tần suất 'How often'. Thay vì nêu con số cụ thể, người nói trả lời bằng điều kiện phát sinh: 'Whenever the light turns red' (Cứ hễ đèn đỏ là sạc).",
    trapNote: "C trả lời cho câu hỏi 'Where'. B mô tả chủng loại thiết bị.",
  },
  {
    id: "p2-q24",
    type: "part2",
    questionAudio: "The tickets to Friday night's concert cost $10 each.",
    questionTranslation: "Vé xem buổi hòa nhạc tối thứ Sáu có giá $10 mỗi vé.",
    options: [
      { key: "A", text: "Actually, they're 15.", isCorrect: true, translation: "Thực ra là 15 đô la đấy." },
      { key: "B", text: "No, I can't play the guitar.", isCorrect: false, translation: "Không, tôi không biết chơi đàn ghi-ta." },
      { key: "C", text: "It's in aisle 5.", isCorrect: false, translation: "Nó ở lối đi số 5." },
    ],
    explanation: "Câu trần thuật đưa ra thông tin giá vé ($10). Đáp án (A) dùng từ 'Actually' để đính chính lại giá vé thực tế là $15.",
    trapNote: "Dấu hiệu từ đính chính: Cụm từ bắt đầu bằng 'Actually' có tỷ lệ là đáp án đúng cực cao trong TOEIC Part 2.",
  },
  {
    id: "p2-q25",
    type: "part2",
    questionAudio: "Can't you update the database today?",
    questionTranslation: "Hôm nay bạn không thể cập nhật cơ sở dữ liệu được sao?",
    options: [
      { key: "A", text: "I did it yesterday.", isCorrect: true, translation: "Tôi đã làm việc đó từ hôm qua rồi." },
      { key: "B", text: "That's an interesting movie.", isCorrect: false, translation: "Đó là một bộ phim thú vị." },
      { key: "C", text: "No, just me.", isCorrect: false, translation: "Không, chỉ có mình tôi thôi." },
    ],
    explanation: "Câu hỏi phủ định nhắc nhở cập nhật dữ liệu. Đáp án (A) nêu rõ công việc đã được hoàn tất từ hôm qua rồi.",
    trapNote: "Câu trả lời giải quyết vấn đề ngầm định: Việc đã xong rồi nên hôm nay không cần làm nữa.",
  },
  {
    id: "p2-q26",
    type: "part2",
    questionAudio: "How are we going to fit the extra supplies in that closet?",
    questionTranslation: "Làm sao chúng ta nhét vừa chỗ đồ bổ sung vào chiếc tủ đó đây?",
    options: [
      { key: "A", text: "I've already read them.", isCorrect: false, translation: "Tôi đã đọc chúng rồi." },
      { key: "B", text: "Natalie's in charge of supplies.", isCorrect: true, translation: "Natalie là người phụ trách văn phòng phẩm mà." },
      { key: "C", text: "It's the door at the end of the hallway.", isCorrect: false, translation: "Đó là cánh cửa ở cuối hành lang." },
    ],
    explanation: "Hỏi cách giải quyết vấn đề sức chứa. Phương án (B) chuyển giao cho người có trách nhiệm: 'Natalie's in charge of supplies' (cụm 'in charge of' = phụ trách).",
    trapNote: "Bẫy đùn đẩy trách nhiệm: Khi gặp khó khăn, câu trả lời hướng đến người chịu trách nhiệm chính rất thường là đáp án đúng.",
  },
  {
    id: "p2-q27",
    type: "part2",
    questionAudio: "Have all the new windows been installed?",
    questionTranslation: "Tất cả các cửa sổ mới đã được lắp đặt xong chưa?",
    options: [
      { key: "A", text: "Sure, I'll close the blinds.", isCorrect: false, translation: "Chắc chắn rồi, tôi sẽ kéo rèm lại." },
      { key: "B", text: "The construction crew is almost finished.", isCorrect: true, translation: "Đội thi công gần như hoàn tất rồi." },
      { key: "C", text: "This isn't the tallest ladder available.", isCorrect: false, translation: "Đây không phải là chiếc thang cao nhất hiện có." },
    ],
    explanation: "Hỏi tiến độ lắp đặt cửa sổ. Đáp án (B) cập nhật tình hình đội thi công sắp làm xong rồi ('almost finished').",
    trapNote: "Bẫy từ liên quan ngữ cảnh: 'blinds' (rèm cửa) và 'ladder' (thang) là các từ liên quan đến 'windows' nhưng tạo thành câu vô nghĩa.",
  },
  {
    id: "p2-q28",
    type: "part2",
    questionAudio: "Would you rather go to lunch now or at noon?",
    questionTranslation: "Bạn muốn đi ăn trưa bây giờ hay vào lúc giữa trưa?",
    options: [
      { key: "A", text: "I'm taking a client to lunch.", isCorrect: true, translation: "Tôi có hẹn đưa khách hàng đi ăn trưa rồi." },
      { key: "B", text: "On the corner of 4th and Main.", isCorrect: false, translation: "Ở góc đường số 4 và đường Main." },
      { key: "C", text: "The daily special is soup and a sandwich.", isCorrect: false, translation: "Món đặc biệt hôm nay là súp và bánh mì kẹp." },
    ],
    explanation: "Câu hỏi lựa chọn giữa hai mốc thời gian ('now or at noon'). Phương án (A) từ chối cả hai một cách gián tiếp vì đã có lịch hẹn riêng với khách hàng.",
    trapNote: "Đáp án phủ định cả hai phương án trong câu hỏi lựa chọn 'A or B' là dạng bẫy rất thường gặp trong Part 2.",
  },
  {
    id: "p2-q29",
    type: "part2",
    questionAudio: "You're taking the training in the afternoon, aren't you?",
    questionTranslation: "Bạn sẽ tham gia khóa đào tạo vào buổi chiều, đúng không?",
    options: [
      { key: "A", text: "The new head of the accounting department.", isCorrect: false, translation: "Trưởng phòng kế toán mới." },
      { key: "B", text: "No, I take my coffee black.", isCorrect: false, translation: "Không, tôi uống cà phê đen." },
      { key: "C", text: "Well, it depends on my schedule.", isCorrect: true, translation: "À, việc đó còn tùy vào lịch làm việc của tôi nữa." },
    ],
    explanation: "Câu hỏi đuôi xác nhận lịch học. Đáp án (C) 'Well, it depends on my schedule' (Còn tùy vào lịch của tôi) thể hiện phản hồi linh hoạt, tự nhiên.",
    trapNote: "Cụm từ 'It depends on...' (còn tùy thuộc vào...) hầu như luôn là đáp án đúng trong Part 2. B bẫy từ 'take' trong cụm 'take coffee'.",
  },
  {
    id: "p2-q30",
    type: "part2",
    questionAudio: "Shouldn't Ms. Ishida look over the financial projections?",
    questionTranslation: "Chẳng phải cô Ishida nên xem qua các dự báo tài chính sao?",
    options: [
      { key: "A", text: "I just got this monitor.", isCorrect: false, translation: "Tôi vừa mới nhận được chiếc màn hình này." },
      { key: "B", text: "To the south entrance.", isCorrect: false, translation: "Đến lối vào phía nam." },
      { key: "C", text: "I'm meeting with her at 10:00.", isCorrect: true, translation: "Tôi có hẹn gặp cô ấy lúc 10 giờ." },
    ],
    explanation: "Câu hỏi phủ định đưa ra đề xuất xem xét tài liệu với cô Ishida. Phương án (C) ngụ ý rằng họ sẽ làm việc đó khi gặp nhau lúc 10 giờ.",
    trapNote: "Câu trả lời gián tiếp ngụ ý công việc sẽ được xử lý trong buổi gặp mặt sắp tới.",
  },
  {
    id: "p2-q31",
    type: "part2",
    questionAudio: "When are you going to choose a new project manager?",
    questionTranslation: "Khi nào thì bạn định chọn người quản lý dự án mới?",
    options: [
      { key: "A", text: "The projector's not working correctly.", isCorrect: false, translation: "Máy chiếu hoạt động không đúng cách." },
      { key: "B", text: "Next to the front entrance.", isCorrect: false, translation: "Bên cạnh lối vào phía trước." },
      { key: "C", text: "I'm really busy this week.", isCorrect: true, translation: "Tuần này tôi thực sự rất bận." },
    ],
    explanation: "Câu hỏi 'When' hỏi thời điểm đưa ra quyết định chọn người. Đáp án (C) 'I'm really busy this week' giải thích lý do tuần này chưa thể chọn được.",
    trapNote: "Bẫy từ phát âm na ná (sound-alike): 'project' (dự án) dễ bị nghe nhầm thành 'projector' (máy chiếu) ở phương án A. B trả lời cho câu hỏi 'Where'.",
  },
];

// Cấu hình dữ liệu các năm thi TOEIC
export const TOEIC_DATA_BY_YEAR: Record<ToeicYear, {
  part1: Part1Question[];
  part2: Part2Question[];
  part3: Part3Conversation[];
  part4: Part4Talk[];
}> = {
  "2023": {
    part1: [],
    part2: PART2_TEST01_QUESTIONS,
    part3: [],
    part4: [],
  },
  "2024": {
    part1: [],
    part2: PART2_TEST01_QUESTIONS,
    part3: [],
    part4: [],
  },
  "2026": {
    part1: [],
    part2: PART2_TEST01_QUESTIONS,
    part3: [],
    part4: [],
  },
};

// Helper to clean words for comparison
export function cleanWord(w: string) {
  return w.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// 4 Part chuẩn của đề thi TOEIC Listening
export const TOEIC_PARTS_INFO = [
  {
    part: 1 as const,
    folderCode: "Part 1",
    title: "Photographs",
    subtitle: "Mô tả tranh ảnh",
    icon: "🖼️",
    activeColor: "border-purple-500 bg-purple-600 text-white shadow-md ring-2 ring-purple-400/25",
  },
  {
    part: 2 as const,
    folderCode: "Part 2",
    title: "Question - Response",
    subtitle: "Hỏi & Đáp phản xạ",
    icon: "❓",
    activeColor: "border-blue-500 bg-blue-600 text-white shadow-md ring-2 ring-blue-400/25",
  },
  {
    part: 3 as const,
    folderCode: "Part 3",
    title: "Conversations",
    subtitle: "Hội thoại ngắn (2-3 người)",
    icon: "💬",
    activeColor: "border-indigo-500 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/25",
  },
  {
    part: 4 as const,
    folderCode: "Part 4",
    title: "Short Talks",
    subtitle: "Bài nói ngắn (Độc thoại)",
    icon: "📢",
    activeColor: "border-amber-500 bg-amber-600 text-white shadow-md ring-2 ring-amber-400/25",
  },
];