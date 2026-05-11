// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBmO3_-It7aTdZgFTuNa6fW7as5tATdJRs",
    authDomain: "myquizlab-5c87b.firebaseapp.com",
    databaseURL: "https://myquizlab-5c87b-default-rtdb.firebaseio.com",
    projectId: "myquizlab-5c87b",
    storageBucket: "myquizlab-5c87b.firebasestorage.app",
    messagingSenderId: "235191830751",
    appId: "1:235191830751:web:753241efe61d5c33c1416a",
    measurementId: "G-PSHXJ7NYMV"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let allQuizzes = [];
let currentQuiz = null;
let userAnswers = {};
let currentUser = null;
let isAdmin = false;

// 1. НАВИГАЦИЯ И АВТОРИЗАЦИЯ
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
}

function toggleAuth(isRegister) {
    document.getElementById('login-form').classList.toggle('hidden', isRegister);
    document.getElementById('register-form').classList.toggle('hidden', !isRegister);
}

function handleRegister() {
    const login = document.getElementById('reg-login').value.trim();
    const pass = document.getElementById('reg-password').value.trim();

    if (login.length < 3 || pass.length < 3) return alert("Минимум 3 символа!");

    database.ref('users/' + login).once('value', (snapshot) => {
        if (snapshot.exists()) {
            alert("Логин занят!");
        } else {
            database.ref('users/' + login).set({ password: pass, role: 'student' })
                .then(() => { alert("Готово! Войдите."); toggleAuth(false); });
        }
    });
}

function handleLogin(role) {
    const login = document.getElementById('auth-login').value.trim();
    const pass = document.getElementById('auth-password').value.trim();

    if (role === 'admin') {
        if (login === 'admin' && pass === '12345') {
            isAdmin = true; currentUser = 'Учитель';
            document.getElementById('admin-editor').classList.remove('hidden');
            finishLogin();
        } else { alert("Ошибка доступа!"); }
    } else {
        database.ref('users/' + login).once('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.password === pass) {
                isAdmin = false; currentUser = login;
                document.getElementById('admin-editor').classList.add('hidden');
                finishLogin();
            } else { alert("Неверные данные!"); }
        });
    }
}

function finishLogin() {
    showPage('main-page');
    renderLibrary();
}

// 2. РАБОТА С ТЕСТАМИ (ПАРСЕР И СОХРАНЕНИЕ)
function parseRawInput(text) {
    const questions = [];
    const rawBlocks = text.split(/Question/i);
    for (let block of rawBlocks) {
        block = block.trim();
        if (!block) continue;
        const optionMatches = [...block.matchAll(/Option\d+\s+(.*?)(?=Option\d+|$)/gis)];
        const questionText = block.split(/Option\d+/i)[0].trim();
        const options = [];
        let correct = null;

        optionMatches.forEach((match, index) => {
            let optText = match[1].trim();
            if (optText.toLowerCase().includes("true")) {
                correct = index;
                optText = optText.replace(/true/i, "").trim();
            }
            options.push(optText);
        });

        if (questionText) {
            if (correct === null) throw new Error(`В вопросе "${questionText.substring(0,20)}" нет true!`);
            questions.push({ q: questionText, options, correct });
        }
    }
    return questions;
}

function handleSaveQuiz() {
    const title = document.getElementById('quiz-title').value.trim();
    const rawData = document.getElementById('quiz-raw-input').value;
    if (!title || !rawData) return alert("Заполни поля!");
    try {
        const questions = parseRawInput(rawData);
        database.ref('quizzes').push({ id: Date.now(), title, questions });
        alert("Сохранено!");
        document.getElementById('quiz-title').value = "";
        document.getElementById('quiz-raw-input').value = "";
    } catch (e) { alert(e.message); }
}

// 3. ОТОБРАЖЕНИЕ БИБЛИОТЕКИ
database.ref('quizzes').on('value', (snapshot) => {
    allQuizzes = [];
    const data = snapshot.val();
    if (data) Object.keys(data).forEach(k => allQuizzes.push({ ...data[k], dbKey: k }));
    renderLibrary();
});

