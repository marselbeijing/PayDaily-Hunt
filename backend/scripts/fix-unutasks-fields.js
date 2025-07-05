const mongoose = require('mongoose');
const Task = require('../models/Task');
require('dotenv').config({ path: __dirname + '/../config.env' });

const MONGO_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const tasks = await Task.find({});
  let updated = 0;

  for (const task of tasks) {
    let changed = false;
    // Проверяем описание
    if (!task.description || !task.description.trim()) {
      task.description = 'Follow the instructions and complete the task.';
      changed = true;
    }
    // Проверяем ссылку
    if (!task.actionUrl || !task.actionUrl.trim()) {
      task.actionUrl = 'REQUIRES MANUAL LINK';
      changed = true;
    }
    if (changed) {
      await task.save();
      updated++;
    }
  }
  console.log(`Updated ${updated} UNU tasks.`);
  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 