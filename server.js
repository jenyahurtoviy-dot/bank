const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Разрешаем серверу принимать JSON-данные от клиента
app.use(express.json());

// Главная настройка: разрешаем серверу показывать HTML, CSS и JS из папки проекта
app.use(express.static(path.join(__dirname)));

// Подключение к базе данных SQLite (файл создастся автоматически)
const dbFile = path.join(__dirname, 'aivora.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('✅ База данных SQLite подключена.');
    }
});

// Создаем таблицу пользователей по умолчанию, если её еще нет
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    balance REAL DEFAULT 0
)`);

// Простой тестовый маршрут для проверки работы API
app.get('/api/status', (req, res) => {
    res.json({ success: true, message: 'Сервер работает отлично!' });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`🚀 Сервер запущен на порту ${port}`);
});