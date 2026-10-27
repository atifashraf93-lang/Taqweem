/* Kutub Khana: names and links only. Every link below is a Rekhta e-book page found by search; the book text is NOT stored in the app.
   Fields: [category, title, author, note, url] */
window.BOOK_CATS = { all: 'سب', had: 'احادیث', mod: 'مودودی', qt: 'سید قطب', km: 'خرم مراد', is: 'اصلاحی' };
(function () {
  var R = 'https://www.rekhta.org/ebooks/detail/';
  var M = 'مولانا ابوالاعلیٰ مودودیؒ', Q = 'سید قطب شہیدؒ', K = 'خرم مرادؒ', I = 'مولانا امین احسن اصلاحیؒ';
  window.BOOKS = [
    ['mod', 'تفہیم القرآن', M, 'تفسیر', R + 'tafheem-ul-quran-maulana-abul-aala-maududi-ebooks'],
    ['mod', 'تفہیم القرآن (جلد 1)', M, 'تفسیر', R + 'tafheem-ul-quran-volume-001-ebooks'],
    ['mod', 'تفہیم القرآن (جلد 3)', M, 'تفسیر', R + 'tafhimul-quran-volume-003-abul-ala-maudoodi-ebooks'],
    ['mod', 'تفہیم القرآن (جلد 4)', M, 'تفسیر', R + 'tafheem-ul-quran-volume-004-abul-ala-maudoodi-ebooks'],
    ['mod', 'خطبات', M, 'عبادات', R + 'khutbat-maulana-abul-aala-maududi-ebooks'],
    ['mod', 'قرآن کی چار بنیادی اصطلاحیں', M, 'قرآن', R + 'quran-ki-char-bunyadi-istilahen-abul-ala-maudoodi-ebooks'],
    ['mod', 'رسالہ دینیات', M, 'بنیادی عقائد', R + 'risala-e-diniyat-abul-ala-maudoodi-ebooks'],
    ['mod', 'پردہ', M, 'معاشرت', R + 'pardah-maulana-abul-aala-maududi-ebooks'],
    ['mod', 'سیرتِ سرورِ عالمﷺ (جلد 1)', M, 'سیرت', R + 'sirat-e-sarwar-e-aalam-volume-001-abul-ala-maudoodi-ebooks'],
    ['mod', 'خلافت و ملوکیت', M, 'تاریخ', R + 'khilafat-o-mulookiyat-abul-ala-maudoodi-ebooks'],
    ['mod', 'سود (حصہ 2)', M, 'معیشت', R + 'sood-part-002-abul-ala-maudoodi-ebooks-1'],
    ['mod', 'اسلامی ریاست', M, 'سیاست', 'https://rekhta.org/ebook-detail/islami-riyasat-abul-ala-maudoodi-ebooks'],
    ['mod', 'تحریکِ اسلامی کی اخلاقی بنیادیں', M, 'تحریک', R + 'tahreek-e-islami-ki-akhlaqi-buniyadein-abul-a-la-maududi-ebooks'],
    ['mod', 'اسلامی تہذیب اور اس کے اصول و مبادی', M, 'تہذیب', R + 'islami-tahzeeb-aur-uske-usool-o-mabadi-abul-ala-maudoodi-ebooks'],
    ['mod', 'اسلام کی راہِ راست اور اس سے انحراف کی راہیں', M, 'دعوت', R + 'islam-ki-rah-e-rast-aur-us-se-inhiraf-ki-rahen-abul-ala-maudoodi-ebooks'],
    ['mod', 'زندگی بعد موت', M, 'آخرت', R + 'zindagi-bad-maut-abul-a-la-maududi-ebooks'],
    ['mod', 'مسئلہ تعددِ ازواج', M, 'معاشرت', R + 'masala-taaddud-e-azwaj-maulana-abul-aala-maududi-ebooks'],

    ['qt', 'اسلام میں عدلِ اجتماعی', Q, 'معاشرہ', R + 'islam-mein-adl-e-ijtema-syed-qutub-shaheed-ebooks'],
    ['qt', 'جادہ و منزل (معالم فی الطریق)', Q, 'فکر', 'https://rekhta.org/ebook-detail/jada-o-manzil-syed-qutub-shaheed-ebooks'],
    ['qt', 'اسلامی تصور کی خصوصیات', Q, 'عقیدہ', R + 'islami-tasawwur-ki-khususiyat-syed-qutub-shaheed-ebooks'],
    ['qt', 'اسلام کی ضرورت', Q, 'فکر', R + 'islam-ek-zarurat-syed-qutub-shaheed-ebooks'],
    ['qt', 'اسلام دینِ حق', Q, 'فکر', 'https://www.rekhta.org/ebooks/islam-deen-e-haq-syed-qutub-shaheed-ebooks?lang=ur'],
    ['qt', 'اسلام کا روشن مستقبل', Q, 'فکر', R + 'islam-ka-raushan-mustaqbil-syed-qutub-shaheed-ebooks'],
    ['qt', 'اسلام کا نظامِ عدل', Q, 'معاشرہ', R + 'islam-ka-nizam-e-adl-ustaz-syed-qutub-ebooks'],
    ['qt', 'قرآن اور سائنس', Q, 'قرآن', R + 'quran-aur-science-ustaz-syed-qutub-ebooks'],

    ['km', 'رب کا پیغام', K, 'قرآن', R + 'rab-ka-paigham-khurram-murad-ebooks'],
    ['km', 'استقبالِ رمضان', K, 'رمضان', R + 'istaqbal-e-ramazan-khurram-murad-ebooks'],
    ['km', 'محاسبۂ نفس: آسان طریقہ', K, 'تزکیہ', R + 'muhasba-e-nafs-aasan-tariqa-khurram-murad-ebooks'],
    ['km', 'تحریکِ اسلامی میں کارکنوں کے باہمی تعلقات', K, 'تحریک', R + 'tahreek-e-islaami-me-kaarkunaon-ke-baahami-ta-alluqaat-khurram-murad-ebooks'],
    ['km', 'رہنمائی (رسائل و مسائل کے جوابات)', K, 'سوال جواب', R + 'rehnumayi-rasaail-o-masaail-ke-unwaan-se-shaa-e-hone-waale-jawabaat-khurram-murad-ebooks'],

    ['is', 'تدبرِ قرآن', I, 'تفسیر', R + 'tadabbur-e-quran-ameen-ahsan-islahi-ebooks'],
    ['is', 'تدبرِ قرآن (جلد 5)', I, 'تفسیر', R + 'tadabbur-e-quran-volume-005-ameen-ahsan-islahi-ebooks'],
    ['is', 'مبادیِ تدبرِ قرآن', I, 'تفسیر', R + 'mabadia-e-tadabbur-e-quran-ameen-ahsan-islahi-ebooks'],
    ['is', 'حقیقتِ نماز', I, 'عبادات', R + 'haqeeqat-e-namaz-ameen-ahsan-islahi-ebooks'],
    ['is', 'حقیقتِ شرک', I, 'عقیدہ', R + 'haqeeqat-e-shirk-ameen-ahsan-islahi-ebooks'],
    ['is', 'حقیقتِ توحید', I, 'عقیدہ', 'https://www.rekhta.org/ebook-detail/haqeeqat-e-tauheed-ameen-ahsan-islahi-ebooks'],
    ['is', 'حقیقتِ تقویٰ', I, 'تزکیہ', 'https://rekhta.org/ebook-detail/haqeeqat-e-taqwa-ameen-ahsan-islahi-ebooks-1'],

    ['had', 'صحیح بخاری', 'امام بخاریؒ', 'صحاحِ ستہ', R + 'saheeh-ul-bukhari-hazrat-imam-bukhari-ebooks'],
    ['had', 'صحیح بخاری (اردو ترجمہ، جلد 1)', 'امام بخاریؒ', 'صحاحِ ستہ', R + 'tarjumah-saheeh-bukhari-urdu-volume-001-hazrat-imam-bukhari-ebooks'],
    ['had', 'صحیح مسلم شریف (مکمل، اردو)', 'امام مسلمؒ', 'صحاحِ ستہ', R + 'saheeh-muslim-sharif-kamil-agha-rafeeq-bulandshahri-ebooks'],
    ['had', 'موطا امام مالک', 'امام مالکؒ', 'حدیث', R + 'muatta-imam-malik-imam-malik-ebooks-1'],
    ['had', 'ریاض الصالحین', 'امام نوویؒ', 'منتخب احادیث', R + 'riyaz-us-saliheen-aboo-zakariyya-yahya-bin-ali-ebooks'],
    ['had', 'ریاض الصالحین (جلد 1)', 'امام نوویؒ', 'منتخب احادیث', R + 'riyaz-us-saleheen-volume-1-ebooks'],
    ['had', 'انوار المصابیح: اردو شرح مشکوٰۃ المصابیح (جلد 9)', 'مشکوٰۃ المصابیح', 'شرح', 'https://rekhta.org/ebooks/detail/anwarul-masabih-tarjumah-urdu-mishkatul-masabih-volume-009-unknown-author-ebooks']
  ];
})();
