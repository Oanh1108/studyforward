import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Vocabulary, CourseType } from '../vocabulary/vocabulary.entity.js';
import { User, UserRole } from '../users/user.entity.js';

const toeicWords = [
  // Business & Finance
  { topic: 'Business & Finance', word: 'revenue', phonetic: '/ˈrevənjuː/', partOfSpeech: 'noun', meaning: 'doanh thu', example: 'The company reported record revenue this quarter.', exampleTranslation: 'Công ty báo cáo doanh thu kỷ lục trong quý này.', frequency: 5 },
  { topic: 'Business & Finance', word: 'invoice', phonetic: '/ˈɪnvɔɪs/', partOfSpeech: 'noun', meaning: 'hóa đơn', example: 'Please send the invoice to the accounting department.', exampleTranslation: 'Vui lòng gửi hóa đơn đến bộ phận kế toán.', frequency: 5 },
  { topic: 'Business & Finance', word: 'budget', phonetic: '/ˈbʌdʒɪt/', partOfSpeech: 'noun', meaning: 'ngân sách', example: 'We need to stay within our budget for this project.', exampleTranslation: 'Chúng ta cần giữ trong ngân sách cho dự án này.', frequency: 5 },
  { topic: 'Business & Finance', word: 'fiscal', phonetic: '/ˈfɪskəl/', partOfSpeech: 'adjective', meaning: 'thuộc tài chính/ngân sách', example: 'The fiscal year ends in December.', exampleTranslation: 'Năm tài chính kết thúc vào tháng 12.', frequency: 4 },
  { topic: 'Business & Finance', word: 'expenditure', phonetic: '/ɪkˈspendɪtʃər/', partOfSpeech: 'noun', meaning: 'chi tiêu, chi phí', example: 'Capital expenditure increased by 20% last year.', exampleTranslation: 'Chi tiêu vốn tăng 20% năm ngoái.', frequency: 4 },
  { topic: 'Business & Finance', word: 'profit', phonetic: '/ˈprɒfɪt/', partOfSpeech: 'noun', meaning: 'lợi nhuận', example: 'The company made a profit of $2 million.', exampleTranslation: 'Công ty đạt lợi nhuận 2 triệu đô.', frequency: 5 },
  { topic: 'Business & Finance', word: 'deficit', phonetic: '/ˈdefɪsɪt/', partOfSpeech: 'noun', meaning: 'thâm hụt', example: 'The budget deficit grew to alarming levels.', exampleTranslation: 'Thâm hụt ngân sách tăng đến mức đáng lo ngại.', frequency: 3 },
  { topic: 'Business & Finance', word: 'dividend', phonetic: '/ˈdɪvɪdend/', partOfSpeech: 'noun', meaning: 'cổ tức', example: 'Shareholders will receive a dividend of $1.50 per share.', exampleTranslation: 'Cổ đông sẽ nhận cổ tức 1,50 đô mỗi cổ phiếu.', frequency: 3 },

  // Marketing
  { topic: 'Marketing', word: 'campaign', phonetic: '/kæmˈpeɪn/', partOfSpeech: 'noun', meaning: 'chiến dịch', example: 'The marketing campaign increased brand awareness significantly.', exampleTranslation: 'Chiến dịch marketing tăng đáng kể nhận thức thương hiệu.', frequency: 5 },
  { topic: 'Marketing', word: 'demographic', phonetic: '/ˌdeməˈɡræfɪk/', partOfSpeech: 'noun', meaning: 'nhân khẩu học', example: 'Our target demographic is adults aged 25-40.', exampleTranslation: 'Nhân khẩu học mục tiêu của chúng tôi là người lớn 25-40 tuổi.', frequency: 4 },
  { topic: 'Marketing', word: 'promotion', phonetic: '/prəˈməʊʃən/', partOfSpeech: 'noun', meaning: 'khuyến mãi / thăng chức', example: 'The summer promotion attracted thousands of new customers.', exampleTranslation: 'Chương trình khuyến mãi hè thu hút hàng nghìn khách hàng mới.', frequency: 5 },
  { topic: 'Marketing', word: 'brand', phonetic: '/brænd/', partOfSpeech: 'noun', meaning: 'thương hiệu', example: 'Building a strong brand takes years of consistent effort.', exampleTranslation: 'Xây dựng thương hiệu mạnh mất nhiều năm nỗ lực nhất quán.', frequency: 5 },
  { topic: 'Marketing', word: 'endorse', phonetic: '/ɪnˈdɔːrs/', partOfSpeech: 'verb', meaning: 'xác nhận, ủng hộ', example: 'The athlete endorsed the new sports drink.', exampleTranslation: 'Vận động viên đó đã ủng hộ loại nước thể thao mới.', frequency: 3 },
  { topic: 'Marketing', word: 'slogan', phonetic: '/ˈsləʊɡən/', partOfSpeech: 'noun', meaning: 'khẩu hiệu', example: 'Their slogan is simple but memorable.', exampleTranslation: 'Khẩu hiệu của họ đơn giản nhưng dễ nhớ.', frequency: 3 },

  // Human Resources
  { topic: 'Human Resources', word: 'recruit', phonetic: '/rɪˈkruːt/', partOfSpeech: 'verb', meaning: 'tuyển dụng', example: 'We are recruiting for several positions in the IT department.', exampleTranslation: 'Chúng tôi đang tuyển dụng cho nhiều vị trí trong bộ phận IT.', frequency: 5 },
  { topic: 'Human Resources', word: 'resume', phonetic: '/ˈrezjuːmeɪ/', partOfSpeech: 'noun', meaning: 'hồ sơ xin việc', example: 'Please submit your resume by Friday.', exampleTranslation: 'Vui lòng nộp hồ sơ trước thứ Sáu.', frequency: 5 },
  { topic: 'Human Resources', word: 'appraisal', phonetic: '/əˈpreɪzəl/', partOfSpeech: 'noun', meaning: 'đánh giá hiệu suất', example: 'Annual appraisals help employees understand their performance.', exampleTranslation: 'Đánh giá hàng năm giúp nhân viên hiểu hiệu suất của mình.', frequency: 4 },
  { topic: 'Human Resources', word: 'resign', phonetic: '/rɪˈzaɪn/', partOfSpeech: 'verb', meaning: 'từ chức', example: 'She decided to resign from her position after 10 years.', exampleTranslation: 'Cô ấy quyết định từ chức sau 10 năm.', frequency: 4 },
  { topic: 'Human Resources', word: 'benefits', phonetic: '/ˈbenɪfɪts/', partOfSpeech: 'noun', meaning: 'phúc lợi', example: 'The job comes with excellent benefits including health insurance.', exampleTranslation: 'Công việc đi kèm phúc lợi xuất sắc bao gồm bảo hiểm y tế.', frequency: 5 },

  // Travel & Transportation
  { topic: 'Travel & Transportation', word: 'itinerary', phonetic: '/aɪˈtɪnəreri/', partOfSpeech: 'noun', meaning: 'lịch trình', example: 'Please review the itinerary before the business trip.', exampleTranslation: 'Vui lòng xem lại lịch trình trước chuyến công tác.', frequency: 4 },
  { topic: 'Travel & Transportation', word: 'terminal', phonetic: '/ˈtɜːmɪnəl/', partOfSpeech: 'noun', meaning: 'nhà ga, bến đỗ', example: 'The international terminal is in a separate building.', exampleTranslation: 'Nhà ga quốc tế nằm trong tòa nhà riêng.', frequency: 4 },
  { topic: 'Travel & Transportation', word: 'depart', phonetic: '/dɪˈpɑːrt/', partOfSpeech: 'verb', meaning: 'khởi hành', example: 'The flight will depart at 9 AM from gate 12.', exampleTranslation: 'Chuyến bay sẽ khởi hành lúc 9 giờ sáng từ cổng 12.', frequency: 5 },
  { topic: 'Travel & Transportation', word: 'baggage', phonetic: '/ˈbæɡɪdʒ/', partOfSpeech: 'noun', meaning: 'hành lý', example: 'Passengers are allowed two pieces of baggage.', exampleTranslation: 'Hành khách được phép mang hai kiện hành lý.', frequency: 4 },

  // Office & Technology
  { topic: 'Office & Technology', word: 'spreadsheet', phonetic: '/ˈspredʃiːt/', partOfSpeech: 'noun', meaning: 'bảng tính', example: 'Update the spreadsheet with the latest sales figures.', exampleTranslation: 'Cập nhật bảng tính với số liệu bán hàng mới nhất.', frequency: 4 },
  { topic: 'Office & Technology', word: 'database', phonetic: '/ˈdeɪtəbeɪs/', partOfSpeech: 'noun', meaning: 'cơ sở dữ liệu', example: 'The customer database needs to be updated regularly.', exampleTranslation: 'Cơ sở dữ liệu khách hàng cần được cập nhật thường xuyên.', frequency: 4 },
  { topic: 'Office & Technology', word: 'correspondence', phonetic: '/ˌkɒrɪˈspɒndəns/', partOfSpeech: 'noun', meaning: 'thư từ, liên lạc', example: 'All official correspondence must be approved by management.', exampleTranslation: 'Tất cả thư từ chính thức phải được quản lý phê duyệt.', frequency: 3 },
  { topic: 'Office & Technology', word: 'agenda', phonetic: '/əˈdʒendə/', partOfSpeech: 'noun', meaning: 'chương trình nghị sự', example: 'The agenda for tomorrow\'s meeting has been sent out.', exampleTranslation: 'Chương trình cho cuộc họp ngày mai đã được gửi đi.', frequency: 4 },
];

