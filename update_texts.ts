import { getBotTexts, updateBotTexts } from './server/db.js';

const defaultTexts = {
  ru: {
    welcome: '👋 Здравствуйте, <b>{name}</b>!\n\nДобро пожаловать в кастинг <b>Dinay Brandface</b>! 🌟\n\nПожалуйста, ознакомьтесь с публичной офертой.\n\nВы готовы заполнить анкету?',
    agree: '✅ Начать',
    ask_name: 'Отлично! 🎉\n\nПожалуйста, отправьте ваши <b>Имя и Фамилию</b> текстовым сообщением. ✍️',
    ask_age_city: 'Супер! Теперь укажите ваш <b>возраст</b> и <b>город проживания</b>. 🏙️\n\n<i>Пример: 22, Ташкент</i>',
    ask_social: 'Отправьте ссылку на ваш профиль <b>Instagram</b> или <b>TikTok</b>. 📱',
    ask_lang_proficiency: '💬 <b>Владеете ли вы русским и узбекским языками в совершенстве?</b>\n\nЛицо бренда Dinay должно свободно общаться на обоих языках. Пожалуйста, напишите, как хорошо вы владеете русским и узбекским. 🗣️',
    ask_video_uz: 'Спасибо! Чтобы мы могли оценить вашу харизму и владение языком, отправьте короткое <b>видеосообщение (кружочек) на УЗБЕКСКОМ языке</b> (до 30 сек).\n\nВ видео ответьте на вопрос:\n💬 <i>«Почему именно вы должны стать лицом Dinay?»</i>\n\n🎥 <i>Принимаются только видео или кружочки.</i>',
    ask_video_ru: 'Отлично! А теперь, чтобы продемонстрировать знание второго языка, запишите такое же <b>видеосообщение (кружочек) на РУССКОМ языке</b> (до 30 сек).\n\nОтветьте на тот же вопрос:\n💬 <i>«Почему именно вы должны стать лицом Dinay?»</i>\n\n🎥 <i>Принимаются только видео или кружочки.</i>',
    done: '🎉 Ваша анкета принята!\nСпасибо за интерес к Dinay 💚\nЕсли ваша кандидатура пройдёт текущий этап отбора, мы свяжемся с вами.',
    not_video: '❌ Пожалуйста, отправьте именно <b>видео</b> или <b>видеосообщение (кружочек)</b>.',
    approved: '🎉 <b>Поздравляем, {name}!</b>\n\nВаша заявка на участие в кастинге <b>Dinay Brandface</b> была <b>одобрена</b>! 🥳 Мы скоро свяжемся с вами для дальнейших шагов.',
    rejected: '😔 <b>Здравствуйте, {name}.</b>\n\nК сожалению, ваша заявка была отклонена. Спасибо за проявленный интерес и участие! Желаем успехов в будущем. 🌟'
  },
  uz: {
    welcome: '👋 Assalomu alaykum, <b>{name}</b>!\n\n<b>Dinay Brandface</b> kastingiga xush kelibsiz! 🌟\n\nIltimos, ommaviy oferta bilan tanishib chiqing.\n\nAnketani to\'ldirishga tayyormisiz?',
    agree: '✅ Boshlash',
    ask_name: 'Ajoyib! 🎉\n\nIltimos, <b>Ism va Familiyangizni</b> matnli xabar orqali yuboring. ✍️',
    ask_age_city: 'Super! Endi <b>yoshingizni</b> va <b>yashash shahringizni</b> kiriting. 🏙️\n\n<i>Misol: 22, Toshkent</i>',
    ask_social: '<b>Instagram</b> yoki <b>TikTok</b> profilingiz havolasini yuboring. 📱',
    ask_lang_proficiency: '💬 <b>Rus va o\'zbek tillarini mukammal bilasizmi?</b>\n\nDinay brendining yuzi ikkala tilda ham erkin muloqot qila olishi kerak. Iltimos, rus va o\'zbek tillarini qay darajada bilishingizni yozib yuboring. 🗣️',
    ask_video_uz: 'Rahmat! Xarizmangiz va til bilish darajangizni baholashimiz uchun, qisqa <b>video xabar (aylana) O\'ZBEK tilida</b> (30 soniyagacha) yuboring.\n\nVideoda quyidagi savolga javob bering:\n💬 <i>«Nima uchun aynan siz Dinay yuzi bo\'lishingiz kerak?»</i>\n\n🎥 <i>Faqat video yoki aylana video qabul qilinadi.</i>',
    ask_video_ru: 'Ajoyib! Endi ikkinchi tilni bilishingizni ko\'rsatish uchun, xuddi shunday <b>video xabarni (aylana) RUS tilida</b> (30 soniyagacha) yozib yuboring.\n\nXuddi shu savolga javob bering:\n💬 <i>«Nima uchun aynan siz Dinay yuzi bo\'lishingiz kerak?»</i>\n\n🎥 <i>Faqat video yoki aylana video qabul qilinadi.</i>',
    done: '🎉 Sizning anketangiz qabul qilindi!\nDinayga bo\'lgan qiziqishingiz uchun rahmat 💚\nAgar nomzodingiz joriy saralash bosqichidan o\'tsa, biz siz bilan bog\'lanamiz.',
    not_video: '❌ Iltimos, faqat <b>video</b> yoki <b>video xabar (aylana)</b> yuboring.',
    approved: '🎉 <b>Tabriklaymiz, {name}!</b>\n\nSizning <b>Dinay Brandface</b> kastingidagi arizangiz <b>qabul qilindi</b>! 🥳 Keyingi qadamlar uchun tez orada siz bilan bog\'lanamiz.',
    rejected: '😔 <b>Assalomu alaykum, {name}.</b>\n\nAfsuski, arizangiz rad etildi. Qiziqish bildirganingiz va ishtirokingiz uchun rahmat! Kelgusidagi ishlaringizda muvaffaqiyatlar tilaymiz. 🌟'
  }
};

async function run() {
  try {
    const currentTexts = await getBotTexts();
    let newTexts = { ...defaultTexts };
    
    // Preserve offer_file_id if it exists
    if (currentTexts && currentTexts.offer_file_id) {
      newTexts.offer_file_id = currentTexts.offer_file_id;
    }
    
    await updateBotTexts(newTexts);
    console.log('Texts updated successfully in DB!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

run();
