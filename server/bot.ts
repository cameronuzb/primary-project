import { Bot, Context, session, SessionFlavor, InputFile } from 'grammy';
import { getUser, updateUser, createApplication, getApplications, getBotTexts } from './db.js';

interface SessionData {
  language?: 'ru' | 'uz';
  step: number;
  fullName?: string;
  ageCity?: string;
  socialLink?: string;
  photoFileId?: string;
  videoFileId?: string;
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
    welcome: '👋 Здравствуйте, <b>{name}</b>!\n\nДобро пожаловать в кастинг <b>Dinay Brandface</b>! 🌟\n\nПожалуйста, внимательно ознакомьтесь с прикрепленным договором публичной оферты. 📄\n\nВы согласны с условиями?',
    agree: '✅ Согласен(на)',
    ask_name: 'Отлично! 🎉\n\nПожалуйста, отправьте ваши <b>Имя и Фамилию</b> текстовым сообщением. ✍️',
    ask_age_city: 'Супер! Теперь укажите ваш <b>возраст</b> и <b>город проживания</b>. 🏙️\n\n<i>Пример: 22, Ташкент</i>',
    ask_social: 'Отправьте ссылку на ваш профиль <b>Instagram</b> или <b>TikTok</b>. 📱',
    ask_photo: 'Пожалуйста, отправьте <b>скриншот статистики</b> вашего профиля (охваты за последние 30 дней). 📈\n\n⚠️ <i>Принимаются только фото.</i>',
    ask_video: 'Отправьте короткое <b>видео</b> (до 30 сек) с ответом на вопрос:\n\n💬 <i>«Почему именно вы должны стать лицом Dinay?»</i>\n\n🎥 <i>Принимаются только видео или кружочки.</i>',
    done: '🎉 <b>Ваша анкета успешно отправлена!</b>\n\nСпасибо за участие. Ожидайте результатов, мы обязательно с вами свяжемся! ⏳',
    not_photo: '❌ Пожалуйста, отправьте именно <b>фото</b> (скриншот статистики).',
    not_video: '❌ Пожалуйста, отправьте именно <b>видео</b> или <b>видеосообщение (кружочек)</b>.',
    approved: '🎉 <b>Поздравляем, {name}!</b>\n\nВаша заявка на участие в кастинге <b>Dinay Brandface</b> была <b>одобрена</b>! 🥳 Мы скоро свяжемся с вами для дальнейших шагов.',
    rejected: '😔 <b>Здравствуйте, {name}.</b>\n\nК сожалению, ваша заявка была отклонена. Спасибо за проявленный интерес и участие! Желаем успехов в будущем. 🌟'
  },
  uz: {
    welcome: '👋 Assalomu alaykum, <b>{name}</b>!\n\n<b>Dinay Brandface</b> kastingiga xush kelibsiz! 🌟\n\nIltimos, biriktirilgan ommaviy ofera shartnomasi bilan diqqat bilan tanishib chiqing. 📄\n\nShartlarga rozimisiz?',
    agree: '✅ Roziman',
    ask_name: 'Ajoyib! 🎉\n\nIltimos, <b>Ism va Familiyangizni</b> matnli xabar orqali yuboring. ✍️',
    ask_age_city: 'Super! Endi <b>yoshingizni</b> va <b>yashash shahringizni</b> kiriting. 🏙️\n\n<i>Misol: 22, Toshkent</i>',
    ask_social: '<b>Instagram</b> yoki <b>TikTok</b> profilingiz havolasini yuboring. 📱',
    ask_photo: 'Iltimos, profilingiz statistikasining <b>skrinshotini</b> yuboring (so\'nggi 30 kunlik qamrov). 📈\n\n⚠️ <i>Faqat rasm qabul qilinadi.</i>',
    ask_video: 'Quyidagi savolga javob berilgan qisqa <b>video</b> (30 soniyagacha) yuboring:\n\n💬 <i>«Nima uchun aynan siz Dinay yuzi bo\'lishingiz kerak?»</i>\n\n🎥 <i>Faqat video yoki aylana video qabul qilinadi.</i>',
    done: '🎉 <b>Sizning anketangiz muvaffaqiyatli yuborildi!</b>\n\nIshtirokingiz uchun rahmat. Natijalarni kuting, biz albatta siz bilan bog\'lanamiz! ⏳',
    not_photo: '❌ Iltimos, faqat <b>rasm</b> (statistika skrinshoti) yuboring.',
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
        ctx.session.photoFileId = user.photo_file_id;
        ctx.session.videoFileId = user.video_file_id;
      }
    }
    await next();
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
      
      const contractContent = lang === 'ru' 
        ? 'Договор публичной оферты Dinay Brandface...\n\n1. Общие положения\n2. Права и обязанности сторон\n(Здесь должен быть полный текст вашего договора)' 
        : 'Dinay Brandface ommaviy ofera shartnomasi...\n\n1. Umumiy qoidalar\n2. Tomonlarning huquq va majburiyatlari\n(Bu yerda shartnomaning to\'liq matni bo\'lishi kerak)';
        
      let documentToSend;
      try {
        // Попытка отправить реальный файл, если он загружен
        documentToSend = new InputFile('./Договор BRANDFACE_UZB&RUS (финал).docx');
      } catch (e) {
        // Если файла нет, отправляем заглушку
        documentToSend = new InputFile(Buffer.from(contractContent), lang === 'ru' ? 'Dogovor_Dinay.txt' : 'Shartnoma_Dinay.txt');
      }
        
      await ctx.replyWithDocument(
        documentToSend,
        {
          caption: getText(lang, 'welcome', { name: safeName }),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: getText(lang, 'agree'), callback_data: 'agree' }]
            ]
          }
        }
      ).catch(async (err) => {
        // Fallback if the file doesn't exist or fails to send
        console.error("Failed to send docx, sending fallback txt", err);
        await ctx.replyWithDocument(
          new InputFile(Buffer.from(contractContent), lang === 'ru' ? 'Dogovor_Dinay.txt' : 'Shartnoma_Dinay.txt'),
          {
            caption: getText(lang, 'welcome', { name: safeName }),
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: getText(lang, 'agree'), callback_data: 'agree' }]
              ]
            }
          }
        );
      });
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
      await ctx.reply(getText(lang, 'ask_photo'), { parse_mode: 'HTML' });
    }
  });

  bot.on('message:photo', async (ctx) => {
    const step = ctx.session.step;
    const lang = ctx.session.language || 'ru';
    const userId = ctx.from.id;
    
    if (step === 6) {
      ctx.session.photoFileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      ctx.session.step = 7;
      await updateUser(userId, { step: 7, photo_file_id: ctx.session.photoFileId });
      await ctx.reply(getText(lang, 'ask_video'), { parse_mode: 'HTML' });
    }
  });

  bot.on(['message:video', 'message:video_note'], async (ctx) => {
    const step = ctx.session.step;
    const lang = ctx.session.language || 'ru';
    const userId = ctx.from.id;
    
    if (step === 7) {
      ctx.session.videoFileId = ctx.message.video?.file_id || ctx.message.video_note?.file_id;
      ctx.session.step = 8;
      await updateUser(userId, { step: 8, video_file_id: ctx.session.videoFileId });
      
      await createApplication({
        user_id: userId,
        full_name: ctx.session.fullName,
        age_city: ctx.session.ageCity,
        social_link: ctx.session.socialLink,
        photo_file_id: ctx.session.photoFileId,
        video_file_id: ctx.session.videoFileId
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
          `💬 <b>Telegram:</b> ${userLink}`;

        // Отправляем фото с текстом
        if (ctx.session.photoFileId) {
          await ctx.api.sendPhoto(groupId, ctx.session.photoFileId, {
            caption: notifyText,
            parse_mode: 'HTML'
          });
        } else {
          await ctx.api.sendMessage(groupId, notifyText, { parse_mode: 'HTML' });
        }
        
        // Отправляем видео или кружочек
        if (ctx.session.videoFileId) {
          if (ctx.message.video_note) {
            await ctx.api.sendVideoNote(groupId, ctx.session.videoFileId);
          } else {
            await ctx.api.sendVideo(groupId, ctx.session.videoFileId);
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
    
    if (step === 6 && !ctx.message.photo) {
      await ctx.reply(getText(lang, 'not_photo'), { parse_mode: 'HTML' });
    } else if (step === 7 && !ctx.message.video && !ctx.message.video_note) {
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
