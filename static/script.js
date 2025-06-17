document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed. Initializing script.");

    // Critical: Check if the OpenAI library loaded successfully.
    if (typeof OpenAI === 'undefined') {
        const errorMsg = "致命错误：核心AI库 (OpenAI.js) 加载失败。请检查网络连接或浏览器插件是否阻止了 cdn.jsdelivr.net 的脚本。";
        console.error(errorMsg);
        alert(errorMsg);
        return; // Stop execution if the library is missing.
    }
    console.log("OpenAI library loaded successfully.");

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
    console.log(`Initial API Key found in session storage: ${userApiKey ? 'Yes' : 'No'}`);

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

        const footerEl = document.getElementById(`footer-${questionNum}`);
        if (!footerEl) return; // Defensive coding

        const scoreEl = document.getElementById(`score-${questionNum}`);
        const cardEl = document.getElementById(`question-${questionNum}`);
        const navItems = navGrid.querySelectorAll(`.nav-item[data-question-index='${questionNum}']`);
        
        const questionScore = 5;

        if (isCorrect) {
            questionScores[questionNum] = questionScore;
            if(scoreEl) scoreEl.textContent = `${questionScore.toFixed(2)} 分`;
            if(scoreEl) scoreEl.classList.add('correct');
            navItems.forEach(item => item.classList.add('correct'));
        } else {
            questionScores[questionNum] = 0;
            if(scoreEl) scoreEl.textContent = `0.00 分`;
            if(scoreEl) scoreEl.classList.add('incorrect');
            navItems.forEach(item => item.classList.add('incorrect'));
            
            // SIMPLIFIED LOGIC: Button is always enabled.
            const aiButton = document.createElement('button');
            aiButton.textContent = 'AI 讲解';
            aiButton.className = 'btn-ai-explain';
            aiButton.dataset.questionIndex = questionIndex;
            if (userAnswer) {
                aiButton.dataset.userAnswer = userAnswer;
            }
            footerEl.appendChild(aiButton);
        }

        totalScore = Object.values(questionScores).reduce((sum, score) => sum + score, 0);
        totalScoreEl.textContent = totalScore;
        footerEl.style.display = 'block';
        if (cardEl) cardEl.classList.add('disabled');
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
        console.log("Click event detected on quiz content. Target:", target);

        if (target.classList.contains('submit-fill-in')) {
            const questionNum = parseInt(target.dataset.questionIndex, 10);
            if (isNaN(questionNum)) return;
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
            console.log("AI Explain button clicked.");
            
            if (!userApiKey) {
                console.log("API Key not found. Alerting user and opening modal.");
                alert('请先在右上角设置您的DeepSeek API Key');
                settingsBtn.click();
                return;
            }

            const questionIndex = parseInt(target.dataset.questionIndex, 10);
            if (isNaN(questionIndex)) {
                console.error("Failed to get question index from button's data attribute.");
                return;
            }
            
            console.log(`Attempting to call getAIExplanation for question index: ${questionIndex}`);
            const userAnswer = target.dataset.userAnswer || null;
            getAIExplanation(questionIndex, userAnswer);
        }
    });

    async function getAIExplanation(questionIndex, userAnswer) {
        console.log(`getAIExplanation started for index: ${questionIndex}.`);
        const aiButton = document.querySelector(`.btn-ai-explain[data-question-index="${questionIndex}"]`);
        const explanationContainer = document.getElementById(`ai-explanation-${questionIndex + 1}`);
        
        try {
            if (!aiButton || !explanationContainer) {
                throw new Error(`内部UI错误：无法找到问题 ${questionIndex + 1} 的按钮或讲解容器。`);
            }
            console.log("UI elements for AI explanation found successfully.");

            console.log("Initializing DeepSeek client...");
            const deepseek = new OpenAI({
                apiKey: userApiKey,
                baseURL: "https://api.deepseek.com",
                dangerouslyAllowBrowser: true
            });
            console.log("DeepSeek client initialized.");
            
            aiButton.disabled = true;
            aiButton.textContent = '思考中...';

            const question = questionsData[questionIndex];
            if (!question) {
                throw new Error(`内部数据错误：找不到题目索引 ${questionIndex} 的数据。`);
            }
            console.log("Question data found:", question);

            explanationContainer.style.display = 'block';
            explanationContainer.textContent = '';
            explanationContainer.classList.add('streaming');

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

            console.log("Sending request to DeepSeek API...");
            const stream = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {"role": "system", "content": "你是一个友善且专业的计算机科学老师。"},
                    {"role": "user", "content": prompt}
                ],
                stream: true,
            });
            console.log("Request sent. Stream received.");

            aiButton.style.display = 'none';
            console.log("AI button hidden, starting to process stream...");

            let receivedContent = false;
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                    receivedContent = true;
                    explanationContainer.textContent += content;
                }
            }
            console.log("Stream processing finished.");

            if (!receivedContent) {
                throw new Error("AI返回了空内容，请重试。");
            }

        } catch (error) {
            console.error('--- A.I. EXPLANATION FAILED ---');
            console.error('Full Error Object:', error);
            const errorMessage = error.message || String(error);
            alert(`😥 抱歉，AI讲解失败了。\n\n错误信息: ${errorMessage}\n\n请按F12打开开发者工具，在Console(控制台)中查看详细错误日志。`);
            
            if (aiButton) {
                aiButton.style.display = 'inline-block';
                aiButton.disabled = false;
                aiButton.textContent = '重试讲解';
            }
            if (explanationContainer) {
                explanationContainer.style.display = 'none';
            }
        } finally {
            console.log(`getAIExplanation finished for index: ${questionIndex}.`);
            if (explanationContainer) {
                explanationContainer.classList.remove('streaming');
            }
        }
    }

    function setupModal() {
        const apiKeyForm = document.getElementById('api-key-form');
        const saveLogic = () => {
            console.log("Save API Key logic started.");
            const key = apiKeyInput.value.trim();
            if (key) {
                userApiKey = key;
                sessionStorage.setItem('deepseek_api_key', key);
                console.log("API Key saved to session storage.");
                apiKeyModal.style.display = 'none';
                alert('API Key 已保存。现在您可以点击 "AI 讲解" 按钮了。');
            } else {
                console.warn("Attempted to save an empty API Key.");
                alert('API Key不能为空。');
            }
        };

        settingsBtn.addEventListener('click', () => {
            apiKeyModal.style.display = 'flex';
            apiKeyInput.focus();
        });

        closeApiKeyModalBtn.addEventListener('click', () => {
            apiKeyModal.style.display = 'none';
        });

        apiKeyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveLogic();
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