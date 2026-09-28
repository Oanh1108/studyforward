export interface QuestionStudyData {
  vocabulary: { word: string; pos: string; phonetic: string; meaning: string }[];
  collocations: { phrase: string; meaning: string; note?: string }[];
}

export const PART2_STUDY_DATA: Record<string, QuestionStudyData> = {
  "p2-q07": {
    vocabulary: [
      { word: "conference", pos: "n", phonetic: "/ˈkɒn.fər.əns/", meaning: "hội nghị, hội thảo cấp cao" },
      { word: "hold / held", pos: "v", phonetic: "/held/", meaning: "tổ chức, cử hành" },
      { word: "vacation", pos: "n", phonetic: "/veɪˈkeɪ.ʃən/", meaning: "kỳ nghỉ dưỡng, kỳ phép" },
      { word: "supply cabinet", pos: "n", phonetic: "/səˈplaɪ ˈkæb.ɪ.nət/", meaning: "tủ chứa đồ dùng văn phòng" },
    ],
    collocations: [
      { phrase: "hold a conference", meaning: "tổ chức một hội nghị / sự kiện", note: "Cụm danh từ + động từ rất hay gặp trong TOEIC" },
      { phrase: "be held at [location]", meaning: "được tổ chức tại địa điểm nào", note: "Cấu trúc bị động chỉ nơi chốn tổ chức" },
      { phrase: "three-day vacation", meaning: "kỳ nghỉ kéo dài 3 ngày", note: "Tính từ ghép có dấu gạch nối" },
    ],
  },
  "p2-q08": {
    vocabulary: [
      { word: "warehouse", pos: "n", phonetic: "/ˈweə.haʊs/", meaning: "nhà kho, kho chứa hàng" },
      { word: "manager", pos: "n", phonetic: "/ˈmæn.ɪ.dʒər/", meaning: "người quản lý, trưởng phòng" },
      { word: "arrive", pos: "v", phonetic: "/əˈraɪv/", meaning: "đến nơi, có mặt" },
      { word: "shipping box", pos: "n", phonetic: "/ˈʃɪp.ɪŋ bɒks/", meaning: "thùng hàng vận chuyển" },
    ],
    collocations: [
      { phrase: "warehouse manager", meaning: "quản lý kho bãi vận hành" },
      { phrase: "not until this afternoon", meaning: "mãi cho tới tận chiều nay mới đến", note: "Cách trả lời kinh điển cho câu hỏi When" },
      { phrase: "shipping and handling", meaning: "vận chuyển và bốc dỡ hàng hóa" },
    ],
  },
  "p2-q09": {
    vocabulary: [
      { word: "nearby", pos: "adv/adj", phonetic: "/ˌnɪəˈbaɪ/", meaning: "ở gần đây, lân cận" },
      { word: "copier", pos: "n", phonetic: "/ˈkɒp.i.ər/", meaning: "máy photocopy, máy in sao" },
      { word: "parking garage", pos: "n", phonetic: "/ˈpɑː.kɪŋ ɡær.ɑːʒ/", meaning: "nhà để xe nhiều tầng" },
      { word: "lake", pos: "n", phonetic: "/leɪk/", meaning: "hồ nước" },
    ],
    collocations: [
      { phrase: "order paper for the copier", meaning: "đặt mua giấy cho máy photocopy" },
      { phrase: "next to the lake", meaning: "nằm ngay cạnh bờ hồ" },
      { phrase: "nearby park", meaning: "công viên gần đây" },
    ],
  },
  "p2-q10": {
    vocabulary: [
      { word: "meeting minutes", pos: "n", phonetic: "/ˈmiː.tɪŋ ˈmɪn.ɪts/", meaning: "biên bản cuộc họp (luôn ở dạng số nhiều)" },
      { word: "accounting department", pos: "n", phonetic: "/əˈkaʊn.tɪŋ dɪˈpɑːt.mənt/", meaning: "phòng kế toán" },
      { word: "office assistant", pos: "n", phonetic: "/ˈɒf.ɪs əˈsɪs.tənt/", meaning: "trợ lý văn phòng" },
      { word: "savings account", pos: "n", phonetic: "/ˈseɪ.vɪŋz əˌkaʊnt/", meaning: "tài khoản tiền gửi tiết kiệm" },
    ],
    collocations: [
      { phrase: "send meeting minutes to [dept]", meaning: "gửi biên bản cuộc họp tới phòng ban nào" },
      { phrase: "cash and credit cards", meaning: "tiền mặt và thẻ tín dụng (phương thức thanh toán)" },
    ],
  },
  "p2-q11": {
    vocabulary: [
      { word: "finance analyst", pos: "n", phonetic: "/ˈfaɪ.næns ˈæn.ə.lɪst/", meaning: "chuyên viên phân tích tài chính" },
      { word: "competent", pos: "adj", phonetic: "/ˈkɒm.pɪ.tənt/", meaning: "có năng lực, giỏi giang, thạo nghề" },
      { word: "decoration", pos: "n", phonetic: "/ˌdek.əˈreɪ.ʃən/", meaning: "đồ trang trí, phần bài trí" },
    ],
    collocations: [
      { phrase: "what you think of [someone]", meaning: "bạn đánh giá / nhận xét thế nào về ai đó" },
      { phrase: "seem very competent", meaning: "có vẻ rất có năng lực và chuyên môn cao" },
    ],
  },
  "p2-q12": {
    vocabulary: [
      { word: "retreat", pos: "n", phonetic: "/rɪˈtriːt/", meaning: "chuyến nghỉ dưỡng, dã ngoại tập thể công ty" },
      { word: "solve", pos: "v", phonetic: "/sɒlv/", meaning: "giải quyết, tháo gỡ (vấn đề)" },
      { word: "idea", pos: "n", phonetic: "/aɪˈdɪə/", meaning: "ý tưởng, sáng kiến" },
    ],
    collocations: [
      { phrase: "go on a company retreat", meaning: "tham gia chuyến dã ngoại gắn kết của công ty" },
      { phrase: "that's a good idea", meaning: "đó là một ý kiến hay (hưởng ứng đề xuất Let's...)" },
      { phrase: "solve the problem", meaning: "giải quyết vấn đề" },
    ],
  },
  "p2-q13": {
    vocabulary: [
      { word: "pick up", pos: "phr v", phonetic: "/pɪk ʌp/", meaning: "đến nhận (đồ), đón (người)" },
      { word: "glasses", pos: "n", phonetic: "/ˈɡlɑː.sɪz/", meaning: "kính mắt" },
      { word: "close", pos: "v", phonetic: "/kləʊz/", meaning: "đóng cửa" },
    ],
    collocations: [
      { phrase: "pick up my glasses", meaning: "ghé lấy kính mắt của tôi" },
      { phrase: "close at 6:00", meaning: "đóng cửa lúc 6 giờ (câu trả lời gián tiếp cho What time)" },
    ],
  },
  "p2-q14": {
    vocabulary: [
      { word: "tracking software", pos: "n", phonetic: "/ˈtræk.ɪŋ ˈsɒft.weər/", meaning: "phần mềm theo dõi, định vị" },
      { word: "lower shelf", pos: "n", phonetic: "/ˈləʊ.ər ʃelf/", meaning: "ngăn kệ phía dưới" },
      { word: "departure", pos: "n", phonetic: "/dɪˈpɑː.tʃər/", meaning: "chuyến khởi hành, sự rời đi" },
    ],
    collocations: [
      { phrase: "sales team", meaning: "đội ngũ nhân viên kinh doanh" },
      { phrase: "know how to use", meaning: "biết cách vận hành / sử dụng cái gì" },
      { phrase: "haven't seen them using it yet", meaning: "tôi vẫn chưa thấy họ dùng nó bao giờ" },
    ],
  },
  "p2-q15": {
    vocabulary: [
      { word: "hardware store", pos: "n", phonetic: "/ˈhɑːd.weər stɔːr/", meaning: "cửa hàng bán dụng cụ kim khí" },
      { word: "hammer", pos: "n", phonetic: "/ˈhæm.ər/", meaning: "cái búa" },
      { word: "nail", pos: "n", phonetic: "/neɪl/", meaning: "cây đinh" },
    ],
    collocations: [
      { phrase: "hardware store", meaning: "tiệm bán đồ cơ khí sửa chữa" },
      { phrase: "hasn't opened yet", meaning: "vẫn chưa mở cửa / chưa khai trương" },
    ],
  },
  "p2-q16": {
    vocabulary: [
      { word: "introduction", pos: "n", phonetic: "/ˌɪn.trəˈdʌk.ʃən/", meaning: "lời giới thiệu, phần mở đầu" },
      { word: "workshop", pos: "n", phonetic: "/ˈwɜːk.ʃɒp/", meaning: "buổi hội thảo chuyên đề, tập huấn" },
    ],
    collocations: [
      { phrase: "write the introduction", meaning: "soạn thảo lời mở đầu cho buổi hội thảo" },
      { phrase: "be happy to [do sth]", meaning: "rất sẵn lòng và vui vẻ làm điều gì đó" },
    ],
  },
  "p2-q17": {
    vocabulary: [
      { word: "retirement party", pos: "n", phonetic: "/rɪˈtaɪə.mənt ˈpɑː.ti/", meaning: "bữa tiệc mừng nghỉ hưu" },
      { word: "thoughtful", pos: "adj", phonetic: "/ˈθɔːt.fəl/", meaning: "chu đáo, ân cần, tinh tế" },
      { word: "delivery driver", pos: "n", phonetic: "/dɪˈlɪv.ər.i ˈdraɪ.vər/", meaning: "tài xế giao hàng" },
    ],
    collocations: [
      { phrase: "retirement party", meaning: "bữa tiệc chia tay nghỉ hưu" },
      { phrase: "that was thoughtful", meaning: "bạn thật là chu đáo (lời khen ngợi xã giao)" },
    ],
  },
  "p2-q18": {
    vocabulary: [
      { word: "intern", pos: "n", phonetic: "/ˈɪn.tɜːn/", meaning: "thực tập sinh" },
      { word: "conference call", pos: "n", phonetic: "/ˈkɒn.fər.əns kɔːl/", meaning: "cuộc gọi họp hội nghị trực tuyến" },
    ],
    collocations: [
      { phrase: "meeting room", meaning: "phòng họp cơ quan" },
      { phrase: "tell someone to go to", meaning: "bảo ai đi đến địa điểm nào" },
    ],
  },
  "p2-q19": {
    vocabulary: [
      { word: "dental appointment", pos: "n", phonetic: "/ˈden.təl əˌpɔɪnt.mənt/", meaning: "lịch hẹn khám nha sĩ" },
      { word: "reschedule", pos: "v", phonetic: "/ˌriːˈskedʒ.uːl/", meaning: "dời lịch hẹn, xếp lại thời gian" },
    ],
    collocations: [
      { phrase: "dental appointment", meaning: "cuộc hẹn khám răng miệng" },
      { phrase: "next Tuesday", meaning: "thứ Ba tuần sau" },
    ],
  },
  "p2-q20": {
    vocabulary: [
      { word: "brochure", pos: "n", phonetic: "/ˈbrəʊ.ʃər/", meaning: "tập tài liệu quảng cáo gấp, cẩm nang giới thiệu" },
      { word: "professional", pos: "adj", phonetic: "/prəˈfeʃ.ən.əl/", meaning: "chuyên nghiệp, chỉn chu" },
    ],
    collocations: [
      { phrase: "print in color", meaning: "in màu" },
      { phrase: "black and white", meaning: "đen trắng" },
      { phrase: "look professional", meaning: "trông chuyên nghiệp" },
    ],
  },
  "p2-q21": {
    vocabulary: [
      { word: "shipment", pos: "n", phonetic: "/ˈʃɪp.mənt/", meaning: "lô hàng vận chuyển" },
      { word: "customs", pos: "n", phonetic: "/ˈkʌs.təmz/", meaning: "hải quan, cơ quan kiểm soát xuất nhập khẩu" },
      { word: "delay", pos: "n/v", phonetic: "/dɪˈleɪ/", meaning: "sự chậm trễ, trì hoãn" },
    ],
    collocations: [
      { phrase: "delay at customs", meaning: "bị giữ lại hoặc trễ ở khâu hải quan" },
      { phrase: "shipment from [place]", meaning: "lô hàng vận chuyển từ..." },
    ],
  },
  "p2-q22": {
    vocabulary: [
      { word: "contract", pos: "n", phonetic: "/ˈkɒn.trækt/", meaning: "hợp đồng kinh tế" },
      { word: "copy", pos: "n", phonetic: "/ˈkɒp.i/", meaning: "bản sao, bản in chụp" },
    ],
    collocations: [
      { phrase: "copies of the contract", meaning: "các bản sao chụp của hợp đồng" },
      { phrase: "sign a contract", meaning: "ký kết hợp đồng" },
    ],
  },
  "p2-q23": {
    vocabulary: [
      { word: "filing cabinet", pos: "n", phonetic: "/ˈfaɪ.lɪŋ ˈkæb.ɪ.nət/", meaning: "tủ tài liệu văn phòng" },
      { word: "report", pos: "n", phonetic: "/rɪˈpɔːt/", meaning: "bản báo cáo công việc" },
    ],
    collocations: [
      { phrase: "move the filing cabinets", meaning: "di chuyển tủ đựng hồ sơ" },
      { phrase: "as soon as I finish", meaning: "ngay sau khi tôi hoàn thành" },
    ],
  },
  "p2-q24": {
    vocabulary: [
      { word: "client", pos: "n", phonetic: "/ˈklaɪ.ənt/", meaning: "khách hàng, đối tác kinh doanh" },
      { word: "meeting", pos: "n", phonetic: "/ˈmiː.tɪŋ/", meaning: "cuộc gặp mặt, cuộc họp" },
    ],
    collocations: [
      { phrase: "meet the new client", meaning: "gặp gỡ đối tác / khách hàng mới" },
      { phrase: "client from [country]", meaning: "khách hàng đến từ..." },
    ],
  },
  "p2-q25": {
    vocabulary: [
      { word: "conference room", pos: "n", phonetic: "/ˈkɒn.fər.əns ruːm/", meaning: "phòng hội nghị, phòng họp lớn" },
      { word: "desk", pos: "n", phonetic: "/desk/", meaning: "bàn làm việc" },
    ],
    collocations: [
      { phrase: "keys to the conference room", meaning: "chùm chìa khóa phòng họp" },
      { phrase: "leave on the desk", meaning: "để quên / để lại trên bàn làm việc" },
    ],
  },
  "p2-q26": {
    vocabulary: [
      { word: "rush hour", pos: "n", phonetic: "/ˈrʌʃ ˌaʊər/", meaning: "giờ cao điểm kẹt xe" },
      { word: "airport", pos: "n", phonetic: "/ˈeə.pɔːt/", meaning: "sân bay" },
    ],
    collocations: [
      { phrase: "take the train", meaning: "đi bằng tàu hỏa" },
      { phrase: "drive to the airport", meaning: "lái xe ra sân bay" },
      { phrase: "during rush hour", meaning: "trong khung giờ cao điểm" },
    ],
  },
  "p2-q27": {
    vocabulary: [
      { word: "quarterly", pos: "adj/adv", phonetic: "/ˈkwɔː.təl.i/", meaning: "hàng quý, theo từng quý (3 tháng)" },
      { word: "financial results", pos: "n", phonetic: "/faɪˈnæn.ʃəl rɪˈzʌlts/", meaning: "kết quả tài chính, doanh thu báo cáo" },
      { word: "present", pos: "v", phonetic: "/prɪˈzent/", meaning: "thuyết trình, trình bày" },
    ],
    collocations: [
      { phrase: "quarterly financial results", meaning: "báo cáo tài chính theo quý" },
      { phrase: "present the results", meaning: "trình bày kết quả kinh doanh" },
    ],
  },
  "p2-q28": {
    vocabulary: [
      { word: "office supplies", pos: "n", phonetic: "/ˈɒf.ɪs səˈplaɪz/", meaning: "văn phòng phẩm, đồ dùng công sở" },
      { word: "printer toner", pos: "n", phonetic: "/ˈprɪn.tər ˈtəʊ.nər/", meaning: "mực dùng cho máy in laser" },
    ],
    collocations: [
      { phrase: "order office supplies", meaning: "đặt mua văn phòng phẩm" },
      { phrase: "run out of printer toner", meaning: "hết sạch mực máy in" },
    ],
  },
  "p2-q29": {
    vocabulary: [
      { word: "flight", pos: "n", phonetic: "/flaɪt/", meaning: "chuyến bay" },
      { word: "smooth", pos: "adj", phonetic: "/smuːð/", meaning: "êm ả, suôn sẻ, thuận lợi" },
    ],
    collocations: [
      { phrase: "flight to [place]", meaning: "chuyến bay đến thành phố nào" },
      { phrase: "thanks for asking", meaning: "cảm ơn bạn đã hỏi han / quan tâm" },
    ],
  },
  "p2-q30": {
    vocabulary: [
      { word: "client call", pos: "n", phonetic: "/ˈklaɪ.ənt kɔːl/", meaning: "cuộc gọi trao đổi với khách hàng" },
      { word: "starving", pos: "adj", phonetic: "/ˈstɑː.vɪŋ/", meaning: "rất đói, đói cồn cào" },
    ],
    collocations: [
      { phrase: "would rather [do sth]", meaning: "thích / muốn làm việc gì hơn" },
      { phrase: "after the client call", meaning: "sau cuộc gọi thoại với khách hàng" },
    ],
  },
  "p2-q31": {
    vocabulary: [
      { word: "submit / turn in", pos: "v", phonetic: "/səbˈmɪt/", meaning: "nộp, đệ trình (tài liệu/báo cáo)" },
      { word: "expense report", pos: "n", phonetic: "/ɪkˈspens rɪˈpɔːt/", meaning: "bản báo cáo chi phí công tác / hoàn ứng" },
    ],
    collocations: [
      { phrase: "submit an expense report", meaning: "nộp bảng kê khai chi phí chi tiêu" },
      { phrase: "turn it in this morning", meaning: "đã nộp nó vào sáng nay rồi" },
    ],
  },
};

