const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();

// Облако (например, Render) само выдаст порт. Если мы на компе — будет 3000.
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ВАЖНО: Разрешаем серверу показывать файлы (включая index.html)
app.use(express.static(__dirname));

// Подключаем или создаем базу
const db = new sqlite3.Database('./aivora.db', (err) => {
    if (err) console.error('❌ Ошибка подключении к БД:', err.message);
    else console.log('✅ База данных SQLite подключена.');
});

// Создаем таблицу
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        balance REAL DEFAULT 1000.00
    )`);
});

const fixTag = (tag) => {
    if (!tag) return '';
    let clean = tag.trim().toLowerCase();
    return clean.startsWith('@') ? clean : '@' + clean;
};

// --- API ---

app.post('/api/register', (req, res) => {
    const { tag, email, password } = req.body;
    const formattedTag = fixTag(tag);

    if (!formattedTag || !email || !password) {
        return res.status(400).json({ error: 'Заполните все поля!' });
    }

    const query = `INSERT INTO users (tag, email, password, balance) VALUES (?, ?, ?, 1000.00)`;
    db.run(query, [formattedTag, email, password], function(err) {
        if (err) return res.status(400).json({ error: 'Тег или Email уже заняты!' });
        res.json({ success: true, tag: formattedTag, balance: 1000.00 });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Неверный Email или пароль' });
        res.json({ success: true, tag: user.tag, balance: user.balance });
    });
});

app.get('/api/user/:tag', (req, res) => {
    const formattedTag = fixTag(req.params.tag);
    db.get(`SELECT tag, balance FROM users WHERE tag = ?`, [formattedTag], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(user);
    });
});

app.post('/api/transfer', (req, res) => {
    let { senderTag, receiverTag, amount } = req.body;
    senderTag = fixTag(senderTag);
    receiverTag = fixTag(receiverTag);
    amount = parseFloat(amount);

    if (!senderTag || !receiverTag || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Укажите корректного получателя и сумму' });
    }
    if (senderTag === receiverTag) {
        return res.status(400).json({ error: 'Нельзя переводить самому себе!' });
    }

    db.get(`SELECT balance FROM users WHERE tag = ?`, [senderTag], (err, sender) => {
        if (err || !sender) return res.status(404).json({ error: 'Отправитель не найден' });
        if (sender.balance < amount) return res.status(400).json({ error: 'Недостаточно денег!' });

        db.get(`SELECT balance FROM users WHERE tag = ?`, [receiverTag], (err, receiver) => {
            if (err || !receiver) return res.status(404).json({ error: 'Получатель не найден!' });

            db.run(`UPDATE users SET balance = balance - ? WHERE tag = ?`, [amount, senderTag], (err) => {
                if (err) return res.status(500).json({ error: 'Ошибка списания' });

                db.run(`UPDATE users SET balance = balance + ? WHERE tag = ?`, [amount, receiverTag], (err) => {
                    if (err) return res.status(500).json({ error: 'Ошибка зачисления' });
                    res.json({ success: true, newBalance: sender.balance - amount, receiver: receiverTag });
                });
            });
        });
    });
});

// ВАЖНО: Если кто-то просто заходит на сайт, отдаем ему index.html
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});