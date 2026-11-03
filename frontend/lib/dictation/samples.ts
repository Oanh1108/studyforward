/** The short practice sets that need no recording: the browser reads them aloud. */
export interface SampleLesson {
  id: string;
  title: string;
  description: string;
  segments: { id: string; text: string; translation: string }[];
}

export const SAMPLE_LESSONS: SampleLesson[] = [
  {
    id: 'sample-meeting',
    title: 'Business Meeting Introduction',
    description: 'Câu mở đầu thường gặp trong một cuộc họp công việc.',
    segments: [
      { id: 's1', text: 'Hello everyone, thank you for joining the meeting today.', translation: 'Xin chào mọi người, cảm ơn vì đã tham gia cuộc họp hôm nay.' },
      { id: 's2', text: 'We have a lot to cover regarding the new project.', translation: 'Chúng ta có rất nhiều điều cần bàn liên quan đến dự án mới.' },
      { id: 's3', text: 'Please make sure to review the document I sent earlier.', translation: 'Vui lòng đảm bảo bạn đã xem tài liệu tôi gửi trước đó.' },
    ],
  },
  {
    id: 'sample-customer-service',
    title: 'Customer Service Call',
    description: 'Hội thoại mẫu khi gọi điện đến bộ phận chăm sóc khách hàng.',
    segments: [
      { id: 's1', text: 'Good morning, this is customer support. How can I help you?', translation: 'Chào buổi sáng, đây là bộ phận hỗ trợ khách hàng. Tôi có thể giúp gì cho bạn?' },
      { id: 's2', text: 'I would like to return an item I purchased last week.', translation: 'Tôi muốn trả lại món hàng tôi đã mua tuần trước.' },
      { id: 's3', text: 'Could you please provide your order number?', translation: 'Bạn có thể vui lòng cung cấp mã đơn hàng không?' },
    ],
  },
];
