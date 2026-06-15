const STORAGE_KEY = 'vocabCardsData';
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyPBu_H_jMJg1EEmWIPE9jMqA4HraR5pFl_Ut3iH5cQV2T7qlKm8988ngGv1w75JSc/exec';

const defaultCards = [
  {
    word: 'apple',
    translate: '蘋果',
    pos: 'noun',
    example: 'He brought an apple to school for lunch.',
    root: '來自古英語 æppel，常見水果名稱。'
  },
  {
    word: 'study',
    translate: '學習',
    pos: 'verb',
    example: 'She likes to study vocabulary every day.',
    root: '來自拉丁語 studium，表示熱情、學習。'
  }
];

const elements = {
  tabs: {
    study: document.getElementById('studyTab'),
    manage: document.getElementById('manageTab')
  },
  pages: {
    study: document.getElementById('studyPage'),
    manage: document.getElementById('managePage')
  },
  cardContainer: document.querySelector('.flip-card-inner'),
  cardFront: document.getElementById('cardFront'),
  cardBack: document.getElementById('cardBack'),
  wordSelect: document.getElementById('wordSelect'),
  addForm: document.getElementById('addForm'),
  WordField: document.getElementById('wordInput'),
  translateField: document.getElementById('translateInput'),
  posField: document.getElementById('posInput'),
  exampleField: document.getElementById('exampleInput'),
  rootField: document.getElementById('rootInput'),
  autoFillButton: document.getElementById('autoFillButton'),
  saveButton: document.getElementById('saveButton'),
  deleteButton: document.getElementById('deleteButton'),
  listBody: document.getElementById('wordListBody'),
  statusMessage: document.getElementById('statusMessage'),
  editIndicator: document.getElementById('editIndicator')
};

let cards = [];
let currentIndex = 0;
let editingIndex = null;

function loadCards() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      cards = JSON.parse(stored);
    } catch (err) {
      cards = [...defaultCards];
    }
  } else {
    cards = [...defaultCards];
  }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function showStatus(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  if (message) {
    window.clearTimeout(showStatus.timeoutId);
    showStatus.timeoutId = window.setTimeout(() => {
      elements.statusMessage.textContent = '';
      elements.statusMessage.className = 'status-message';
    }, 4500);
  }
}

async function sendWordToBackend(item) {
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes('XXXXXXXX')) {
    return { ok: false, error: '請先在 script.js 中設定 GAS_WEB_APP_URL。' };
  }

  try {
    const formData = new URLSearchParams();
    Object.entries(item).forEach(([key, value]) => {
      formData.append(key, value || '');
    });

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: formData,
      mode: 'no-cors'
    });

    if (response.type === 'opaque') {
      return { ok: true, data: null };
    }

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `後端回傳錯誤：${response.status} ${response.statusText} ${text}` };
    }

    return { ok: true, data: await response.json().catch(() => null) };
  } catch (error) {
    return { ok: false, error: error.message || '網路連線失敗' };
  }
}

function updateWordOptions() {
  elements.wordSelect.innerHTML = cards.map((card, index) => {
    return `<option value="${index}">${card.word}</option>`;
  }).join('');
  if (cards.length === 0) {
    elements.wordSelect.innerHTML = '<option value="-1">尚無單字，請新增</option>';
    currentIndex = -1;
  } else if (currentIndex < 0 || currentIndex >= cards.length) {
    currentIndex = 0;
  }
  elements.wordSelect.value = currentIndex;
}

function renderCard() {
  if (cards.length === 0) {
    elements.cardFront.textContent = '尚無單字';
    elements.cardBack.innerHTML = '<p>請前往管理頁新增單字。</p>';
    return;
  }
  const card = cards[currentIndex];
  elements.cardFront.textContent = card.word;
  elements.cardBack.innerHTML = `
    <h2>${card.word}</h2>
    <p><strong>翻譯：</strong>${card.translate || '未填寫'}</p>
    <p><strong>詞性：</strong>${card.pos || '未填寫'}</p>
    <p><strong>例句：</strong>${card.example || '未填寫'}</p>
    <p><strong>字根分析：</strong>${card.root || '未填寫'}</p>
  `;
}

