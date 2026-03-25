import asyncio
import logging
import os
import sqlite3
from datetime import datetime
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import CommandStart, CommandObject
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_IDS = [int(id) for id in os.getenv("ADMIN_IDS", "").split(",") if id]

logging.basicConfig(level=logging.INFO)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Database setup
conn = sqlite3.connect('bot.db')
cursor = conn.cursor()

cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        language TEXT,
        utm_source TEXT,
        step INTEGER DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
''')
cursor.execute('''
    CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        full_name TEXT,
        age_city TEXT,
        social_link TEXT,
        photo_file_id TEXT,
        video_file_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
    )
''')
conn.commit()

# States
class Form(StatesGroup):
    language = State()
    agreement = State()
    full_name = State()
    age_city = State()
    social_link = State()
    photo = State()
    video = State()

# Texts
TEXTS = {
    'ru': {
        'welcome': 'Добро пожаловать в кастинг Dinay Brandface! Пожалуйста, ознакомьтесь с условиями и договором: [Ссылка на договор]. Вы согласны?',
        'agree': '✅ Согласен(на)',
        'ask_name': 'Отлично! Пожалуйста, отправьте ваши Имя и Фамилию текстовым сообщением.',
        'ask_age_city': 'Укажите ваш возраст и город проживания.',
        'ask_social': 'Отправьте ссылку на ваш профиль Instagram или TikTok.',
        'ask_photo': 'Пожалуйста, отправьте скриншот статистики вашего профиля (охваты за 30 дней). Принимаются только фото.',
        'ask_video': 'Отправьте короткое видео (до 30 сек) с ответом на вопрос: «Почему именно вы должны стать лицом Динай?». Принимаются только видео или кружочки.',
        'done': 'Ваша анкета успешно отправлена! Ожидайте результатов.',
        'not_photo': 'Пожалуйста, отправьте именно фото (скриншот статистики).',
        'not_video': 'Пожалуйста, отправьте именно видео или видеосообщение (кружочек).',
        'approved': 'Поздравляем! Ваша заявка одобрена.',
        'rejected': 'К сожалению, ваша заявка отклонена. Спасибо за участие!'
    },
    'uz': {
        'welcome': 'Dinay Brandface kastingiga xush kelibsiz! Iltimos, shartlar va shartnoma bilan tanishib chiqing: [Shartnoma havolasi]. Rozimisiz?',
        'agree': '✅ Roziman',
        'ask_name': 'Ajoyib! Iltimos, Ism va Familiyangizni matnli xabar orqali yuboring.',
        'ask_age_city': 'Yoshingiz va yashash shahringizni kiriting.',
        'ask_social': 'Instagram yoki TikTok profilingiz havolasini yuboring.',
        'ask_photo': 'Iltimos, profilingiz statistikasining skrinshotini yuboring (30 kunlik qamrov). Faqat rasm qabul qilinadi.',
        'ask_video': '«Nima uchun aynan siz Dinay yuzi bo\\'lishingiz kerak?» degan savolga javob berilgan qisqa video (30 soniyagacha) yuboring. Faqat video yoki aylana video qabul qilinadi.',
        'done': 'Sizning anketangiz muvaffaqiyatli yuborildi! Natijalarni kuting.',
        'not_photo': 'Iltimos, faqat rasm (statistika skrinshoti) yuboring.',
        'not_video': 'Iltimos, faqat video yoki video xabar (aylana) yuboring.',
        'approved': 'Tabriklaymiz! Arizangiz qabul qilindi.',
        'rejected': 'Afsuski, arizangiz rad etildi. Ishtirokingiz uchun rahmat!'
    }
}

@dp.message(CommandStart())
async def command_start(message: types.Message, command: CommandObject, state: FSMContext):
    utm = command.args or ""
    user_id = message.from_user.id
    username = message.from_user.username or ""
    
    cursor.execute('INSERT OR IGNORE INTO users (user_id, username, utm_source, step) VALUES (?, ?, ?, 1)', 
                   (user_id, username, utm))
    cursor.execute('UPDATE users SET step = 1 WHERE user_id = ?', (user_id,))
    conn.commit()
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang_ru")],
        [InlineKeyboardButton(text="🇺🇿 O'zbekcha", callback_data="lang_uz")]
    ])
    
    await state.set_state(Form.language)
    await message.answer("Выберите язык / Tilni tanlang:", reply_markup=keyboard)

@dp.callback_query(Form.language, F.data.in_(["lang_ru", "lang_uz"]))
async def process_language(callback: types.CallbackQuery, state: FSMContext):
    lang = "ru" if callback.data == "lang_ru" else "uz"
    await state.update_data(language=lang)
    
    cursor.execute('UPDATE users SET language = ?, step = 2 WHERE user_id = ?', (lang, callback.from_user.id))
    conn.commit()
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=TEXTS[lang]['agree'], callback_data="agree")]
    ])
    
    await state.set_state(Form.agreement)
    await callback.message.edit_text(TEXTS[lang]['welcome'], reply_markup=keyboard)

@dp.callback_query(Form.agreement, F.data == "agree")
async def process_agreement(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    lang = data.get('language', 'ru')
    
    cursor.execute('UPDATE users SET step = 3 WHERE user_id = ?', (callback.from_user.id,))
    conn.commit()
    
    await state.set_state(Form.full_name)
    await callback.message.edit_text(TEXTS[lang]['ask_name'])

@dp.message(Form.full_name, F.text)
async def process_name(message: types.Message, state: FSMContext):
    await state.update_data(full_name=message.text)
    data = await state.get_data()
    lang = data.get('language', 'ru')
    
    cursor.execute('UPDATE users SET step = 4 WHERE user_id = ?', (message.from_user.id,))
    conn.commit()
    
    await state.set_state(Form.age_city)
    await message.answer(TEXTS[lang]['ask_age_city'])

@dp.message(Form.age_city, F.text)
async def process_age_city(message: types.Message, state: FSMContext):
    await state.update_data(age_city=message.text)
    data = await state.get_data()
    lang = data.get('language', 'ru')
    
    cursor.execute('UPDATE users SET step = 5 WHERE user_id = ?', (message.from_user.id,))
    conn.commit()
    
    await state.set_state(Form.social_link)
    await message.answer(TEXTS[lang]['ask_social'])

@dp.message(Form.social_link, F.text)
async def process_social(message: types.Message, state: FSMContext):
    await state.update_data(social_link=message.text)
    data = await state.get_data()
    lang = data.get('language', 'ru')
    
    cursor.execute('UPDATE users SET step = 6 WHERE user_id = ?', (message.from_user.id,))
    conn.commit()
    
    await state.set_state(Form.photo)
    await message.answer(TEXTS[lang]['ask_photo'])

@dp.message(Form.photo, F.photo)
async def process_photo(message: types.Message, state: FSMContext):
    await state.update_data(photo_file_id=message.photo[-1].file_id)
    data = await state.get_data()
    lang = data.get('language', 'ru')
    
    cursor.execute('UPDATE users SET step = 7 WHERE user_id = ?', (message.from_user.id,))
    conn.commit()
    
    await state.set_state(Form.video)
    await message.answer(TEXTS[lang]['ask_video'])

@dp.message(Form.photo)
async def process_photo_invalid(message: types.Message, state: FSMContext):
    data = await state.get_data()
    lang = data.get('language', 'ru')
    await message.answer(TEXTS[lang]['not_photo'])

@dp.message(Form.video, F.video | F.video_note)
async def process_video(message: types.Message, state: FSMContext):
    video_id = message.video.file_id if message.video else message.video_note.file_id
    await state.update_data(video_file_id=video_id)
    data = await state.get_data()
    lang = data.get('language', 'ru')
    
    cursor.execute('UPDATE users SET step = 8 WHERE user_id = ?', (message.from_user.id,))
    
    cursor.execute('''
        INSERT INTO applications (user_id, full_name, age_city, social_link, photo_file_id, video_file_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        message.from_user.id,
        data['full_name'],
        data['age_city'],
        data['social_link'],
        data['photo_file_id'],
        video_id
    ))
    conn.commit()
    
    app_id = cursor.lastrowid
    
    await state.clear()
    await message.answer(TEXTS[lang]['done'])
    
    # Notify admins
    for admin_id in ADMIN_IDS:
        try:
            caption = f"Новая анкета #{app_id}\\nФИО: {data['full_name']}\\nВозраст/Город: {data['age_city']}\\nСсылка: {data['social_link']}"
            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(text="✅ Одобрить", callback_data=f"approve_{app_id}"),
                    InlineKeyboardButton(text="❌ Отклонить", callback_data=f"reject_{app_id}")
                ]
            ])
            
            # Send media group (not fully supported with inline keyboards in one message, so we send video with caption)
            await bot.send_photo(admin_id, data['photo_file_id'], caption="Статистика профиля")
            await bot.send_video(admin_id, video_id, caption=caption, reply_markup=keyboard)
        except Exception as e:
            logging.error(f"Failed to send to admin {admin_id}: {e}")

