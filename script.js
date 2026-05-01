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

// Инициализация
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let allQuizzes = [];
let currentQuiz = null;

// Слушатель базы данных
database.ref('quizzes').on('value', (snapshot) => {
    const data = snapshot.val();
    allQuizzes = [];
    if (data) {
        Object.keys(data).forEach(key => {
            allQuizzes.push({ ...data[key], dbKey: key });
        });
    }
    renderLibrary();
});

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
}

// ПАРСЕР
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

function handleSaveQuiz() {
    const title = document.getElementById('quiz-title').value;
    const rawData = document.getElementById('quiz-raw-input').value;
    if(!title || !rawData) return alert("Заполни все поля!");

    const newQuiz = { id: Date.now(), title, questions: parseRawInput(rawData) };
    database.ref('quizzes').push(newQuiz);
    
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-raw-input').value = '';
    alert("Сохранено в облако!");
}

function renderLibrary() {
    const list = document.getElementById('quiz-list');
    if(!list) return;
    list.innerHTML = allQuizzes.map(q => `
        <div class="quiz-card">
            <div class="quiz-info">
                <strong>${q.title}</strong><br>
                <small>${q.questions ? q.questions.length : 0} вопросов</small>
            </div>
            <div class="quiz-actions">
                <button onclick="startQuiz(${q.id})" style="background:#28a745">Открыть</button>
                <button onclick="editQuiz('${q.dbKey}')" style="background:#ffc107; color: #333">✎</button>
                <button onclick="deleteQuiz('${q.dbKey}')" style="background:#dc3545">✕</button>
            </div>
        </div>
    `).join('');
}

function deleteQuiz(dbKey) {
    if(confirm("Удалить тест навсегда?")) database.ref('quizzes/' + dbKey).remove();
}

function editQuiz(dbKey) {
    const quiz = allQuizzes.find(q => q.dbKey === dbKey);
    document.getElementById('quiz-title').value = quiz.title;
    let rawText = "";
    quiz.questions.forEach(q => {
        rawText += `Question ${q.q}\n`;
        q.options.forEach((opt, i) => {
            rawText += `Option${i+1} ${opt}${i === q.correct ? ' true' : ''}\n`;
        });
        rawText += "\n";
    });
    document.getElementById('quiz-raw-input').value = rawText;
    database.ref('quizzes/' + dbKey).remove();
    window.scrollTo(0,0);
}

function startQuiz(id) {
    currentQuiz = allQuizzes.find(q => q.id === id);
    document.getElementById('current-quiz-title').innerText = currentQuiz.title;
    document.getElementById('submit-btn').style.display = 'block';
    const container = document.getElementById('questions-container');
    
    container.innerHTML = currentQuiz.questions.map((q, qIdx) => `
        <div class="question-block">
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
    const parent = btn.parentElement;

    if (isInstant) {
        if (oIdx === correctIdx) btn.classList.add('correct');
        else {
            btn.classList.add('wrong');
            parent.querySelectorAll('.option-btn')[correctIdx].classList.add('correct');
        }
        parent.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    } else {
        parent.querySelectorAll('.option-btn').forEach(b => {
            b.style.border = '1px solid #eee';
            delete b.dataset.selected;
        });
        btn.style.border = '2px solid #1a73e8'; 
        btn.dataset.selected = oIdx;
    }
}

function checkFullQuiz() {
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let lyceumPoints = 0;
    
    const isLyceumMode = document.getElementById('lyceum-mode').checked;
    const questions = currentQuiz.questions;

    document.querySelectorAll('.question-block').forEach((block, qIdx) => {
        const correctIdx = questions[qIdx].correct;
        const btns = block.querySelectorAll('.option-btn');
        let selected = null;

        btns.forEach((b, i) => { 
            if(b.dataset.selected !== undefined) selected = Number(b.dataset.selected); 
        });

        btns.forEach((b, i) => {
            b.disabled = true;
            if(i === correctIdx) b.classList.add('correct');
            if(selected === i && i !== correctIdx) b.classList.add('wrong');
        });

        if (selected === null) {
            skippedCount++;
        } else if (selected === correctIdx) {
            correctCount++;
            lyceumPoints += 4;
        } else {
            wrongCount++;
            lyceumPoints -= 1;
        }
    });

    let resultMsg = `РЕЗУЛЬТАТЫ ТЕСТА:\n`;
    resultMsg += `--------------------------\n`;
    resultMsg += `Правильно: ${correctCount}\n`;
    resultMsg += `Неправильно: ${wrongCount}\n`;
    resultMsg += `Пропущено: ${skippedCount}\n`;
    
    if (isLyceumMode) {
        resultMsg += `--------------------------\n`;
        resultMsg += `ИТОГОВЫЙ БАЛЛ (Лицей): ${lyceumPoints}\n`;
        resultMsg += `(Расчет: ${correctCount}*4 - ${wrongCount}*1)`;
    } else {
        const percent = Math.round((correctCount / questions.length) * 100);
        resultMsg += `--------------------------\n`;
        resultMsg += `Успешность: ${percent}%`;
    }

    alert(resultMsg);
    document.getElementById('submit-btn').style.display = 'none';
}