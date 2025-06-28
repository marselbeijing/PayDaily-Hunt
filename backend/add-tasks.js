const mongoose = require('mongoose');
const Task = require('./models/Task');

// 1. Строка подключения MongoDB Atlas:
const MONGODB_URI = 'mongodb+srv://marselbeijing:Atlant19850124@cluster0.0se81fu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// 2. Массив заданий для добавления:
const tasks = [
  {
    title: 'Join our Telegram channel',
    description: 'Subscribe to our official Telegram channel and get a reward.',
    reward: 0.5,
    category: 'social',
    isActive: true
  },
  {
    title: 'Follow us on Twitter',
    description: 'Follow our official Twitter account.',
    reward: 0.7,
    category: 'social',
    isActive: true
  },
  {
    title: 'Download our app',
    description: 'Install our mobile app and sign in.',
    reward: 1.0,
    category: 'apps',
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