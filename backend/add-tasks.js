const mongoose = require('mongoose');
const Task = require('./models/Task');

// 1. Строка подключения MongoDB Atlas:
const MONGODB_URI = 'mongodb+srv://marselbeijing:Atlant19850124@cluster0.0se81fu.mongodb.net/paydaily_hunt?retryWrites=true&w=majority&appName=Cluster0';

// 2. Массив заданий для добавления:
const tasks = [
  {
    title: 'Join our Telegram channel',
    description: 'Subscribe to our official Telegram channel and get a reward.',
    type: 'social',
    reward: 0.5,
    actionUrl: 'https://t.me/yourchannel',
    category: 'entertainment',
    isActive: true
  },
  {
    title: 'Install our mobile app',
    description: 'Download and install our app from the App Store or Google Play.',
    type: 'app_install',
    reward: 1.0,
    actionUrl: 'https://yourapp.link',
    category: 'gaming',
    isActive: true
  },
  {
    title: 'Take a short survey',
    description: 'Answer a few questions and get a reward.',
    type: 'survey',
    reward: 0.3,
    actionUrl: 'https://yoursurvey.link',
    category: 'finance',
    isActive: true
  }
];

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  for (const task of tasks) {
    const exists = await Task.findOne({ title: task.title, category: task.category });
    if (exists) {
      console.log(`Task with title "${task.title}" and category "${task.category}" already exists, skipping.`);
      continue;
    }
    await Task.create(task);
    console.log(`Task "${task.title}" added!`);
  }

  await mongoose.disconnect();
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 