/* Kutub Khana: names and links only. Every link is a Rekhta e-book page found by search; no book text is stored in the app.
   One entry per book (no separate volumes). Fields: [category, title, short description, url] */
window.BOOK_CATS = { all: 'سب', had: 'احادیث', mod: 'مودودی', qt: 'سید قطب', km: 'خرم مراد', is: 'اصلاحی' };
window.BOOK_AUTH = { had: 'کتبِ حدیث', mod: 'مولانا ابوالاعلیٰ مودودیؒ', qt: 'سید قطب شہیدؒ', km: 'خرم مرادؒ', is: 'مولانا امین احسن اصلاحیؒ' };
(function () {
  var R = 'https://www.rekhta.org/ebooks/detail/';
  window.BOOKS = [
    ['had', 'صحیح بخاری', 'امام بخاریؒ · صحیح ترین احادیث کا مجموعہ', R + 'saheeh-ul-bukhari-hazrat-imam-bukhari-ebooks'],
    ['had', 'صحیح مسلم', 'امام مسلمؒ · صحیح احادیث کا مجموعہ (اردو)', R + 'saheeh-muslim-sharif-kamil-agha-rafeeq-bulandshahri-ebooks'],
    ['had', 'موطا امام مالک', 'امام مالکؒ · حدیث و فقہ کا قدیم مجموعہ', R + 'muatta-imam-malik-imam-malik-ebooks-1'],
    ['had', 'ریاض الصالحین', 'امام نوویؒ · اخلاق و عبادات سے متعلق منتخب احادیث', R + 'riyaz-us-saliheen-aboo-zakariyya-yahya-bin-ali-ebooks'],

    ['mod', 'تفہیم القرآن', 'قرآن کا اردو ترجمہ اور تفسیر', R + 'tafheem-ul-quran-maulana-abul-aala-maududi-ebooks'],
    ['mod', 'خطبات', 'ایمان، نماز، روزہ، زکوٰۃ اور حج کی حقیقت', R + 'khutbat-maulana-abul-aala-maududi-ebooks'],
    ['mod', 'قرآن کی چار بنیادی اصطلاحیں', 'الٰہ، رب، دین اور عبادت کا قرآنی مفہوم', R + 'quran-ki-char-bunyadi-istilahen-abul-ala-maudoodi-ebooks'],
    ['mod', 'رسالہ دینیات', 'اسلام کے بنیادی عقائد اور احکام کا مختصر تعارف', R + 'risala-e-diniyat-abul-ala-maudoodi-ebooks'],
    ['mod', 'پردہ', 'اسلام میں پردے اور عورت کے مقام پر', R + 'pardah-maulana-abul-aala-maududi-ebooks'],
    ['mod', 'خلافت و ملوکیت', 'خلافت کے ملوکیت میں بدلنے کی تاریخ', 'https://rekhta.org/ebooks/detail/khilafat-o-mulookiyat-abul-ala-maudoodi-ebooks'],
    ['mod', 'تحریکِ اسلامی کی اخلاقی بنیادیں', 'اسلامی کام کرنے والوں کے اخلاقی اصول', R + 'tahreek-e-islami-ki-akhlaqi-buniyadein-abul-a-la-maududi-ebooks'],

    ['qt', 'جادہ و منزل', 'معالم فی الطریق · ان کی معروف مگر مباحث کی حامل کتاب', 'https://rekhta.org/ebook-detail/jada-o-manzil-syed-qutub-shaheed-ebooks'],
    ['qt', 'اسلام میں عدلِ اجتماعی', 'اسلام کے معاشرتی عدل کا تصور', R + 'islam-mein-adl-e-ijtema-syed-qutub-shaheed-ebooks'],
    ['qt', 'اسلامی تصور کی خصوصیات', 'اسلامی نظریۂ حیات کی خصوصیات', R + 'islami-tasawwur-ki-khususiyat-syed-qutub-shaheed-ebooks'],
    ['qt', 'اسلام کا روشن مستقبل', 'اس دین کے مستقبل پر', R + 'islam-ka-raushan-mustaqbil-syed-qutub-shaheed-ebooks'],

    ['km', 'رب کا پیغام', '', R + 'rab-ka-paigham-khurram-murad-ebooks'],
    ['km', 'استقبالِ رمضان', 'رمضان کی تیاری کے لیے رہنمائی', R + 'istaqbal-e-ramazan-khurram-murad-ebooks'],
    ['km', 'محاسبۂ نفس: آسان طریقہ', 'خود احتسابی کا آسان طریقہ', R + 'muhasba-e-nafs-aasan-tariqa-khurram-murad-ebooks'],

    ['is', 'تدبرِ قرآن', 'قرآن کی تفسیر، نظمِ قرآن کی روشنی میں', R + 'tadabbur-e-quran-ameen-ahsan-islahi-ebooks'],
    ['is', 'مبادیِ تدبرِ قرآن', 'تدبرِ قرآن کے اصولوں کا تعارف', R + 'mabadia-e-tadabbur-e-quran-ameen-ahsan-islahi-ebooks'],
    ['is', 'حقیقتِ نماز', '', R + 'haqeeqat-e-namaz-ameen-ahsan-islahi-ebooks'],
    ['is', 'حقیقتِ توحید', '', 'https://www.rekhta.org/ebook-detail/haqeeqat-e-tauheed-ameen-ahsan-islahi-ebooks'],
    ['is', 'حقیقتِ تقویٰ', '', 'https://rekhta.org/ebook-detail/haqeeqat-e-taqwa-ameen-ahsan-islahi-ebooks-1']
  ];
})();
