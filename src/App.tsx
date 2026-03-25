/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Square, Users, FileText, CheckCircle, XCircle, Download, Settings, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [token, setToken] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'settings'>('dashboard');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setIsRunning(data.running);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, appsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/applications')
      ]);
      const statsData = await statsRes.json();
      const appsData = await appsRes.json();
      
      if (!statsData.error) {
        setStats(statsData);
      }
      if (!appsData.error && Array.isArray(appsData)) {
        setApplications(appsData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchData();
    const interval = setInterval(() => {
      fetchStatus();
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    if (!token) return alert('Please enter a bot token');
    try {
      const res = await fetch('/api/start-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (res.ok) {
        setIsRunning(true);
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch('/api/stop-bot', { method: 'POST' });
      if (res.ok) {
        setIsRunning(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await fetch(`/api/applications/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить ВСЕ анкеты и пользователей? Это действие нельзя отменить.')) {
      return;
    }
    try {
      await fetch('/api/clear-data', { method: 'POST' });
      fetchData();
      alert('Все данные успешно удалены.');
    } catch (e) {
      console.error(e);
      alert('Ошибка при удалении данных.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Админ панель</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md",
              activeTab === 'dashboard' ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <Users className="w-5 h-5" />
            Дашборд
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md",
              activeTab === 'applications' ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <FileText className="w-5 h-5" />
            Анкеты
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md",
              activeTab === 'settings' ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <Settings className="w-5 h-5" />
            Настройки
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <a
            href="/api/download-python"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            <Download className="w-4 h-4" />
            Скачать Python код
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Bot Control */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Управление ботом</h2>
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isRunning}
                />
              </div>
              {isRunning ? (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <Square className="w-4 h-4" />
                  Остановить бота
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Play className="w-4 h-4" />
                  Запустить бота
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-gray-500">Статус:</span>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  isRunning ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                )}>
                  {isRunning ? 'Работает' : 'Остановлен'}
                </span>
              </div>
            </div>
          </div>

          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-sm font-medium text-gray-500">Всего анкет</div>
                  <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalApps}</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-sm font-medium text-gray-500">Новых сегодня</div>
                  <div className="mt-2 text-3xl font-semibold text-blue-600">{stats.todayApps}</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-sm font-medium text-gray-500">Конверсия</div>
                  <div className="mt-2 text-3xl font-semibold text-indigo-600">
                    {stats.totalUsers > 0 ? Math.round((stats.totalApps / stats.totalUsers) * 100) : 0}%
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-sm font-medium text-gray-500">Одобрено</div>
                  <div className="mt-2 text-3xl font-semibold text-green-600">{stats.approvedApps}</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-sm font-medium text-gray-500">Отклонено</div>
                  <div className="mt-2 text-3xl font-semibold text-red-600">{stats.rejectedApps}</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Воронка конверсии</h3>
                <div className="space-y-4">
                  {stats.funnel?.map((step: any) => (
                    <div key={step.step} className="flex items-center gap-4">
                      <div className="w-32 text-sm text-gray-500">Шаг {step.step}</div>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(step.count / stats.totalUsers) * 100}%` }}
                        />
                      </div>
                      <div className="w-16 text-sm font-medium text-gray-900 text-right">
                        {step.count} ({Math.round((step.count / stats.totalUsers) * 100)}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Список анкет</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={handleClearData}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Очистить базу
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    <Download className="w-4 h-4" />
                    Экспорт CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Дата</th>
                      <th className="px-6 py-3 font-medium">ФИО</th>
                      <th className="px-6 py-3 font-medium">Возраст/Город</th>
                      <th className="px-6 py-3 font-medium">Соцсети</th>
                      <th className="px-6 py-3 font-medium">Фото</th>
                      <th className="px-6 py-3 font-medium">Видео</th>
                      <th className="px-6 py-3 font-medium">Статус</th>
                      <th className="px-6 py-3 font-medium text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {applications?.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-500">
                          {format(new Date(app.created_at), 'dd.MM.yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{app.full_name}</td>
                        <td className="px-6 py-4 text-gray-500">{app.age_city}</td>
                        <td className="px-6 py-4">
                          <a href={app.social_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {app.social_link}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          {app.photo_file_id && (
                            <a href={`/api/file/${app.photo_file_id}`} target="_blank" rel="noopener noreferrer">
                              <img src={`/api/file/${app.photo_file_id}`} alt="Фото" className="w-12 h-12 object-cover rounded-md border border-gray-200 hover:opacity-80 transition-opacity" />
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {app.video_file_id && (
                            <a href={`/api/file/${app.video_file_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full border border-gray-200 text-blue-600 hover:bg-blue-50 transition-colors">
                              <Play className="w-5 h-5 ml-1" />
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            app.status === 'pending' && "bg-yellow-100 text-yellow-800",
                            app.status === 'approved' && "bg-green-100 text-green-800",
                            app.status === 'rejected' && "bg-red-100 text-red-800"
                          )}>
                            {app.status === 'pending' ? 'Ожидает' : app.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {app.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(app.id, 'approved')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Одобрить
                              </button>
                              <button 
                                onClick={() => handleStatusChange(app.id, 'rejected')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Отклонить
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!applications || applications.length === 0) && (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          Нет анкет
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Настройки текстов бота</h3>
              <p className="text-gray-500 text-sm mb-6">Здесь вы можете изменить тексты бота без изменения кода. Используйте <code>{'{name}'}</code> для подстановки имени пользователя.</p>
              
              <SettingsForm />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsForm() {
  const [texts, setTexts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/bot-texts')
      .then(res => res.json())
      .then(data => {
        if (Object.keys(data).length === 0) {
          // Default texts if empty
          setTexts({
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
          });
        } else {
          setTexts(data);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bot-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(texts)
      });
      if (res.ok) {
        alert('Тексты успешно сохранены!');
      } else {
        alert('Ошибка при сохранении текстов.');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при сохранении текстов.');
    }
    setSaving(false);
  };

  const handleChange = (lang: 'ru' | 'uz', key: string, value: string) => {
    setTexts((prev: any) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [key]: value
      }
    }));
  };

  if (loading) return <div>Загрузка текстов...</div>;

  const fields = [
    { key: 'welcome', label: 'Приветствие (с договором)' },
    { key: 'agree', label: 'Кнопка "Согласен"' },
    { key: 'ask_name', label: 'Запрос имени' },
    { key: 'ask_age_city', label: 'Запрос возраста и города' },
    { key: 'ask_social', label: 'Запрос соцсетей' },
    { key: 'ask_photo', label: 'Запрос фото (статистики)' },
    { key: 'ask_video', label: 'Запрос видео' },
    { key: 'done', label: 'Успешное завершение' },
    { key: 'not_photo', label: 'Ошибка: отправлено не фото' },
    { key: 'not_video', label: 'Ошибка: отправлено не видео' },
    { key: 'approved', label: 'Уведомление: Заявка одобрена' },
    { key: 'rejected', label: 'Уведомление: Заявка отклонена' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Russian Texts */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg text-gray-900 border-b pb-2">🇷🇺 Русский язык</h4>
          {fields.map(field => (
            <div key={`ru-${field.key}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <textarea 
                rows={field.key === 'welcome' || field.key === 'ask_video' || field.key === 'approved' || field.key === 'rejected' ? 4 : 2} 
                value={texts.ru[field.key]} 
                onChange={(e) => handleChange('ru', field.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" 
              />
            </div>
          ))}
        </div>

        {/* Uzbek Texts */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg text-gray-900 border-b pb-2">🇺🇿 O'zbekcha</h4>
          {fields.map(field => (
            <div key={`uz-${field.key}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <textarea 
                rows={field.key === 'welcome' || field.key === 'ask_video' || field.key === 'approved' || field.key === 'rejected' ? 4 : 2} 
                value={texts.uz[field.key]} 
                onChange={(e) => handleChange('uz', field.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить все тексты'}
        </button>
      </div>
    </div>
  );
}
