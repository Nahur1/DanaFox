/* ===== DanaFox · Grammar level test (#/grammar/level) + overall level exam: vocabulary + grammar + reading (#/exam) =====
   Adaptive (IRT, 3-parameter logistic, EAP estimate): every answer updates the ability estimate and the next question is
   picked close to it. Levels: Pre-A1 (0) · A1 (1) · A2 (2) · B1 (3) · B2 (4) · C1 (5) · C2 (6).
   Bank item: [level, topic, sentence with ___, [correct, distractor…], Persian explanation, [Grammar in Use units]] */
(function(){
const {t, n, esc} = VY; const ACT = VY.ACT, V = VY.V;
const BANK = [[0,"be","I ___ a student.",["am","is","are","be"],"با I همیشه am به کار می‌رود.",""],
[0,"be","She ___ from Iran.",["is","are","am","be"],"با he/she/it فعل is می‌آید.",""],
[0,"be","They ___ my friends.",["are","is","am","be"],"با they/we/you فعل are می‌آید.",""],
[0,"be","We ___ at home now.",["are","is","am","be"],"با we فعل are می‌آید.",""],
[0,"art","This is ___ apple.",["an","a","two","many"],"قبل از کلمه‌ای که با صدای مصوت شروع می‌شود (apple) از an استفاده می‌کنیم.","72"],
[0,"ps","___ you like tea?",["Do","Does","Are","Is"],"در سؤالِ حال ساده با you از Do استفاده می‌کنیم.","2"],
[0,"have","He ___ two brothers.",["has","have","is","are"],"با he/she/it شکل has به کار می‌رود.","17"],
[0,"there","There ___ a book on the table.",["is","are","am","be"],"برای اسم مفرد (a book) از there is استفاده می‌کنیم.","84"],
[0,"noun","I have two ___.",["cats","cat","cates","a cat"],"بعد از عدد بیشتر از یک، اسم جمع می‌شود: two cats.","79"],
[0,"ps","Where ___ you live?",["do","does","are","is"],"سؤال حال ساده با you: Where do you…?","2"],
[0,"pron","This is my sister. ___ name is Sara.",["Her","His","She","Hers"],"صفت ملکی برای خانم her است و قبل از اسم می‌آید.",""],
[0,"modal","I can ___ English.",["speak","speaks","speaking","to speak"],"بعد از can شکل سادهٔ فعل (بدون to و s) می‌آید.","26"],
[0,"prep","The keys are ___ the bag.",["in","at","of","to"],"برای «داخلِ» چیزی از in استفاده می‌کنیم.","123"],
[0,"q","___ is your name?",["What","Who","Where","How"],"برای پرسیدن اسم: What is your name?","49"],
[0,"ps","My brother ___ not like coffee.",["does","do","is","are"],"منفیِ حال ساده با he/she/it: does not + فعل ساده.","2"],
[1,"ps","She ___ to work every day.",["goes","go","going","is go"],"حال ساده با she: فعل s/es می‌گیرد (goes).","2"],
[1,"pc","Look! The children ___ in the garden.",["are playing","play","plays","is playing"],"Look! نشان می‌دهد کار همین الان در جریان است → حال استمراری؛ children جمع است.","1,3"],
[1,"past","I ___ to the cinema yesterday.",["went","go","have gone","was go"],"yesterday → گذشتهٔ ساده؛ گذشتهٔ go می‌شود went.","5"],
[1,"past","___ you at home last night?",["Were","Was","Did","Are"],"گذشتهٔ to be با you می‌شود were.","5"],
[1,"pc","He ___ TV at the moment.",["is watching","watches","watch","watching"],"at the moment → حال استمراری (is + ing).","1"],
[1,"comp","My house is ___ than your house.",["bigger","more big","biggest","big"],"صفت کوتاه + er + than: bigger than.","105"],
[1,"quant","There aren't ___ eggs in the fridge.",["any","some","a","no"],"در جملهٔ منفی با اسم جمع از any استفاده می‌کنیم.","85"],
[1,"prep","We usually have dinner ___ 8 o'clock.",["at","in","on","to"],"برای ساعت از at استفاده می‌کنیم.","121"],
[1,"prep","My birthday is ___ May.",["in","on","at","to"],"برای ماه از in استفاده می‌کنیم.","121"],
[1,"quant","How ___ money do you have?",["much","many","lot","few"],"money غیرقابل‌شمارش است → How much.","87"],
[1,"past","Did you ___ the film?",["like","liked","likes","liking"],"بعد از did فعل به شکل ساده می‌آید.","5"],
[1,"comp","This is the ___ day of my life!",["best","better","good","most good"],"صفت عالیِ good می‌شود the best.","108"],
[1,"pc","Please be quiet. The baby ___.",["is sleeping","sleeps","sleep","slept"],"«ساکت باش» → کار الان در جریان است → حال استمراری.","1"],
[1,"fut","I'm going ___ a new phone next week.",["to buy","buy","buying","buys"],"ساختار برنامهٔ آینده: be going to + فعل ساده.","20"],
[1,"ps","He doesn't ___ meat.",["eat","eats","eating","ate"],"بعد از doesn't فعل ساده (بدون s) می‌آید.","2"],
[1,"past","I ___ my homework last night.",["did","do","done","made"],"برای تکلیف از do استفاده می‌کنیم؛ last night → گذشته: did my homework.","5"],
[2,"pp","I've never ___ sushi.",["eaten","ate","eat","eating"],"حال کامل: have + قسمت سوم فعل (eaten).","7,8"],
[2,"pp","She ___ here since 2015.",["has lived","lives","lived","is living"],"since + نقطهٔ شروع → حال کامل (has lived).","12"],
[2,"pastc","When I arrived, they ___ dinner.",["were having","are having","have had","have"],"کاری که در لحظه‌ای از گذشته در جریان بود → گذشتهٔ استمراری.","6"],
[2,"past","I ___ play tennis when I was a child, but I don't now.",["used to","use to","was used to","am used to"],"عادت گذشته که دیگر ادامه ندارد: used to + فعل ساده.","18"],
[2,"fut","If it rains tomorrow, we ___ at home.",["will stay","would stay","stayed","would have stayed"],"شرطی نوع اول: if + حال ساده، will + فعل.","25,38"],
[2,"modal","You ___ smoke here. It's not allowed.",["mustn't","don't have to","needn't","can"],"ممنوعیت → mustn't. (don't have to یعنی «لازم نیست».)","32"],
[2,"comp","She is ___ student in our class.",["the most intelligent","more intelligent","the intelligentest","most intelligent than"],"صفت بلند در حالت عالی: the most + صفت.","108"],
[2,"prep","I'm interested ___ learning Spanish.",["in","on","at","for"],"interested همیشه با in می‌آید.","130"],
[2,"comp","This book is ___ than that one.",["more interesting","interestinger","most interesting","the more interesting"],"صفت بلند در مقایسه: more + صفت + than.","105"],
[2,"link","We didn't go out ___ it was raining.",["because","so","but","although"],"دلیل را با because بیان می‌کنیم.",""],
[2,"quant","There isn't ___ milk left.",["much","many","a few","few"],"milk غیرقابل‌شمارش است → much.","87"],
[2,"adv","She speaks English very ___.",["well","good","nice","goodly"],"برای توصیف فعل (speaks) قید لازم است؛ قیدِ good می‌شود well.","101"],
[2,"pp","Have you finished your homework ___?",["yet","still","since","ago"],"در سؤال و جملهٔ منفیِ حال کامل، yet در آخر جمله می‌آید.","111"],
[2,"ger","I enjoy ___ to music.",["listening","to listen","listen","listened"],"بعد از enjoy فعل ing‌دار می‌آید.","53"],
[2,"ger","He decided ___ a new car.",["to buy","buying","buy","bought"],"بعد از decide مصدر با to می‌آید.","54"],
[2,"adv","The film was ___. I almost fell asleep.",["boring","bored","bore","bores"],"صفت ing‌دار ویژگیِ خودِ چیز را می‌گوید (فیلم خسته‌کننده بود).","98"],
[3,"cond","If I ___ rich, I would travel around the world.",["were","am","will be","would be"],"شرطی نوع دوم (فرضی): if + گذشتهٔ ساده (were)، would + فعل.","38,39"],
[3,"pass","This house ___ in 1920.",["was built","built","has built","was building"],"خانه ساخته شده (مجهول) و زمانش گذشته است → was built.","42"],
[3,"pastp","I ___ for two hours when she finally called.",["had been waiting","have been waiting","was waited","am waiting"],"کاری که تا لحظه‌ای در گذشته ادامه داشت → گذشتهٔ کامل استمراری.","16"],
[3,"q","Do you know where ___?",["she lives","does she live","lives she","she does live"],"در سؤال غیرمستقیم ترتیب کلمات مثل جملهٔ خبری است (she lives).","50"],
[3,"rep","She said she ___ the film the day before.",["had seen","has seen","sees","was see"],"در نقل قول غیرمستقیم، گذشته یک زمان عقب می‌رود → had seen.","47,48"],
[3,"rel","That's the man ___ car was stolen.",["whose","who","which","whom"],"برای مالکیت در جملهٔ موصولی از whose استفاده می‌کنیم.","94"],
[3,"q","It's a nice day, ___ it?",["isn't","is","doesn't","wasn't"],"جملهٔ مثبت با is → دنبالهٔ سؤالی منفی: isn't it?","52"],
[3,"ger","I'm not used to ___ up so early.",["getting","get","got","have got"],"be used to (عادت داشتن) + فعل ing‌دار.","61"],
[3,"pastp","By the time we got to the cinema, the film ___.",["had already started","has already started","already starts","was already start"],"کاری که قبل از کار دیگری در گذشته انجام شده → گذشتهٔ کامل.","15"],
[3,"cond","I wish I ___ more free time.",["had","have","will have","would have"],"آرزو دربارهٔ حال: wish + گذشتهٔ ساده.","39,41"],
[3,"ger","She suggested ___ to the beach.",["going","to go","go","we to go"],"بعد از suggest فعل ing‌دار می‌آید (یا that…).","53"],
[3,"pp","He's been working here ___ three years.",["for","since","during","from"],"برای «مدت زمان» از for و برای «نقطهٔ شروع» از since استفاده می‌کنیم.","12"],
[3,"ger","I'd rather ___ at home tonight.",["stay","to stay","staying","stayed"],"would rather + فعل ساده (بدون to).","59"],
[3,"link","The meeting was cancelled ___ the bad weather.",["because of","because","although","in spite of"],"قبل از اسم (the bad weather) از because of استفاده می‌کنیم.",""],
[3,"fut","I'll call you when I ___ home.",["get","will get","would get","got"],"بعد از when با مفهوم آینده، حال ساده می‌آید نه will.","25"],
[3,"pass","We ___ our car serviced last week.",["had","made","did","let"],"ساختار have something done: کاری که دیگری برای ما انجام می‌دهد.","46"],
[4,"cond","If I had known about the problem, I ___ you.",["would have helped","will help","had helped","helped"],"شرطی نوع سوم: if + had + p.p.، would have + p.p.","40"],
[4,"modal","She ___ be at home — her car isn't outside.",["can't","mustn't","needn't","shouldn't"],"نتیجه‌گیریِ منفی و مطمئن → can't («امکان ندارد»).","28"],
[4,"pass","He ___ to be the richest man in the country.",["is said","says","is saying","said"],"ساختار مجهولِ گزارشی: be said to + فعل («گفته می‌شود که…»).","45"],
[4,"link","Despite ___ hard, he failed the exam.",["studying","he studied","of studying","to study"],"بعد از despite اسم یا فعل ing‌دار می‌آید (نه جمله و نه of).","113"],
[4,"fut","By next June, I ___ here for ten years.",["will have worked","will work","am working","have worked"],"کاری که تا زمانی در آینده کامل می‌شود → آیندهٔ کامل.","24"],
[4,"ger","I regret ___ him the truth. It was a big mistake.",["telling","to tell","tell","told"],"regret + ing = پشیمانی از کاری که در گذشته کرده‌ایم.","56"],
[4,"modal","You ___ a taxi. I could have driven you.",["needn't have taken","mustn't have taken","can't have taken","shouldn't take"],"کاری که انجام شد ولی لازم نبود → needn't have + p.p.","32"],
[4,"rel","The man ___ to the manager is my uncle.",["talking","talks","is talking","talked"],"عبارت ing‌دار به‌جای who is talking به کار می‌رود.","97"],
[4,"cond","It's time we ___ home.",["went","go","will go","have gone"],"بعد از It's time + فاعل، گذشتهٔ ساده می‌آید.","35"],
[4,"rel","My parents, ___ live in Shiraz, are visiting us.",["who","that","which","whom"],"در جملهٔ موصولیِ توضیحی (بین ویرگول) that به کار نمی‌رود؛ برای انسان who.","95"],
[4,"link","I'll lend you the money ___ you pay me back next week.",["as long as","unless","in case","even if"],"as long as = «به شرط اینکه».","115"],
[4,"link","Take an umbrella ___ it rains.",["in case","unless","so that","if not"],"in case = «برای احتیاط، اگر احیاناً…».","114"],
[4,"ger","He apologised ___ late.",["for being","to be","for be","being"],"apologise for + فعل ing‌دار.","62"],
[4,"comp","The more you practise, ___ you get.",["the better","better","the best","more better"],"ساختار the more…, the better… («هرچه بیشتر…، بهتر…»).","106"],
[4,"ger","There's no point ___ to him; he never listens.",["in talking","to talk","for talk","of talk"],"There's no point in + فعل ing‌دار.","63"],
[4,"pass","We were made ___ for two hours.",["to wait","wait","waiting","waited"],"make somebody do در حالت مجهول می‌شود be made to do.","55"],
[4,"ger","The house needs ___. The walls look terrible.",["painting","to paint","painted","paint"],"need + ing معنای مجهول دارد (= needs to be painted).","57"],
[5,"inv","Hardly ___ the house when it started to rain.",["had we left","we had left","did we leave","we left"],"بعد از Hardly در ابتدای جمله، فعل کمکی قبل از فاعل می‌آید (وارونگی) و با when ادامه می‌یابد.",""],
[5,"inv","Not only ___ late, but he also forgot the tickets.",["was he","he was","he is","did he be"],"بعد از Not only در ابتدای جمله وارونگی لازم است: was he.",""],
[5,"cond","I'd rather you ___ smoke in the house.",["didn't","don't","won't","not"],"would rather + فاعل دیگر + گذشتهٔ ساده (برای حال/آینده).","59"],
[5,"cond","Had I known you were coming, I ___ a cake.",["would have baked","would bake","had baked","will bake"],"Had I known = If I had known (شرطی سوم با وارونگی).","40"],
[5,"modal","She ___ have left already — her coat is still here.",["can't","mustn't","shouldn't","needn't"],"نتیجه‌گیریِ منفی دربارهٔ گذشته: can't have + p.p.","28"],
[5,"cond","___ you need any help, don't hesitate to call me.",["Should","Would","Had","Were"],"Should you need = If you need (رسمی، با وارونگی).",""],
[5,"pass","The suspect is believed ___ the country last week.",["to have left","to leave","leaving","having left"],"برای کارِ گذشته در این ساختار: be believed to have + p.p.","45"],
[5,"inv","Little ___ that he was being watched.",["did he know","he knew","he did know","knew he"],"Little در ابتدای جمله (به معنی «اصلاً») وارونگی می‌خواهد: did he know.",""],
[5,"cond","If it ___ for your help, I would have failed.",["hadn't been","isn't","won't be","hasn't been"],"If it hadn't been for = «اگر… نبود» (دربارهٔ گذشته).","40"],
[5,"inv","No sooner had she arrived ___ the phone rang.",["than","when","then","that"],"No sooner… همیشه با than می‌آید.",""],
[5,"rel","This is the hotel at ___ we stayed last summer.",["which","that","where","who"],"بعد از حرف اضافه فقط which (برای اشیا) یا whom (برای انسان) می‌آید.","93,94"],
[5,"ger","I object ___ like a child.",["to being treated","to be treated","being treated","for being treated"],"object to + ing؛ این‌جا مجهول است: to being treated.","60,62"],
[5,"inv","Only after the meeting ___ how serious the problem was.",["did I realise","I realised","I did realise","realised I"],"Only after… در ابتدای جمله → وارونگی در جملهٔ اصلی.",""],
[5,"cond","It is essential that every student ___ the form by Friday.",["complete","completed","will complete","completing"],"بعد از It is essential that… شکل سادهٔ فعل (وجه التزامی) می‌آید.",""],
[5,"inv","So difficult ___ that nobody passed.",["was the exam","the exam was","did the exam be","the exam"],"So + صفت در ابتدای جمله → وارونگی: was the exam.",""],
[5,"ger","He denied ___ the money.",["having taken","to have taken","to take","take"],"deny + فعل ing‌دار؛ having taken به گذشته اشاره می‌کند.","53"],
[6,"inv","Rarely ___ such a beautiful sunset.",["have I seen","I have seen","I saw","saw I"],"قیدهای منفیِ ابتدای جمله (Rarely) وارونگی می‌خواهند.",""],
[6,"inv","Under no circumstances ___ the door to strangers.",["should you open","you should open","you open","open you"],"Under no circumstances در ابتدای جمله → وارونگی: should you open.",""],
[6,"rel","The proposal, ___ details are still unclear, has been criticised.",["whose","of which","which","its"],"whose برای مالکیت دربارهٔ اشیا هم به کار می‌رود (= the details of which).","94"],
[6,"cond","___ he to resign, the company would be in serious trouble.",["Were","Had","Should","Did"],"Were he to = If he were to (شرطیِ فرضیِ رسمی با وارونگی).",""],
[6,"inv","It was not until I got home ___ I realised I had lost my wallet.",["that","when","than","which"],"ساختار تأکیدی It was not until… that…",""],
[6,"pass","She is said to ___ a fortune in the 1990s.",["have made","make","making","had made"],"برای گذشته: be said to have + p.p.","45"],
[6,"link","Much ___ I admire his work, I can't agree with his views.",["as","though","so","like"],"Much as = «هرچند که / با اینکه خیلی…».","113"],
[6,"link","Try ___ she might, she couldn't open the jar.",["as","though","so","how"],"اصطلاح Try as she might = «هرچه تلاش کرد…».",""],
[6,"inv","Scarcely had the concert begun ___ the lights went out.",["when","than","that","then"],"Scarcely/Hardly… با when می‌آید (No sooner با than).",""],
[6,"cond","I'd just as soon you ___ tell anyone about this.",["didn't","don't","won't","not"],"would (just as) soon + فاعل + گذشتهٔ ساده، مثل would rather.","59"],
[6,"inv","Not until the 19th century ___ widely available.",["did electricity become","electricity became","became electricity","electricity did become"],"Not until… در ابتدای جمله → وارونگی در جملهٔ اصلی.",""],
[6,"cond","Looking back, he would rather ___ the truth at the time.",["have been told","being told","to be told","had told"],"ترجیح دربارهٔ گذشته (و مجهول): would rather have been + p.p.","59"],
[6,"inv","So ___ was the noise that we couldn't sleep.",["loud","loudly","louder","loudness"],"So + صفت + فعل + فاعل… that (وارونگی تأکیدی).","102"],
[6,"inv","Such ___ his anger that he couldn't speak.",["was","did","had","made"],"Such + be + اسم… that = «آن‌قدر … بود که…».","102"],
[6,"cond","But for his quick thinking, the accident ___ much worse.",["would have been","had been","will be","was"],"But for = «اگر … نبود»؛ دربارهٔ گذشته → would have been.",""],
[6,"inv","On no account ___ to leave the building.",["are visitors allowed","visitors are allowed","visitors allowed","allowed visitors"],"On no account در ابتدای جمله → وارونگی: are visitors allowed.",""]];
const TOPIC = {
  be:['to be','فعل to be'], have:['have / has','have و has'], art:['Articles (a/an/the)','حروف تعریف (a/an/the)'], pron:['Pronouns & possessives','ضمیر و صفت ملکی'],
  noun:['Nouns & plurals','اسم و جمع'], there:['there is / there are','there is و there are'], ps:['Present simple','حال ساده'], pc:['Present continuous','حال استمراری'],
  past:['Past simple','گذشتهٔ ساده'], pastc:['Past continuous','گذشتهٔ استمراری'], pp:['Present perfect','حال کامل'], pastp:['Past perfect','گذشتهٔ کامل'],
  fut:['Future forms','زمان آینده'], modal:['Modal verbs','افعال وجهی (can، must…)'], cond:['Conditionals, wish & would rather','شرطی، wish و would rather'],
  pass:['Passive','مجهول'], rep:['Reported speech','نقل قول غیرمستقیم'], q:['Questions & question tags','سؤال و question tag'], ger:['-ing or to + verb','فعل ing‌دار یا مصدر با to'],
  rel:['Relative clauses','جملات موصولی'], comp:['Comparatives & superlatives','صفت تفضیلی و عالی'], quant:['Quantifiers','کمیت‌نماها (much، many…)'],
  adv:['Adjectives & adverbs','صفت و قید'], prep:['Prepositions','حروف اضافه'], link:['Linking words','کلمات ربط'], inv:['Inversion & emphasis','وارونگی و ساختارهای تأکیدی']
};
const LV = ['Pre-A1','A1','A2','B1','B2','C1','C2'];
const TX = {
  en: {gtTab:'Level test', gtTitle:'Grammar level test', gtSub:'Find out your English grammar level — from absolute beginner (Pre-A1) to C2.',
    gtAdaptive:'Adaptive', gtAdaptiveS:'questions get easier or harder based on your answers', gtQ:'{n} questions', gtMin:'about {n} minutes', gtNoGuess:'If you don’t know, press “I don’t know” — guessing makes the result less accurate.',
    gtStart:'Start the test', gtLast:'Last result', gtQuestion:'Question', gtChoose:'Choose the correct option', gtDontKnow:'I don’t know', gtResult:'Your grammar level', gtCorrect:'{a} of {b} correct',
    gtYouHere:'You are here', gtByLevel:'Accuracy by level', gtAsked:'{a}/{b}', gtReview:'Topics to review', gtReviewS:'Tap a topic to open the related Grammar in Use unit.', gtNoWrong:'No mistakes — great job! 🎉',
    gtPlan:'What to study next', gtAnswers:'Your answers', gtYour:'Your answer', gtRight:'Correct answer', gtRetake:'Take it again', gtBack:'Back to Grammar', gtHistory:'Previous results', gtUnits:'Units {a}–{b}', gtOpenUnits:'Start studying',
    gtCard:'How good is your grammar?', gtCardS:'A short adaptive test — from zero to C2.', gtSeeResult:'See result',
    lv0:'Starter', lv1:'Beginner', lv2:'Elementary', lv3:'Intermediate', lv4:'Upper-intermediate', lv5:'Advanced', lv6:'Proficient',
    lvD0:'You are just starting. First learn the basics: to be, pronouns, a/an and the present simple.',
    lvD1:'You can build simple sentences in the present simple, present continuous and past simple.',
    lvD2:'You know the main tenses. Now strengthen the present perfect, comparisons and modal verbs.',
    lvD3:'You use most common structures correctly. Consolidate conditionals, the passive and reported speech.',
    lvD4:'Your grammar is strong. Work on finer points: third conditional, past modals and relative clauses.',
    lvD5:'You know advanced structures. Practise inversion and formal patterns.',
    lvD6:'Near-native control — you handle even very advanced and formal structures.',
    plan0:'Start with the present simple, to be and present continuous — Grammar in Use units 1–6.', plan1:'Units 1–14: present, past and present perfect.', plan2:'Units 7–25: present perfect, past perfect and the future.',
    plan3:'Units 26–68: modal verbs, conditionals, passive, reported speech, -ing and to.', plan4:'Units 69–120: articles, relative clauses, adjectives & adverbs, linking words.', plan5:'Units 121–145 + Additional exercises: prepositions, phrasal verbs and mixed practice.', plan6:'Additional exercises and the Study guide test to keep everything sharp.',
    exTitle:'Overall level exam', exSub:'Vocabulary + grammar + reading — one test that shows your overall English level.', exCard:'Overall English level exam', exCardS:'Vocabulary + grammar + reading · adaptive · about 10 minutes',
    exPartV:'Vocabulary', exPartVS:'{n} adaptive questions: choose the Persian meaning', exPartG:'Grammar', exPartGS:'{n} adaptive questions: fill the gap', exPartR:'Reading', exPartRS:'a short text and {n} questions',
    exOverall:'Your overall level', exParts:'Your skills', exVocab:'≈ {n} words', exStart:'Start the exam', exPart:'Part {a} of {b}', exMore:'More precise tests', exMoreV:'Full vocabulary test', exMoreG:'Full grammar test', exLast:'Overall level',
    exReadQ:'Read the text and answer', exNext:'Next part'},
  fa: {gtTab:'تعیین سطح', gtTitle:'آزمون تعیین سطح گرامر', gtSub:'سطح گرامر انگلیسی‌تان را بسنجید — از صفرِ صفر (Pre-A1) تا C2.',
    gtAdaptive:'هوشمند و تطبیقی', gtAdaptiveS:'سؤال‌ها با توجه به جواب‌های شما سخت‌تر یا آسان‌تر می‌شوند', gtQ:'{n} سؤال', gtMin:'حدود {n} دقیقه', gtNoGuess:'اگر جواب را نمی‌دانید «نمی‌دانم» را بزنید — حدس زدن نتیجه را نادقیق می‌کند.',
    gtStart:'شروع آزمون', gtLast:'نتیجهٔ قبلی', gtQuestion:'سؤال', gtChoose:'گزینهٔ درست را انتخاب کنید', gtDontKnow:'نمی‌دانم', gtResult:'سطح گرامر شما', gtCorrect:'{a} از {b} درست',
    gtYouHere:'شما اینجایید', gtByLevel:'درصد درستی در هر سطح', gtAsked:'{a}/{b}', gtReview:'مباحثی که باید مرور کنید', gtReviewS:'روی هر مبحث بزنید تا یونیت مربوطش در Grammar in Use باز شود.', gtNoWrong:'هیچ اشتباهی نداشتید — عالی بود! 🎉',
    gtPlan:'قدم بعدی برای مطالعه', gtAnswers:'جواب‌های شما', gtYour:'جواب شما', gtRight:'جواب درست', gtRetake:'آزمون دوباره', gtBack:'برگشت به گرامر', gtHistory:'نتیجه‌های قبلی', gtUnits:'یونیت‌های {a} تا {b}', gtOpenUnits:'شروع مطالعه',
    gtCard:'گرامرت در چه سطحیه؟', gtCardS:'یک آزمون کوتاه و هوشمند — از صفر تا C2.', gtSeeResult:'دیدن نتیجه',
    lv0:'صفر / شروع', lv1:'مبتدی', lv2:'مقدماتی', lv3:'متوسط', lv4:'فوق‌متوسط', lv5:'پیشرفته', lv6:'تسلط کامل',
    lvD0:'تازه شروع کرده‌اید. اول پایه‌ها را یاد بگیرید: فعل to be، ضمیرها، a/an و زمان حال ساده.',
    lvD1:'جمله‌های ساده را با حال ساده، حال استمراری و گذشتهٔ ساده می‌سازید.',
    lvD2:'زمان‌های اصلی را می‌شناسید. حالا حال کامل، مقایسه و افعال وجهی را تقویت کنید.',
    lvD3:'بیشتر ساختارهای رایج را درست به کار می‌برید. شرطی‌ها، مجهول و نقل قول را محکم کنید.',
    lvD4:'گرامرتان قوی است. روی نکته‌های ظریف‌تر کار کنید: شرطی نوع سوم، افعال وجهیِ گذشته و جملات موصولی.',
    lvD5:'ساختارهای پیشرفته را بلدید. وارونگی و ساختارهای رسمی را تمرین کنید.',
    lvD6:'تسلط تقریباً کامل! حتی ساختارهای خیلی پیشرفته و رسمی را هم درست تشخیص می‌دهید.',
    plan0:'از حال ساده، فعل to be و حال استمراری شروع کنید — یونیت‌های ۱ تا ۶ کتاب Grammar in Use.', plan1:'یونیت‌های ۱ تا ۱۴: زمان حال، گذشته و حال کامل.', plan2:'یونیت‌های ۷ تا ۲۵: حال کامل، گذشتهٔ کامل و آینده.',
    plan3:'یونیت‌های ۲۶ تا ۶۸: افعال وجهی، شرطی‌ها، مجهول، نقل قول، ing و to.', plan4:'یونیت‌های ۶۹ تا ۱۲۰: حروف تعریف، جملات موصولی، صفت و قید، کلمات ربط.', plan5:'یونیت‌های ۱۲۱ تا ۱۴۵ و تمرین‌های تکمیلی: حروف اضافه، افعال عبارتی و تمرین ترکیبی.', plan6:'تمرین‌های تکمیلی و آزمون Study guide تا همه‌چیز تازه بماند.',
    exTitle:'آزمون جامع تعیین سطح', exSub:'لغت + گرامر + ریدینگ — یک آزمون که سطح کلی انگلیسی شما را نشان می‌دهد.', exCard:'آزمون جامع سطح زبان', exCardS:'لغت + گرامر + ریدینگ · هوشمند · حدود ۱۰ دقیقه',
    exPartV:'لغت', exPartVS:'{n} سؤال تطبیقی: معنی فارسی را انتخاب کنید', exPartG:'گرامر', exPartGS:'{n} سؤال تطبیقی: جای خالی را پر کنید', exPartR:'ریدینگ', exPartRS:'یک متن کوتاه و {n} سؤال',
    exOverall:'سطح کلی شما', exParts:'مهارت‌های شما', exVocab:'≈ {n} لغت', exStart:'شروع آزمون', exPart:'بخش {a} از {b}', exMore:'آزمون‌های دقیق‌تر', exMoreV:'آزمون کامل لغت', exMoreG:'آزمون کامل گرامر', exLast:'سطح کلی',
    exReadQ:'متن را بخوانید و جواب دهید', exNext:'بخش بعد'}
};
const T = (k, v) => { let s = (TX[VY.lang()] || TX.en)[k] || TX.en[k] || k; if(v) for(const x in v) s = s.replace('{' + x + '}', v[x]); return s; };
const fa = () => VY.lang() === 'fa';
const topicName = k => (TOPIC[k] || [k, k])[fa() ? 1 : 0];
const lvName = l => T('lv' + l);

/* ---------- adaptive engine (3PL IRT, EAP on a grid) ---------- */
const GRID = []; for(let x = -1; x <= 7.5001; x += 0.1) GRID.push(+x.toFixed(2));
function estimate(resp, mu = 2, sd = 2.2){
  const w = GRID.map(x => { let l = Math.exp(-((x - mu) ** 2) / (2 * sd * sd));
    for(const r of resp){ const p = r.c + (1 - r.c) / (1 + Math.exp(-1.7 * (x - r.b))); l *= r.ok ? p : (1 - p); } return l; });
  const s = w.reduce((a, b) => a + b, 0) || 1, m = GRID.reduce((a, x, i) => a + x * w[i], 0) / s;
  return {th: m, se: Math.sqrt(GRID.reduce((a, x, i) => a + (x - m) ** 2 * w[i], 0) / s)};
}
const levelOf = th => th < 0.5 ? 0 : Math.min(6, Math.round(th));
const subOf = th => { const l = levelOf(th), lo = l === 0 ? -1 : l - 0.5, hi = l === 6 ? 7 : l + 0.5, f = (th - lo) / (hi - lo); return f < .34 ? 'low' : f < .67 ? 'mid' : 'high'; };
const scoreOf = th => Math.max(2, Math.min(100, Math.round((th + 0.5) / 7 * 100)));
function pickGrammar(S){
  const target = S.resp.length ? S.th : 1.2, recent = S.items.slice(-2).map(i => BANK[i][1]);
  let c = BANK.map((x, i) => i).filter(i => !S.used.has(i));
  const fresh = c.filter(i => !recent.includes(BANK[i][1])); if(fresh.length >= 4) c = fresh;
  c.sort((a, b) => Math.abs(BANK[a][0] - target) - Math.abs(BANK[b][0] - target) || Math.random() - .5);
  const near = c.filter(i => Math.abs(BANK[i][0] - target) <= Math.abs(BANK[c[0]][0] - target) + 0.01);
  const i = (near.length ? near : c)[Math.floor(Math.random() * (near.length || 1))];
  const q = BANK[i], o = VY.shuffle(q[3]);
  return {i, o, a: o.indexOf(q[3][0])};
}
const newG = () => ({resp: [], used: new Set(), items: [], th: 1.2, ans: [], cur: null});
function answerG(S, choice){
  const q = S.cur, it = BANK[q.i], ok = choice === q.a;
  S.used.add(q.i); S.items.push(q.i);
  S.resp.push({b: it[0], ok, c: choice < 0 ? 0 : 1 / it[3].length});
  S.ans.push([q.i, choice < 0 ? null : q.o[choice], ok]);
  S.th = estimate(S.resp).th; return ok;
}
function summaryG(S){
  const e = estimate(S.resp), th = Math.max(-0.5, Math.min(6.5, e.th)), lv = levelOf(th), per = {};
  S.ans.forEach(([i, , ok]) => { const l = BANK[i][0]; per[l] = per[l] || [0, 0]; per[l][1]++; if(ok) per[l][0]++; });
  return {lv, cefr: LV[lv], theta: Math.round(th * 100) / 100, sub: subOf(th), score: scoreOf(th), ok: S.ans.filter(x => x[2]).length, n: S.ans.length, per, ans: S.ans.map(([i, p, ok]) => [BANK[i][2], p, ok])};
}
const findQ = s => BANK.find(x => x[2] === s);

/* ---------- shared pieces ---------- */
const NG = 24, EX_V = 14, EX_G = 14;
function sentence(it, filled, cls){
  const parts = esc(it[2]).split('___');
  const gap = filled != null ? `<span class="gt-gap filled ${cls || ''}">${esc(filled)}</span>` : `<span class="gt-gap"></span>`;
  return parts.join(gap);
}
function ladder(lv, mini){
  return `<div class="gt-ladder ${mini ? 'mini' : ''} ${lv != null ? 'has-me' : ''}">${LV.map((c, i) => `<div class="gt-step s${i} ${lv === i ? 'on' : ''} ${lv != null && i < lv ? 'past' : ''}" style="--h:${28 + i * 11}px">
    ${lv === i ? `<span class="gt-me"><em>🦊</em><small>${T('gtYouHere')}</small></span>` : ''}<i></i><b class="en">${c}</b>${mini ? '' : `<small>${lvName(i)}</small>`}</div>`).join('')}</div>`;
}
function qCard(it, q, st){
  // st: undefined (waiting) | {pick, ok}
  const filled = st ? (st.pick >= 0 ? q.o[st.pick] : q.o[q.a]) : null, cls = st ? (st.ok ? 'ok' : st.pick >= 0 ? 'bad' : 'show') : '';
  return `<div class="card gt-q ${st ? (st.ok ? 'is-ok' : 'is-bad') : ''}"><div class="gt-qtype">✏️ ${T('gtChoose')}</div>
    <p class="gt-sent en" dir="ltr">${sentence(it, filled, cls)}</p>${st && !st.ok ? `<div class="gt-fix en" dir="ltr">✓ ${sentence(it, q.o[q.a], 'ok')}</div>` : ''}</div>
  <div class="gt-opts" dir="ltr">${q.o.map((o, i) => `<button class="gt-opt ${st ? (i === q.a ? 'right' : i === st.pick ? 'wrong' : 'dim') : ''}" data-act="${st ? '' : 'gtAns'}" data-v="${i}" ${st ? 'disabled' : ''}><span class="gt-k">${'ABCD'[i]}</span><span class="en">${esc(o)}</span></button>`).join('')}</div>
  <div class="row mt12" style="justify-content:center"><button class="btn btn-ghost btn-sm gt-dk" data-act="gtAns" data-v="-1" ${st ? 'disabled' : ''}>🤷 ${T('gtDontKnow')}</button></div>`;
}
function topBar(done, total, chip, quit){
  return `<div class="study-top gt-top"><button class="icon-btn" data-act="${quit}" aria-label="close">${icon('x')}</button><div class="progress gt-prog"><i style="width:${Math.max(3, done / total * 100)}%"></i></div><span class="chip purple">${chip}</span></div>`;
}
const fmtDate = ts => new Date(ts).toLocaleDateString(fa() ? 'fa-IR' : 'en-GB');
function perLevelBars(per){
  return LV.map((c, l) => { const x = per[l]; if(!x) return ''; const p = x[0] / x[1] * 100;
    return `<div class="gt-bar"><span class="en gt-bl s${l}">${c}</span><div class="progress ${p >= 70 ? 'green' : p >= 40 ? 'yellow' : 'red'}"><i style="width:${Math.max(3, p)}%"></i></div><b>${n(x[0])}/${n(x[1])}</b></div>`; }).join('');
}
function reviewTopics(ans){
  const wrong = {}; ans.forEach(([s, , ok]) => { if(ok) return; const it = findQ(s); if(!it) return; const k = it[1]; (wrong[k] = wrong[k] || {n: 0, u: new Set()}); wrong[k].n++; String(it[5] || '').split(',').filter(Boolean).forEach(u => wrong[k].u.add(+u)); });
  const ks = Object.keys(wrong).sort((a, b) => wrong[b].n - wrong[a].n);
  if(!ks.length) return `<p class="gt-yay">${T('gtNoWrong')}</p>`;
  return `<p class="small muted">${T('gtReviewS')}</p><div class="gt-topics">${ks.map(k => { const u = [...wrong[k].u].sort((a, b) => a - b)[0];
    return `<a class="gt-topic" ${u ? `href="#/grammar/u/${u}"` : 'href="#/grammar"'}><span>${esc(topicName(k))}</span>${u ? `<small>${t('irUnit')} ${n(u)}</small>` : ''}${wrong[k].n > 1 ? `<i>×${n(wrong[k].n)}</i>` : ''}</a>`; }).join('')}</div>`;
}
function answersList(ans){
  return `<details class="card gt-ans mt16"><summary><b>📝 ${T('gtAnswers')}</b><span class="chip">${n(ans.filter(x => x[2]).length)} / ${n(ans.length)}</span></summary>
    <div class="gt-alist">${ans.map(([s, pick, ok], k) => { const it = findQ(s); if(!it) return '';
      return `<div class="gt-ai ${ok ? 'ok' : 'bad'}"><div class="row" style="gap:8px;align-items:flex-start"><span class="gt-an">${ok ? '✓' : '✗'}</span><div style="flex:1;min-width:0">
        <p class="en" dir="ltr">${sentence(it, it[3][0], 'ok')}</p>${!ok ? `<div class="small"><span class="muted">${T('gtYour')}:</span> <span class="en gt-wrongw" dir="ltr">${pick ? esc(pick) : '🤷'}</span></div>` : ''}
        <div class="small muted gt-why">💡 ${esc(it[4])}</div></div><span class="chip tiny en">${LV[it[0]]}</span></div></div>`; }).join('')}</div></details>`;
}

/* ================= GRAMMAR LEVEL TEST ================= */
let G = null;   // running grammar test
ACT.gtStart = () => { G = newG(); G.t0 = Date.now(); G.cur = pickGrammar(G); if(location.hash !== '#/grammar/level') location.hash = '#/grammar/level'; else VY.rerender(); };
ACT.gtAns = el => {
  const S = VY.current === 'exam' ? (X && X.g) : G; if(!S || S.lock || !S.cur) return;
  const v = +el.dataset.v, ok = answerG(S, v); S.lock = true; S.st = {pick: v, ok};
  VY.sound && VY.sound(ok ? 'ok' : 'bad'); VY.rerender();
  setTimeout(() => { S.lock = false; S.st = null;
    if(VY.current === 'exam') return exNext();
    if(S.ans.length >= NG) return gtFinish(); S.cur = pickGrammar(S); VY.rerender(); }, ok ? 650 : 1500);
};
ACT.gtQuit = () => { if(G && G.ans.length && !confirm(t('plQuitQ'))) return; G = null; VY.go('grammar'); };
function gtFinish(){
  const r = summaryG(G), old = VY.kvGet('grLevel');
  r.at = Date.now(); r.time = Math.round((Date.now() - G.t0) / 1000);
  r.hist = ((old && old.hist) || []).concat(old ? [{at: old.at, cefr: old.cefr, score: old.score}] : []).slice(-5);
  VY.kvSet('grLevel', r); VY.addXP && VY.addXP(25); VY.save(); VY.sound && VY.sound('done');
  G = null; VY.go('grammar/level/result');
}
const PLAN = [[0, 1, 6], [1, 1, 14], [2, 7, 25], [3, 26, 68], [4, 69, 120], [5, 121, 145], [6, 0, 0]];
function planCard(lv){
  const p = PLAN[lv];
  return `<div class="card gt-plan"><h3>🚀 ${T('gtPlan')}</h3><p class="muted">${T('plan' + lv)}</p>
    <div class="row wrap mt12" style="gap:8px">${p[1] ? `<a class="btn btn-primary btn-sm" href="#/grammar/u/${p[1]}">📖 ${T('gtOpenUnits')} · ${t('irUnit')} ${n(p[1])}</a>` : ''}${lv >= 5 ? `<a class="btn btn-soft btn-sm" href="#/grammar/add">✏️ ${t('grAdd')}</a>` : ''}${lv >= 6 ? `<a class="btn btn-soft btn-sm" href="#/grammar/test">🎯 ${t('grTest')}</a>` : ''}</div></div>`;
}
function gtIntro(){
  const r = VY.kvGet('grLevel');
  return `<div class="gt"><div class="card gt-intro">
    <div class="gt-mascot">🦊<span>📝</span></div>
    <h2>${T('gtTitle')}</h2><p class="muted">${T('gtSub')}</p>
    ${ladder(r ? r.lv : null)}
    <div class="gt-pills"><span>🧠 <b>${T('gtAdaptive')}</b><small>${T('gtAdaptiveS')}</small></span><span>📝 <b>${T('gtQ', {n: n(NG)})}</b><small>Pre-A1 → C2</small></span><span>⏱ <b>${T('gtMin', {n: n(7)})}</b><small>${t('grammar')}</small></span></div>
    <p class="small muted gt-note">💡 ${T('gtNoGuess')}</p>
    <div class="row wrap mt16" style="justify-content:center;gap:10px">${r ? `<a class="btn btn-ghost btn-lg" href="#/grammar/level/result">${T('gtLast')} · <span class="en">${esc(r.cefr)}</span></a>` : ''}<button class="btn btn-primary btn-lg" data-act="gtStart">${T('gtStart')} ${icon('arrow')}</button></div>
  </div></div>`;
}
function gtTest(){
  const S = G, it = BANK[S.cur.i], k = S.ans.length + (S.st ? 0 : 1);
  return `<div class="gt gt-run">${topBar(S.ans.length, NG, `${n(Math.min(k, NG))} / ${n(NG)}`, 'gtQuit')}${qCard(it, S.cur, S.st)}</div>`;
}
function gtResult(r){
  const nextLv = Math.min(6, r.lv + 1);
  return `<div class="gt gt-res">
    <section class="hero gt-hero lv${r.lv}"><div class="gt-hero-tx">
      <span class="chip gt-hchip">📗 ${T('gtResult')}</span>
      <h2><span class="en">${esc(r.cefr)}</span> · ${lvName(r.lv)}</h2><p>${T('lvD' + r.lv)}</p>
      <div class="row wrap mt12" style="gap:6px"><span class="chip gt-hchip">✓ ${T('gtCorrect', {a: n(r.ok), b: n(r.n)})}</span><span class="chip gt-hchip">⏱ ${n(Math.max(1, Math.round(r.time / 60)))} ${t('min')}</span><span class="chip gt-hchip">${t('plSub_' + r.sub)}</span></div>
    </div>${VY.ring(r.score / 100, 128, 12, '#FFE58A', 'rgba(255,255,255,.22)', `<div><b class="en">${esc(r.cefr)}</b><br><span>${n(r.score)}${fa() ? '٪' : '%'}</span></div>`)}</section>
    <div class="card mt16">${ladder(r.lv)}</div>
    <div class="grid g2 mt16">
      <div class="card"><h3>📊 ${T('gtByLevel')}</h3><div class="mt12">${perLevelBars(r.per)}</div></div>
      <div class="card"><h3>🔁 ${T('gtReview')}</h3>${reviewTopics(r.ans)}</div>
    </div>
    <div class="mt16">${planCard(r.lv)}</div>
    ${answersList(r.ans)}
    ${r.hist && r.hist.length ? `<div class="card mt16"><h3>🕘 ${T('gtHistory')}</h3><div class="list">${r.hist.slice().reverse().map(h => `<div class="li"><span class="w en" dir="ltr">${esc(h.cefr)}</span><span class="m">${n(h.score)}${fa() ? '٪' : '%'}</span><span class="muted small">${fmtDate(h.at)}</span></div>`).join('')}</div></div>` : ''}
    <div class="row wrap mt16" style="gap:8px;justify-content:center"><button class="btn btn-primary" data-act="gtStart">${icon('repeat')} ${T('gtRetake')}</button><a class="btn btn-ghost" href="#/grammar">${icon('back')} ${T('gtBack')}</a></div>
  </div>`;
}
/* grammar section: route #/grammar/level[/result] */
VY.gtView = sub => { if(G) return gtTest(); const r = VY.kvGet('grLevel'); if(sub === 'result' && r) return gtResult(r); return gtIntro(); };
VY.gtActive = () => !!G;
VY.gtTabLabel = () => T('gtTab'); VY.gtTitle = () => T('gtTitle');
VY.gtBanner = () => { const r = VY.kvGet('grLevel');
  return `<a class="card gt-banner" href="#/grammar/level${r ? '/result' : ''}"><span class="gt-bm">🦊</span><div class="gt-tx" style="flex:1;min-width:0"><b>${T('gtCard')}</b><span class="small muted">${r ? `${t('yourLevel')}: <b class="en">${esc(r.cefr)}</b> · ${lvName(r.lv)}` : T('gtCardS')}</span></div><span class="btn btn-primary btn-sm">${r ? T('gtSeeResult') : T('gtStart')}</span></a>`; };

/* ================= OVERALL EXAM (#/exam): vocabulary + grammar + reading ================= */
let X = null;
const PL = () => VY.PL;
ACT.exStart = () => {
  if(!PL() || PL().pool().length < 40){ VY.toast(t('notEnough')); return; }
  X = {step: 'v', t0: Date.now(), v: {resp: [], used: new Set(), th: 2, ans: [], cur: null}, g: newG(), r: [], ri: 0};
  X.v.cur = PL().vocabItem(X.v.th, X.v.used);
  if(location.hash !== '#/exam') location.hash = '#/exam'; else VY.rerender();
};
ACT.exQuit = () => { if(X && !confirm(t('plQuitQ'))) return; X = null; VY.go('home'); };
ACT.exVAns = el => {
  const S = X && X.v; if(!S || S.lock) return; const v = +el.dataset.v, q = S.cur, ok = v === q.a;
  S.lock = true; S.used.add(q.id); S.resp.push({b: q.band, ok, c: v < 0 ? 0 : 0.25}); S.ans.push(ok); S.th = estimate(S.resp, 2.5, 2).th;
  document.querySelectorAll('.gt .opt').forEach(b => { const i = +b.dataset.v; b.disabled = true; if(i === q.a) b.classList.add('correct'); else if(i === v) b.classList.add('wrong'); });
  VY.sound && VY.sound(ok ? 'ok' : 'bad');
  setTimeout(() => { S.lock = false; if(S.ans.length >= EX_V){ X.step = 'g'; X.g.cur = pickGrammar(X.g); } else S.cur = PL().vocabItem(S.th, S.used); VY.rerender(); }, ok ? 500 : 1000);
};
function exNext(){ const S = X.g; if(S.ans.length >= EX_G){ X.step = 'r'; S.cur = null; } else S.cur = pickGrammar(S); VY.rerender(); }
ACT.exRAns = el => { if(!X || X.lock) return; const c = +el.dataset.v, q = PL().RQS[X.ri]; X.lock = true;
  document.querySelectorAll('.gt .opt').forEach(b => { b.disabled = true; if(+b.dataset.v === c) b.classList.add('on'); });
  X.r.push(c === q.a); setTimeout(() => { X.lock = false; X.ri++; if(X.ri >= PL().RQS.length) exFinish(); else VY.rerender(); }, 350); };
function exFinish(){
  const L = PL(), ev = estimate(X.v.resp, 2.5, 2), thV = Math.max(0.5, Math.min(6.5, ev.th)), g = summaryG(X.g);
  const rs = X.r.filter(Boolean).length / L.RQS.length, thR = 1.2 + rs * 4.6;
  const th = Math.max(-0.5, Math.min(6.5, 0.4 * thV + 0.4 * g.theta + 0.2 * thR)), lv = levelOf(th);
  const old = VY.kvGet('exam');
  const r = {lv, cefr: LV[lv], theta: Math.round(th * 100) / 100, sub: subOf(th), score: scoreOf(th),
    v: {lv: levelOf(thV), cefr: LV[levelOf(thV)], ok: X.v.ans.filter(Boolean).length, n: X.v.ans.length, vocab: Math.round(L.interp(L.VOC, thV) / 50) * 50},
    g: {lv: g.lv, cefr: g.cefr, ok: g.ok, n: g.n, ans: g.ans, per: g.per},
    r: {ok: X.r.filter(Boolean).length, n: L.RQS.length, pct: Math.round(rs * 100)},
    ielts: Math.round(L.interp(L.IELTS, Math.max(1, th)) * 2) / 2, toefl: Math.round(L.interp(L.TOEFL, Math.max(1, th))),
    at: Date.now(), time: Math.round((Date.now() - X.t0) / 1000)};
  r.hist = ((old && old.hist) || []).concat(old ? [{at: old.at, cefr: old.cefr, score: old.score}] : []).slice(-5);
  VY.kvSet('exam', r); VY.addXP && VY.addXP(40); VY.save(); VY.sound && VY.sound('done');
  X = null; VY.go('exam/result');
}
function exIntro(){
  const r = VY.kvGet('exam'), L = PL();
  return `<div class="gt"><div class="card gt-intro">
    <div class="gt-mascot">🦊<span>🏆</span></div>
    <h2>${T('exTitle')}</h2><p class="muted">${T('exSub')}</p>
    <div class="pl-steps gt-parts">${[['📚', T('exPartV'), T('exPartVS', {n: n(EX_V)})], ['✏️', T('exPartG'), T('exPartGS', {n: n(EX_G)})], ['📖', T('exPartR'), T('exPartRS', {n: n(L ? L.RQS.length : 5)})]].map(([e, a, b], i) => `<div class="pl-step"><span class="pl-n">${n(i + 1)}</span><div><b>${e} ${a}</b><span class="small muted">${b}</span></div></div>`).join('')}</div>
    ${ladder(r ? r.lv : null, true)}
    <p class="small muted gt-note">💡 ${T('gtNoGuess')}</p>
    <div class="row wrap mt16" style="justify-content:center;gap:10px">${r ? `<a class="btn btn-ghost btn-lg" href="#/exam/result">${T('gtLast')} · <span class="en">${esc(r.cefr)}</span></a>` : ''}<button class="btn btn-primary btn-lg" data-act="exStart">${T('exStart')} ${icon('arrow')}</button></div>
  </div></div>`;
}
function exTest(){
  const L = PL(), total = EX_V + EX_G + L.RQS.length, done = X.v.ans.length + X.g.ans.length + X.ri, part = X.step === 'v' ? 1 : X.step === 'g' ? 2 : 3;
  const top = topBar(done, total, `${['📚', '✏️', '📖'][part - 1]} ${T('exPart', {a: n(part), b: n(3)})}`, 'exQuit');
  let body = '';
  if(X.step === 'v'){ const q = X.v.cur;
    body = `<div class="card q-prompt gt-vq"><div class="q-type">${t('qWhatMeans')}</div><div class="row" style="justify-content:center;gap:12px"><div class="q-main en" dir="ltr">${esc(q.word)}</div>${VY.speakBtn(q.word, 'sm')}</div></div>
      <div class="opts">${q.o.map((o, i) => `<button class="opt" data-act="exVAns" data-v="${i}"><span class="k">${n(i + 1)}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div class="row mt12" style="justify-content:center"><button class="btn btn-ghost btn-sm gt-dk" data-act="exVAns" data-v="-1">🤷 ${T('gtDontKnow')}</button></div>`; }
  else if(X.step === 'g'){ const S = X.g; body = qCard(BANK[S.cur.i], S.cur, S.st); }
  else { const q = L.RQS[X.ri];
    body = `<div class="card pl-passage"><div class="lbl">📖 ${T('exReadQ')}</div><p class="en" dir="ltr">${esc(L.PASSAGE)}</p></div>
      <div class="card q-prompt mt12" style="padding:20px"><div class="q-sent en" dir="ltr">${esc(q.q)}</div></div>
      <div class="opts">${q.o.map((o, i) => `<button class="opt en" dir="ltr" data-act="exRAns" data-v="${i}"><span class="k">${String.fromCharCode(65 + i)}</span><span>${esc(o)}</span></button>`).join('')}</div>`; }
  return `<div class="gt gt-run quiz">${top}${body}</div>`;
}
function skill(e, label, cefr, sub, pct, href){
  return `<a class="gt-skill" href="${href}"><span class="gt-se">${e}</span><b>${label}</b><span class="gt-sc en">${esc(cefr)}</span><small>${sub}</small><div class="progress"><i style="width:${Math.max(3, pct)}%"></i></div></a>`;
}
function exResult(r){
  return `<div class="gt gt-res">
    <section class="hero gt-hero lv${r.lv}"><div class="gt-hero-tx">
      <span class="chip gt-hchip">🏆 ${T('exOverall')}</span>
      <h2><span class="en">${esc(r.cefr)}</span> · ${lvName(r.lv)}</h2><p>${T('lvD' + r.lv)}</p>
      <div class="row wrap mt12" style="gap:6px">${r.lv >= 2 ? `<span class="chip gt-hchip">IELTS ≈ ${n(r.ielts)}</span><span class="chip gt-hchip">TOEFL iBT ≈ ${n(r.toefl)}</span>` : ''}<span class="chip gt-hchip">⏱ ${n(Math.max(1, Math.round(r.time / 60)))} ${t('min')}</span></div>
    </div>${VY.ring(r.score / 100, 128, 12, '#FFE58A', 'rgba(255,255,255,.22)', `<div><b class="en">${esc(r.cefr)}</b><br><span>${n(r.score)}${fa() ? '٪' : '%'}</span></div>`)}</section>
    <div class="card mt16">${ladder(r.lv)}</div>
    <div class="section-title"><h2>${T('exParts')}</h2></div>
    <div class="gt-skills">
      ${skill('📚', T('exPartV'), r.v.cefr, `${T('exVocab', {n: n(r.v.vocab)})} · ${T('gtCorrect', {a: n(r.v.ok), b: n(r.v.n)})}`, r.v.ok / r.v.n * 100, '#/placement')}
      ${skill('✏️', T('exPartG'), r.g.cefr, T('gtCorrect', {a: n(r.g.ok), b: n(r.g.n)}), r.g.ok / r.g.n * 100, '#/grammar/level')}
      ${skill('📖', T('exPartR'), (r.r.pct >= 80 ? 'B2+' : r.r.pct >= 60 ? 'B1' : r.r.pct >= 40 ? 'A2' : 'A1'), T('gtCorrect', {a: n(r.r.ok), b: n(r.r.n)}), r.r.pct, '#/reading')}
    </div>
    <div class="grid g2 mt16">
      <div class="card"><h3>🔁 ${T('gtReview')}</h3>${reviewTopics(r.g.ans)}</div>
      <div class="card"><h3>🎯 ${T('exMore')}</h3><div class="col mt12" style="display:flex;flex-direction:column;gap:8px"><a class="btn btn-soft" href="#/placement">📚 ${T('exMoreV')}</a><a class="btn btn-soft" href="#/grammar/level">✏️ ${T('exMoreG')}</a></div></div>
    </div>
    ${answersList(r.g.ans)}
    ${r.hist && r.hist.length ? `<div class="card mt16"><h3>🕘 ${T('gtHistory')}</h3><div class="list">${r.hist.slice().reverse().map(h => `<div class="li"><span class="w en" dir="ltr">${esc(h.cefr)}</span><span class="m">${n(h.score)}${fa() ? '٪' : '%'}</span><span class="muted small">${fmtDate(h.at)}</span></div>`).join('')}</div></div>` : ''}
    <div class="row wrap mt16" style="gap:8px;justify-content:center"><button class="btn btn-primary" data-act="exStart">${icon('repeat')} ${T('gtRetake')}</button><a class="btn btn-ghost" href="#/home">${icon('back')} ${t('home')}</a></div>
  </div>`;
}
V.exam = {title: () => T('exTitle'), render(){ if(X) return exTest(); const r = VY.kvGet('exam'); if((VY.params || [])[0] === 'result' && r) return exResult(r); return exIntro(); }};
/* home card */
VY.examCard = () => { const r = VY.kvGet('exam');
  return `<a class="card gt-home" href="#/exam${r ? '/result' : ''}"><div class="gt-hm">🦊<span>🏆</span></div><div class="gt-tx" style="flex:1;min-width:0"><b>${T('exCard')}</b>
    <span class="small">${r ? `${T('exLast')}: <b class="en">${esc(r.cefr)}</b> · ${T('exPartV')} <span class="en">${esc(r.v.cefr)}</span> · ${T('exPartG')} <span class="en">${esc(r.g.cefr)}</span>` : T('exCardS')}</span></div>
    <span class="btn btn-yellow btn-sm">${r ? T('gtSeeResult') : T('exStart')} ${icon('arrow')}</span></a>`; };
/* keyboard: 1–4 / A–D choose, 0 or ? = I don't know */
document.addEventListener('keydown', e => {
  if(e.target.matches && e.target.matches('input,textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
  const run = (VY.current === 'grammar' && G) || (VY.current === 'exam' && X); if(!run) return;
  const k = e.key.toLowerCase(), i = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
  const btns = [...document.querySelectorAll('.gt-run .gt-opt:not([disabled]), .gt-run .opts .opt:not([disabled])')];
  if(i >= 0 && btns[i]){ e.preventDefault(); btns[i].click(); }
  else if(k === '0' || k === '?'){ const d = document.querySelector('.gt-run .gt-dk:not([disabled])'); if(d){ e.preventDefault(); d.click(); } }
});
})();