export function getPart2StudyDetails(questionId: string): QuestionStudyData {
  if (PART2_STUDY_DATA[questionId]) {
    return PART2_STUDY_DATA[questionId];
  }
  return {
    vocabulary: [
      { word: "question", pos: "n", phonetic: "/ˈkwes.tʃən/", meaning: "câu hỏi phản xạ giao tiếp" },
      { word: "response", pos: "n", phonetic: "/rɪˈspɒns/", meaning: "câu phản hồi / hồi đáp phù hợp" },
    ],
    collocations: [
      { phrase: "question and response", meaning: "hỏi và đáp tương tác công sở" },
      { phrase: "business context", meaning: "ngữ cảnh thương mại chuyên nghiệp" },
    ],
  };
}

export interface AudioTimestamp {
  start: number;
  end: number;
  label: string;
}

export const PART2_AUDIO_TIMESTAMPS: Record<string, AudioTimestamp> = {
  "p2-q07": { start: 48, end: 66, label: "00:48 - 01:06" },
  "p2-q08": { start: 66, end: 84, label: "01:06 - 01:24" },
  "p2-q09": { start: 84, end: 102, label: "01:24 - 01:42" },
  "p2-q10": { start: 102, end: 120, label: "01:42 - 02:00" },
  "p2-q11": { start: 120, end: 138, label: "02:00 - 02:18" },
  "p2-q12": { start: 138, end: 156, label: "02:18 - 02:36" },
  "p2-q13": { start: 156, end: 174, label: "02:36 - 02:54" },
  "p2-q14": { start: 174, end: 192, label: "02:54 - 03:12" },
  "p2-q15": { start: 192, end: 210, label: "03:12 - 03:30" },
  "p2-q16": { start: 210, end: 228, label: "03:30 - 03:48" },
  "p2-q17": { start: 228, end: 246, label: "03:48 - 04:06" },
  "p2-q18": { start: 246, end: 264, label: "04:06 - 04:24" },
  "p2-q19": { start: 264, end: 282, label: "04:24 - 04:42" },
  "p2-q20": { start: 282, end: 300, label: "04:42 - 05:00" },
  "p2-q21": { start: 300, end: 318, label: "05:00 - 05:18" },
  "p2-q22": { start: 318, end: 336, label: "05:18 - 05:36" },
  "p2-q23": { start: 336, end: 354, label: "05:36 - 05:54" },
  "p2-q24": { start: 354, end: 372, label: "05:54 - 06:12" },
  "p2-q25": { start: 372, end: 390, label: "06:12 - 06:30" },
  "p2-q26": { start: 390, end: 408, label: "06:30 - 06:48" },
  "p2-q27": { start: 408, end: 426, label: "06:48 - 07:06" },
  "p2-q28": { start: 426, end: 444, label: "07:06 - 07:24" },
  "p2-q29": { start: 444, end: 462, label: "07:24 - 07:42" },
  "p2-q30": { start: 462, end: 480, label: "07:42 - 08:00" },
  "p2-q31": { start: 480, end: 508, label: "08:00 - 08:28" },
};

export const getPart2AudioTimestamp = (qId: string, index: number): AudioTimestamp => {
  if (PART2_AUDIO_TIMESTAMPS[qId]) return PART2_AUDIO_TIMESTAMPS[qId];
  const start = 48 + index * 18;
  const end = start + 18;
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
  };
  return { start, end, label: `${formatTime(start)} - ${formatTime(end)}` };
};