function renderWordList() {
  if (cards.length === 0) {
    elements.listBody.innerHTML = '<tr><td colspan="4">目前沒有單字。</td></tr>';
    return;
  }
  elements.listBody.innerHTML = cards
    .map((card, index) => {
      return `
        <tr>
          <td>${card.word}</td>
          <td>${card.translate}</td>
          <td>${card.pos}</td>
          <td class="actions">
            <button type="button" class="small-button" data-action="edit" data-index="${index}">編輯</button>
            <button type="button" class="small-button danger" data-action="delete" data-index="${index}">刪除</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function setFormValues(card = null) {
  if (!card) {
    elements.WordField.value = '';
    elements.translateField.value = '';
    elements.posField.value = '';
    elements.exampleField.value = '';
    elements.rootField.value = '';
    editingIndex = null;
    elements.editIndicator.textContent = '新增單字';
    elements.deleteButton.hidden = true;
    return;
  }
  elements.WordField.value = card.word;
  elements.translateField.value = card.translate;
  elements.posField.value = card.pos;
  elements.exampleField.value = card.example;
  elements.rootField.value = card.root;
  editingIndex = card.index;
  elements.editIndicator.textContent = '編輯單字';
  elements.deleteButton.hidden = false;
}

function switchTab(target) {
  Object.keys(elements.tabs).forEach((name) => {
    const tab = elements.tabs[name];
    const page = elements.pages[name];
    const active = name === target;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
    page.classList.toggle('active', active);
    page.hidden = !active;
  });
}

async function autoFillWord() {
  const word = elements.WordField.value.trim().toLowerCase();
  if (!word) {
    showStatus('請先輸入英文單字。', 'error');
    return;
  }
  elements.autoFillButton.disabled = true;
  showStatus('自動填入中，請稍候...', 'info');

  const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const transUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-TW`;
  try {
    const [dictResp, transResp] = await Promise.allSettled([
      fetch(dictUrl),
      fetch(transUrl)
    ]);

    if (dictResp.status === 'fulfilled' && dictResp.value.ok) {
      const data = await dictResp.value.json();
      const entry = Array.isArray(data) && data[0] ? data[0] : null;
      if (entry) {
        const meaning = entry.meanings?.[0];
        const definition = meaning?.definitions?.[0];
        if (meaning?.partOfSpeech) {
          elements.posField.value = meaning.partOfSpeech;
        }
        if (definition?.example) {
          elements.exampleField.value = definition.example;
        }
        if (entry.origin) {
          elements.rootField.value = entry.origin;
        } else if (definition?.definition) {
          elements.rootField.value = `字義來源：${definition.definition}`;
        }
      }
    }

    if (transResp.status === 'fulfilled' && transResp.value.ok) {
      const transData = await transResp.value.json();
      const translated = transData.responseData?.translatedText;
      if (translated) {
        elements.translateField.value = translated;
      }
    }

    if (!elements.translateField.value && !elements.posField.value && !elements.exampleField.value && !elements.rootField.value) {
      showStatus('未取得自動填入內容，請手動補足欄位。', 'warning');
    } else {
      showStatus('已完成自動填入，請確認內容。', 'success');
    }
  } catch (error) {
    showStatus('自動填入失敗，請檢查網路或稍後再試。', 'error');
  } finally {
    elements.autoFillButton.disabled = false;
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const word = elements.WordField.value.trim();
  if (!word) {
    showStatus('英文單字為必填。', 'error');
    return;
  }

  const newItem = {
    word,
    translate: elements.translateField.value.trim(),
    pos: elements.posField.value.trim(),
    example: elements.exampleField.value.trim(),
    root: elements.rootField.value.trim()
  };

  elements.saveButton.disabled = true;
  showStatus('正在儲存單字並送出後端...', 'info');

  const isEdit = editingIndex !== null && editingIndex >= 0 && editingIndex < cards.length;
  if (isEdit) {
    cards[editingIndex] = newItem;
  } else {
    cards.push(newItem);
  }

  saveCards();
  updateWordOptions();
  renderWordList();
  renderCard();
  setFormValues();

  const backendResult = await sendWordToBackend(newItem);
  if (backendResult.ok) {
    showStatus(isEdit ? '單字已更新，已同步至後端。' : '已新增單字，已同步至後端。', 'success');
  } else {
    showStatus(`儲存成功，但後端同步失敗：${backendResult.error}`, 'warning');
  }
  elements.saveButton.disabled = false;
}

function handleListClick(event) {
  const btn = event.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  const index = Number(btn.dataset.index);
  if (action === 'edit') {
    const card = cards[index];
    if (card) {
      setFormValues({ ...card, index });
      switchTab('manage');
    }
  } else if (action === 'delete') {
    if (confirm(`確定要刪除「${cards[index].word}」嗎？`)) {
      cards.splice(index, 1);
      saveCards();
      if (currentIndex >= cards.length) currentIndex = cards.length - 1;
      updateWordOptions();
      renderWordList();
      renderCard();
      setFormValues();
      showStatus('單字已刪除。', 'success');
    }
  }
}

function initEvents() {
  elements.tabs.study.addEventListener('click', () => switchTab('study'));
  elements.tabs.manage.addEventListener('click', () => switchTab('manage'));

  elements.wordSelect.addEventListener('change', (event) => {
    currentIndex = Number(event.target.value);
    renderCard();
    elements.cardContainer.classList.remove('flipped');
  });

  document.querySelector('.flip-card').addEventListener('click', () => {
    elements.cardContainer.classList.toggle('flipped');
  });

  elements.autoFillButton.addEventListener('click', autoFillWord);
  elements.addForm.addEventListener('submit', handleFormSubmit);
  elements.deleteButton.addEventListener('click', () => {
    if (editingIndex !== null && cards[editingIndex]) {
      if (confirm(`確定要刪除「${cards[editingIndex].word}」嗎？`)) {
        cards.splice(editingIndex, 1);
        saveCards();
        if (currentIndex >= cards.length) currentIndex = cards.length - 1;
        updateWordOptions();
        renderWordList();
        renderCard();
        setFormValues();
        showStatus('單字已刪除。', 'success');
      }
    }
  });

  elements.listBody.addEventListener('click', handleListClick);
}

function init() {
  loadCards();
  updateWordOptions();
  renderCard();
  renderWordList();
  setFormValues();
  initEvents();
}

init();
