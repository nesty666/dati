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

    async function loadSubjects() {
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_PATH}`);
            const data = await response.json();
            const files = data.filter(item => item.name.endsWith('.json'));

            subjectSelector.innerHTML = '<option value="">--请选择一个科目--</option>';
            files.forEach(file => {
                const subjectName = file.name.replace('.json', '');
                const option = document.createElement('option');
                option.value = file.name;
                option.textContent = subjectName;
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
            renderNavigation();
            return;
        }

        try {
            const response = await fetch(`https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@latest/${DATA_PATH}/${fileName}`);
            questionsData = await response.json();
            totalScore = 0;
            totalScoreEl.textContent = '0';
            renderQuestions();
            renderNavigation();
        } catch (error) {
            console.error('Failed to load questions:', error);
            quizContent.innerHTML = `<div class="empty-state"><h2>加载题目失败</h2><p>无法加载科目'${fileName.replace('.json', '')}'的题目数据。</p></div>`;
        }
    }

    function renderQuestions() {
        quizContent.innerHTML = '';
        questionsData.forEach((question, index) => {
            const questionNum = index + 1;
            const questionCard = document.createElement('div');
            questionCard.className = 'question-card';
            questionCard.id = `question-${questionNum}`;

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

            questionCard.innerHTML = `
                <div class="question-header">
                    <p class="question-title">${questionNum}. ${question.question}</p>
                    <span class="question-score" id="score-${questionNum}"></span>
                </div>
                <div class="question-body">${optionsHtml}</div>
                <div class="question-footer" id="footer-${questionNum}" style="display: none;">
                    <p>正确答案: <span class="correct-answer">${question.answer}</span></p>
                </div>
            `;
            quizContent.appendChild(questionCard);
            attachAnswerHandlers(questionCard, question, index);
        });
    }
    
    function attachAnswerHandlers(card, question, index) {
        const questionScore = 5;
        const questionNum = index + 1;

        const handleAnswer = (isCorrect) => {
            const scoreEl = card.querySelector(`#score-${questionNum}`);
            const footerEl = card.querySelector(`#footer-${questionNum}`);
            const navItems = navGrid.querySelectorAll(`.nav-item[data-question-index='${questionNum}']`);

            if (isCorrect) {
                totalScore += questionScore;
                scoreEl.textContent = `${questionScore.toFixed(2)} 分`;
                scoreEl.classList.add('correct');
                navItems.forEach(item => item.classList.add('correct'));
            } else {
                scoreEl.textContent = `0.00 分`;
                scoreEl.classList.add('incorrect');
                navItems.forEach(item => item.classList.add('incorrect'));
            }

            totalScoreEl.textContent = totalScore;
            footerEl.style.display = 'block';
            card.classList.add('disabled');
        };

        if (question.type === 'multiple_choice' || question.type === 'true_false') {
            const options = card.querySelectorAll(`input[name='question-${questionNum}']`);
            options.forEach(option => {
                option.addEventListener('change', (e) => {
                    const selectedValue = e.target.value;
                    const isCorrect = selectedValue.toLowerCase() === String(question.answer).toLowerCase();
                    
                    const parentLi = e.target.closest('li');
                    if (isCorrect) {
                        parentLi.classList.add('correct');
                    } else {
                        parentLi.classList.add('incorrect');
                        const correctOptionValue = String(question.answer);
                        const correctInput = Array.from(card.querySelectorAll('input')).find(input => input.value.toLowerCase() === correctOptionValue.toLowerCase());
                        if (correctInput) {
                            correctInput.closest('li').classList.add('correct');
                        }
                    }
                    handleAnswer(isCorrect);
                });
            });
        } else if (question.type === 'fill_in') {
            const submitBtn = card.querySelector(`.submit-fill-in`);
            const inputEl = card.querySelector('input[type="text"]');
            
            submitBtn.addEventListener('click', () => {
                const userAnswer = inputEl.value.trim();
                const correctAnswers = String(question.answer).split(',').map(s => s.trim());
                const isCorrect = correctAnswers.includes(userAnswer);
                handleAnswer(isCorrect);
            });
        }
    }
    
    function attachNavListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.dataset.listenerAttached) return;

            item.addEventListener('click', (e) => {
                e.preventDefault();
                const questionId = item.getAttribute('href');
                const targetQuestion = document.querySelector(questionId);
                if (targetQuestion) {
                    targetQuestion.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
            item.dataset.listenerAttached = 'true';
        });
    }

    function renderNavigation(viewType = 'normal') {
        navGrid.innerHTML = ''; 

        if (questionsData.length === 0) return;

        if (viewType === 'normal') {
            questionsData.forEach((_question, index) => {
                const questionNum = index + 1;
                const navItem = document.createElement('a');
                navItem.href = `#question-${questionNum}`;
                navItem.className = 'nav-item';
                navItem.dataset.questionIndex = questionNum;
                navItem.textContent = questionNum;
                navGrid.appendChild(navItem);
            });
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
                    const titleEl = document.createElement('h4');
                    titleEl.className = 'nav-category-title';
                    titleEl.textContent = category.title;
                    navGrid.appendChild(titleEl);

                    category.questions.forEach(questionNum => {
                        const navItem = document.createElement('a');
                        navItem.href = `#question-${questionNum}`;
                        navItem.className = 'nav-item';
                        navItem.dataset.questionIndex = questionNum;
                        navItem.textContent = questionNum;
                        navGrid.appendChild(navItem);
                    });
                }
            });
        }

        attachNavListeners();
    }

    subjectSelector.addEventListener('change', (e) => {
        loadQuestions(e.target.value);
    });

    navTypeSelector.addEventListener('change', (e) => {
        renderNavigation(e.target.value);
    });

    loadSubjects();
}); 