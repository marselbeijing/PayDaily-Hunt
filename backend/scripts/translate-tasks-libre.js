const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');

// Попытка загрузить Task из двух возможных путей
let Task;
try {
  Task = require('../models/Task');
} catch (e) {
  Task = require(path.resolve(__dirname, '../models/Task'));
}

const MONGODB_URI = 'mongodb+srv://username:password@cluster.mongodb.net/paydaily_hunt'; // замените на свой

async function translate(text) {
  try {
    const res = await axios.post('https://libretranslate.com/translate', {
      q: text,
      source: 'ru',
      target: 'en',
      format: 'text'
    }, { headers: { 'accept': 'application/json' } });
    return res.data.translatedText;
  } catch (err) {
    console.error('Ошибка перевода:', err.message);
    return text;
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const tasks = await Task.find({});
  let updated = 0;
  for (const task of tasks) {
    try {
      // Переводим только если есть кириллица (русский текст)
      let changed = false;
      if (task.title && /[\u0400-\u04FF]/.test(task.title)) {
        const enTitle = await translate(task.title);
        task.title = enTitle;
        changed = true;
      }
      if (task.description && /[\u0400-\u04FF]/.test(task.description)) {
        const enDesc = await translate(task.description);
        task.description = enDesc;
        changed = true;
      }
      // Если есть другие текстовые поля, добавьте их здесь
      if (changed) {
        await task.save();
        updated++;
        console.log(`Переведено: "${task.title}"`);
      }
    } catch (err) {
      console.error('Ошибка при обработке задания:', err.message);
    }
  }

  await mongoose.disconnect();
  console.log(`Done! Updated: ${updated}`);
}

main().catch(console.error); 
const axios = require('axios');
const path = require('path');

// Попытка загрузить Task из двух возможных путей
let Task;
try {
  Task = require('../models/Task');
} catch (e) {
  Task = require(path.resolve(__dirname, '../models/Task'));
}

const MONGODB_URI = 'mongodb+srv://username:password@cluster.mongodb.net/paydaily_hunt'; // замените на свой

async function translate(text) {
  try {
    const res = await axios.post('https://libretranslate.com/translate', {
      q: text,
      source: 'ru',
      target: 'en',
      format: 'text'
    }, { headers: { 'accept': 'application/json' } });
    return res.data.translatedText;
  } catch (err) {
    console.error('Ошибка перевода:', err.message);
    return text;
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const tasks = await Task.find({});
  let updated = 0;
  for (const task of tasks) {
    try {
      // Переводим только если есть кириллица (русский текст)
      let changed = false;
      if (task.title && /[\u0400-\u04FF]/.test(task.title)) {
        const enTitle = await translate(task.title);
        task.title = enTitle;
        changed = true;
      }
      if (task.description && /[\u0400-\u04FF]/.test(task.description)) {
        const enDesc = await translate(task.description);
        task.description = enDesc;
        changed = true;
      }
      // Если есть другие текстовые поля, добавьте их здесь
      if (changed) {
        await task.save();
        updated++;
        console.log(`Переведено: "${task.title}"`);
      }
    } catch (err) {
      console.error('Ошибка при обработке задания:', err.message);
    }
  }

  await mongoose.disconnect();
  console.log(`Done! Updated: ${updated}`);
}

main().catch(console.error); 
const axios = require('axios');
const path = require('path');

// Попытка загрузить Task из двух возможных путей
let Task;
try {
  Task = require('../models/Task');
} catch (e) {
  Task = require(path.resolve(__dirname, '../models/Task'));
}

const MONGODB_URI = 'mongodb+srv://username:password@cluster.mongodb.net/paydaily_hunt'; // замените на свой

async function translate(text) {
  try {
    const res = await axios.post('https://libretranslate.com/translate', {
      q: text,
      source: 'ru',
      target: 'en',
      format: 'text'
    }, { headers: { 'accept': 'application/json' } });
    return res.data.translatedText;
  } catch (err) {
    console.error('Ошибка перевода:', err.message);
    return text;
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const tasks = await Task.find({});
  let updated = 0;
  for (const task of tasks) {
    try {
      // Переводим только если есть кириллица (русский текст)
      let changed = false;
      if (task.title && /[\u0400-\u04FF]/.test(task.title)) {
        const enTitle = await translate(task.title);
        task.title = enTitle;
        changed = true;
      }
      if (task.description && /[\u0400-\u04FF]/.test(task.description)) {
        const enDesc = await translate(task.description);
        task.description = enDesc;
        changed = true;
      }
      // Если есть другие текстовые поля, добавьте их здесь
      if (changed) {
        await task.save();
        updated++;
        console.log(`Переведено: "${task.title}"`);
      }
    } catch (err) {
      console.error('Ошибка при обработке задания:', err.message);
    }
  }

  await mongoose.disconnect();
  console.log(`Done! Updated: ${updated}`);
}

main().catch(console.error); 