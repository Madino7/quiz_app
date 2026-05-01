// Твоя конфигурация из консоли
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

// Инициализация (версия Compat)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let allQuizzes = [];
let currentQuiz = null;

// 1. Синхронизация с облаком в реальном времени
database.ref('quizzes').on('value', (snapshot) => {
    const data = snapshot.val();
    allQuizzes = [];
    if (data) {
        // Превращаем объект Firebase в массив
        Object.keys(data).forEach(key => {
            allQuizzes.push({ id: data[key].id, title: data[key].title, questions: data[key].questions, dbKey: key });
        });
    }
    renderLibrary();
});

// 2. Навигация
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
}

// 3. Сохранение в облако
function handleSaveQuiz() {
    const title = document.getElementById('quiz-title').value;
    const rawData = document.getElementById('quiz-raw-input').value;
    
    if(!title || !rawData) return alert("Заполни поля!");

    const newQuiz = {
        id: Date.now(),
        title: title,
        questions: parseRawInput(rawData)
    };

    // Отправляем в Firebase
    database.ref('quizzes').push(newQuiz);

    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-raw-input').value = '';
    alert("Тест отправлен в облако!");
}

// 4. Удаление из облака
function deleteQuiz(dbKey) {
    if (confirm("Удалить этот тест из всех устройств?")) {
        database.ref('quizzes/' + dbKey).remove();
    }
}

// 5. Редактирование (Загрузка в форму и удаление старого)
function editQuiz(dbKey) {
    const quiz = allQuizzes.find(q => q.dbKey === dbKey);
    document.getElementById('quiz-title').value = quiz.title;
    
    let rawText = "";
    quiz.questions.forEach((q) => {
        rawText += `Question ${q.q}\n`;
        q.options.forEach((opt, oIdx) => {
            rawText += `Option${oIdx + 1} ${opt}${oIdx === q.correct ? ' true' : ''}\n`;
        });
        rawText += "\n";
    });
    document.getElementById('quiz-raw-input').value = rawText;
    
    // Удаляем из базы, чтобы при сохранении создалась обновленная версия
    database.ref('quizzes/' + dbKey).remove();
    window.scrollTo(0,0);
}

// 6. Парсер
function parseRawInput(text) {
    const questions = [];
    const rawBlocks = text.split(/Question/i);
    rawBlocks.forEach(block => {
        if (block.trim() === "") return;
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
        if (questionText) questions.push({ q: questionText, options, correct });
    });
    return questions;
}

// 7. Отрисовка списка
function renderLibrary() {
    const list = document.getElementById('quiz-list');
    if(!list) return;
    list.innerHTML = allQuizzes.map(q => `
        <div class="quiz-card">
            <div><strong>${q.title}</strong> <br> <small>${q.questions.length} вопр.</small></div>
            <div class="quiz-actions">
                <button onclick="startQuiz(${q.id})">Открыть</button>
                <button onclick="editQuiz('${q.dbKey}')" style="background:#FF9800">✎</button>
                <button onclick="deleteQuiz('${q.dbKey}')" style="background:#f44336">✕</button>
            </div>
        </div>
    `).join('');
}

// 8. Логика теста (та же, что была раньше)
function startQuiz(id) {
    currentQuiz = allQuizzes.find(q => q.id === id);
    document.getElementById('current-quiz-title').innerText = currentQuiz.title;
    const container = document.getElementById('questions-container');
    container.innerHTML = currentQuiz.questions.map((q, qIdx) => `
        <div class="question-block">
            <p><strong>${qIdx + 1}.</strong> ${q.q}</p>
            ${q.options.map((opt, oIdx) => `
                <button class="option-btn" onclick="handleOptionClick(${qIdx}, ${oIdx}, this)">${opt}</button>
            `).join('')}
        </div>
    `).join('');
    showPage('quiz-page');
    // В конец функции startQuiz
if (window.MathJax) {
    MathJax.typesetPromise();
}
}

function handleOptionClick(qIdx, oIdx, btn) {
    const isInstant = document.getElementById('instant-check').checked;
    const correctIdx = currentQuiz.questions[qIdx].correct;
    if (isInstant) {
        if (oIdx === correctIdx) btn.classList.add('correct');
        else {
            btn.classList.add('wrong');
            btn.parentElement.querySelectorAll('.option-btn')[correctIdx].classList.add('correct');
        }
        btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    } else {
        btn.parentElement.querySelectorAll('.option-btn').forEach(b => {
            b.style.border = '1px solid #ddd';
            delete b.dataset.selected;
        });
        btn.style.border = '2px solid #2196F3'; 
        btn.dataset.selected = oIdx;
    }
}

function checkFullQuiz() {
    let score = 0;
    document.querySelectorAll('.question-block').forEach((block, qIdx) => {
        const correctIdx = currentQuiz.questions[qIdx].correct;
        const btns = block.querySelectorAll('.option-btn');
        let selected = null;
        btns.forEach((b, i) => { if(b.dataset.selected !== undefined) selected = i; });
        btns.forEach((b, i) => {
            b.disabled = true;
            if(i === correctIdx) b.classList.add('correct');
            if(selected === i && i !== correctIdx) b.classList.add('wrong');
        });
        if(selected === correctIdx) score++;
    });
    alert(`Твой результат: ${score} из ${currentQuiz.questions.length}`);
}