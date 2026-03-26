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
  let text = currentTexts[lang]?.[key];
  if (!text || text.trim() === '') {
    text = defaultTexts[lang]?.[key as keyof typeof defaultTexts['ru']] || '';
  }
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`{${k}}`, 'g'), v);
  }
  return text;
}

async function safeReply(ctx: any, text: string, options: any = {}) {
  try {
    return await ctx.reply(text, options);
  } catch (e) {
    console.error('Failed to send message with HTML, falling back to plain text:', e);
    const plainText = text.replace(/<[^>]*>?/gm, '');
    const safeOptions = { ...options };
    delete safeOptions.parse_mode;
    return await ctx.reply(plainText, safeOptions);
  }
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
    const groupId = '-5208437302';
    const allowedAdmins = [768567874]; // Ваш Telegram ID
    
    if (!allowedAdmins.includes(ctx.from.id)) {
      try {
        const chatMember = await ctx.api.getChatMember(groupId, ctx.from.id);
        if (chatMember.status !== 'creator' && chatMember.status !== 'administrator') {
          await safeReply(ctx, '⛔️ У вас нет прав администратора для выполнения этой команды.');
          return;
        }
      } catch (e) {
        console.error('Admin check error:', e);
        await safeReply(ctx, '⛔️ У вас нет прав для выполнения этой команды.');
        return;
      }
    }

    let document = ctx.message?.document;
    
    // Check if it's a reply to a document
    if (!document && ctx.message?.reply_to_message?.document) {
      document = ctx.message.reply_to_message.document;
    }

    if (!document) {
      await safeReply(ctx, 
        '⚠️ <b>Как обновить оферту:</b>\n\n' +
        '1. Отправьте файл (PDF или другой документ) в этот чат.\n' +
        '2. В поле "Подпись" (Caption) напишите команду <code>/setoffer</code>\n' +
        '<b>ИЛИ</b>\n' +
        'Ответьте (Reply) на уже отправленный файл командой <code>/setoffer</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    const fileId = document.file_id;
    let texts = await getBotTexts() || defaultTexts;
    texts.offer_file_id = fileId;
    
    await updateBotTexts(texts);
    await reloadTexts();
    
    await safeReply(ctx, '✅ Публичная оферта успешно обновлена!');
  });

  bot.command('start', async (ctx) => {
    const utm = ctx.match || '';
    const userId = ctx.from?.id;
    const username = ctx.from?.username || '';
    
    if (userId) {
      const existingUser = await getUser(userId);
      if (!existingUser) {
        await updateUser(userId, {
          username,
          utm_source: utm,
          step: 1,
          joined_at: new Date().toISOString()
        });
      } else {
        await updateUser(userId, { step: 1 });
      }
    }
    
    ctx.session.step = 1;
    
    await safeReply(ctx, 'Выберите язык / Tilni tanlang:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
          [{ text: "🇺🇿 O'zbekcha", callback_data: 'lang_uz' }]
        ]
      }
    });
  });
  
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    
    if (data === 'lang_ru' || data === 'lang_uz') {
      const lang = data === 'lang_ru' ? 'ru' : 'uz';
      ctx.session.language = lang;
      ctx.session.step = 2;
      
      const userName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Участник';
      const safeName = userName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      await updateUser(userId, { language: lang, step: 2 });
      
      await ctx.answerCallbackQuery().catch(() => {});
      await ctx.deleteMessage().catch(() => {});
      
      // Send offer file if exists
      if (currentTexts?.offer_file_id) {
        await ctx.api.sendDocument(userId, currentTexts.offer_file_id, {
          caption: '📄 Публичная оферта / Ommaviy oferta'
        }).catch(console.error);
      }
      
      try {
        await safeReply(ctx, 
          getText(lang, 'welcome', { name: safeName }),
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: getText(lang, 'agree'), callback_data: 'agree' }]
              ]
            }
          }
        );
      } catch (e) {
        console.error('Failed to send welcome message with HTML, falling back to plain text:', e);
        await safeReply(ctx, 
          getText(lang, 'welcome', { name: safeName }).replace(/<[^>]*>?/gm, ''),
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: getText(lang, 'agree'), callback_data: 'agree' }]
              ]
            }
          }
        );
      }
    } else if (data === 'agree') {
      const lang = ctx.session.language || 'ru';
      ctx.session.step = 3;
      await updateUser(userId, { step: 3 });
      
      await ctx.answerCallbackQuery().catch(() => {});
      // Убираем кнопку "Согласен", чтобы нельзя было нажать дважды
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
      // Отправляем следующий вопрос новым сообщением
      await safeReply(ctx, getText(lang, 'ask_name'), { parse_mode: 'HTML' });
    }
  });

  bot.on('message:text', async (ctx) => {
    const step = ctx.session.step;
    const lang = ctx.session.language || 'ru';
    const userId = ctx.from.id;
    
    if (step === 3) {
      ctx.session.fullName = ctx.message.text;
      ctx.session.step = 4;
      await updateUser(userId, { step: 4, full_name: ctx.message.text });
      await safeReply(ctx, getText(lang, 'ask_age_city'), { parse_mode: 'HTML' });
    } else if (step === 4) {
      ctx.session.ageCity = ctx.message.text;
      ctx.session.step = 5;
      await updateUser(userId, { step: 5, age_city: ctx.message.text });
      await safeReply(ctx, getText(lang, 'ask_social'), { parse_mode: 'HTML' });
    } else if (step === 5) {
      ctx.session.socialLink = ctx.message.text;
      ctx.session.step = 6;
      await updateUser(userId, { step: 6, social_link: ctx.message.text });
      await safeReply(ctx, getText(lang, 'ask_lang_proficiency'), { parse_mode: 'HTML' });
    } else if (step === 6) {
      ctx.session.langProficiency = ctx.message.text;
      ctx.session.step = 7;
      await updateUser(userId, { step: 7, lang_proficiency: ctx.message.text });
      await safeReply(ctx, getText(lang, 'ask_video_uz'), { parse_mode: 'HTML' });
    }
  });

  bot.on(['message:video', 'message:video_note'], async (ctx) => {
    const step = ctx.session.step;
    const lang = ctx.session.language || 'ru';
    const userId = ctx.from.id;
    
    if (step === 7) {
      ctx.session.videoUzId = ctx.message.video?.file_id || ctx.message.video_note?.file_id;
      ctx.session.step = 8;
      await updateUser(userId, { step: 8, video_uz_id: ctx.session.videoUzId });
      await safeReply(ctx, getText(lang, 'ask_video_ru'), { parse_mode: 'HTML' });
    } else if (step === 8) {
      ctx.session.videoRuId = ctx.message.video?.file_id || ctx.message.video_note?.file_id;
      ctx.session.step = 9;
      await updateUser(userId, { step: 9, video_ru_id: ctx.session.videoRuId });
      
      await createApplication({
        user_id: userId,
        full_name: ctx.session.fullName,
        age_city: ctx.session.ageCity,
        social_link: ctx.session.socialLink,
        lang_proficiency: ctx.session.langProficiency,
        video_ru_id: ctx.session.videoRuId,
        video_uz_id: ctx.session.videoUzId
      });
      
      // Отправка уведомления в группу
      try {
        const groupId = '-5208437302';
        const username = ctx.from?.username;
        const userLink = username ? `@${username}` : `<a href="tg://user?id=${userId}">Пользователь (ID: ${userId})</a>`;
        
        const notifyText = `🆕 <b>Новая заявка!</b>\n\n` +
          `👤 <b>ФИО:</b> ${ctx.session.fullName}\n` +
          `🏙 <b>Возраст/Город:</b> ${ctx.session.ageCity}\n` +
          `📱 <b>Соцсеть:</b> ${ctx.session.socialLink}\n` +
          `🗣 <b>Знание языков:</b> ${ctx.session.langProficiency}\n` +
          `💬 <b>Telegram:</b> ${userLink}`;

        await ctx.api.sendMessage(groupId, notifyText, { parse_mode: 'HTML' });
        
        // Отправляем видео или кружочек
        if (ctx.session.videoUzId) {
          await ctx.api.sendMessage(groupId, '🎥 Видео на узбекском:');
          try {
            await ctx.api.sendVideoNote(groupId, ctx.session.videoUzId);
          } catch (e) {
            await ctx.api.sendVideo(groupId, ctx.session.videoUzId).catch(console.error);
          }
        }
        if (ctx.session.videoRuId) {
          await ctx.api.sendMessage(groupId, '🎥 Видео на русском:');
          try {
            await ctx.api.sendVideoNote(groupId, ctx.session.videoRuId);
          } catch (e) {
            await ctx.api.sendVideo(groupId, ctx.session.videoRuId).catch(console.error);
          }
        }
      } catch (err) {
        console.error('Ошибка при отправке в группу:', err);
      }
      
      await safeReply(ctx, getText(lang, 'done'), { parse_mode: 'HTML' });
    }
  });
  
  bot.on('message', async (ctx) => {
    const step = ctx.session.step;
    const lang = ctx.session.language || 'ru';
    
    if ((step === 7 || step === 8) && !ctx.message.video && !ctx.message.video_note) {
      await safeReply(ctx, getText(lang, 'not_video'), { parse_mode: 'HTML' });
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
    const safeName = (app?.full_name || 'Участник').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    await bot.api.sendMessage(userId, getText(lang, status, { name: safeName }), { parse_mode: 'HTML' });
  } catch (e) {
    console.error('Failed to notify user:', e);
  }
}