const ieltsWords = [
  // Academic
  { topic: 'Academic', word: 'hypothesis', phonetic: '/haɪˈpɒθɪsɪs/', partOfSpeech: 'noun', meaning: 'giả thuyết', example: 'The researchers tested their hypothesis through experiments.', exampleTranslation: 'Các nhà nghiên cứu kiểm tra giả thuyết qua thí nghiệm.', frequency: 5 },
  { topic: 'Academic', word: 'methodology', phonetic: '/ˌmeθəˈdɒlədʒi/', partOfSpeech: 'noun', meaning: 'phương pháp luận', example: 'The methodology used in this study is clearly explained.', exampleTranslation: 'Phương pháp luận trong nghiên cứu này được giải thích rõ ràng.', frequency: 5 },
  { topic: 'Academic', word: 'significant', phonetic: '/sɪɡˈnɪfɪkənt/', partOfSpeech: 'adjective', meaning: 'đáng kể, có ý nghĩa', example: 'There was a significant increase in temperature.', exampleTranslation: 'Có sự tăng đáng kể về nhiệt độ.', frequency: 5 },
  { topic: 'Academic', word: 'phenomenon', phonetic: '/fɪˈnɒmɪnən/', partOfSpeech: 'noun', meaning: 'hiện tượng', example: 'Climate change is a global phenomenon.', exampleTranslation: 'Biến đổi khí hậu là một hiện tượng toàn cầu.', frequency: 5 },
  { topic: 'Academic', word: 'empirical', phonetic: '/ɪmˈpɪrɪkəl/', partOfSpeech: 'adjective', meaning: 'dựa trên thực nghiệm', example: 'The theory is supported by empirical evidence.', exampleTranslation: 'Lý thuyết được hỗ trợ bởi bằng chứng thực nghiệm.', frequency: 4 },

  // Environment
  { topic: 'Environment', word: 'sustainable', phonetic: '/səˈsteɪnəbəl/', partOfSpeech: 'adjective', meaning: 'bền vững', example: 'We need sustainable energy sources for the future.', exampleTranslation: 'Chúng ta cần các nguồn năng lượng bền vững cho tương lai.', frequency: 5 },
  { topic: 'Environment', word: 'emissions', phonetic: '/ɪˈmɪʃənz/', partOfSpeech: 'noun', meaning: 'khí thải', example: 'Carbon emissions must be reduced to combat climate change.', exampleTranslation: 'Khí thải carbon phải được giảm để chống biến đổi khí hậu.', frequency: 5 },
  { topic: 'Environment', word: 'biodiversity', phonetic: '/ˌbaɪəʊdaɪˈvɜːrsəti/', partOfSpeech: 'noun', meaning: 'đa dạng sinh học', example: 'Deforestation threatens biodiversity in tropical regions.', exampleTranslation: 'Nạn phá rừng đe dọa đa dạng sinh học ở vùng nhiệt đới.', frequency: 4 },
  { topic: 'Environment', word: 'renewable', phonetic: '/rɪˈnjuːəbəl/', partOfSpeech: 'adjective', meaning: 'có thể tái tạo', example: 'Solar and wind are renewable energy sources.', exampleTranslation: 'Mặt trời và gió là nguồn năng lượng tái tạo.', frequency: 5 },

  // Society
  { topic: 'Society', word: 'urbanization', phonetic: '/ˌɜːrbənɪˈzeɪʃən/', partOfSpeech: 'noun', meaning: 'đô thị hóa', example: 'Rapid urbanization has led to housing shortages.', exampleTranslation: 'Đô thị hóa nhanh chóng dẫn đến thiếu nhà ở.', frequency: 4 },
  { topic: 'Society', word: 'inequality', phonetic: '/ˌɪnɪˈkwɒləti/', partOfSpeech: 'noun', meaning: 'bất bình đẳng', example: 'Income inequality has widened in recent decades.', exampleTranslation: 'Bất bình đẳng thu nhập đã gia tăng trong những thập kỷ gần đây.', frequency: 5 },
  { topic: 'Society', word: 'consensus', phonetic: '/kənˈsensəs/', partOfSpeech: 'noun', meaning: 'sự đồng thuận', example: 'There is a growing consensus on the need for reform.', exampleTranslation: 'Có sự đồng thuận ngày càng tăng về nhu cầu cải cách.', frequency: 4 },
  { topic: 'Society', word: 'migration', phonetic: '/maɪˈɡreɪʃən/', partOfSpeech: 'noun', meaning: 'di cư', example: 'Migration to cities has increased dramatically.', exampleTranslation: 'Di cư đến các thành phố đã tăng đáng kể.', frequency: 4 },

  // Technology
  { topic: 'Technology', word: 'artificial intelligence', phonetic: '/ˌɑːrtɪfɪʃəl ɪnˈtelɪdʒəns/', partOfSpeech: 'noun', meaning: 'trí tuệ nhân tạo', example: 'Artificial intelligence is transforming many industries.', exampleTranslation: 'Trí tuệ nhân tạo đang biến đổi nhiều ngành công nghiệp.', frequency: 5 },
  { topic: 'Technology', word: 'automation', phonetic: '/ˌɔːtəˈmeɪʃən/', partOfSpeech: 'noun', meaning: 'tự động hóa', example: 'Automation has replaced many manual jobs.', exampleTranslation: 'Tự động hóa đã thay thế nhiều công việc thủ công.', frequency: 5 },
  { topic: 'Technology', word: 'innovation', phonetic: '/ˌɪnəˈveɪʃən/', partOfSpeech: 'noun', meaning: 'đổi mới, sáng tạo', example: 'Technological innovation drives economic growth.', exampleTranslation: 'Đổi mới công nghệ thúc đẩy tăng trưởng kinh tế.', frequency: 5 },
];