function renderLibrary() {
    const list = document.getElementById('quiz-list');
    if (!list || !currentUser) return;

    list.innerHTML = allQuizzes.map(q => `
        <div class="quiz-card">
            <div class="quiz-info">
                <strong>${q.title}</strong><br>
                <small style="color: #666;">Вопросов: ${q.questions ? q.questions.length : 0}</small>
            </div>
            <div class="quiz-actions">
                <button onclick="startQuiz(${q.id})" style="background:#28a745; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight: bold;">Начать</button>
                
                ${isAdmin ? `
                    <button onclick="editQuiz('${q.dbKey}')" style="background:#ffc107; color:#333; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">✎</button>
                    <button onclick="deleteQuiz('${q.dbKey}')" style="background:#dc3545; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">✕</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function deleteQuiz(key) { if (confirm("Удалить?")) database.ref('quizzes/' + key).remove(); }

// 4. ПРОХОЖДЕНИЕ ТЕСТА
function startQuiz(id) {
    currentQuiz = allQuizzes.find(q => q.id === id);
    userAnswers = {};
    document.getElementById('current-quiz-title').innerText = currentQuiz.title;
    document.getElementById('submit-btn').style.display = 'block';
    const container = document.getElementById('questions-container');
    container.innerHTML = currentQuiz.questions.map((q, qIdx) => `
        <div class="question-block" id="q-block-${qIdx}">
            <p><strong>${qIdx + 1}.</strong> ${q.q}</p>
            <div class="options-group">
                ${q.options.map((opt, oIdx) => `
                    <button class="option-btn" onclick="handleOptionClick(${qIdx}, ${oIdx}, this)">${opt}</button>
                `).join('')}
            </div>
        </div>
    `).join('');
    showPage('quiz-page');
    if (window.MathJax) MathJax.typesetPromise();
}

function handleOptionClick(qIdx, oIdx, btn) {
    const isInstant = document.getElementById('instant-check').checked;
    const correctIdx = currentQuiz.questions[qIdx].correct;
    userAnswers[qIdx] = oIdx;

    if (isInstant) {
        if (oIdx === correctIdx) btn.classList.add('correct');
        else {
            btn.classList.add('wrong');
            btn.parentElement.querySelectorAll('.option-btn')[correctIdx].classList.add('correct');
        }
        btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    } else {
        btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.style.border = '1px solid #eee');
        btn.style.border = '2px solid #1a73e8';
    }
}

function checkFullQuiz() {
    let correctCount = 0; 
    let wrongCount = 0;
    let skippedCount = 0; // Добавили счетчик пропущенных
    let lyceumPoints = 0;
    
    const isLyceumMode = document.getElementById('lyceum-mode').checked;
    const questions = currentQuiz.questions;

    questions.forEach((q, qIdx) => {
        const correctIdx = q.correct;
        const selected = userAnswers[qIdx];
        const block = document.getElementById(`q-block-${qIdx}`);
        const btns = block.querySelectorAll('.option-btn');

        btns.forEach((b, i) => {
            b.disabled = true;
            if (i === correctIdx) b.classList.add('correct');
            if (selected === i && i !== correctIdx) b.classList.add('wrong');
        });

        // ЛОГИКА ПОДСЧЕТА
        if (selected === undefined) { 
            // Если в объекте userAnswers нет записи для этого вопроса
            skippedCount++; 
        } else if (selected === correctIdx) { 
            correctCount++; 
            lyceumPoints += 4; 
        } else { 
            wrongCount++;
            lyceumPoints -= 1; 
        }
    });

    const percent = Math.round((correctCount / questions.length) * 100);
    
    // Сохранение в Firebase (добавили skipped в облако)
    saveResultToCloud(correctCount, questions.length, percent, lyceumPoints, skippedCount);

    // ФОРМИРУЕМ СООБЩЕНИЕ
    let resultMsg = `РЕЗУЛЬТАТЫ:\n`;
    resultMsg += `--------------------------\n`;
    resultMsg += `Правильно: ${correctCount}\n`;
    resultMsg += `Неправильно: ${wrongCount}\n`;
    resultMsg += `Пропущено: ${skippedCount}\n`; // Выводим пропущенные
    resultMsg += `Успешность: ${percent}%`;

    if (isLyceumMode) {
        resultMsg += `\n--------------------------`;
        resultMsg += `\nБаллы Лицея: ${lyceumPoints}`;
    }

    alert(resultMsg);
    document.getElementById('submit-btn').style.display = 'none';
    window.scrollTo(0,0);
}

// Не забудь обновить и эту функцию, чтобы она принимала skipped
function saveResultToCloud(score, total, percent, points, skipped) {
    database.ref('results').push({
        user: currentUser, 
        test: currentQuiz.title,
        date: new Date().toLocaleDateString(), 
        time: new Date().toLocaleTimeString(),
        score, 
        total, 
        percent, 
        points,
        skipped // Сохраняем количество пропущенных в базу
    });
}

function saveResultToCloud(score, total, percent, points) {
    database.ref('results').push({
        user: currentUser, test: currentQuiz.title,
        date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(),
        score, total, percent, points
    });
}
// ФУНКЦИЯ РЕДАКТИРОВАНИЯ
function editQuiz(dbKey) {
    // 1. Находим нужный тест в массиве по его ключу в базе
    const quiz = allQuizzes.find(q => q.dbKey === dbKey);
    if (!quiz) return;

    // 2. Заполняем заголовок
    document.getElementById('quiz-title').value = quiz.title;
    
    // 3. Превращаем массив вопросов обратно в текст для textarea
    let rawText = "";
    quiz.questions.forEach(q => {
        rawText += `Question ${q.q}\n`;
        q.options.forEach((opt, i) => {
            // Добавляем "true" к правильному варианту
            rawText += `Option${i+1} ${opt}${i === q.correct ? ' true' : ''}\n`;
        });
        rawText += "\n"; // Пробел между вопросами
    });
    
    document.getElementById('quiz-raw-input').value = rawText;

    // 4. Даем знать учителю, что делать дальше
    if(confirm("Тест загружен в редактор. После внесения правок нажмите 'Сохранить в облако'. Удалить старую версию теста из списка сейчас?")) {
        database.ref('quizzes/' + dbKey).remove();
    }
    
    // Скроллим вверх к редактору
    window.scrollTo(0, 0);
}
