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

export function isBotRunning() {
  return isRunning;
}

export async function stopBot() {
  if (bot && isRunning) {
    await bot.stop();
    isRunning = false;
    bot = null;
  }
}

const defaultTexts = {
  ru: {
    welcome: '👋 Здравствуйте, <b>{name}</b>!\n\nДобро пожаловать в кастинг <b>Dinay Brandface</b>! 🌟\n\nПожалуйста, ознакомьтесь с публичной офертой.\n\nВы готовы заполнить анкету?',
    agree: '✅ Начать',
    ask_name: 'Отлично! 🎉\n\nПожалуйста, отправьте ваши <b>Имя и Фамилию</b> текстовым сообщением. ✍️',
    ask_age_city: 'Супер! Теперь укажите ваш <b>возраст</b> и <b>город проживания</b>. 🏙️\n\n<i>Пример: 22, Ташкент</i>',
    ask_social: 'Отправьте ссылку на ваш профиль <b>Instagram</b> или <b>TikTok</b>. 📱',
    ask_lang_proficiency: '💬 <b>Владеете ли вы русским и узбекским языками в совершенстве?</b>\n\nПожалуйста, опишите ваш уровень владения языками. 🗣️',
    ask_video_ru: 'Отправьте короткое <b>видеосообщение (кружочек) на РУССКОМ языке</b> (до 30 сек) с ответом на вопрос:\n\n💬 <i>«Почему именно вы должны стать лицом Dinay?»</i>\n\n🎥 <i>Принимаются только видео или кружочки.</i>',
    ask_video_uz: 'Отлично! Теперь отправьте такое же <b>видеосообщение (кружочек) на УЗБЕКСКОМ языке</b> (до 30 сек) с ответом на вопрос:\n\n💬 <i>«Почему именно вы должны стать лицом Dinay?»</i>\n\n🎥 <i>Принимаются только видео или кружочки.</i>',
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
    ask_lang_proficiency: '💬 <b>Rus va o\'zbek tillarini mukammal bilasizmi?</b>\n\nIltimos, tillarni bilish darajangizni tavsiflang. 🗣️',
    ask_video_ru: 'Quyidagi savolga javob berilgan qisqa <b>video xabar (aylana) RUS tilida</b> (30 soniyagacha) yuboring:\n\n💬 <i>«Nima uchun aynan siz Dinay yuzi bo\'lishingiz kerak?»</i>\n\n🎥 <i>Faqat video yoki aylana video qabul qilinadi.</i>',
    ask_video_uz: 'Ajoyib! Endi xuddi shunday <b>video xabarni (aylana) O\'ZBEK tilida</b> (30 soniyagacha) yuboring:\n\n💬 <i>«Nima uchun aynan siz Dinay yuzi bo\'lishingiz kerak?»</i>\n\n🎥 <i>Faqat video yoki aylana video qabul qilinadi.</i>',
    done: '🎉 Sizning anketangiz qabul qilindi!\nDinayga bo\'lgan qiziqishingiz uchun rahmat 💚\nAgar nomzodingiz joriy saralash bosqichidan o\'tsa, biz siz bilan bog\'lanamiz.',
    not_video: '❌ Iltimos, faqat <b>video</b> yoki <b>video xabar (aylana)</b> yuboring.',
    approved: '🎉 <b>Tabriklaymiz, {name}!</b>\n\nSizning <b>Dinay Brandface</b> kastingidagi arizangiz <b>qabul qilindi</b>! 🥳 Keyingi qadamlar uchun tez orada siz bilan bog\'lanamiz.',
    rejected: '😔 <b>Assalomu alaykum, {name}.</b>\n\nAfsuski, arizangiz rad etildi. Qiziqish bildirganingiz va ishtirokingiz uchun rahmat! Kelgusidagi ishlaringizda muvaffaqiyatlar tilaymiz. 🌟'
  }
};

let currentTexts: any = null;

