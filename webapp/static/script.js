document.addEventListener('DOMContentLoaded', () => {
    if (typeof questionsData === 'undefined' || questionsData.length === 0) {
        console.log("No questions data found. Script will not run.");
        return;
    }

    const totalScoreEl = document.getElementById('total-score');
    const navGrid = document.getElementById('nav-grid');
    const navTypeSelector = document.getElementById('nav-type-selector');
    let totalScore = 0;

    const questionCards = document.querySelectorAll('.question-card');

    questionCards.forEach((card, index) => {
        const question = questionsData[index];
        if (!question) return;
        const questionScore = 5;

        const handleAnswer = (isCorrect) => {
            const questionNum = index + 1;
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
            const options = card.querySelectorAll(`input[name='question-${index + 1}']`);
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
            const submitBtn = card.querySelector(`.submit-fill-in[data-question-index='${index + 1}']`);
            const inputEl = card.querySelector('input[type="text"]');
            
            submitBtn.addEventListener('click', () => {
                const userAnswer = inputEl.value.trim();
                const correctAnswers = String(question.answer).split(',').map(s => s.trim());
                const isCorrect = correctAnswers.includes(userAnswer);
                handleAnswer(isCorrect);
            });
        }
    });

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

    navTypeSelector.addEventListener('change', (e) => {
        renderNavigation(e.target.value);
    });

    renderNavigation('normal');
}); 