let allQuizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
let currentQuiz = null;

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    if(pageId === 'main-page') renderLibrary();
}

function parseRawInput(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const questions = [];
    let currentQ = null;

    lines.forEach(line => {
        if (line.toLowerCase().startsWith('question')) {
            if (currentQ) questions.push(currentQ);
            currentQ = { q: line.replace(/question/i, '').trim(), options: [], correct: null };
        } else if (line.toLowerCase().startsWith('option')) {
            const isCorrect = line.toLowerCase().endsWith('true');
            const text = line.replace(/option\d+/i, '').replace(/true/i, '').trim();
            currentQ.options.push(text);
            if (isCorrect) currentQ.correct = currentQ.options.length - 1;
        }
    });
    if (currentQ) questions.push(currentQ);
    return questions;
}

function handleSaveQuiz() {
    const title = document.getElementById('quiz-title').value;
    const rawData = document.getElementById('quiz-raw-input').value;
    if(!title || !rawData) return alert("Заполни все поля!");
    const quiz = { id: Date.now(), title: title, questions: parseRawInput(rawData) };
    allQuizzes.push(quiz);
    localStorage.setItem('quizzes', JSON.stringify(allQuizzes));
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-raw-input').value = '';
    renderLibrary();
}

function renderLibrary() {
    const list = document.getElementById('quiz-list');
    list.innerHTML = allQuizzes.map(q => `
        <div class="quiz-card">
            <span>${q.title} (${q.questions.length} вопр.)</span>
            <button onclick="startQuiz(${q.id})">Открыть</button>
        </div>
    `).join('');
}

function startQuiz(id) {
    currentQuiz = allQuizzes.find(q => q.id === id);
    document.getElementById('current-quiz-title').innerText = currentQuiz.title;
    document.getElementById('submit-btn').style.display = 'block'; // Показываем кнопку сдачи
    const container = document.getElementById('questions-container');
    
    container.innerHTML = currentQuiz.questions.map((q, qIdx) => `
        <div class="question-block" id="q-block-${qIdx}">
            <p><strong>Вопрос ${qIdx + 1}:</strong> ${q.q}</p>
            <div class="options-group">
                ${q.options.map((opt, oIdx) => `
                    <button class="option-btn" onclick="handleOptionClick(${qIdx}, ${oIdx}, this)">
                        ${opt}
                    </button>
                `).join('')}
            </div>
        </div>
    `).join('');
    showPage('quiz-page');
}

// ОБНОВЛЕННАЯ ЛОГИКА КЛИКА
function handleOptionClick(qIdx, oIdx, btn) {
    const isInstant = document.getElementById('instant-check').checked;
    const correctIdx = currentQuiz.questions[qIdx].correct;
    const parent = btn.parentElement;

    if (isInstant) {
        if (oIdx === correctIdx) {
            btn.classList.add('correct');
        } else {
            btn.classList.add('wrong');
            parent.querySelectorAll('.option-btn')[correctIdx].classList.add('correct');
        }
        parent.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    } else {
        parent.querySelectorAll('.option-btn').forEach(b => {
            b.style.border = '1px solid #ddd';
            delete b.dataset.selected;
        });
        btn.style.border = '2px solid #2196F3'; 
        btn.dataset.selected = oIdx;
    }
}

// ОБНОВЛЕННАЯ ПРОВЕРКА ВСЕГО ТЕСТА
function checkFullQuiz() {
    let score = 0;
    const questions = currentQuiz.questions; // Данные из объекта
    const blocks = document.querySelectorAll('.question-block');

    blocks.forEach((block, qIdx) => {
        const correctIdx = questions[qIdx].correct;
        const options = block.querySelectorAll('.option-btn');
        let selectedIdx = null;

        // Определяем, какой индекс выбрал пользователь
        options.forEach((btn, oIdx) => {
            // dataset.selected — это строка, поэтому используем Number() для перевода в число
            if (btn.dataset.selected !== undefined) {
                selectedIdx = Number(btn.dataset.selected);
            }
        });

        // Подсветка и подсчет
        options.forEach((btn, oIdx) => {
            btn.disabled = true; // Блокируем кнопки
            
            // Если этот вариант правильный — красим в зеленый
            if (oIdx === correctIdx) {
                btn.classList.add('correct');
            }
            
            // Если пользователь выбрал этот вариант и он НЕВЕРНЫЙ — красим в красный
            if (selectedIdx === oIdx && selectedIdx !== correctIdx) {
                btn.classList.add('wrong');
            }
        });

        // Если выбранный индекс совпал с правильным — увеличиваем счет
        if (selectedIdx === correctIdx) {
            score++;
        }
    });

    alert(`Тест завершен!\nРезультат: ${score} из ${questions.length} (${Math.round(score/questions.length * 100)}%)`);
    document.getElementById('submit-btn').style.display = 'none';
}
renderLibrary();