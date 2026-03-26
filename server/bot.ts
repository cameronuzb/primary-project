import { Bot, Context, session, SessionFlavor, InputFile } from 'grammy';
import { getUser, updateUser, createApplication, getApplications, getBotTexts, updateBotTexts } from './db.js';

interface SessionData {
  language?: 'ru' | 'uz';
  step: number;
  fullName?: string;
  ageCity?: string;
  socialLink?: string;
  langProficiency?: string;
  videoRuId?: string;
  videoUzId?: string;
}

type MyContext = Context & SessionFlavor<SessionData>;

export let bot: Bot<MyContext> | null = null;
let isRunning = false;

let isStarting = false;

export function isBotRunning() {
  return isRunning || isStarting;
}

export async function stopBot() {
  if (bot) {
    try {
      await bot.stop();
    } catch (e) {
      console.error('Error stopping bot:', e);
    }
    isRunning = false;
    bot = null;
  }
}

const defaultTexts = {
  ru: {
    welcome: '👋 Здравствуйте, <b>{name}</b>!\n\nДобро пожаловать на кастинг <b>Dinay Brandface</b>! 🌟\n\nПеред началом, пожалуйста, ознакомьтесь с публичной офертой.\n\nГотовы заполнить анкету?',
    agree: '✅ Начать',
    ask_name: 'Отлично! 🎉\n\nДля начала, пожалуйста, напишите ваши <b>Имя и Фамилию</b>.',
    ask_age_city: 'Супер! Укажите ваш <b>возраст</b> и <b>город проживания</b>.\n\n<i>Пример: 22, Ташкент</i>',
    ask_social: 'Пожалуйста, отправьте ссылку на ваш профиль в <b>Instagram</b> или <b>TikTok</b>. 📱',
    ask_lang_proficiency: '💬 <b>Владеете ли вы русским и узбекским языками?</b>\n\nЛицо бренда Dinay должно свободно общаться на обоих языках. Пожалуйста, оцените ваш уровень владения русским и узбекским языками. 🗣️',
    ask_video_uz: 'Спасибо! Чтобы мы могли оценить вашу харизму и подачу, отправьте короткое <b>видеосообщение (кружочек) на УЗБЕКСКОМ языке</b> (до 30 секунд).\n\nОтветьте на вопрос:\n💬 <i>«Почему именно вы должны стать лицом бренда Dinay?»</i>\n\n🎥 <i>Принимаются только видео или кружочки.</i>',
    ask_video_ru: 'Отлично! А теперь запишите такое же <b>видеосообщение (кружочек) на РУССКОМ языке</b> (до 30 секунд).\n\nОтветьте на тот же вопрос:\n💬 <i>«Почему именно вы должны стать лицом бренда Dinay?»</i>\n\n🎥 <i>Принимаются только видео или кружочки.</i>',
    done: '🎉 Ваша анкета успешно принята!\n\nБлагодарим за интерес к бренду Dinay 💚\nЕсли ваша кандидатура пройдет отбор, наша команда обязательно свяжется с вами.',
    not_video: '❌ Пожалуйста, отправьте <b>видео</b> или <b>видеосообщение (кружочек)</b>.',
    approved: '🎉 <b>Поздравляем, {name}!</b>\n\nВаша заявка на участие в кастинге <b>Dinay Brandface</b> была <b>одобрена</b>! 🥳 Мы скоро свяжемся с вами для дальнейших шагов.',
    rejected: '😔 <b>Здравствуйте, {name}.</b>\n\nК сожалению, ваша заявка была отклонена. Спасибо за проявленный интерес и участие! Желаем успехов в будущем. 🌟'
  },
  uz: {
    welcome: '👋 Assalomu alaykum, <b>{name}</b>!\n\n<b>Dinay Brandface</b> kastingiga xush kelibsiz! 🌟\n\nBoshlashdan oldin, iltimos, ommaviy oferta bilan tanishib chiqing.\n\nAnketani to\'ldirishga tayyormisiz?',
    agree: '✅ Boshlash',
    ask_name: 'Ajoyib! 🎉\n\nBoshlash uchun, iltimos, <b>Ism va Familiyangizni</b> yozib yuboring.',
    ask_age_city: 'Super! Endi <b>yoshingizni</b> va <b>yashash shahringizni</b> kiriting.\n\n<i>Misol: 22, Toshkent</i>',
    ask_social: 'Iltimos, <b>Instagram</b> yoki <b>TikTok</b> profilingiz havolasini yuboring. 📱',
    ask_lang_proficiency: '💬 <b>Rus va o\'zbek tillarini bilasizmi?</b>\n\nDinay brendining yuzi ikkala tilda ham erkin muloqot qila olishi kerak. Iltimos, rus va o\'zbek tillarini qay darajada bilishingizni yozib yuboring. 🗣️',
    ask_video_uz: 'Rahmat! Xarizmangiz va nutqingizni baholashimiz uchun, qisqa <b>video xabar (aylana) O\'ZBEK tilida</b> (30 soniyagacha) yuboring.\n\nQuyidagi savolga javob bering:\n💬 <i>«Nima uchun aynan siz Dinay brendining yuzi bo\'lishingiz kerak?»</i>\n\n🎥 <i>Faqat video yoki aylana video qabul qilinadi.</i>',
    ask_video_ru: 'Ajoyib! Endi xuddi shunday <b>video xabarni (aylana) RUS tilida</b> (30 soniyagacha) yozib yuboring.\n\nXuddi shu savolga javob bering:\n💬 <i>«Nima uchun aynan siz Dinay brendining yuzi bo\'lishingiz kerak?»</i>\n\n🎥 <i>Faqat video yoki aylana video qabul qilinadi.</i>',
    done: '🎉 Sizning anketangiz muvaffaqiyatli qabul qilindi!\n\nDinay brendiga bo\'lgan qiziqishingiz uchun rahmat 💚\nAgar nomzodingiz saralashdan o\'tsa, jamoamiz siz bilan albatta bog\'lanadi.',
    not_video: '❌ Iltimos, <b>video</b> yoki <b>video xabar (aylana)</b> yuboring.',
    approved: '🎉 <b>Tabriklaymiz, {name}!</b>\n\nSizning <b>Dinay Brandface</b> kastingidagi arizangiz <b>qabul qilindi</b>! 🥳 Keyingi qadamlar uchun tez orada siz bilan bog\'lanamiz.',
    rejected: '😔 <b>Assalomu alaykum, {name}.</b>\n\nAfsuski, arizangiz rad etildi. Qiziqish bildirganingiz va ishtirokingiz uchun rahmat! Kelgusidagi ishlaringizda muvaffaqiyatlar tilaymiz. 🌟'
  }
};