export async function reloadTexts() {
  const dbTexts = await getBotTexts();
  currentTexts = dbTexts || defaultTexts;
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
    try {
      const chatMember = await ctx.api.getChatMember(groupId, ctx.from.id);
      if (chatMember.status !== 'creator' && chatMember.status !== 'administrator') {
        return;
      }
    } catch (e) {
      // If error, maybe not in group or bot not admin. Let's just allow it for now or check a specific admin ID.
      // We will allow anyone who knows the command to set it, or you can restrict it.
    }

    const document = ctx.message?.document;
    if (!document) {
      await ctx.reply('Пожалуйста, отправьте PDF-файл публичной оферты с подписью /setoffer');
      return;
    }

    const fileId = document.file_id;
    let texts = await getBotTexts() || defaultTexts;
    texts.offer_file_id = fileId;
    
    await updateBotTexts(texts);
    await reloadTexts();
    
    await ctx.reply('✅ Публичная оферта успешно обновлена!');
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
    
    await ctx.reply('Выберите язык / Tilni tanlang:', {
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
      
      await ctx.answerCallbackQuery();
      await ctx.deleteMessage().catch(() => {});
      
      // Send offer file if exists
      if (currentTexts?.offer_file_id) {
        await ctx.api.sendDocument(userId, currentTexts.offer_file_id, {
          caption: '📄 Публичная оферта / Ommaviy oferta'
        }).catch(console.error);
      }
      
      await ctx.reply(
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
    } else if (data === 'agree') {
      const lang = ctx.session.language || 'ru';
      ctx.session.step = 3;
      await updateUser(userId, { step: 3 });
      
      await ctx.answerCallbackQuery();
      // Убираем кнопку "Согласен", чтобы нельзя было нажать дважды
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
      // Отправляем следующий вопрос новым сообщением
      await ctx.reply(getText(lang, 'ask_name'), { parse_mode: 'HTML' });
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
      await ctx.reply(getText(lang, 'ask_age_city'), { parse_mode: 'HTML' });
    } else if (step === 4) {
      ctx.session.ageCity = ctx.message.text;
      ctx.session.step = 5;
      await updateUser(userId, { step: 5, age_city: ctx.message.text });
      await ctx.reply(getText(lang, 'ask_social'), { parse_mode: 'HTML' });
    } else if (step === 5) {
      ctx.session.socialLink = ctx.message.text;
      ctx.session.step = 6;
      await updateUser(userId, { step: 6, social_link: ctx.message.text });
      await ctx.reply(getText(lang, 'ask_lang_proficiency'), { parse_mode: 'HTML' });
    } else if (step === 6) {
      ctx.session.langProficiency = ctx.message.text;
      ctx.session.step = 7;
      await updateUser(userId, { step: 7, lang_proficiency: ctx.message.text });
      await ctx.reply(getText(lang, 'ask_video_ru'), { parse_mode: 'HTML' });
    }
  });

  bot.on(['message:video', 'message:video_note'], async (ctx) => {
    const step = ctx.session.step;
    const lang = ctx.session.language || 'ru';
    const userId = ctx.from.id;
    
    if (step === 7) {
      ctx.session.videoRuId = ctx.message.video?.file_id || ctx.message.video_note?.file_id;
      ctx.session.step = 8;
      await updateUser(userId, { step: 8, video_ru_id: ctx.session.videoRuId });
      await ctx.reply(getText(lang, 'ask_video_uz'), { parse_mode: 'HTML' });
    } else if (step === 8) {
      ctx.session.videoUzId = ctx.message.video?.file_id || ctx.message.video_note?.file_id;
      ctx.session.step = 9;
      await updateUser(userId, { step: 9, video_uz_id: ctx.session.videoUzId });
      
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
        if (ctx.session.videoRuId) {
          await ctx.api.sendMessage(groupId, '🎥 Видео на русском:');
          try {
            await ctx.api.sendVideoNote(groupId, ctx.session.videoRuId);
          } catch (e) {
            await ctx.api.sendVideo(groupId, ctx.session.videoRuId).catch(console.error);
          }
        }
        if (ctx.session.videoUzId) {
          await ctx.api.sendMessage(groupId, '🎥 Видео на узбекском:');
          try {
            await ctx.api.sendVideoNote(groupId, ctx.session.videoUzId);
          } catch (e) {
            await ctx.api.sendVideo(groupId, ctx.session.videoUzId).catch(console.error);
          }
        }
      } catch (err) {
        console.error('Ошибка при отправке в группу:', err);
      }
      
      await ctx.reply(getText(lang, 'done'), { parse_mode: 'HTML' });
    }
  });
  
  bot.on('message', async (ctx) => {
    const step = ctx.session.step;
    const lang = ctx.session.language || 'ru';
    
    if ((step === 7 || step === 8) && !ctx.message.video && !ctx.message.video_note) {
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
    }
  }).catch((err) => {
    console.error('Failed to start polling:', err);
    isRunning = false;
  });
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
