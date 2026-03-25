# Dinay Brandface Telegram Bot (Python)

Это исходный код Telegram-бота для кастинга «Dinay Brandface», написанный на Python с использованием библиотеки `aiogram 3.x`.

## Требования
- Python 3.11+
- Docker (опционально)

## Запуск локально
1. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```
2. Скопируйте файл `.env.example` в `.env` и укажите ваш `BOT_TOKEN` и `ADMIN_IDS` (через запятую).
3. Запустите бота:
   ```bash
   python bot.py
   ```

## Запуск через Docker
1. Соберите образ:
   ```bash
   docker build -t dinay-bot .
   ```
2. Запустите контейнер:
   ```bash
   docker run -d --env-file .env --name dinay-bot dinay-bot
   ```

## База данных
Бот использует SQLite. Файл базы данных `bot.db` будет создан автоматически при первом запуске.

## Смена текстов
Все тексты находятся в словаре `TEXTS` в файле `bot.py`. Вы можете изменить их прямо там.
