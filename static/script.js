document.addEventListener('DOMContentLoaded', async () => {
    const GITHUB_USER = 'nesty666'; 
    const GITHUB_REPO = 'dati';
    const DATA_PATH = 'data';

    const subjectSelector = document.getElementById('subject');
    const quizContent = document.getElementById('quiz-content');
    const navGrid = document.getElementById('nav-grid');
    const navTypeSelector = document.getElementById('nav-type-selector');
    const totalScoreEl = document.getElementById('total-score');
    
    let questionsData = [];
    let totalScore = 0;
    const questionScores = {};

    async function loadSubjects() {
        try {
            const response = await fetch(`https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@latest/${DATA_PATH}/subjects.json?t=${new Date().getTime()}`);
            const subjects = await response.json();

            subjectSelector.innerHTML = '<option value="">--请选择一个科目--</option>';
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.fileName;
                option.textContent = subject.displayName;
                subjectSelector.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load subjects:', error);
            subjectSelector.innerHTML = '<option value="">加载科目失败</option>';
        }
    }

    async function loadQuestions(fileName) {
        if (!fileName) {
            quizContent.innerHTML = `
                <div class="empty-state">
                    <h2>欢迎来到在线答题系统</h2>
                    <p>请从上方的下拉菜单中选择一个科目开始答题。</p>
                </div>`;
            questionsData = [];
            totalScore = 0;
            renderNavigation();
            return;
        }

        try {
            const response = await fetch(`https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@latest/${DATA_PATH}/${fileName}?t=${new Date().getTime()}`);
            questionsData = await response.json();
            totalScore = 0;
            Object.keys(questionScores).forEach(key => delete questionScores[key]);
            totalScoreEl.textContent = '0';
            renderQuestions();
            renderNavigation();
        } catch (error) {
            console.error('Failed to load questions:', error);
            quizContent.innerHTML = `<div class="empty-state"><h2>加载题目失败</h2><p>无法加载科目'${fileName.replace('.json', '')}'的题目数据。</p></div>`;
        }
    }

    function renderQuestions() {
        const questionsHtml = questionsData.map((question, index) => {
            const questionNum = index + 1;
            let optionsHtml = '';

            if (question.type === 'multiple_choice') {
                const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
                optionsHtml = `<ul class="options-list">` +
                    question.options.map((option, i) => `
                        <li>
                            <label>
                                <input type="radio" name="question-${questionNum}" value="${optionLetters[i]}">
                                <span class="option-text">${optionLetters[i]}. ${option}</span>
                            </label>
                        </li>
                    `).join('') + `</ul>`;
            } else if (question.type === 'true_false') {
                optionsHtml = `<ul class="options-list">
                    <li><label><input type="radio" name="question-${questionNum}" value="true"><span class="option-text">正确</span></label></li>
                    <li><label><input type="radio" name="question-${questionNum}" value="false"><span class="option-text">错误</span></label></li>
                </ul>`;
            } else if (question.type === 'fill_in') {
                optionsHtml = `
                    <div class="fill-in-wrapper">
                        <input type="text" name="question-${questionNum}" placeholder="请输入答案">
                        <button class="submit-fill-in" data-question-index="${questionNum}">提交</button>
                    </div>`;
            }

            return `
                <div class="question-card" id="question-${questionNum}">
                    <div class="question-header">
                        <p class="question-title">${questionNum}. ${question.question}</p>
                        <span class="question-score" id="score-${questionNum}"></span>
                    </div>
                    <div class="question-body">${optionsHtml}</div>
                    <div class="question-footer" id="footer-${questionNum}" style="display: none;">
                        <p>正确答案: <span class="correct-answer">${question.answer}</span></p>
                    </div>
                </div>
            `;
        }).join('');
        
        quizContent.innerHTML = questionsHtml;
    }
    
    function handleAnswer(questionIndex, isCorrect) {
        const questionNum = questionIndex + 1;
        
        if (questionScores[questionNum] !== undefined) return;

        const scoreEl = document.getElementById(`score-${questionNum}`);
        const footerEl = document.getElementById(`footer-${questionNum}`);
        const cardEl = document.getElementById(`question-${questionNum}`);
        const navItems = navGrid.querySelectorAll(`.nav-item[data-question-index='${questionNum}']`);
        
        const questionScore = 5;

        if (isCorrect) {
            questionScores[questionNum] = questionScore;
            scoreEl.textContent = `${questionScore.toFixed(2)} 分`;
            scoreEl.classList.add('correct');
            navItems.forEach(item => item.classList.add('correct'));
        } else {
            questionScores[questionNum] = 0;
            scoreEl.textContent = `0.00 分`;
            scoreEl.classList.add('incorrect');
            navItems.forEach(item => item.classList.add('incorrect'));
        }

        totalScore = Object.values(questionScores).reduce((sum, score) => sum + score, 0);
        totalScoreEl.textContent = totalScore;
        footerEl.style.display = 'block';
        cardEl.classList.add('disabled');
    }

    quizContent.addEventListener('change', (e) => {
        if (e.target.type !== 'radio' || !e.target.name.startsWith('question-')) return;

        const questionNum = parseInt(e.target.name.split('-')[1], 10);
        const questionIndex = questionNum - 1;
        const question = questionsData[questionIndex];

        const selectedValue = e.target.value;
        const isCorrect = selectedValue.toLowerCase() === String(question.answer).toLowerCase();
        
        const parentLi = e.target.closest('li');
        if (isCorrect) {
            parentLi.classList.add('correct');
        } else {
            parentLi.classList.add('incorrect');
            const correctOptionValue = String(question.answer);
            const card = document.getElementById(`question-${questionNum}`);
            const correctInput = Array.from(card.querySelectorAll('input')).find(input => input.value.toLowerCase() === correctOptionValue.toLowerCase());
            if (correctInput) {
                correctInput.closest('li').classList.add('correct');
            }
        }
        
        handleAnswer(questionIndex, isCorrect);
    });

    quizContent.addEventListener('click', (e) => {
        if (!e.target.classList.contains('submit-fill-in')) return;

        const questionNum = parseInt(e.target.dataset.questionIndex, 10);
        const questionIndex = questionNum - 1;
        const question = questionsData[questionIndex];
        
        const card = document.getElementById(`question-${questionNum}`);
        const inputEl = card.querySelector('input[type="text"]');
        const userAnswer = inputEl.value.trim();
        const correctAnswers = String(question.answer).split(/[,，]/).map(s => s.trim());
        const isCorrect = correctAnswers.includes(userAnswer);

        handleAnswer(questionIndex, isCorrect);
    });
    
    function attachNavListeners() {
        navGrid.addEventListener('click', (e) => {
            if (!e.target.classList.contains('nav-item')) return;
            e.preventDefault();
            const questionId = e.target.getAttribute('href');
            const targetQuestion = document.querySelector(questionId);
            if (targetQuestion) {
                targetQuestion.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }

    function renderNavigation(viewType = 'normal') {
        let navHtml = ''; 

        if (questionsData.length > 0) {
            if (viewType === 'normal') {
                navHtml = questionsData.map((_q, index) => {
                    const questionNum = index + 1;
                    const status = questionScores[questionNum] === 5 ? 'correct' : (questionScores[questionNum] === 0 ? 'incorrect' : '');
                    return `<a href="#question-${questionNum}" class="nav-item ${status}" data-question-index="${questionNum}">${questionNum}</a>`;
                }).join('');
            } else if (viewType === 'categorized') {
                const categories = {
                    multiple_choice: { title: '选择题', questions: [] },
                    true_false: { title: '判断题', questions: [] },
                    fill_in: { title: '填空题', questions: [] }
                };

                questionsData.forEach((question, index) => {
                    if (categories[question.type]) {
                        categories[question.type].questions.push(index + 1);
                    }
                });

                const displayOrder = ['multiple_choice', 'true_false', 'fill_in'];

                displayOrder.forEach(type => {
                    const category = categories[type];
                    if (category.questions.length > 0) {
                        navHtml += `<h4 class="nav-category-title">${category.title}</h4>`;
                        navHtml += category.questions.map(questionNum => {
                            const status = questionScores[questionNum] === 5 ? 'correct' : (questionScores[questionNum] === 0 ? 'incorrect' : '');
                             return `<a href="#question-${questionNum}" class="nav-item ${status}" data-question-index="${questionNum}">${questionNum}</a>`;
                        }).join('');
                    }
                });
            }
        }
        
        navGrid.innerHTML = navHtml;
    }
    
    attachNavListeners();

    subjectSelector.addEventListener('change', (e) => {
        loadQuestions(e.target.value);
    });

    navTypeSelector.addEventListener('change', (e) => {
        renderNavigation(e.target.value);
    });

    loadSubjects();
}); 