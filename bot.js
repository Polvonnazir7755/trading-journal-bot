const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// === SOZLAMALAR — BULARNI O'ZGARTIRING ===
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const SERVER_URL = process.env.SERVER_URL || 'https://your-server.onrender.com';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your-secret-here';
const ADMIN_ID = process.env.ADMIN_ID || '123456789'; // Sizning Telegram ID ingiz
const PAYME_LINK = 'https://payme.uz/...'; // Payme link
const CLICK_LINK = 'https://my.click.uz/...'; // Click link
// ==========================================

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Foydalanuvchi holatlari
const userStates = {};

// === START ===
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'Foydalanuvchi';
  
  bot.sendMessage(chatId, 
    `👋 Salom, ${name}!\n\n` +
    `📊 *Trading Journal* — Professional savdo kundaligi\n\n` +
    `✅ Savdolaringizni kuzatish\n` +
    `✅ AI tahlil va maslahatlar\n` +
    `✅ Risk kalkulyator\n` +
    `✅ Prop firma kuzatuvi\n` +
    `✅ London/NY sessiya taymer\n` +
    `✅ Backtesting tizimi\n\n` +
    `💰 *Narxlar:*\n` +
    `• Oddiy versiya: *5$* (Web) / *8$* (Desktop)\n` +
    `• PRO versiya: *10$* (Web) / *12$* (Desktop)\n\n` +
    `Quyidagi tugmalardan birini tanlang:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 Web Oddiy — 5$', callback_data: 'buy_web_standard' },
            { text: '🌐 Web PRO — 10$', callback_data: 'buy_web_pro' }
          ],
          [
            { text: '💻 Desktop Oddiy — 8$', callback_data: 'buy_desktop_standard' },
            { text: '💻 Desktop PRO — 12$', callback_data: 'buy_desktop_pro' }
          ],
          [
            { text: '❓ Savollar', callback_data: 'faq' },
            { text: '📸 Namuna ko\'rish', callback_data: 'demo' }
          ]
        ]
      }
    }
  );
});

// === CALLBACK QUERIES ===
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const userId = query.from.id;

  bot.answerCallbackQuery(query.id);

  if (data === 'faq') {
    bot.sendMessage(chatId,
      `❓ *Ko'p so'raladigan savollar*\n\n` +
      `*Web vs Desktop farqi nima?*\n` +
      `Web — brauzerda ishlaydi, hech narsa o'rnatmaydi\n` +
      `Desktop — kompyuterga o'rnatiladi, offline ham ishlaydi\n\n` +
      `*To'lov qanday amalga oshiriladi?*\n` +
      `Payme yoki Click orqali\n\n` +
      `*Kalit qancha vaqt ishlaydi?*\n` +
      `Bir martalik to'lov — muddatsiz\n\n` +
      `*Bir kalit nechta qurilmada ishlaydi?*\n` +
      `Faqat 1 ta qurilmada\n\n` +
      `*Muammo bo'lsa?*\n` +
      `Admin bilan bog'laning: @admin_username`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (data === 'demo') {
    bot.sendMessage(chatId,
      `📸 *Trading Journal namunalari*\n\n` +
      `Quyida app ning asosiy funksiyalari ko'rsatilgan.\n\n` +
      `🎥 Video namuna: [YouTube link]\n` +
      `📱 Instagram: [@sizning_username]`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Sotib olish
  const buyMap = {
    'buy_web_standard': { name: 'Web Oddiy', price: '5$', type: 'standard', version: 'web' },
    'buy_web_pro': { name: 'Web PRO', price: '10$', type: 'pro', version: 'web' },
    'buy_desktop_standard': { name: 'Desktop Oddiy', price: '8$', type: 'standard', version: 'desktop' },
    'buy_desktop_pro': { name: 'Desktop PRO', price: '12$', type: 'pro', version: 'desktop' }
  };

  if (buyMap[data]) {
    const product = buyMap[data];
    userStates[userId] = { step: 'awaiting_payment', product };

    bot.sendMessage(chatId,
      `✅ Siz tanladingiz: *${product.name} — ${product.price}*\n\n` +
      `💳 *To'lov usulini tanlang:*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💳 Payme orqali', callback_data: `pay_payme_${data}` },
              { text: '💳 Click orqali', callback_data: `pay_click_${data}` }
            ],
            [{ text: '◀️ Orqaga', callback_data: 'back' }]
          ]
        }
      }
    );
    return;
  }

  if (data.startsWith('pay_')) {
    const parts = data.split('_');
    const payMethod = parts[1];
    const productKey = parts.slice(2).join('_');
    const product = buyMap[productKey];

    const payLink = payMethod === 'payme' ? PAYME_LINK : CLICK_LINK;

    bot.sendMessage(chatId,
      `💳 *${payMethod === 'payme' ? 'Payme' : 'Click'} orqali to'lov*\n\n` +
      `Mahsulot: *${product.name}*\n` +
      `Narx: *${product.price}*\n\n` +
      `📌 To'lov linkiga o'ting va to'lovni amalga oshiring.\n` +
      `To'lov tugagach *"To'lov qildim"* tugmasini bosing.\n\n` +
      `⚠️ Izohga Telegram username ingizni yozing!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: `💳 ${payMethod === 'payme' ? 'Payme' : 'Click'} ga o'tish`, url: payLink }],
            [{ text: '✅ To\'lov qildim', callback_data: `confirm_${productKey}_${userId}` }]
          ]
        }
      }
    );
    return;
  }

  if (data.startsWith('confirm_')) {
    const parts = data.split('_');
    const productKey = parts.slice(1, -1).join('_');
    const product = buyMap[productKey];

    bot.sendMessage(chatId,
      `⏳ To'lovingiz tekshirilmoqda...\n\n` +
      `Admin tasdiqlagandan so'ng kalitingiz yuboriladi.\n` +
      `Odatda 5-15 daqiqa ichida.`,
      { parse_mode: 'Markdown' }
    );

    // Admin ga xabar
    bot.sendMessage(ADMIN_ID,
      `🔔 *Yangi to'lov so'rovi!*\n\n` +
      `👤 Foydalanuvchi: ${query.from.first_name} ${query.from.last_name || ''}\n` +
      `📱 Username: @${query.from.username || 'yo\'q'}\n` +
      `🆔 ID: ${userId}\n` +
      `📦 Mahsulot: ${product.name}\n` +
      `💰 Narx: ${product.price}\n\n` +
      `✅ Tasdiqlash uchun:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ 
              text: `✅ Tasdiqlash va kalit yuborish`, 
              callback_data: `admin_approve_${userId}_${productKey}` 
            }],
            [{ 
              text: `❌ Rad etish`, 
              callback_data: `admin_reject_${userId}` 
            }]
          ]
        }
      }
    );
    return;
  }

  // Admin tasdiqlash
  if (data.startsWith('admin_approve_')) {
    const parts = data.split('_');
    const targetUserId = parts[2];
    const productKey = parts.slice(3).join('_');
    const product = buyMap[productKey];

    try {
      // Server dan kalit yaratish
      const response = await axios.post(`${SERVER_URL}/api/create-key`, {
        secret: ADMIN_SECRET,
        type: product.type,
        telegramId: targetUserId,
        buyerName: `TG-${targetUserId}`
      });

      const { key } = response.data;

      // Mijozga kalit yuborish
      if (product.version === 'web') {
        bot.sendMessage(targetUserId,
          `🎉 *To'lovingiz tasdiqlandi!*\n\n` +
          `📦 Mahsulot: *${product.name}*\n\n` +
          `🔑 *Sizning kalitingiz:*\n` +
          `\`${key}\`\n\n` +
          `🌐 *Web app linki:*\n` +
          `https://your-app-link.netlify.app\n\n` +
          `📌 Kalitni birinchi kirganda so'raydi.\n` +
          `⚠️ Kalitni hech kimga bermang — faqat 1 qurilmada ishlaydi!\n\n` +
          `Muammo bo'lsa: @admin_username`,
          { parse_mode: 'Markdown' }
        );
      } else {
        // Desktop — fayl yuborish
        bot.sendMessage(targetUserId,
          `🎉 *To'lovingiz tasdiqlandi!*\n\n` +
          `📦 Mahsulot: *${product.name}*\n\n` +
          `🔑 *Sizning kalitingiz:*\n` +
          `\`${key}\`\n\n` +
          `💻 *O'rnatish fayli yuborilmoqda...*`,
          { parse_mode: 'Markdown' }
        );

        // .exe fayl yuborish
        const filePath = product.type === 'pro'
          ? './files/Trading Journal Pro Setup 2.0.0.exe'
          : './files/Trading Journal Setup 1.0.0.exe';

        try {
          await bot.sendDocument(targetUserId, filePath, {
            caption: `✅ Trading Journal ${product.type === 'pro' ? 'PRO' : ''} Setup\n\nO'rnatib, kalitni kiriting!`
          });
        } catch(e) {
          bot.sendMessage(targetUserId,
            `📥 *O'rnatish faylini yuklab oling:*\n` +
            `[Download link bu yerda]\n\n` +
            `Kalit: \`${key}\``,
            { parse_mode: 'Markdown' }
          );
        }
      }

      // Admin ga tasdiqlash
      bot.sendMessage(ADMIN_ID,
        `✅ Kalit yuborildi!\n\nMijoz ID: ${targetUserId}\nKalit: \`${key}\``,
        { parse_mode: 'Markdown' }
      );

    } catch(e) {
      bot.sendMessage(ADMIN_ID, `❌ Xato: ${e.message}`);
    }
    return;
  }

  if (data.startsWith('admin_reject_')) {
    const targetUserId = data.split('_')[2];
    bot.sendMessage(targetUserId,
      `❌ *To'lov tasdiqlanmadi.*\n\n` +
      `To'lov amalga oshmagan ko'rinadi. Qaytadan urinib ko'ring yoki @admin_username bilan bog'laning.`,
      { parse_mode: 'Markdown' }
    );
    bot.sendMessage(ADMIN_ID, `✅ Rad etildi.`);
    return;
  }

  if (data === 'back') {
    bot.sendMessage(chatId, 'Asosiy menyu:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 Web Oddiy — 5$', callback_data: 'buy_web_standard' },
            { text: '🌐 Web PRO — 10$', callback_data: 'buy_web_pro' }
          ],
          [
            { text: '💻 Desktop Oddiy — 8$', callback_data: 'buy_desktop_standard' },
            { text: '💻 Desktop PRO — 12$', callback_data: 'buy_desktop_pro' }
          ]
        ]
      }
    });
  }
});

// Admin buyruqlari
bot.onText(/\/admin/, (msg) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  bot.sendMessage(msg.chat.id,
    `👨‍💼 *Admin panel*\n\n` +
    `Buyruqlar:\n` +
    `/stats — Statistika\n` +
    `/addkey [type] — Kalit yaratish\n`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/stats/, async (msg) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  try {
    const res = await axios.get(`${SERVER_URL}/api/licenses?secret=${ADMIN_SECRET}`);
    const licenses = Object.values(res.data.licenses);
    const total = licenses.length;
    const active = licenses.filter(l => l.active).length;
    const pro = licenses.filter(l => l.type === 'pro').length;
    bot.sendMessage(msg.chat.id,
      `📊 *Statistika*\n\n` +
      `Jami kalitlar: ${total}\n` +
      `Faol: ${active}\n` +
      `PRO: ${pro}\n` +
      `Oddiy: ${total - pro}`,
      { parse_mode: 'Markdown' }
    );
  } catch(e) {
    bot.sendMessage(msg.chat.id, `Xato: ${e.message}`);
  }
});

console.log('Bot ishga tushdi! ✅');