let currentTexts: any = null;

export async function reloadTexts() {
  const dbTexts = await getBotTexts();
  currentTexts = {
    ...defaultTexts,
    offer_file_id: dbTexts?.offer_file_id
  };
}

function getText(lang: 'ru' | 'uz', key: string, params: Record<string, string> = {}): string {
  if (!currentTexts) currentTexts = defaultTexts;
  let text = currentTexts[lang]?.[key] || defaultTexts[lang]?.[key as keyof typeof defaultTexts['ru']] || '';
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`{${k}}`, 'g'), v);
  }
  return text;
}

export async function initBot(token: string) {
  if (isStarting) {
    console.log('Bot is already starting...');
    return;
  }
  isStarting = true;

  try {
    await stopBot();
    await reloadTexts();
    
    bot = new Bot<MyContext>(token);
    
    bot.use(session({ initial: () => ({ step: 0 }) }));
    
    // Восстанавливаем сессию из базы данных, если она пустая (например, после перезапуска сервера)
    bot.use(async (ctx, next) => {
      if (ctx.from?.id) {
        const user = await getUser(ctx.from.id) as any;
        if (user && ctx.session.step === 0 && user.step > 0) {
          ctx.session.step = user.step;
          ctx.session.language = user.language || user.lang || 'ru';
          ctx.session.fullName = user.full_name;
          ctx.session.ageCity = user.age_city;
          ctx.session.socialLink = user.social_link;
          ctx.session.langProficiency = user.lang_proficiency;
          ctx.session.videoRuId = user.video_ru_id;
          ctx.session.videoUzId = user.video_uz_id;
        }
      }
      await next();
    });
  
  bot.command('setoffer', async (ctx) => {
    // Check if admin
    const adminIds = [768567874]; // Ваша админка
    if (!ctx.from || !adminIds.includes(ctx.from.id)) {
      return ctx.reply('У вас нет прав для этой команды.');
    }

    const reply = ctx.message?.reply_to_message;
    if (!reply || !reply.document) {
      return ctx.reply('Пожалуйста, ответьте на сообщение с файлом (документом) оферты командой /setoffer');
    }

    const fileId = reply.document.file_id;
    await updateBotTexts({ offer_file_id: fileId });
    await reloadTexts();
    
    return ctx.reply('✅ Файл оферты успешно обновлен!');
  });

  bot.command('start', async (ctx) => {
    ctx.session.step = 1;
    
    const user = await getUser(ctx.from?.id || 0);
    if (!user) {
      await updateUser(ctx.from?.id || 0, {
        username: ctx.from?.username,
        first_name: ctx.from?.first_name,
        last_name: ctx.from?.last_name,
        step: 1
      });
    } else {
      await updateUser(ctx.from?.id || 0, { step: 1 });
    }

    await ctx.reply('Tilni tanlang / Выберите язык:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
          [{ text: '🇺🇿 O\'zbekcha', callback_data: 'lang_uz' }]
        ]
      }
    });
  });

  bot.callbackQuery(/^lang_(ru|uz)$/, async (ctx) => {
    const lang = ctx.match[1] as 'ru' | 'uz';
    ctx.session.language = lang;
    ctx.session.step = 2;
    
    await updateUser(ctx.from.id, { lang, step: 2 });
    
    const welcomeText = getText(lang, 'welcome', { name: ctx.from.first_name });
    
    if (currentTexts?.offer_file_id) {
      await ctx.replyWithDocument(currentTexts.offer_file_id, {
        caption: welcomeText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: getText(lang, 'agree'), callback_data: 'agree' }]]
        }
      });
    } else {
      await ctx.reply(welcomeText, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: getText(lang, 'agree'), callback_data: 'agree' }]]
        }
      });
    }
    
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('agree', async (ctx) => {
    const lang = ctx.session.language || 'ru';
    ctx.session.step = 3;
    await updateUser(ctx.from.id, { step: 3 });
    
    await ctx.reply(getText(lang, 'ask_name'), { parse_mode: 'HTML' });
    await ctx.answerCallbackQuery();
  });

  bot.on('message:text', async (ctx) => {
    const step = ctx.session.step;
    const lang = ctx.session.language || 'ru';
    const text = ctx.message.text;

    if (step === 3) {
      ctx.session.fullName = text;
      ctx.session.step = 4;
      await updateUser(ctx.from.id, { full_name: text, step: 4 });
      await ctx.reply(getText(lang, 'ask_age_city'), { parse_mode: 'HTML' });
    } 
    else if (step === 4) {
      ctx.session.ageCity = text;
      ctx.session.step = 5;
      await updateUser(ctx.from.id, { age_city: text, step: 5 });
      await ctx.reply(getText(lang, 'ask_social'), { parse_mode: 'HTML' });
    }
    else if (step === 5) {
      ctx.session.socialLink = text;
      ctx.session.step = 6;
      await updateUser(ctx.from.id, { social_link: text, step: 6 });
      await ctx.reply(getText(lang, 'ask_lang_proficiency'), { parse_mode: 'HTML' });
    }
    else if (step === 6) {
      ctx.session.langProficiency = text;
      ctx.session.step = 7;
      await updateUser(ctx.from.id, { lang_proficiency: text, step: 7 });
      await ctx.reply(getText(lang, 'ask_video_uz'), { parse_mode: 'HTML' });
    }
  });

  bot.on(['message:video', 'message:video_note'], async (ctx) => {
    const step = ctx.session.step;
    const lang = ctx.session.language || 'ru';
    
    const fileId = ctx.message.video?.file_id || ctx.message.video_note?.file_id;
    if (!fileId) return;

    if (step === 7) {
      ctx.session.videoUzId = fileId;
      ctx.session.step = 8;
      await updateUser(ctx.from.id, { video_uz_id: fileId, step: 8 });
      await ctx.reply(getText(lang, 'ask_video_ru'), { parse_mode: 'HTML' });
    }
    else if (step === 8) {
      ctx.session.videoRuId = fileId;
      ctx.session.step = 9;
      await updateUser(ctx.from.id, { video_ru_id: fileId, step: 9 });
      
      // Save application
      await createApplication({
        user_id: ctx.from.id,
        username: ctx.from.username,
        full_name: ctx.session.fullName!,
        age_city: ctx.session.ageCity!,
        social_link: ctx.session.socialLink!,
        lang_proficiency: ctx.session.langProficiency!,
        video_ru_id: ctx.session.videoRuId!,
        video_uz_id: ctx.session.videoUzId!
      });

      await ctx.reply(getText(lang, 'done'), { parse_mode: 'HTML' });
    }
  });

  bot.on('message', async (ctx) => {
    const step = ctx.session.step;
    const lang = ctx.session.language || 'ru';
    
    if (step === 7 || step === 8) {
      await ctx.reply(getText(lang, 'not_video'), { parse_mode: 'HTML' });
    }
  });
  
  bot.catch((err) => {
    console.error('Bot Error:', err);
  });
  
  bot.start({
    onStart: (botInfo) => {
      console.log(`Bot started as @${botInfo.username}`);
      isRunning = true;
      isStarting = false;
    }
  }).catch((err) => {
    console.error('Failed to start polling:', err);
    isRunning = false;
    isStarting = false;
  });
  } catch (e) {
    console.error('Error during bot initialization:', e);
    isStarting = false;
    throw e;
  }
}

export async function getTelegramFileUrl(fileId: string): Promise<string> {
  if (!bot || !isRunning) throw new Error('Bot is not running');
  const file = await bot.api.getFile(fileId);
  return `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
}

export async function notifyUser(userId: number, status: 'approved' | 'rejected') {
  if (!bot || !isRunning) return;
  
  try {
    const user = await getUser(userId) as any;
    const apps = await getApplications();
    const app = apps.find(a => a.user_id === userId);
    
    const lang = (user?.lang || user?.language || 'ru') as 'ru' | 'uz';
    const name = app?.full_name || user?.first_name || 'Участник';
    
    const text = getText(lang, status, { name });
    await bot.api.sendMessage(userId, text, { parse_mode: 'HTML' });
  } catch (e) {
    console.error(`Failed to notify user ${userId}:`, e);
  }
}
