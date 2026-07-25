// 상태 관리 변수
let words = [];
let gameQueue = [];
let currentWord = null;
let timer = null;
let timeLeft = 10;
let inkoObj = null; // 한영 자동 변환 라이브러리 인스턴스

// DOM 요소 캐싱
const elements = {
    // 탭
    tabManager: document.getElementById('tab-manager'),
    tabGame: document.getElementById('tab-game'),
    viewManager: document.getElementById('view-manager'),
    viewGame: document.getElementById('view-game'),

    // 단어장 관리
    addForm: document.getElementById('add-word-form'),
    inputEng: document.getElementById('input-eng'),
    inputKor: document.getElementById('input-kor'),
    wordList: document.getElementById('word-list'),
    wordCount: document.getElementById('word-count'),
    btnExport: document.getElementById('btn-export'),
    inputImport: document.getElementById('input-import'),
    btnDeleteAll: document.getElementById('btn-delete-all'), // 전체 삭제 버튼 추가

    // 게임
    startScreen: document.getElementById('game-start-screen'),
    playScreen: document.getElementById('game-play-screen'),
    btnStart: document.getElementById('btn-start-game'),
    timerText: document.getElementById('timer-text'),
    wordDisplay: document.getElementById('current-word'),
    btnListen: document.getElementById('btn-listen'),
    gameForm: document.getElementById('game-form'),
    inputAnswer: document.getElementById('input-answer'),
    btnSubmitAnswer: document.getElementById('btn-submit-answer'),
    feedbackBox: document.getElementById('game-feedback'),
    feedbackMsg: document.getElementById('feedback-message'),
    correctMeaning: document.getElementById('correct-meaning'),
    btnNextWord: document.getElementById('btn-next-word')
};

// --- 초기화 및 로컬스토리지 ---
function init() {
    loadInkoLibrary(); // HTML 수정 없이 JS 내부에서 한영 변환 라이브러리 로드
    const savedWords = localStorage.getItem('toeicWords');
    if (savedWords) {
        words = JSON.parse(savedWords);
    }
    renderWordList();
    bindEvents();
}

function saveWords() {
    localStorage.setItem('toeicWords', JSON.stringify(words));
    renderWordList();
}

// --- 한영 변환 라이브러리 로드 및 핸들러 ---
function loadInkoLibrary() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/inko@1.1.1/inko.min.js';
    script.onload = () => {
        inkoObj = new Inko();
    };
    document.head.appendChild(script);
}

function forceKoreanInput(e) {
    // 라이브러리가 아직 로드되지 않았으면 무시
    if (!inkoObj) return;

    const target = e.target;
    const originalValue = target.value;

    // 1. 입력된 텍스트를 모두 영타로 취급하여 풀기 (영타+한글 꼬임 방지)
    const asEnglish = inkoObj.ko2en(originalValue);
    // 2. 완벽한 영타 문자열을 다시 한글로 조합
    const convertedValue = inkoObj.en2ko(asEnglish);

    // 변환된 결과가 기존과 다를 때만 덮어쓰기 (실제 한글 키보드 입력 시 끊김 방지)
    if (originalValue !== convertedValue) {
        target.value = convertedValue;
    }
}

// --- 이벤트 바인딩 ---
function bindEvents() {
    // 탭 전환
    elements.tabManager.addEventListener('click', () => switchTab('manager'));
    elements.tabGame.addEventListener('click', () => switchTab('game'));

    // 단어장 관리
    elements.addForm.addEventListener('submit', addWord);
    elements.btnExport.addEventListener('click', exportJSON);
    elements.inputImport.addEventListener('change', importJSON);
    elements.btnDeleteAll.addEventListener('click', deleteAllWords); // 전체 삭제 이벤트

    // ★ 한글 뜻 입력창: 영타 -> 한글 자동 변환 이벤트
    elements.inputKor.addEventListener('input', forceKoreanInput);

    // 게임 컨트롤
    elements.btnStart.addEventListener('click', startGame);
    elements.gameForm.addEventListener('submit', checkAnswer);
    elements.btnNextWord.addEventListener('click', nextGameWord);
    elements.btnListen.addEventListener('click', () => speakWord(currentWord.eng));

    // ★ 게임 정답 입력창: 영타 -> 한글 자동 변환 이벤트
    elements.inputAnswer.addEventListener('input', forceKoreanInput);
}

// --- 탭 컨트롤 ---
function switchTab(tabName) {
    if (tabName === 'manager') {
        elements.tabManager.classList.add('active');
        elements.tabGame.classList.remove('active');
        elements.viewManager.classList.add('active');
        elements.viewManager.classList.remove('hidden');
        elements.viewGame.classList.remove('active');
        elements.viewGame.classList.add('hidden');

        // 게임 중지
        clearInterval(timer);
        elements.startScreen.classList.remove('hidden');
        elements.playScreen.classList.add('hidden');
    } else {
        elements.tabGame.classList.add('active');
        elements.tabManager.classList.remove('active');
        elements.viewGame.classList.add('active');
        elements.viewGame.classList.remove('hidden');
        elements.viewManager.classList.remove('active');
        elements.viewManager.classList.add('hidden');
    }
}