@dp.message(Form.video)
async def process_video_invalid(message: types.Message, state: FSMContext):
    data = await state.get_data()
    lang = data.get('language', 'ru')
    await message.answer(TEXTS[lang]['not_video'])

@dp.callback_query(F.data.startswith("approve_") | F.data.startswith("reject_"))
async def process_admin_decision(callback: types.CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        return
        
    action, app_id = callback.data.split("_")
    status = "approved" if action == "approve" else "rejected"
    
    cursor.execute('UPDATE applications SET status = ? WHERE id = ?', (status, app_id))
    cursor.execute('SELECT user_id FROM applications WHERE id = ?', (app_id,))
    user_id = cursor.fetchone()[0]
    conn.commit()
    
    cursor.execute('SELECT language FROM users WHERE user_id = ?', (user_id,))
    lang = cursor.fetchone()[0] or 'ru'
    
    # Update admin message
    await callback.message.edit_caption(
        caption=f"{callback.message.caption}\\n\\n<b>Статус: {'ОДОБРЕНО' if status == 'approved' else 'ОТКЛОНЕНО'}</b>",
        parse_mode="HTML"
    )
    
    # Notify user
    try:
        await bot.send_message(user_id, TEXTS[lang][status])
    except Exception as e:
        logging.error(f"Failed to notify user {user_id}: {e}")

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
