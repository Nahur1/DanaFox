export default [
{
  id: 'general-1-library-notice', exam: 'general', level: 1, minutes: 8, title: 'New Library Opening Hours', title_fa: 'ساعات کاری جدید کتابخانه', topic: 'Everyday life',
  paras: [
    'From Monday 3 March, Greenfield Public Library will have new opening hours. The library will open at 9 a.m. from Monday to Friday and close at 8 p.m., two hours later than before. On Saturdays, it will open from 10 a.m. to 4 p.m. The library will stay closed on Sundays.',
    'We are also starting a free homework club for children aged 8 to 12. It will meet every Tuesday and Thursday from 4 to 6 p.m. in the Children\'s Room. Parents do not need to book, but children must bring their library card.',
    'Please remember that books can now be returned at any time using the new book drop next to the main entrance. If you have any questions, ask a member of staff at the information desk or call us on 0123 456 789.'
  ],
  gl: { 'opening hours': 'ساعات کاری', 'homework club': 'کلاس تکلیف', book: 'رزرو کردن', 'book drop': 'صندوق بازگرداندن کتاب', entrance: 'ورودی' },
  qs: [
    { type: 'tfng', q: 'The library will now close at 8 p.m. on weekdays.', a: 'T' },
    { type: 'tfng', q: 'Before March, the library closed at 7 p.m.', a: 'F' },
    { type: 'tfng', q: 'The library is open on Sunday mornings.', a: 'F' },
    { type: 'tfng', q: 'The homework club is free.', a: 'T' },
    { type: 'tfng', q: 'The homework club has a maximum of 20 children.', a: 'NG' },
    { type: 'mcq', q: 'What must children bring to the homework club?', o: ['Money', 'Their library card', 'A parent', 'A booking form'], a: 1 },
    { type: 'gap', q: 'You can return books at any time using the new ______. (TWO WORDS)', a: ['book drop'], w: 2 }
  ]
},
{
  id: 'general-2-job-email', exam: 'general', level: 2, minutes: 10, title: 'An Email from a New Manager', title_fa: 'ایمیلی از یک مدیر جدید', topic: 'Work',
  paras: [
    'Dear team,\nAs many of you know, I joined the company last Monday as the new customer service manager. I have really enjoyed meeting most of you this week, and I\'d like to thank everyone for making me feel so welcome.',
    'Over the next month, I am planning to meet each of you individually for about thirty minutes. I want to hear about your work, what is going well and what could be improved. Please choose a time that suits you using the online calendar; the link is at the bottom of this email. If none of the times are convenient, let me know and we can find another slot.',
    'I would also like to try a small change. From next week, our Monday meeting will start at 9:30 instead of 9:00, so that colleagues who take their children to school have enough time to arrive. The meeting will also be shorter – no more than 30 minutes – and we will share the notes by email afterwards for anyone who cannot attend.',
    'I\'m looking forward to working with all of you.\nBest wishes,\nSara Ahmadi'
  ],
  gl: { individually: 'به‌صورت جداگانه', suits: 'مناسب است', convenient: 'مناسب، راحت', slot: 'بازهٔ زمانی', attend: 'شرکت کردن' },
  qs: [
    { type: 'mcq', q: 'Why did Sara write this email?', o: ['To complain about the team', 'To introduce herself and explain some plans', 'To announce that she is leaving', 'To invite the team to a party'], a: 1 },
    { type: 'mcq', q: 'How long will the individual meetings last?', o: ['About 15 minutes', 'About 30 minutes', 'About an hour', 'All morning'], a: 1 },
    { type: 'mcq', q: 'Why is the Monday meeting moving to 9:30?', o: ['Because Sara arrives late', 'To help parents who take children to school', 'Because the room is busy', 'To make the meeting longer'], a: 1 },
    { type: 'tfng', q: 'Sara has already met every member of the team.', a: 'F' },
    { type: 'tfng', q: 'People who miss the Monday meeting will receive the notes.', a: 'T' },
    { type: 'tfng', q: 'Sara worked in a bank before joining the company.', a: 'NG' },
    { type: 'gap', q: 'Team members should book a meeting using the online ______. (ONE WORD)', a: ['calendar'], w: 1 }
  ]
},
{
  id: 'general-3-digital-detox', exam: 'general', level: 3, minutes: 12, title: 'Is It Time for a Digital Detox?', title_fa: 'آیا وقت سم‌زدایی دیجیتال است؟', topic: 'Lifestyle & health',
  paras: [
    'The average adult now checks their phone dozens of times a day, often without any clear purpose. For some people, this constant connection has begun to feel less like a convenience and more like a burden. As a result, the idea of a "digital detox" – a period of time without smartphones, social media or other devices – has become increasingly popular.',
    'Advocates claim that even a short break can improve sleep, concentration and mood. Some hotels now offer packages in which guests hand in their phones at reception, and summer camps for adults promise a return to conversation and outdoor activity. Research on the subject, however, is mixed. While several studies have found that reducing social-media use can lower feelings of loneliness and anxiety, others suggest that the benefits of a complete break may disappear soon after people reconnect.',
    'Many psychologists therefore recommend changing habits rather than escaping technology altogether. Simple steps include turning off non-essential notifications, keeping phones out of the bedroom and setting specific times for checking messages. The goal, they argue, is not to reject useful tools, but to make sure that we use them deliberately instead of reacting automatically every time a screen lights up.'
  ],
  gl: { detox: 'سم‌زدایی', burden: 'بار، سربار', advocates: 'طرفداران', packages: 'بسته‌ها', reconnect: 'دوباره وصل شدن', 'non-essential': 'غیرضروری', notifications: 'اعلان‌ها', deliberately: 'آگاهانه' },
  qs: [
    { type: 'mcq', q: 'What is the writer\'s main point in the final paragraph?', o: ['People should stop using phones completely.', 'It is better to use technology consciously than to avoid it entirely.', 'Notifications are always useful.', 'Phones should be kept in the bedroom.'], a: 1 },
    { type: 'ynng', q: 'For some people, constant connection has become a burden.', a: 'Y' },
    { type: 'ynng', q: 'All research shows that a digital detox has long-lasting benefits.', a: 'N' },
    { type: 'ynng', q: 'Digital detox hotels are more expensive than ordinary hotels.', a: 'NG' },
    { type: 'multi', k: 2, q: 'Choose TWO simple steps that psychologists recommend.', o: ['Deleting all social-media accounts', 'Keeping phones out of the bedroom', 'Buying a second phone', 'Setting times for checking messages', 'Going to a summer camp'], a: [1, 3] },
    { type: 'gap', q: 'Some hotels ask guests to hand in their phones at ______. (ONE WORD)', a: ['reception'], w: 1 },
    { type: 'gap', q: 'Reducing social-media use may lower feelings of loneliness and ______. (ONE WORD)', a: ['anxiety'], w: 1 }
  ]
},
{
  id: 'general-4-four-day-week', exam: 'general', level: 4, minutes: 14, title: 'The Four-Day Week: Utopia or Experiment?', title_fa: 'هفتهٔ کاری چهارروزه: آرمان‌شهر یا آزمایش؟', topic: 'Economy & society',
  paras: [
    'A century ago, the eight-hour day and the two-day weekend were regarded by many employers as dangerously utopian demands. Today they are taken for granted, and a growing movement argues that the next step should be a four-day working week with no loss of pay. Proponents insist that this is not a call for people to do less, but for organisations to stop confusing hours spent at a desk with value produced.',
    'Large trials conducted in several countries have provided encouraging, if not conclusive, evidence. In a widely reported British pilot involving around sixty companies, most participants chose to keep the shorter week after the trial ended, citing lower staff turnover, fewer sick days and broadly stable revenue. Employees, unsurprisingly, reported less burnout and more time for family and exercise. Sceptics, however, point out that the firms involved volunteered to take part and were therefore likely to be those best suited to the change.',
    'Indeed, the model translates unevenly across sectors. Software developers or marketing teams may be able to eliminate unnecessary meetings and compress their work, but a hospital, a school or a bus company cannot simply close for an extra day; it must hire additional staff, which raises costs. There is also a risk that compressing five days of work into four simply intensifies pressure, replacing one form of exhaustion with another.',
    'Perhaps the most valuable outcome of the debate is that it has forced managers to scrutinise how time is actually used. Even organisations that never adopt a four-day week may benefit from asking which meetings, reports and rituals genuinely contribute to their goals – and which survive merely out of habit.'
  ],
  gl: { utopian: 'آرمان‌گرایانه', 'taken for granted': 'بدیهی فرض شده', proponents: 'طرفداران', conclusive: 'قطعی', turnover: 'جابه‌جایی نیرو', burnout: 'فرسودگی شغلی', sceptics: 'شکاکان', compress: 'فشرده کردن', intensifies: 'تشدید می‌کند', scrutinise: 'موشکافانه بررسی کردن' },
  qs: [
    { type: 'mcq', q: 'Why does the writer mention the eight-hour day in the first paragraph?', o: ['To show that once-radical working reforms can become normal', 'To argue that people worked harder in the past', 'To criticise employers today', 'To explain how wages were calculated'], a: 0 },
    { type: 'mcq', q: 'What is the sceptics\' main criticism of the British pilot?', o: ['It lasted only one week.', 'The companies chose to participate and may not be typical.', 'Employees were paid less.', 'Revenue fell sharply.'], a: 1 },
    { type: 'ynng', q: 'Most companies in the British trial decided to continue with the four-day week.', a: 'Y' },
    { type: 'ynng', q: 'Hospitals can adopt a four-day week without any extra cost.', a: 'N' },
    { type: 'ynng', q: 'The four-day week will be compulsory in Britain within ten years.', a: 'NG' },
    { type: 'match', q: 'Match the idea with the paragraph: the risk that shorter weeks create a new kind of stress', o: ['Paragraph 1', 'Paragraph 2', 'Paragraph 3', 'Paragraph 4'], a: 2 },
    { type: 'match', q: 'Match the idea with the paragraph: a benefit of the debate for all organisations', o: ['Paragraph 1', 'Paragraph 2', 'Paragraph 3', 'Paragraph 4'], a: 3 },
    { type: 'gap', q: 'Employees in the trial reported less ______. (ONE WORD)', a: ['burnout'], w: 1 }
  ]
}
];