// --- 단어장 관리 로직 ---
function addWord(e) {
    e.preventDefault();
    const eng = elements.inputEng.value.trim();
    const kor = elements.inputKor.value.trim();

    if (eng && kor) {
        words.push({ eng, kor });
        saveWords();
        elements.inputEng.value = '';
        elements.inputKor.value = '';
        elements.inputEng.focus();
    }
}

function deleteWord(index) {
    // 알람 경고창 없이 바로 삭제 처리
    words.splice(index, 1);
    saveWords();
}

function deleteAllWords() {
    if (words.length === 0) {
        alert('삭제할 단어가 없습니다.');
        return;
    }
    
    // 실수로 지우는 것을 방지하기 위한 확인창
    if (confirm('저장된 모든 단어를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        words = [];
        saveWords();
    }
}

function renderWordList() {
    elements.wordCount.textContent = words.length;
    elements.wordList.innerHTML = '';

    words.forEach((word, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <span class="word-eng">${word.eng}</span>
                <span class="word-kor">${word.kor}</span>
            </div>
            <div class="word-actions">
                <button class="btn-icon" onclick="speakWord('${word.eng.replace(/'/g, "\\'")}')" title="발음 듣기" style="font-size: 1.2rem; padding: 5px;">🔊</button>
                <button class="btn-delete-icon" onclick="deleteWord(${index})" title="삭제">🗑️</button>
            </div>
        `;
        elements.wordList.appendChild(li);
    });
}

// --- JSON 내보내기 / 가져오기 ---
function exportJSON() {
    if (words.length === 0) {
        alert('내보낼 단어가 없습니다.');
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(words, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "toeic_words.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const importedWords = JSON.parse(event.target.result);
            if (Array.isArray(importedWords) && importedWords.length > 0 && importedWords[0].eng) {
                words = words.concat(importedWords);
                saveWords();
                alert(`${importedWords.length}개의 단어를 성공적으로 불러왔습니다.`);
            } else {
                alert('잘못된 파일 형식입니다.');
            }
        } catch (error) {
            alert('파일을 읽는 중 오류가 발생했습니다.');
        }
        elements.inputImport.value = ''; // 초기화
    };
    reader.readAsText(file);
}

// --- 게임 로직 ---
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function startGame() {
    if (words.length === 0) {
        alert('단어장에 저장된 단어가 없습니다. 단어를 먼저 추가해주세요.');
        switchTab('manager');
        return;
    }

    elements.startScreen.classList.add('hidden');
    elements.playScreen.classList.remove('hidden');

    gameQueue = shuffleArray(words);
    nextGameWord();
}

function nextGameWord() {
    if (gameQueue.length === 0) {
        gameQueue = shuffleArray(words);
    }

    currentWord = gameQueue.pop();

    elements.wordDisplay.textContent = currentWord.eng;
    elements.inputAnswer.value = '';
    elements.inputAnswer.disabled = false;
    elements.btnSubmitAnswer.disabled = false;
    elements.feedbackBox.classList.add('hidden');
    elements.inputAnswer.focus();

    speakWord(currentWord.eng);
    startTimer();
}

function speakWord(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

function startTimer() {
    clearInterval(timer);
    timeLeft = 10;
    updateTimerUI();

    timer = setInterval(() => {
        timeLeft--;
        updateTimerUI();

        if (timeLeft <= 0) {
            clearInterval(timer);
            handleWrongAnswer("시간 초과!");
        }
    }, 1000);
}

function updateTimerUI() {
    elements.timerText.textContent = timeLeft;
    if (timeLeft <= 3) {
        elements.timerText.classList.add('danger');
    } else {
        elements.timerText.classList.remove('danger');
    }
}

function checkAnswer(e) {
    e.preventDefault();
    if (!currentWord || timeLeft <= 0) return;

    const userAnswer = elements.inputAnswer.value.trim();
    clearInterval(timer);

    // ★ 사용자 입력에서 모든 띄어쓰기 제거
    const userAnswerNoSpace = userAnswer.replace(/\s+/g, '');

    // 정답 판별 로직 수정 (띄어쓰기 및 괄호 무시)
    const isCorrect = currentWord.kor.split(',').some(answer => {
        // 1. 원본 정답에서 띄어쓰기만 제거하여 비교 (괄호까지 다 입력한 경우 정답 처리)
        const originalNoSpace = answer.replace(/\s+/g, '');
        
        // 2. 소( ), 중{ }, 대[ ] 괄호와 그 안의 내용을 완전히 제거한 후 띄어쓰기 제거하여 비교
        const cleanedNoSpace = answer.replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, '').replace(/\s+/g, '');

        // 사용자가 괄호까지 썼든 안 썼든, 정답과 일치하면 통과
        return userAnswerNoSpace === originalNoSpace || userAnswerNoSpace === cleanedNoSpace;
    });

    if (isCorrect) {
        nextGameWord();
    } else {
        handleWrongAnswer("오답입니다!");
    }
}

function handleWrongAnswer(message) {
    elements.inputAnswer.disabled = true;
    elements.btnSubmitAnswer.disabled = true;

    elements.feedbackMsg.textContent = message;
    elements.correctMeaning.textContent = currentWord.kor;
    elements.feedbackBox.classList.remove('hidden');

    elements.btnNextWord.focus();
}

init();