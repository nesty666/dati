document.addEventListener('DOMContentLoaded', async () => {
    const GITHUB_USER = 'nesty666'; 
    const GITHUB_REPO = 'dati';
    const DATA_PATH = 'data';

    const subjectSelector = document.getElementById('subject');
    const quizContent = document.getElementById('quiz-content');
    const navGrid = document.getElementById('nav-grid');
    const navTypeSelector = document.getElementById('nav-type-selector');
    const totalScoreEl = document.getElementById('total-score');
    
    // AI Feature Elements
    const settingsBtn = document.getElementById('settings-btn');
    const apiKeyModal = document.getElementById('api-key-modal');
    const closeApiKeyModalBtn = document.getElementById('close-modal-btn');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const apiKeyInput = document.getElementById('api-key-input');

    let questionsData = [];
    let totalScore = 0;
    const questionScores = {};
    let userApiKey = sessionStorage.getItem('deepseek_api_key') || '';

    if (userApiKey) {
        apiKeyInput.value = userApiKey;
    }

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
                        <div class="ai-explanation-container" id="ai-explanation-${questionNum}" style="display: none;"></div>
                    </div>
                </div>
            `;
        }).join('');
        
        quizContent.innerHTML = questionsHtml;
    }
    
    function handleAnswer(questionIndex, isCorrect, userAnswer = null) {
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
            
            // Add AI Explain button
            const aiButton = document.createElement('button');
            aiButton.textContent = 'AI 讲解';
            aiButton.className = 'btn-ai-explain';
            aiButton.dataset.questionIndex = questionIndex;
            if (userAnswer) {
                aiButton.dataset.userAnswer = userAnswer;
            }
            // New Robust Logic: Disable button if no key is set
            if (!userApiKey) {
                aiButton.disabled = true;
                aiButton.title = '请先在右上角设置 API Key';
            }
            footerEl.appendChild(aiButton);
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
        
        handleAnswer(questionIndex, isCorrect, selectedValue);
    });

    quizContent.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('submit-fill-in')) {
            const questionNum = parseInt(target.dataset.questionIndex, 10);
            const questionIndex = questionNum - 1;
            const question = questionsData[questionIndex];
            
            const card = document.getElementById(`question-${questionNum}`);
            const inputEl = card.querySelector('input[type="text"]');
            const userAnswer = inputEl.value.trim();
            if (!userAnswer) return;

            const correctAnswers = String(question.answer).split(/[,，]/).map(s => s.trim());
            const isCorrect = correctAnswers.includes(userAnswer);

            handleAnswer(questionIndex, isCorrect, userAnswer);
        } else if (target.classList.contains('btn-ai-explain')) {
            // Defensive check
            if (target.disabled) return;
            
            const questionIndex = parseInt(target.dataset.questionIndex, 10);
            if (isNaN(questionIndex)) return; // Exit if index is not a number

            const userAnswer = target.dataset.userAnswer || null;
            getAIExplanation(questionIndex, userAnswer);
        }
    });

    async function getAIExplanation(questionIndex, userAnswer) {
        const question = questionsData[questionIndex];

        // Guard clause against missing question data
        if (!question) {
            alert(`出现内部错误：找不到题目索引 ${questionIndex} 的数据，无法生成AI讲解。`);
            return;
        }

        const aiButton = document.querySelector(`.btn-ai-explain[data-question-index="${questionIndex}"]`);
        aiButton.disabled = true;
        aiButton.textContent = '思考中...';

        if (!userApiKey) {
            alert('请先在右上角设置您的DeepSeek API Key');
            apiKeyModal.style.display = 'flex';
            // Reset button state
            aiButton.disabled = false;
            aiButton.textContent = 'AI 讲解';
            return;
        }

        const explanationContainer = document.getElementById(`ai-explanation-${questionIndex + 1}`);
        explanationContainer.style.display = 'block';
        explanationContainer.textContent = '🤖 正在向 DeepSeek AI 请求讲解...';

        let prompt = `你是一个友善且专业的计算机科学老师。请用中文、简洁易懂地解释下面这道题。请重点解释为什么正确答案是这个，而不是用户选择的错误答案（如果提供了用户的答案）。

题目：${question.question}
`;

        if (question.type === 'multiple_choice' && question.options) {
            prompt += `选项：\n${question.options.map((opt, i) => `${['A', 'B', 'C', 'D', 'E', 'F'][i]}. ${opt}`).join('\n')}\n`;
        }
        
        prompt += `正确答案是：${question.answer}\n`;

        if (userAnswer) {
             prompt += `我选择了：${userAnswer}\n`;
        }
        
        prompt += "\n请开始你的讲解：";

        try {
            const response = await fetch("https://api.deepseek.com/chat/completions", {
                method: 'POST',
                signal: AbortSignal.timeout(30000), // 30-second timeout
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userApiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-reasoner",
                    messages: [
                        {"role": "system", "content": "你是一个友善且专业的计算机科学老师。"},
                        {"role": "user", "content": prompt}
                    ],
                    stream: false,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null); // Gracefully handle non-json error responses
                const errorMsg = errorData?.error?.message || response.statusText || "未知API错误";
                throw new Error(`API 请求失败，状态码: ${response.status}. 错误详情: ${errorMsg}`);
            }

            const data = await response.json();
            if (!data.choices || data.choices.length === 0 || !data.choices[0].message.content) {
                throw new Error("API 返回的数据格式不正确，缺少讲解内容。");
            }

            const explanation = data.choices[0].message.content;
            explanationContainer.textContent = explanation;
            aiButton.style.display = 'none'; // Hide button only on success

        } catch (error) {
            console.error('AI Explanation Error:', error);
            explanationContainer.style.display = 'none'; // Hide container on error
            // Provide a clearer, more actionable error message
            alert(`😥 抱歉，AI讲解失败了。\n\n错误信息: ${String(error.message)}\n\n这可能是由于：\n1. 网络超时或连接中断。\n2. API Key不正确或账户余额不足。\n3. DeepSeek服务器暂时无法访问。\n\n请检查后重试。`);
            aiButton.disabled = false;
            aiButton.textContent = '重试讲解';
        }
    }

    function updateAIButtonsState(enabled) {
        // This is a more efficient way to manage state by adding/removing a class
        // on a container, instead of iterating over all buttons.
        // For simplicity with the current structure, we will stick to a direct but clear approach.
        document.querySelectorAll('.btn-ai-explain').forEach(btn => {
            if (enabled) {
                btn.disabled = false;
                btn.title = '获取AI讲解';
            } else {
                btn.disabled = true;
                btn.title = '请先在右上角设置 API Key';
            }
        });
    }

    function setupModal() {
        const apiKeyForm = document.getElementById('api-key-form');

        settingsBtn.addEventListener('click', () => {
            apiKeyModal.style.display = 'flex';
        });

        closeApiKeyModalBtn.addEventListener('click', () => {
            apiKeyModal.style.display = 'none';
        });

        saveApiKeyBtn.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                userApiKey = key;
                sessionStorage.setItem('deepseek_api_key', key);
                apiKeyModal.style.display = 'none';
                alert('API Key已保存（仅在本次会话中有效）。');
                updateAIButtonsState(true);
            } else {
                alert('API Key不能为空。');
            }
        });

        apiKeyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Directly call the save logic instead of simulating a click
            const key = apiKeyInput.value.trim();
            if (key) {
                userApiKey = key;
                sessionStorage.setItem('deepseek_api_key', key);
                apiKeyModal.style.display = 'none';
                alert('API Key已保存（仅在本次会话中有效）。');
                updateAIButtonsState(true);
            } else {
                alert('API Key不能为空。');
            }
        });

        apiKeyModal.addEventListener('click', (e) => {
            if (e.target === apiKeyModal) {
                apiKeyModal.style.display = 'none';
            }
        });
    }

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

    setupModal();
    loadSubjects();
}); 