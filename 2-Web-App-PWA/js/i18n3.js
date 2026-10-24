/* UI strings for v3 features: reading, placement test, smart plan, AI tutor, duels, leaderboard, feedback */
Object.assign(I18N.en, {
 reading:'Reading', duelTitle:'Duels', feedback:'Feedback', feedbackS:'Ideas, bugs, wrong translations — tell us anything.', feedbackShort:'Ideas & bug reports', send:'Send',
 aiTutor:'AI tutor', aiTutorS:'Write a sentence with the word and get instant feedback.', weakWords:'Weak words', placementTest:'Placement test', placementS:'Find your level in about 8 minutes',
 yourLevel:'Your level', vocabSize:'Vocabulary', hard:'Hard', easy:'Easy', details:'Details', edit:'Edit', open:'Open', done:'Done', you:'You', loading:'Loading…', signIn:'Sign in',
 fontSize:'Text size', fontSizeS:'Make all text larger or smaller', exFa:'Persian under examples', exFaS:'Show the Persian translation under every example sentence',
 newPerDay:'New words per day', newPerDayS:'How many new words the smart plan introduces daily', retention:'Target memory', retentionS:'Higher = more frequent reviews (FSRS scheduler)',
 community:'Community', unameTitle:'Username', unameWhy:'Pick a username so friends can find you and invite you to duels.', unameSetBtn:'Choose username',
 unameRules:'3–20 characters: English letters, numbers and _ — must start with a letter.', onbPlacement:'Take placement test',
 err_generic:'Something went wrong. Please try again.', err_bad_username:'Invalid username: 3–20 letters, numbers or _ and it must start with a letter.', err_username_taken:'This username is already taken.',
 err_user_not_found:'User not found.', err_cannot_invite_self:"You can't invite yourself.", err_too_many_invites:'Too many open invitations. Wait for answers first.', err_not_enough_words:'Not enough words for this duel. Choose another category.',
 err_not_found:'Not found.', err_duel_expired:'This duel has expired.', err_duel_declined:'This duel was declined.', err_duel_cancelled:'This duel was cancelled.', err_duel_done:'This duel is already finished.', err_duel_active:'This duel has already started.',
 err_not_started:'The duel has not started yet.', err_network:'No connection to the server.', err_login_required:'Please sign in first.', err_ai_unavailable:'The AI tutor is not available right now.', err_ai_limit:'Daily AI limit reached. Try again tomorrow.', err_too_many_attempts:'Too many requests. Please wait a bit.', err_required:'Please fill in the field.',
 showFa:'Show Persian', planAllDone:'Everything for today is done 🎉', smartSession:'Smart session', noWeak:'No weak words right now 💪',
 tipLeech:'{n} words keep slipping away. Study them separately and write your own example for each.', tipRisk:'{n} words are fading from memory — a short review now saves them.',
 tipPace:'Learning a few new words every day beats long, rare sessions.', tipGood:'Great memory health — keep the daily rhythm.',
 insights:'Memory insights', memStrength:'Memory strength', atRisk:'Fading words', newThisWeek:'New this week', etaTrack:'to finish {c}', leeches:'Hard-to-remember', leechSub:'Words you forgot 4 or more times. Try the AI tutor or write a personal note for each.',
 todayPlan:"Today's plan", todayPlanS:'Built for you from your memory data', planReview:'Review', planReviewS:'{n} cards are due — weakest first', planNoDue:'Nothing due ✓',
 planNew:'New words', planNewS:'{n} new words for today', planNewDone:"Today's new words are done ✓", planWeak:'Fix weak words', planWeakS:'{n} words need a boost',
 planReading:'Reading practice', planReadingDone:'Done today ✓', planDuelS:'Challenge a friend or a random player',
 aiWrite:'Your sentence', aiPh:'Write a sentence using “{w}”…', aiCheck:'Check my sentence', aiExplain:'Explain the word', aiOffline:'Offline mode: basic checks only (AI needs a connection).', aiNeedLogin:'Sign in to use the AI tutor; offline only basic checks are available.',
 lcNoWord:'Your sentence does not contain “{w}”.', lcShort:'Try a longer sentence (at least 5 words).', lcCap:'Start the sentence with a capital letter.', lcPunct:'End the sentence with . ! or ?',
 aiTooShort:'Write at least 3 words.', lcTitle:'Suggestions', lcOk:'Looks good!', aiLocalNote:'Basic offline check — sign in & go online for full AI feedback.', aiThinking:'Thinking…',
 aiGood:'Well done!', aiFix:'Almost — see the correction', aiLeft:'{n} AI checks left today', aiLimit:'Daily AI limit reached. Try again tomorrow.',
 readingTitle:'Reading practice', readingSub:'Real exam formats: IELTS, TOEFL, GRE, PTE and General English — tap any word for its meaning.', rdDone:'done', avgScore:'Average', rdSuggested:'Suggested for you', rdEmpty:'No passages here yet.',
 rdAbout_ielts:'IELTS Academic Reading: True/False/Not Given, headings, matching, sentence and summary completion.', rdAbout_toefl:'TOEFL iBT Reading: factual, vocabulary, inference, insert-text and summary questions.',
 rdAbout_gre:'GRE Verbal: reading comprehension, select-in-passage and text completion.', rdAbout_pte:'PTE Academic Reading: multiple choice (single & multiple), re-order paragraphs and fill in the blanks.', rdAbout_general:'Everyday texts: notices, emails and articles for general English.',
 rdBand:'Band', minShort:'min', questions:'questions', paragraphs:'paragraphs', maxWords:'max {n} words', ordYours:'Your order', ordHint:'Tap the boxes below in the correct order.', ordLeft:'Tap to add', insertHint:'You can also tap a ■ in the passage.',
 chooseN:'choose {n}', yourAnswer:'Your answer', rdResult:'Your result', rdSaveWords:'Save new words', translation:'Translation', passage:'Passage', tapWordHint:'Tap a word for its meaning, or select a phrase to translate it.',
 hideTr:'Hide translation', showTr:'Persian translation', glossary:'Key words', goQuestions:'Go to questions', answeredN:'{a} of {b} answered', rdSubmit:'Check answers', rdUnanswered:'{n} questions are unanswered. Check anyway?',
 translating:'Translating…', saveToMyWords:'Save to My Words', trOffline:'No translation (offline).', translateSel:'Translate selection',
 rh_tfng:'TRUE = the passage says this · FALSE = the passage says the opposite · NOT GIVEN = the passage does not say.', rh_ynng:"YES = matches the writer's view · NO = contradicts it · NOT GIVEN = the writer does not say.", rh_head:'Choose the heading that best summarises each paragraph.', rh_match:'Find the paragraph that contains this information.', rh_gap:'Use words from the passage and respect the word limit.', rh_bank:'Choose words from the box.', rh_insert:'Where would the sentence fit best?', rh_order:'Put the paragraphs in the original order.', rh_select:'Choose the sentence from the passage.', rh_tc:'Choose a word for every blank.', rh_multi:'More than one answer is correct.',
 plQuitQ:'Quit the test? Your answers will be lost.', plResult:'Placement result', plParts:'Your scores', plPartV:'Word meanings', plPartYN:'Word recognition', plPartR:'Reading',
 plPartVS:'{n} adaptive questions — they get harder or easier based on your answers', plPartYNS:'{n} words: do you know them? (some are not real words!)', plPartRS:'A short text with {n} questions',
 plFakeWarn:'You said yes to some made-up words, so your recognition score was reduced.', plNext:'Road to {c}', plTop:'You are at the top level. Keep reading and reviewing to stay there!', plNeed:'About {n} more words to reach {c}. Estimated time:',
 weeks:'weeks', perDay:'per day', plRec:'Recommended start', plRecS:'Your smart plan now starts new words from these levels.', plSkipEasy:'Mark easier decks as known', plSkipEasyQ:'Mark {n} easier words as known? They will come back for review in 2 months.',
 plRetake:'Retake test', plHistory:'Previous results', plIntro:'Three short parts measure your vocabulary and reading. Answer honestly — guessing makes your plan worse.', plTime:'About 8 minutes · works offline',
 plLast:'Last result', plBegin:'Start test', dontKnow:"I don't know", plYNQ:'Do you know this word?', plYNHint:'Some words are made up. Say “yes” only if you know the meaning.', plKnow:'Yes, I know it', plDontKnow:"No / not sure", plReadText:'Read the text', plPart:'Part', plSkipPart:'Skip this part',
 plSub_low:'low', plSub_mid:'mid', plSub_high:'high',
 cefr_A1:'Beginner', cefr_A2:'Elementary', cefr_B1:'Intermediate', cefr_B2:'Upper-intermediate', cefr_C1:'Advanced', cefr_C2:'Proficient',
 cefrD_A1:'You know basic everyday words. Start with the General · Basic deck.', cefrD_A2:'You understand simple, familiar texts. Build everyday vocabulary to reach B1.',
 cefrD_B1:'You can handle most everyday topics. Academic words for IELTS/TOEFL are your next step.', cefrD_B2:'You read most texts with good understanding. Advanced academic vocabulary will lift you to C1.',
 cefrD_C1:'You understand demanding texts. Focus on precise, low-frequency words and collocations.', cefrD_C2:'Near-native vocabulary. Keep it sharp with GRE-level reading.',
 allWords:'All words', duelSub:'Same questions, same time — the faster correct answer wins more points.', duelNeedLogin:'Sign in to play duels against friends and other learners. You can still practise against the bot.', duelOffline:'Duels need a connection to the server. You can practise against the bot offline.', duelBot:'Practice vs bot',
 rating:'Rating', wShort:'W', lShort:'L', dShort:'D', duelInvites:'Invitations', accept:'Accept', decline:'Decline', cancel:'Cancel', quickMatch:'Quick match', quickMatchS:'Play against a learner with a similar rating.', duelWords:'Words',
 findOpponent:'Find opponent', inviteFriend:'Invite a friend', inviteFriendS:'Search by username or account number. They get a Telegram notification if connected.', invite:'Invite', noResults:'No users found.', duelOpen:'Open duels',
 dst_waiting:'Searching', dst_invited:'Invited', dst_active:'Playing', dst_expired:'Expired', dst_declined:'Declined', dst_cancelled:'Cancelled', dst_done:'Finished',
 duelHistory:'Recent duels', res_win:'You won!', res_loss:'You lost', res_draw:'Draw', duelNoHistory:'No duels yet — start one!', leaderboard:'Leaderboard', leaderboardS:'Top learners this week, of all time and in duels.', seeLeaderboard:'Open leaderboard',
 inviteSent:'Invitation sent', duelGone:'This duel was not found.', searching:'Looking for an opponent…', searchingS:'Usually takes a few seconds', invitedYou:'{n} invited you to a duel', waitingAccept:'Waiting for {n} to accept…', waitingAcceptS:'The invitation is valid for 24 hours. You can leave this page.',
 getReady:'Get ready!', waitOpponent:'Waiting for your opponent…', opProgress:'Opponent: {a} of {b}', leave:'Leave duel', opponent:'Opponent', rematch:'Rematch', duelReview:'Questions', forfeitQ:'Leave the duel? It counts as a loss.', botName:'VajeBot',
 lbWeek:'This week', lbAll:'All time', lbDuel:'Duels', lbOffline:'The leaderboard needs a connection to the server.', lbEmpty:'No one here yet — be the first!', lbS_week:'XP earned in the last 7 days.', lbS_xp:'Total XP.', lbS_duel:'Duel rating (Elo).',
 fbSentQueued:'Your saved feedback was sent', fb_idea:'Idea', fb_bug:'Bug', fb_content:'Content', fb_praise:'Praise', fb_other:'Other',
 fbPh_idea:'What would make DanaFox better for you?', fbPh_bug:'What happened, and what did you expect? (device, page…)', fbPh_content:'Wrong translation or example? Tell us the word and the fix.', fbPh_praise:'What do you like most?', fbPh_other:'Your message…',
 fbContact:'Email or Telegram ID (optional, for a reply)', fbMine:'My messages', fbQueued:'Saved — it will be sent when you are online', fbThanks:'Thank you! Your message was sent.',
 fbst_new:'Received', fbst_seen:'Seen', fbst_planned:'Planned', fbst_done:'Done', fbst_rejected:'Not planned', fbReply:'Reply', fbNone:'No messages yet.'
});
Object.assign(I18N.fa, {
 reading:'ریدینگ', duelTitle:'دوئل', feedback:'بازخورد', feedbackS:'ایده، مشکل، ترجمهٔ اشتباه — هر چیزی را با ما در میان بگذارید.', feedbackShort:'ایده‌ها و گزارش مشکل', send:'ارسال',
 aiTutor:'مربی هوشمند', aiTutorS:'با لغت یک جمله بنویسید و فوراً بازخورد بگیرید.', weakWords:'لغات ضعیف', placementTest:'آزمون تعیین سطح', placementS:'در حدود ۸ دقیقه سطحتان را پیدا کنید',
 yourLevel:'سطح شما', vocabSize:'دایرهٔ لغات', hard:'سخت بود', easy:'آسان', details:'جزئیات', edit:'ویرایش', open:'باز کردن', done:'انجام شد', you:'شما', loading:'در حال بارگذاری…', signIn:'ورود',
 fontSize:'اندازهٔ متن', fontSizeS:'همهٔ متن‌ها را بزرگ‌تر یا کوچک‌تر کنید', exFa:'ترجمهٔ فارسی زیر مثال‌ها', exFaS:'ترجمهٔ فارسی زیر همهٔ جمله‌های مثال نمایش داده شود',
 newPerDay:'لغت جدید در روز', newPerDayS:'برنامهٔ هوشمند هر روز چند لغت جدید معرفی کند', retention:'هدف حافظه', retentionS:'بیشتر = مرورهای بیشتر (زمان‌بندی FSRS)',
 community:'جامعه', unameTitle:'نام کاربری', unameWhy:'یک نام کاربری انتخاب کنید تا دوستانتان بتوانند شما را پیدا کنند و به دوئل دعوت کنند.', unameSetBtn:'انتخاب نام کاربری',
 unameRules:'۳ تا ۲۰ کاراکتر: حروف انگلیسی، عدد و _ — باید با حرف شروع شود.', onbPlacement:'آزمون تعیین سطح',
 err_generic:'مشکلی پیش آمد. دوباره امتحان کنید.', err_bad_username:'نام کاربری نامعتبر است: ۳ تا ۲۰ حرف انگلیسی، عدد یا _ و با حرف شروع شود.', err_username_taken:'این نام کاربری قبلاً گرفته شده است.',
 err_user_not_found:'کاربر پیدا نشد.', err_cannot_invite_self:'نمی‌توانید خودتان را دعوت کنید.', err_too_many_invites:'دعوت‌های باز زیادی دارید؛ کمی صبر کنید.', err_not_enough_words:'لغت کافی برای این دوئل نیست؛ دستهٔ دیگری انتخاب کنید.',
 err_not_found:'پیدا نشد.', err_duel_expired:'مهلت این دوئل تمام شده است.', err_duel_declined:'این دوئل رد شد.', err_duel_cancelled:'این دوئل لغو شد.', err_duel_done:'این دوئل تمام شده است.', err_duel_active:'این دوئل شروع شده است.',
 err_not_started:'دوئل هنوز شروع نشده است.', err_network:'ارتباط با سرور برقرار نشد.', err_login_required:'ابتدا وارد شوید.', err_ai_unavailable:'مربی هوشمند فعلاً در دسترس نیست.', err_ai_limit:'سهمیهٔ امروز مربی هوشمند تمام شد؛ فردا دوباره امتحان کنید.', err_too_many_attempts:'درخواست‌ها زیاد است؛ کمی صبر کنید.', err_required:'لطفاً فیلد را پر کنید.',
 showFa:'نمایش فارسی', planAllDone:'همهٔ کارهای امروز انجام شد 🎉', smartSession:'جلسهٔ هوشمند', noWeak:'فعلاً لغت ضعیفی ندارید 💪',
 tipLeech:'{n} لغت مدام فراموش می‌شوند. جداگانه مرورشان کنید و برای هرکدام یک مثال شخصی بنویسید.', tipRisk:'{n} لغت در حال فراموش شدن هستند — یک مرور کوتاه همین حالا نجاتشان می‌دهد.',
 tipPace:'یادگیری چند لغت در هر روز، از جلسه‌های طولانی و پراکنده بهتر است.', tipGood:'سلامت حافظه‌تان عالی است — همین ریتم روزانه را ادامه دهید.',
 insights:'تحلیل حافظه', memStrength:'قدرت حافظه', atRisk:'در حال فراموشی', newThisWeek:'جدید این هفته', etaTrack:'تا پایان {c}', leeches:'لغات سرسخت', leechSub:'لغاتی که ۴ بار یا بیشتر فراموش شده‌اند. از مربی هوشمند کمک بگیرید یا برای هرکدام یادداشت بنویسید.',
 todayPlan:'برنامهٔ امروز', todayPlanS:'بر اساس داده‌های حافظهٔ شما ساخته شده', planReview:'مرور', planReviewS:'{n} کارت آمادهٔ مرور — ضعیف‌ترها اول', planNoDue:'مروری باقی نمانده ✓',
 planNew:'لغات جدید', planNewS:'{n} لغت جدید برای امروز', planNewDone:'لغات جدید امروز تمام شد ✓', planWeak:'تقویت لغات ضعیف', planWeakS:'{n} لغت نیاز به تقویت دارند',
 planReading:'تمرین ریدینگ', planReadingDone:'امروز انجام شد ✓', planDuelS:'با یک دوست یا بازیکن تصادفی مسابقه بدهید',
 aiWrite:'جملهٔ شما', aiPh:'یک جمله با «{w}» بنویسید…', aiCheck:'بررسی جمله', aiExplain:'توضیح لغت', aiOffline:'حالت آفلاین: فقط بررسی ساده (هوش مصنوعی به اینترنت نیاز دارد).', aiNeedLogin:'برای استفاده از مربی هوشمند وارد شوید؛ بدون ورود فقط بررسی ساده در دسترس است.',
 lcNoWord:'جملهٔ شما شامل «{w}» نیست.', lcShort:'جملهٔ بلندتری بنویسید (حداقل ۵ کلمه).', lcCap:'جمله را با حرف بزرگ شروع کنید.', lcPunct:'جمله را با . یا ! یا ? تمام کنید.',
 aiTooShort:'حداقل ۳ کلمه بنویسید.', lcTitle:'پیشنهادها', lcOk:'به نظر خوب است!', aiLocalNote:'بررسی سادهٔ آفلاین — برای بازخورد کامل هوش مصنوعی وارد شوید و آنلاین باشید.', aiThinking:'در حال بررسی…',
 aiGood:'آفرین!', aiFix:'تقریباً درست — اصلاح را ببینید', aiLeft:'{n} بررسی هوشمند دیگر برای امروز', aiLimit:'سهمیهٔ امروز مربی هوشمند تمام شد؛ فردا دوباره امتحان کنید.',
 readingTitle:'تمرین ریدینگ', readingSub:'قالب واقعی آزمون‌ها: آیلتس، تافل، GRE، PTE و انگلیسی عمومی — روی هر کلمه بزنید تا معنی‌اش را ببینید.', rdDone:'انجام‌شده', avgScore:'میانگین', rdSuggested:'پیشنهاد برای شما', rdEmpty:'هنوز متنی اینجا نیست.',
 rdAbout_ielts:'ریدینگ آیلتس آکادمیک: True/False/Not Given، انتخاب عنوان، تطبیق، تکمیل جمله و خلاصه.', rdAbout_toefl:'ریدینگ تافل iBT: سؤال‌های جزئیات، واژگان، استنباط، جای‌گذاری جمله و خلاصه.',
 rdAbout_gre:'بخش Verbal آزمون GRE: درک مطلب، انتخاب جمله از متن و تکمیل متن.', rdAbout_pte:'ریدینگ PTE آکادمیک: چندگزینه‌ای (تک و چندجوابی)، مرتب‌سازی پاراگراف‌ها و پر کردن جای خالی.', rdAbout_general:'متن‌های روزمره: اطلاعیه، ایمیل و مقاله برای انگلیسی عمومی.',
 rdBand:'نمره (Band)', minShort:'دقیقه', questions:'سؤال', paragraphs:'پاراگراف', maxWords:'حداکثر {n} کلمه', ordYours:'ترتیب شما', ordHint:'گزینه‌های پایین را به ترتیب درست لمس کنید.', ordLeft:'برای افزودن لمس کنید', insertHint:'می‌توانید روی ■ داخل متن هم بزنید.',
 chooseN:'{n} گزینه', yourAnswer:'پاسخ شما', rdResult:'نتیجهٔ شما', rdSaveWords:'ذخیرهٔ لغات جدید', translation:'ترجمه', passage:'متن', tapWordHint:'روی هر کلمه بزنید تا معنی‌اش را ببینید، یا یک عبارت را انتخاب کنید تا ترجمه شود.',
 hideTr:'پنهان کردن ترجمه', showTr:'ترجمهٔ فارسی', glossary:'لغات کلیدی', goQuestions:'رفتن به سؤال‌ها', answeredN:'{a} از {b} پاسخ داده شده', rdSubmit:'بررسی پاسخ‌ها', rdUnanswered:'{n} سؤال بی‌پاسخ مانده. با این حال بررسی شود؟',
 translating:'در حال ترجمه…', saveToMyWords:'ذخیره در لغات من', trOffline:'ترجمه در دسترس نیست (آفلاین).', translateSel:'ترجمهٔ متن انتخاب‌شده',
 rh_tfng:'TRUE = متن همین را می‌گوید · FALSE = متن عکسش را می‌گوید · NOT GIVEN = متن چیزی در این باره نمی‌گوید.', rh_ynng:'YES = با نظر نویسنده موافق است · NO = مخالف نظر نویسنده است · NOT GIVEN = نویسنده نظری نداده.', rh_head:'عنوانی را انتخاب کنید که بهترین خلاصهٔ هر پاراگراف باشد.', rh_match:'پاراگرافی را پیدا کنید که این اطلاعات را دارد.', rh_gap:'از کلمات خود متن استفاده کنید و محدودیت تعداد کلمه را رعایت کنید.', rh_bank:'کلمه‌ها را از فهرست انتخاب کنید.', rh_insert:'جمله در کدام جای متن بهتر می‌نشیند؟', rh_order:'پاراگراف‌ها را به ترتیب اصلی بچینید.', rh_select:'جمله را از داخل متن انتخاب کنید.', rh_tc:'برای هر جای خالی یک کلمه انتخاب کنید.', rh_multi:'بیش از یک پاسخ درست است.',
 plQuitQ:'از آزمون خارج می‌شوید؟ پاسخ‌ها از بین می‌روند.', plResult:'نتیجهٔ تعیین سطح', plParts:'نمره‌های شما', plPartV:'معنی لغات', plPartYN:'شناخت لغات', plPartR:'درک مطلب',
 plPartVS:'{n} سؤال تطبیقی — بر اساس پاسخ‌هایتان سخت‌تر یا آسان‌تر می‌شوند', plPartYNS:'{n} کلمه: آن‌ها را می‌شناسید؟ (بعضی‌ها کلمهٔ واقعی نیستند!)', plPartRS:'یک متن کوتاه با {n} سؤال',
 plFakeWarn:'به چند کلمهٔ ساختگی «بله» گفتید، برای همین نمرهٔ شناخت لغات کم شد.', plNext:'مسیر رسیدن به {c}', plTop:'در بالاترین سطح هستید. با ریدینگ و مرور، سطحتان را حفظ کنید!', plNeed:'حدود {n} لغت دیگر تا {c}. زمان تقریبی:',
 weeks:'هفته', perDay:'در روز', plRec:'نقطهٔ شروع پیشنهادی', plRecS:'برنامهٔ هوشمند از این به بعد لغات جدید را از این سطح‌ها شروع می‌کند.', plSkipEasy:'علامت‌گذاری سطح‌های آسان‌تر به‌عنوان بلدم', plSkipEasyQ:'{n} لغت آسان‌تر به‌عنوان «بلدم» علامت بخورد؟ دو ماه بعد برای مرور برمی‌گردند.',
 plRetake:'آزمون دوباره', plHistory:'نتیجه‌های قبلی', plIntro:'سه بخش کوتاه دایرهٔ لغات و درک مطلب شما را می‌سنجد. صادقانه جواب دهید — حدس زدن برنامه‌تان را بدتر می‌کند.', plTime:'حدود ۸ دقیقه · آفلاین هم کار می‌کند',
 plLast:'آخرین نتیجه', plBegin:'شروع آزمون', dontKnow:'نمی‌دانم', plYNQ:'این کلمه را می‌شناسید؟', plYNHint:'بعضی کلمه‌ها ساختگی‌اند. فقط وقتی «بله» بزنید که معنی را بدانید.', plKnow:'بله، می‌دانم', plDontKnow:'نه / مطمئن نیستم', plReadText:'متن را بخوانید', plPart:'بخش', plSkipPart:'رد کردن این بخش',
 plSub_low:'ابتدای سطح', plSub_mid:'میانهٔ سطح', plSub_high:'انتهای سطح',
 cefr_A1:'مبتدی', cefr_A2:'مقدماتی', cefr_B1:'متوسط', cefr_B2:'فوق‌متوسط', cefr_C1:'پیشرفته', cefr_C2:'تسلط کامل',
 cefrD_A1:'لغات پایهٔ روزمره را می‌شناسید. از بستهٔ «عمومی · پایه» شروع کنید.', cefrD_A2:'متن‌های ساده و آشنا را می‌فهمید. با لغات روزمره به سطح B1 برسید.',
 cefrD_B1:'از پس بیشتر موضوعات روزمره برمی‌آیید. قدم بعدی لغات آکادمیک آیلتس/تافل است.', cefrD_B2:'بیشتر متن‌ها را به‌خوبی می‌فهمید. لغات آکادمیک پیشرفته شما را به C1 می‌رساند.',
 cefrD_C1:'متن‌های دشوار را درک می‌کنید. روی لغات دقیق، کم‌کاربرد و هم‌آیندها تمرکز کنید.', cefrD_C2:'دایرهٔ لغاتی نزدیک به زبان مادری. با ریدینگ سطح GRE آن را تیز نگه دارید.',
 allWords:'همهٔ لغات', duelSub:'سؤال‌های یکسان در زمان یکسان — پاسخ درستِ سریع‌تر امتیاز بیشتری می‌گیرد.', duelNeedLogin:'برای دوئل با دوستان و دیگر زبان‌آموزان وارد شوید. تمرین با ربات بدون ورود هم ممکن است.', duelOffline:'دوئل به اتصال سرور نیاز دارد. به‌صورت آفلاین می‌توانید با ربات تمرین کنید.', duelBot:'تمرین با ربات',
 rating:'امتیاز', wShort:'برد', lShort:'باخت', dShort:'مساوی', duelInvites:'دعوت‌ها', accept:'قبول', decline:'رد', cancel:'لغو', quickMatch:'مسابقهٔ سریع', quickMatchS:'با زبان‌آموزی با امتیاز نزدیک به شما بازی کنید.', duelWords:'لغات',
 findOpponent:'پیدا کردن حریف', inviteFriend:'دعوت از دوست', inviteFriendS:'با نام کاربری یا شمارهٔ حساب جست‌وجو کنید. اگر تلگرامش متصل باشد، اعلان می‌گیرد.', invite:'دعوت', noResults:'کاربری پیدا نشد.', duelOpen:'دوئل‌های باز',
 dst_waiting:'در جست‌وجو', dst_invited:'دعوت‌شده', dst_active:'در حال بازی', dst_expired:'منقضی شد', dst_declined:'رد شد', dst_cancelled:'لغو شد', dst_done:'تمام‌شده',
 duelHistory:'دوئل‌های اخیر', res_win:'بردید!', res_loss:'باختید', res_draw:'مساوی', duelNoHistory:'هنوز دوئلی نداشته‌اید — یکی شروع کنید!', leaderboard:'جدول برترین‌ها', leaderboardS:'برترین‌های این هفته، همهٔ زمان‌ها و دوئل.', seeLeaderboard:'دیدن جدول',
 inviteSent:'دعوت ارسال شد', duelGone:'این دوئل پیدا نشد.', searching:'در جست‌وجوی حریف…', searchingS:'معمولاً چند ثانیه طول می‌کشد', invitedYou:'{n} شما را به دوئل دعوت کرد', waitingAccept:'منتظر قبول {n}…', waitingAcceptS:'دعوت تا ۲۴ ساعت معتبر است. می‌توانید از این صفحه خارج شوید.',
 getReady:'آماده باشید!', waitOpponent:'منتظر حریف…', opProgress:'حریف: {a} از {b}', leave:'ترک دوئل', opponent:'حریف', rematch:'بازی دوباره', duelReview:'سؤال‌ها', forfeitQ:'دوئل را ترک می‌کنید؟ باخت حساب می‌شود.', botName:'واژه‌بات',
 lbWeek:'این هفته', lbAll:'همهٔ زمان‌ها', lbDuel:'دوئل', lbOffline:'جدول برترین‌ها به اتصال سرور نیاز دارد.', lbEmpty:'هنوز کسی اینجا نیست — اولین نفر باشید!', lbS_week:'امتیاز (XP) هفت روز اخیر.', lbS_xp:'مجموع امتیاز (XP).', lbS_duel:'ریتینگ دوئل (Elo).',
 fbSentQueued:'بازخوردهای ذخیره‌شدهٔ شما ارسال شد', fb_idea:'ایده', fb_bug:'مشکل', fb_content:'محتوا', fb_praise:'تشکر', fb_other:'سایر',
 fbPh_idea:'چه چیزی دانافاکس را برای شما بهتر می‌کند؟', fbPh_bug:'چه اتفاقی افتاد و انتظار چه چیزی داشتید؟ (دستگاه، صفحه…)', fbPh_content:'ترجمه یا مثال اشتباه؟ لغت و اصلاحش را بنویسید.', fbPh_praise:'چه چیزی را بیشتر دوست دارید؟', fbPh_other:'پیام شما…',
 fbContact:'ایمیل یا آیدی تلگرام (اختیاری، برای پاسخ)', fbMine:'پیام‌های من', fbQueued:'ذخیره شد — وقتی آنلاین شوید ارسال می‌شود', fbThanks:'ممنون! پیام شما ارسال شد.',
 fbst_new:'دریافت شد', fbst_seen:'دیده شد', fbst_planned:'در برنامه', fbst_done:'انجام شد', fbst_rejected:'در برنامه نیست', fbReply:'پاسخ', fbNone:'هنوز پیامی ندارید.'
});
/* v3.1 — sections: Reading (texts · AWL · Cambridge 9–20 …) and Listening (1200 IELTS Listening words …) */
Object.assign(I18N.en, {
 listening:'Listening', listeningTitle:'Listening', listeningSub:'Vocabulary for the Listening test — each file is its own section, split into categories.',
 rdTexts:'Reading passages', rdTextsS:'passages with questions',
 secN:'categories', secCats:'Categories', secCatsS:'Pick a category to study its words',
 deckSource:'Source'
});
Object.assign(I18N.fa, {
 listening:'لیسنینگ', listeningTitle:'لیسنینگ', listeningSub:'لغات آزمون لیسنینگ — هر مجموعه بخش جداگانهٔ خودش را دارد و به دسته‌های کوچک‌تر تقسیم شده است.',
 rdTexts:'متن‌های ریدینگ', rdTextsS:'متن همراه با سؤال',
 secN:'دسته', secCats:'دسته‌بندی‌ها', secCatsS:'یک دسته را انتخاب کنید و لغاتش را یاد بگیرید',
 deckSource:'منبع'
});
/* v3.2 — Inside Reading Intro / 1 / 2 */
Object.assign(I18N.en, {
 irLoadErr:'Could not load the book. Check your connection and try again.', irUnits:'Units', irUnitsS:'Each unit: 2 readings · exercises with answer key · target words', irReadings:'Readings', irSkill:'Skill', irReadingN:'Reading {n}', irExercises:'Exercises', irUnit:'Unit', irTargetWords:'target words', irWords:'Vocabulary',
 irHowTitle:'How to study a unit', irHow:'1) Study the unit’s target words (Vocabulary tab). 2) Read Reading 1 and answer the True/False questions — target words are highlighted. 3) Do Reading 2 the same way. 4) Do the exercises in your notebook and check them with the answer key.',
 irExHint:'Write your answers, then check them with the key.', irShowAll:'Show all answers', irHideAll:'Hide all answers', irShowKey:'Show answer', irHideKey:'Hide answer', irPage:'Book p.', irTwHint:'target words are underlined',
 irK_byr:'Before you read', irK_skill:'Reading skill', irK_review:'Review a skill', irK_voc:'Vocabulary activities', irK_rcx:'Reading comprehension', irK_wd:'Writing & discussion', irK_sar:'Self-assessment',
 rh_tf:'TRUE = the passage says this · FALSE = the passage does not agree with it.'
});
Object.assign(I18N.fa, {
 irLoadErr:'بارگیری کتاب ممکن نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.', irUnits:'یونیت‌ها', irUnitsS:'هر یونیت: ۲ متن · تمرین‌ها با پاسخ‌نامه · لغات هدف', irReadings:'متن‌ها', irSkill:'مهارت', irReadingN:'متن {n}', irExercises:'تمرین‌ها', irUnit:'یونیت', irTargetWords:'لغت هدف', irWords:'لغات',
 irHowTitle:'روش مطالعهٔ هر یونیت', irHow:'۱) اول لغات هدف یونیت را یاد بگیرید (زبانهٔ لغات). ۲) متن ۱ را بخوانید و به سؤال‌های درست/نادرست جواب دهید — لغات هدف در متن مشخص شده‌اند. ۳) متن ۲ را هم همین‌طور. ۴) تمرین‌ها را در دفترتان حل کنید و با پاسخ‌نامه چک کنید.',
 irExHint:'جواب‌ها را بنویسید و بعد با پاسخ‌نامه مقایسه کنید.', irShowAll:'نمایش همهٔ پاسخ‌ها', irHideAll:'پنهان کردن پاسخ‌ها', irShowKey:'نمایش پاسخ', irHideKey:'پنهان کردن پاسخ', irPage:'صفحهٔ کتاب', irTwHint:'لغات هدف زیرخط دارند',
 irK_byr:'پیش از خواندن', irK_skill:'مهارت ریدینگ', irK_review:'مرور مهارت', irK_voc:'تمرین واژگان', irK_rcx:'درک مطلب', irK_wd:'نوشتن و بحث', irK_sar:'خودارزیابی',
 rh_tf:'TRUE = متن همین را می‌گوید · FALSE = متن با آن موافق نیست.'
});
/* v3.3 — Grammar section (English Grammar in Use) */
Object.assign(I18N.en, {
 grammar:'Grammar', grSub:'English Grammar in Use (5th edition) — every unit with its lesson and interactive exercises with answer key.',
 grUnits:'Units', grUnitsN:'units', grExN:'exercises', grExS:'ex.', grUnitsR:'Units {a}–{b}', grTest:'Study guide test', grAdd:'Additional exercises', grApp:'Appendices',
 grHowT:'How to study', grHow:'Open a unit, read the lesson (sections A, B, C …, Persian translation available), then do the exercises and press Check. Not sure where to start? Take the Study guide test.',
 grLesson:'Lesson', grExercises:'Exercises', grSecs:'sections', grGoEx:'Go to exercises', grLessonHint:'Read the explanations and examples. Tap 🔊 to hear an example.',
 grEx:'Exercise', grExHint:'Type your answers in the boxes, then press Check. Enter jumps to the next box.', grCheck:'Check', grReset:'Reset', grScore:'{a} / {b} correct',
 grPerfect:'All correct!', grExample:'Example answers — your answer may be different.', grSee:'See also', grAddS:'Mixed practice from the back of the book, grouped by topic.',
 grTestT:'Which units do you need?', grTestS:'Choose the right alternative(s) — sometimes more than one is correct. After checking, you get the list of units to study.',
 grLast:'Last result', grStudy:'Study', grStudyList:'Units to study:'
});
Object.assign(I18N.fa, {
 grammar:'گرامر', grSub:'کتاب English Grammar in Use (ویرایش پنجم): درس همهٔ یونیت‌ها، همراه با تمرین‌های تعاملی و پاسخ‌نامه.',
 grUnits:'یونیت‌ها', grUnitsN:'یونیت', grExN:'تمرین', grExS:'تمرین', grUnitsR:'یونیت {a} تا {b}', grTest:'آزمون تعیین سطح (Study guide)', grAdd:'تمرین‌های تکمیلی', grApp:'پیوست‌ها',
 grHowT:'روش مطالعه', grHow:'یک یونیت را باز کنید و درس را بخوانید (بخش‌های A، B، C و…؛ ترجمهٔ فارسی هم دارد). بعد تمرین‌ها را حل کنید و «بررسی» را بزنید. نمی‌دانید از کجا شروع کنید؟ آزمون Study guide را بدهید.',
 grLesson:'درس', grExercises:'تمرین‌ها', grSecs:'بخش', grGoEx:'رفتن به تمرین‌ها', grLessonHint:'توضیح‌ها و مثال‌ها را بخوانید. برای شنیدن هر مثال 🔊 را بزنید.',
 grEx:'تمرین', grExHint:'جواب‌ها را در کادرها بنویسید و «بررسی» را بزنید. با Enter به کادر بعدی می‌روید.', grCheck:'بررسی', grReset:'از نو', grScore:'{a} از {b} درست',
 grPerfect:'همه درست بود!', grExample:'پاسخ‌ها نمونه هستند؛ جواب شما می‌تواند متفاوت باشد.', grSee:'همچنین ببینید', grAddS:'تمرین‌های ترکیبی انتهای کتاب، دسته‌بندی‌شده بر اساس موضوع.',
 grTestT:'کدام یونیت‌ها را باید بخوانید؟', grTestS:'گزینهٔ درست را انتخاب کنید؛ گاهی بیش از یک گزینه درست است. بعد از بررسی، فهرست یونیت‌هایی که باید مطالعه کنید نمایش داده می‌شود.',
 grLast:'آخرین نتیجه', grStudy:'مطالعه کنید', grStudyList:'یونیت‌هایی که باید بخوانید:'
});
/* v3.3 — IELTS vocabulary books (Learn → IELTS) */
Object.assign(I18N.en, {
 vbBands:'IELTS words by band', vbTests:'tests', vbUnitsS:'Each unit: book pages · answer key · recordings · word deck',
 vbHow:'Open a unit and work through its pages (exercises, readings, test practice). Write your answers, then check them in the Answer key tab. Learn the unit’s words with flashcards in the Words tab. After every 5 units, do the test.',
 vbScripts:'Recording scripts', vbTracks:'recordings', vbTestS:'vocabulary test', vbPages:'pages', vbPagesT:'Book pages', vbKey:'Answer key',
 vbShowImg:'Page image', vbShowTxt:'Text', vbPagesHint:'Tap a page to zoom. Use “Text” to see the page as text (also works offline).',
 vbKeyHint:'Check your answers after doing the exercises.', vbKeyPages:'Key pages', vbImgErr:'The page image needs an internet connection.'
});
Object.assign(I18N.fa, {
 vbBands:'لغات آیلتس بر اساس باند', vbTests:'آزمون', vbUnitsS:'هر یونیت: صفحه‌های کتاب · پاسخ‌نامه · متن فایل‌های صوتی · لغات',
 vbHow:'یک یونیت را باز کنید و صفحه‌هایش را کار کنید (تمرین‌ها، متن‌ها و Test practice). جواب‌ها را بنویسید و در زبانهٔ «پاسخ‌نامه» بررسی کنید. لغات یونیت را در زبانهٔ «لغات» با فلش‌کارت یاد بگیرید. بعد از هر ۵ یونیت، آزمون را بدهید.',
 vbScripts:'متن فایل‌های صوتی', vbTracks:'فایل صوتی', vbTestS:'آزمون واژگان', vbPages:'صفحه', vbPagesT:'صفحه‌های کتاب', vbKey:'پاسخ‌نامه',
 vbShowImg:'تصویر صفحه', vbShowTxt:'متن', vbPagesHint:'برای بزرگ‌نمایی روی صفحه بزنید. با «متن» صفحه را به صورت متنی ببینید (بدون اینترنت هم کار می‌کند).',
 vbKeyHint:'بعد از حل تمرین‌ها جواب‌هایتان را بررسی کنید.', vbKeyPages:'صفحه‌های پاسخ‌نامه', vbImgErr:'نمایش تصویر صفحه به اینترنت نیاز دارد.'
});