export async function seedVocabulary(dataSource: DataSource) {
  const repo = dataSource.getRepository(Vocabulary);
  const count = await repo.count();
  if (count > 0) {
    console.log('Vocabulary already seeded, skipping.');
    return;
  }

  const toeic = toeicWords.map((w) => repo.create({ ...w, course: CourseType.TOEIC }));
  const ielts = ieltsWords.map((w) => repo.create({ ...w, course: CourseType.IELTS }));

  await repo.save([...toeic, ...ielts]);
  console.log(`Seeded ${toeic.length} TOEIC + ${ielts.length} IELTS words.`);
}

export async function seedDefaultAdmin(dataSource: DataSource) {
  const repo = dataSource.getRepository(User);
  const email = 'admin@gmail.com';
  const existing = await repo.findOne({ where: { email } });

  if (existing) {
    if (existing.role !== UserRole.ADMIN) {
      existing.role = UserRole.ADMIN;
      await repo.save(existing);
    }
    console.log('Default admin already exists, skipping creation.');
    return;
  }

  const admin = repo.create({
    name: 'Admin',
    email,
    password: await bcrypt.hash('admin@1008', 10),
    role: UserRole.ADMIN,
  });

  await repo.save(admin);
  console.log('Created default admin account: admin@gmail.com');
}
