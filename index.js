const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
const data = require('./data.json');

const token = process.env.TOKEN || '7820501883:AAFE96vIZZKIqQhFvL7n0Ul2UJMmaihumZY';
const bot = new TelegramBot(token, { polling: true });

const damageMap = data.damageTypesMap;
const phoneModelsMap = data.phoneModels;
const damageMessages = data.damageMessages;

let userState = {};

function toCamelCase(str) {
  return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase())
            .replace(/^./, (char) => char.toLowerCase());
}

function formatFileName(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

function sendDamageOptions(chatId) {
  const inlineKeyboard = Object.entries(damageMap).map(([key, label]) => [
    { text: label, callback_data: 'damage_' + key }
  ]);
  bot.sendMessage(chatId, 'Ընտրիր, թե ի՞նչն է վնասվել 👇', {
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

function sendPhoneModelOptions(chatId) {
  const phoneEntries = Object.entries(phoneModelsMap);
  const inlineKeyboard = [];

  for (let i = 0; i < phoneEntries.length; i += 2) {
    const row = [];
    for (let j = 0; j < 2; j++) {
      const entry = phoneEntries[i + j];
      if (!entry) continue;
      const [key, label] = entry;
      const callbackData = key === 'other' ? 'go_back' : 'model_' + key;
      row.push({ text: label, callback_data: callbackData });
    }
    inlineKeyboard.push(row);
  }

  bot.sendMessage(chatId, 'Ի՞նչ մոդելի մասին է խոսքը 📱', {
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}
// էս կլիրս աշխատումա 
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === '📍 Մեր հասցեն') {
    const latitude = 40.201917559305585;
    const longitude = 44.495988287283225;

    const addressText =
      '📍 Մեր հասցեն է՝ \nՔ. Երևան, Կոմիտաս 3\n\n' +
      '🌐 www.arimobile.am\n' +
      '📱 +37494457566 | +37493139116';

    bot.sendLocation(chatId, latitude, longitude).then(() => {
      bot.sendMessage(chatId, addressText);
    });
  }
});

//  էս կլիրս պիտի փոխվի , պառտադիր երկաթից

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === '📱 Վերանորոգման մասին') {
    const addressText =
      `Ողջու’յն Հարգելի հաճախորդ👋

      «Արի Մոբայլ» Սերվիս կենտրոնը արդեն 5 տարի գոծող ընկերություն է։ 
      Արի Մոբայլ սերվիս կենտրոնը ունի հմուտ և պրոֆեսիոնալ մասնագետներ։ Սպասարկվում է արագ և որակյալ։ 
      Ինչու՞ օգտվել հենց մեր սերվիս կենտրոնից👇

      1. Չի օգտագործվում ոչ օրիգինալ պահեստամասեր՝ անգամ եթե հաճախորդը ցանկանում է տեղադրել ոչ օրիգինալ պահեստամասեր։

      2. Յուրաքանչյուր վնասված սմարթֆոն վերանորոգվում է սրտացավորեն և զգուշորեն։

      3. Խաբեություն, գողություն, և այլն չի լինում։

      4. Վերանորոգումից հետո ձեր սմարթֆոնի մոտ խնդիրներ չեն առաջանում։ 


      5. Ցանկացած վերանորոգումից հետո վերականգնվում է ջրակայունությունը (ip67), այսպիսով պաշտպանում է ձեր սմարթֆոնը՝ ջրից, փոշուց և այլն

      Ձեր սմարթֆոնի վերանորոգումը վստահեք միայն պրոֆեսիոնալ և փորձառու մասնագետներին։`;
    bot.sendMessage(chatId, addressText);
  }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  userState[chatId] = { started: true };

  bot.sendMessage(chatId, 'Բարև 👋', {
    reply_markup: {
      keyboard: [['📱 Վերանորոգման մասին'],['📍 Մեր հասցեն'],
                ['🌐 Մեր հարթակները']],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });

  sendDamageOptions(chatId);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === '🌐 Մեր հարթակները') {
    bot.sendMessage(chatId, '📱 Մեր հարթակները՝', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📱 Instagram', url: 'https://instagram.com/arimobile.am' },
            { text: '🎵 TikTok', url: 'https://tiktok.com/@arimobile.am' }
          ]
        ]
      }
    });
  }
});

bot.onText(/\/other/, (msg) => {
  const chatId = msg.chat.id;
  sendDamageOptions(chatId);
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const callbackData = query.data;
  const state = userState[chatId] || {};

  try {
    await bot.deleteMessage(chatId, messageId);
  } catch (err) {
    console.error('Չհաջողվեց ջնջել մեսիջը:', err.message);
  }

  if (callbackData === 'go_back') {
    await bot.answerCallbackQuery(query.id);
    sendDamageOptions(chatId);
    return;
  }

  if (callbackData.startsWith('damage_')) {
    const damageKeyRaw = callbackData.replace('damage_', '').trim();
    state.damage = damageKeyRaw;
    userState[chatId] = state;
    await bot.answerCallbackQuery(query.id);
    sendPhoneModelOptions(chatId);
    return;
  }

  if (callbackData.startsWith('model_')) {
    const modelKey = callbackData.replace('model_', '').trim();
    state.model = modelKey;
    userState[chatId] = state;

    const damageKeyRaw = state.damage || 'other';
    const damageKey = toCamelCase(damageKeyRaw);

    const repairGroup = data[damageKey] || {};
    const price = repairGroup[modelKey] || repairGroup['other'] || 'Անհայտ';

    const modelName = phoneModelsMap[modelKey] || modelKey;
    const damageLabel = damageMap[damageKeyRaw] || damageKeyRaw;
    const damageMessage = damageMessages[damageKey] || '';

    const caption = `🔧 Վերանորոգումը կարժենա՝ ${price} դրամ 💰\n\n` +
                    `📱 Մոդել․ ${modelName}\n` +
                    `⚠️ Խնդիր․ ${damageLabel}\n` +
                    `${damageMessage}`;

    const formattedModel = formatFileName(modelKey);
    const formattedDamage = damageKey;
    const jpgPath = path.join(__dirname, 'images', formattedDamage, `${formattedModel}.jpg`);

    try {
      if (fs.existsSync(jpgPath)) {
        await bot.sendPhoto(chatId, fs.createReadStream(jpgPath), {
          caption,
          contentType: 'image/jpeg'
        });
      } else {
        await bot.sendMessage(chatId, caption + `\n\n⚠️ Նկարը բացակայում է`);
      }
    } catch (err) {
      console.error('Նկարի ուղարկման սխալ:', err.message);
      await bot.sendMessage(chatId, caption + `\n\n⚠️ Նկարը չի գտնվել`);
    }

    delete userState[chatId];
  }
});

bot.on("polling_error", (err) => {
  console.error("Polling error:", err.code || err.message || err);
});