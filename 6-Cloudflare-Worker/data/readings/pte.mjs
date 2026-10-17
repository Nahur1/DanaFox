export default [
{
  id: 'pte-1-microplastics', exam: 'pte', level: 1, minutes: 10, title: 'Microplastics in Our Water', title_fa: 'میکروپلاستیک‌ها در آب ما', topic: 'Environment',
  paras: [
    'Microplastics are pieces of plastic smaller than five millimetres. Some are made deliberately, such as the tiny beads once added to face scrubs, but most come from larger items that slowly break apart in sunlight and seawater. Washing synthetic clothes also releases thousands of plastic fibres, which pass through treatment plants and enter rivers.',
    'Scientists have now found microplastics almost everywhere they have looked, from Arctic ice to bottled drinking water. Their effects on human health are still unclear. However, researchers are concerned because the particles can carry harmful chemicals and are easily swallowed by fish and other animals. Several countries have already banned plastic microbeads in cosmetics, and some washing-machine makers are developing filters to catch fibres before they leave the home.'
  ],
  gl: { deliberately: 'عمداً', scrubs: 'لایه‌بردارها', synthetic: 'مصنوعی', fibres: 'الیاف', particles: 'ذرات', cosmetics: 'لوازم آرایشی' },
  qs: [
    { type: 'mcq', kind: 'Multiple choice, single answer', q: 'According to the text, where do most microplastics come from?', o: ['Face scrubs', 'Larger plastic items that break down', 'Arctic ice', 'Water treatment plants'], a: 1 },
    { type: 'multi', kind: 'Multiple choice, multiple answers', k: 0, q: 'Which of the following are mentioned as responses to the problem? Select all correct answers.', o: ['Bans on microbeads in cosmetics', 'Filters for washing machines', 'A tax on bottled water', 'Cleaning Arctic ice', 'Stopping the production of synthetic clothes'], a: [0, 1] },
    { type: 'order', kind: 'Re-order paragraphs', q: 'The text boxes have been placed in a random order. Restore the original order.', o: ['Over time, sunlight and waves break it into smaller and smaller pieces.', 'A plastic bottle is thrown into the sea.', 'Finally, the tiny fragments are swallowed by fish.', 'Eventually these pieces become microplastics, less than five millimetres long.'], a: [1, 0, 3, 2] },
    { g: 'Reading: Fill in the blanks · Choose the word that best fits each gap.', type: 'bank', kind: 'Fill in the blanks', q: 'The effects of microplastics on human health are still ______.', o: ['unclear', 'banned', 'synthetic', 'deliberate'], a: 0 },
    { type: 'bank', kind: 'Fill in the blanks', q: 'Washing ______ clothes releases plastic fibres.', o: ['cotton', 'synthetic', 'clean', 'heavy'], a: 1 },
    { type: 'bank', kind: 'Fill in the blanks', q: 'Fish can easily ______ the particles.', o: ['swallow', 'filter', 'produce', 'ban'], a: 0 }
  ]
},
{
  id: 'pte-2-remote-work', exam: 'pte', level: 2, minutes: 12, title: 'The Remote Work Revolution', title_fa: 'انقلاب دورکاری', topic: 'Work & society',
  paras: [
    'Before 2020, working from home was a privilege enjoyed by a small minority of employees. The pandemic changed that almost overnight, as offices closed and companies discovered that many tasks could be performed perfectly well from a kitchen table. Several years later, a large proportion of office workers in developed economies continue to spend at least part of the week at home.',
    'Supporters of remote work point to the time and money saved on commuting, as well as greater flexibility for parents and carers. Some studies have also found modest gains in productivity, particularly for tasks that require concentration. Critics, however, argue that remote arrangements weaken the informal contacts through which junior staff learn and through which new ideas often emerge. Managers also report difficulties in building trust within teams whose members rarely meet.',
    'As a result, many organisations have settled on hybrid models, in which employees come to the office on certain days. The challenge now is to make those days worthwhile, using them for collaboration and mentoring rather than for tasks that could be done equally well at home.'
  ],
  gl: { privilege: 'امتیاز ویژه', pandemic: 'همه‌گیری', commuting: 'رفت‌وآمد به محل کار', carers: 'مراقبان', modest: 'اندک', informal: 'غیررسمی', hybrid: 'ترکیبی', mentoring: 'راهنمایی، مربیگری' },
  qs: [
    { type: 'mcq', kind: 'Multiple choice, single answer', q: 'What is the main idea of the passage?', o: ['Remote work has no disadvantages.', 'Remote work expanded rapidly and has benefits and costs, leading many firms to hybrid models.', 'Offices will disappear completely.', 'Productivity always falls at home.'], a: 1 },
    { type: 'multi', kind: 'Multiple choice, multiple answers', k: 0, q: 'According to the passage, which are disadvantages of remote work?', o: ['Less informal learning for junior staff', 'Higher commuting costs', 'Difficulty building trust in teams', 'Less flexibility for parents', 'Fewer opportunities for ideas to emerge informally'], a: [0, 2, 4] },
    { type: 'order', kind: 'Re-order paragraphs', q: 'Restore the original order of the sentences.', o: ['As a result, the company introduced a hybrid schedule.', 'At first, employees enjoyed working from home every day.', 'Now staff meet in the office on Tuesdays and Thursdays for team projects.', 'After a few months, however, managers noticed that new staff were struggling to learn.'], a: [1, 3, 0, 2] },
    { g: 'Reading & Writing: Fill in the blanks · Choose the best option for each gap.', type: 'bank', kind: 'Fill in the blanks', q: 'Remote work saves the time ______ on commuting.', o: ['spent', 'spend', 'spending', 'spends'], a: 0 },
    { type: 'bank', kind: 'Fill in the blanks', q: 'Some studies found modest gains ______ productivity.', o: ['on', 'in', 'at', 'for'], a: 1 },
    { type: 'bank', kind: 'Fill in the blanks', q: 'Office days should be used for collaboration ______ than routine tasks.', o: ['more', 'rather', 'better', 'instead'], a: 1 }
  ]
},
{
  id: 'pte-3-placebo', exam: 'pte', level: 3, minutes: 12, title: 'The Puzzle of the Placebo', title_fa: 'معمای دارونما', topic: 'Medicine',
  paras: [
    'A placebo is a treatment with no active ingredient, such as a sugar pill, that is given to patients in clinical trials so that the effects of a real drug can be measured against it. For decades, the improvement that many patients experience after taking a placebo was regarded as a nuisance – a source of "noise" that researchers needed to subtract. Increasingly, however, scientists are treating the placebo effect as a genuine phenomenon worth studying in its own right.',
    'Brain-imaging studies have shown that, in people who expect pain relief, placebos can trigger the release of the body\'s own pain-relieving chemicals. The effect depends heavily on context: larger pills tend to work better than small ones, injections better than tablets, and expensive "brands" better than cheap ones. Remarkably, some trials have found that placebos can help even when patients are told openly that they are receiving an inactive pill, which challenges the assumption that deception is essential.',
    'The placebo effect has limits. It can reduce symptoms such as pain, nausea and fatigue, but it does not shrink tumours or cure infections. Nevertheless, a better understanding of how expectations shape experience may help doctors communicate in ways that strengthen the benefits of real treatments.'
  ],
  gl: { placebo: 'دارونما', 'active ingredient': 'مادهٔ مؤثره', nuisance: 'مزاحمت', subtract: 'کم کردن', trigger: 'راه انداختن', deception: 'فریب', nausea: 'حالت تهوع', fatigue: 'خستگی', tumours: 'تومورها' },
  qs: [
    { type: 'mcq', kind: 'Multiple choice, single answer', q: 'How has the scientific attitude towards the placebo effect changed?', o: ['It was once studied closely but is now ignored.', 'It was once seen as noise but is now studied as a real effect.', 'It has always been considered harmful.', 'It is now used to cure infections.'], a: 1 },
    { type: 'multi', kind: 'Multiple choice, multiple answers', k: 0, q: 'Which factors are said to make placebos more effective?', o: ['Larger pills', 'Injections rather than tablets', 'Cheaper brands', 'Higher prices', 'Taking them at night'], a: [0, 1, 3] },
    { type: 'mcq', kind: 'Multiple choice, single answer', q: 'What is surprising about "open-label" placebo trials?', o: ['Patients refused to take the pills.', 'Placebos still helped although patients knew they were inactive.', 'The pills contained active ingredients.', 'Doctors could not measure any effect.'], a: 1 },
    { type: 'order', kind: 'Re-order paragraphs', q: 'Restore the original order.', o: ['Half of the volunteers receive the new drug, and half receive a placebo.', 'Researchers want to know whether a new painkiller works.', 'Only if the drug group improves significantly more is the drug considered effective.', 'Neither the volunteers nor the doctors know who has received which pill.'], a: [1, 0, 3, 2] },
    { g: 'Reading: Fill in the blanks', type: 'bank', kind: 'Fill in the blanks', q: 'Placebos can ______ the release of natural pain-relieving chemicals.', o: ['trigger', 'cure', 'subtract', 'shrink'], a: 0 },
    { type: 'bank', kind: 'Fill in the blanks', q: 'The placebo effect does not cure ______.', o: ['nausea', 'pain', 'infections', 'fatigue'], a: 2 }
  ]
},
{
  id: 'pte-4-language-extinction', exam: 'pte', level: 4, minutes: 14, title: 'When Languages Disappear', title_fa: 'وقتی زبان‌ها ناپدید می‌شوند', topic: 'Linguistics',
  paras: [
    'Of the roughly 7,000 languages spoken in the world today, linguists estimate that as many as half may cease to be spoken by the end of this century. Language death is not new – countless languages have vanished throughout history – but its current pace is unprecedented. Most endangered languages have few speakers, many of whom are elderly, and children are no longer acquiring them at home.',
    'The causes are rarely linguistic. Communities shift to dominant languages because those languages offer access to education, employment and political participation; in some cases, earlier generations were actively punished for speaking their ancestral tongue at school. The loss is not merely sentimental. Each language encodes a distinctive way of categorising experience, and many contain detailed knowledge of local plants, animals and ecosystems that has never been written down.',
    'Revitalisation efforts have had mixed results. Hebrew, revived as an everyday spoken language in the late nineteenth and twentieth centuries, is often cited as a success, while Welsh and Māori have regained ground through immersion schooling and broadcasting. Yet such cases depend on sustained institutional support and, above all, on the willingness of parents to speak the language to their children. Digital tools – from recorded dictionaries to social-media groups – can assist, but they cannot substitute for a community of everyday users.'
  ],
  gl: { unprecedented: 'بی‌سابقه', endangered: 'در معرض خطر', ancestral: 'اجدادی', sentimental: 'احساساتی', encodes: 'رمزگذاری می‌کند', revitalisation: 'احیا', immersion: 'غوطه‌وری (آموزش کاملاً به آن زبان)', substitute: 'جایگزین شدن' },
  qs: [
    { type: 'mcq', kind: 'Multiple choice, single answer', q: 'According to the passage, what is the main reason communities abandon their languages?', o: ['The languages are too difficult to learn.', 'Dominant languages provide social and economic opportunities.', 'Linguists encourage them to do so.', 'Digital tools are unavailable.'], a: 1 },
    { type: 'multi', kind: 'Multiple choice, multiple answers', k: 0, q: 'Which of the following does the writer present as necessary for successful revitalisation?', o: ['Long-term institutional support', 'Parents speaking the language to children', 'Social-media groups alone', 'A written literature of at least 1,000 books', 'A community of everyday users'], a: [0, 1, 4] },
    { type: 'mcq', kind: 'Multiple choice, single answer', q: 'Why does the writer say the loss of languages is "not merely sentimental"?', o: ['Because languages contain unique knowledge and ways of seeing the world', 'Because languages are expensive to maintain', 'Because most endangered languages are written', 'Because children prefer dominant languages'], a: 0 },
    { type: 'order', kind: 'Re-order paragraphs', q: 'Restore the original order.', o: ['Their children, however, answered only in the national language.', 'By the third generation, nobody in the family could understand the old songs.', 'A family moved from their village to the capital in search of work.', 'At home, the parents continued to speak their native language.'], a: [2, 3, 0, 1] },
    { g: 'Reading & Writing: Fill in the blanks', type: 'bank', kind: 'Fill in the blanks', q: 'The current pace of language loss is ______.', o: ['unprecedented', 'sentimental', 'ancestral', 'reversible'], a: 0 },
    { type: 'bank', kind: 'Fill in the blanks', q: 'Digital tools cannot ______ for a community of speakers.', o: ['replace', 'substitute', 'exchange', 'support'], a: 1 },
    { type: 'bank', kind: 'Fill in the blanks', q: 'Welsh and Māori have regained ground through ______ schooling.', o: ['immersion', 'private', 'distance', 'evening'], a: 0 }
  ]
}
];
