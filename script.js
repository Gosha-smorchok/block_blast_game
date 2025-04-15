// --- Константы ---
const GRID_SIZE = 8;
const CELL_SIZE = 40; // Совпадает с CSS
const blockColors = {
    'L': '#81C784',    // Soft Green 
    '2x2': '#64B5F6', // Soft Blue
    '3x3': '#FFB74D', // Soft Orange
    '2x3': '#4FC3F7'  // Soft Light Blue
};

const blockShapes = {
    // Координаты клеток относительно точки вставки (верхний левый угол)
    '3x3': { 
        color: blockColors['3x3'], 
        cells: [[0,0], [0,1], [0,2], [1,0], [1,1], [1,2], [2,0], [2,1], [2,2]] 
    },
    '2x3': { // Прямоугольник 2x3
        color: blockColors['2x3'],
        rotations: [
            [[0,0], [0,1], [0,2], [1,0], [1,1], [1,2]], // 0 градусов
            [[0,0], [0,1], [1,0], [1,1], [2,0], [2,1]], // 90 градусов
            [[0,0], [0,1], [0,2], [1,0], [1,1], [1,2]], // 180 градусов (как 0)
            [[0,0], [0,1], [1,0], [1,1], [2,0], [2,1]], // 270 градусов (как 90)
        ],
        currentRotation: 0
    },
    '2x2': { 
        color: blockColors['2x2'], 
        cells: [[0,0], [0,1], [1,0], [1,1]] 
    },
    'L': {
        color: blockColors['L'],
        rotations: [
            [[0,0], [1,0], [2,0], [2,1]], // 0 градусов
            [[0,0], [0,1], [0,2], [1,0]], // 90 градусов
            [[0,0], [0,1], [1,1], [2,1]], // 180 градусов
            [[1,0], [1,1], [1,2], [0,2]], // 270 градусов
        ],
        currentRotation: 0
    }
};
const blockTypes = Object.keys(blockShapes);

// --- Переменные состояния игры ---
let grid = []; // Двумерный массив состояния поля (0 - пусто, 1 - занято/цвет)
let score = 0;
let currentBlocks = []; // Три текущих блока для выбора
let selectedBlock = null; // Какой блок выбран для перетаскивания/размещения
let dragOffsetX = 0;
let dragOffsetY = 0;
let draggingElement = null; // Элемент, который тащим пальцем
let draggingElementWidth = 0; // <<-- Новая переменная
let draggingElementHeight = 0; // <<-- Новая переменная
let touchStartX = 0;
let touchStartY = 0;
let touchTargetBlockIndex = -1;
let isVibrationEnabled = true; // По умолчанию вибрация включена
let gridRectCache = null; // <<-- Кеш геометрии сетки
let isDraggingOverGrid = false; // <<-- Флаг, что тащим над сеткой
let dragStartTimer = null; // <<-- Таймер для задержки начала перетаскивания
const DRAG_START_DELAY = 250; // ms - задержка для начала перетаскивания
const DRAG_MOVE_THRESHOLD = 5; // pixels - порог движения для отмены tap
let isDragging = false; // <<-- Флаг, что идет именно перетаскивание
let highScore = 0; // <<-- Добавляем переменную для рекорда
let highlightedCells = new Set(); // <<< НОВОЕ: для отслеживания подсвеченных ячеек
let comboCounter = 0; // <<< НОВОЕ: Счетчик для комбо-цепочки

// --- Элементы DOM ---
let gameContainer;
let gridContainer;
let scoreDisplay;
let highScoreDisplay; // <<-- Добавляем элемент для рекорда
let nextBlocksPanel;
let rotateButton;
let vibrationToggle;
let modalShareSettingsButton; // <<-- Новая кнопка Поделиться в настройках

// --- Переменные для модальных окон ---
let settingsModal;
let gameOverModal;
let gameOverScoreElement;
let gameOverHighScoreElement;
let modalNewGameOverButton;
let modalShareOverButton;

// <<< НАЧАЛО: Добавление переменных для таблицы лидеров >>>
let leaderboardContainer;
let leaderboardList;
let modalShowLeaderboardButton;
let closeLeaderboardButton;
// <<< КОНЕЦ: Добавление переменных для таблицы лидеров >>>

// <<< НАЧАЛО: Переменная для элемента счетчика комбо >>>
let comboCountElement;
// <<< КОНЕЦ: Переменная для элемента счетчика комбо >>>

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    gameContainer = document.getElementById('game-container');
    gridContainer = document.getElementById('grid-container');
    scoreDisplay = document.getElementById('score');
    nextBlocksPanel = document.getElementById('next-blocks-panel');
    rotateButton = document.getElementById('rotate-button');
    const settingsButton = document.getElementById('settings-button');
    settingsModal = document.getElementById('settings-modal');
    const modalNewGameButton = document.getElementById('modal-new-game');
    const modalContinueButton = document.getElementById('modal-continue');
    vibrationToggle = document.getElementById('vibration-toggle');
    highScoreDisplay = document.getElementById('high-score-board');
    modalShareSettingsButton = document.getElementById('modal-share-settings'); // <<-- Получаем новую кнопку

    // --- Получаем элементы модального окна Game Over ---
    gameOverModal = document.getElementById('game-over-modal');
    gameOverScoreElement = document.getElementById('game-over-score');
    gameOverHighScoreElement = document.getElementById('game-over-highscore');
    modalNewGameOverButton = document.getElementById('modal-new-game-over');
    modalShareOverButton = document.getElementById('modal-share-over');
    // --- Конец получения элементов ---

    // <<< НАЧАЛО: Получение элементов таблицы лидеров >>>
    leaderboardContainer = document.getElementById('leaderboard-container');
    leaderboardList = document.getElementById('leaderboard-list');
    modalShowLeaderboardButton = document.getElementById('modal-show-leaderboard');
    closeLeaderboardButton = document.getElementById('close-leaderboard');
    // <<< КОНЕЦ: Получение элементов таблицы лидеров >>>

    // <<< НАЧАЛО: Получение элемента счетчика комбо >>>
    comboCountElement = document.getElementById('combo-count');
    // <<< КОНЕЦ: Получение элемента счетчика комбо >>>

    if(settingsButton && settingsModal) {
        settingsButton.addEventListener('click', () => {
            settingsModal.classList.add('active'); // Показываем окно настроек
        });
    }

    // Функция закрытия модального окна (обобщенная)
    function closeModal(modalElement) {
        if (modalElement) {
            modalElement.classList.remove('active');
        }
    }

    if (modalNewGameButton) {
        modalNewGameButton.addEventListener('click', () => {
            closeModal(settingsModal); // Закрываем окно настроек
            newGame(); // Начинаем новую игру
        });
    }

    if (modalContinueButton) {
        modalContinueButton.addEventListener('click', () => closeModal(settingsModal)); // Закрываем окно настроек
    }

    // Закрытие модальных окон по клику вне их области
    [settingsModal, gameOverModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) { // Клик был по фону
                    closeModal(modal);
                }
            });
        }
    });

    // --- Обработчики для кнопок в Game Over модалке ---
    if (modalNewGameOverButton) {
        modalNewGameOverButton.addEventListener('click', () => {
            closeModal(gameOverModal); // Закрываем окно Game Over
            newGame(); // Начинаем новую игру
        });
    }
    if (modalShareOverButton) {
        modalShareOverButton.addEventListener('click', () => {
            handleShareClick(); // Вызываем существующую функцию шаринга
            // Окно Game Over не закрываем, чтобы пользователь мог вернуться
        });
    }
    // --- Конец обработчиков для Game Over модалки ---

    // --- Обработчик для новой кнопки Поделиться в Настройках ---
    if (modalShareSettingsButton) {
        modalShareSettingsButton.addEventListener('click', () => {
            handleShareClick(); // Вызываем существующую функцию шаринга
            // Можно закрыть окно настроек после шаринга, или оставить открытым
             closeModal(settingsModal);
        });
    }
    // --- Конец обработчика ---

    // <<< НАЧАЛО: Обработчики для кнопок таблицы лидеров >>>
    if (modalShowLeaderboardButton) {
        modalShowLeaderboardButton.addEventListener('click', () => {
            closeModal(settingsModal); // Закрываем настройки
            loadChatLeaderboard(); // Загружаем и показываем лидеров
        });
    }
    if (closeLeaderboardButton) {
        closeLeaderboardButton.addEventListener('click', () => {
            if (leaderboardContainer) {
                leaderboardContainer.style.display = 'none'; // Скрываем контейнер
            }
        });
    }
    // <<< КОНЕЦ: Обработчики для кнопок таблицы лидеров >>>

    // Назначение обработчиков
    gridContainer.addEventListener('dragover', handleDragOver);
    gridContainer.addEventListener('drop', handleDrop);
    gridContainer.addEventListener('click', handleGridClick);
    rotateButton?.addEventListener('click', rotateSelectedBlock);
    addHighlightStyles();

    // Переносим вызов newGame внутрь DOMContentLoaded после инициализации элементов
    initializeGrid();
    newGame();
    updateGridRectCache(); // <<-- Первичное получение геометрии сетки

    // --- Загрузка рекорда ---
    const savedHighScore = localStorage.getItem('blockBlastHighScore');
    if (savedHighScore !== null) {
        highScore = parseInt(savedHighScore, 10) || 0; // Parse as integer
    }
    updateHighScoreDisplay(); // Отобразить загруженный рекорд
    // --- Конец загрузки рекорда ---

    // Загрузка состояния вибрации из localStorage
    const savedVibrationSetting = localStorage.getItem('blockBlastVibration');
    if (savedVibrationSetting !== null) {
        isVibrationEnabled = savedVibrationSetting === 'true';
    }
    if (vibrationToggle) {
        vibrationToggle.checked = isVibrationEnabled;

        // Обработчик изменения чекбокса
        vibrationToggle.addEventListener('change', () => {
            isVibrationEnabled = vibrationToggle.checked;
            localStorage.setItem('blockBlastVibration', isVibrationEnabled); // Сохраняем настройку
            console.log('Vibration enabled:', isVibrationEnabled);
            if (isVibrationEnabled) {
                 triggerHapticFeedback('light'); // Небольшая вибрация при включении
            }
        });
    }

    // Инициализация Telegram Mini App
    try {
        if (window.Telegram?.WebApp) {
             window.Telegram.WebApp.ready();
             // ... (настройка темы, если нужна) ...
        } else {
             console.warn("Telegram WebApp API not fully available or ready.");
        }
    } catch (error) {
        console.error("Error initializing Telegram WebApp API:", error);
    }
});

function calculateCellSize() {
    if (!gameContainer || !gridContainer) return 10; // Возвращаем минимум, если элементы не найдены

    // Используем ширину внешнего контейнера
    const gameContainerWidth = gameContainer.offsetWidth; 
    
    // Получаем вычисленные стили gridContainer для точного padding
    const gridStyle = window.getComputedStyle(gridContainer);
    const gridPaddingLeft = parseFloat(gridStyle.paddingLeft) || 0;
    const gridPaddingRight = parseFloat(gridStyle.paddingRight) || 0;
    const gridTotalPadding = gridPaddingLeft + gridPaddingRight;

    const gap = 1; // Соответствует gap в CSS для gridContainer

    // Доступная ширина внутри padding сетки
    // Используем gameContainerWidth, т.к. gridContainer должен занимать его ширину (за вычетом своих padding)
    const availableWidth = gameContainerWidth - gridTotalPadding - (GRID_SIZE - 1) * gap; 
    const cellSize = Math.max(10, Math.floor(availableWidth / GRID_SIZE));

    console.log(`Game Container Width: ${gameContainerWidth}, Grid Padding: ${gridTotalPadding}, Available Width: ${availableWidth}, Cell Size: ${cellSize}`);
    
    if (cellSize <= 10 && gameContainerWidth > 100) { 
        console.warn("Calculated cell size is unexpectedly small (<= 10px). Check layout and calculations.");
    }

    return cellSize;
}

/** Инициализация или сброс игрового поля */
function initializeGrid() {
    grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    gridContainer.innerHTML = '';
    console.log('Initializing grid...');

    const cellSize = calculateCellSize();

    // Применяем размеры к сетке
    gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${cellSize}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${cellSize}px)`;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            gridContainer.appendChild(cell);
        }
    }
    // Вызываем renderGrid после создания всех ячеек
    renderGrid(); 
}

/** Отрисовка текущего состояния сетки */
function renderGrid() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cellElement = gridContainer.querySelector(`[data-row='${r}'][data-col='${c}']`);
            if (grid[r][c]) {
                cellElement.style.backgroundColor = grid[r][c];
                cellElement.classList.add('occupied');
            } else {
                cellElement.style.backgroundColor = '';
                cellElement.classList.remove('occupied');
            }
        }
    }
}

/** Генерация случайного блока */
function generateBlock() {
    const type = blockTypes[Math.floor(Math.random() * blockTypes.length)];
    const shapeInfo = blockShapes[type];

    // Клонируем объект, чтобы не изменять исходные формы
    const newBlock = JSON.parse(JSON.stringify(shapeInfo));
    newBlock.type = type;

    // Обрабатываем вращения
    if (newBlock.rotations) {
        newBlock.cells = newBlock.rotations[newBlock.currentRotation];
    }

    return newBlock;
}

/** Генерация и отображение следующих трех блоков */
function generateNextBlocks() {
    currentBlocks = [generateBlock(), generateBlock(), generateBlock()];
    renderNextBlocks();
}

/** Отображение блоков в панели предпросмотра */
function renderNextBlocks() {
    const previews = nextBlocksPanel.querySelectorAll('.block-preview');
    
    previews.forEach((preview, index) => {
        preview.innerHTML = '';
        preview.dataset.blockIndex = index;
        const block = currentBlocks[index];
        
        if (!block) {
            preview.style.visibility = 'hidden';
            return;
        }
        
        preview.style.visibility = 'visible';

        // Создаем мини-сетку для отображения блока
        const blockSize = Math.max(
            ...block.cells.map(cell => Math.max(cell[0], cell[1]))
        ) + 1;
        
        const previewGrid = document.createElement('div');
        previewGrid.style.display = 'grid';
        previewGrid.style.gridTemplateColumns = `repeat(${blockSize}, 15px)`;
        previewGrid.style.gridTemplateRows = `repeat(${blockSize}, 15px)`;
        previewGrid.style.gap = '1px';

        // Создаем карту занятых ячеек
        const cellsMap = {};
        block.cells.forEach(cell => cellsMap[`${cell[0]}_${cell[1]}`] = true);

        // Отрисовываем мини-сетку
        for (let r = 0; r < blockSize; r++) {
            for (let c = 0; c < blockSize; c++) {
                const cellDiv = document.createElement('div');
                cellDiv.style.width = '15px';
                cellDiv.style.height = '15px';
                
                if (cellsMap[`${r}_${c}`]) {
                    cellDiv.style.backgroundColor = block.color;
                } else {
                    cellDiv.style.backgroundColor = 'transparent';
                }
                
                previewGrid.appendChild(cellDiv);
            }
        }
        
        preview.appendChild(previewGrid);

        // Добавляем обработчики событий
        preview.draggable = true;
        preview.addEventListener('dragstart', handleDragStart);
        preview.addEventListener('click', handleClickBlock);
        // --- Добавляем обработчики touch --- 
        preview.addEventListener('touchstart', handleTouchStart, { passive: false }); // passive: false для предотвращения прокрутки
    });
}

/** Обновление счета */
function updateScore(newScore) {
    console.log("Updating score to:", newScore, "Element:", scoreDisplay); // Отладка
    score = newScore;
    if (scoreDisplay) { // Добавим проверку на существование элемента
        scoreDisplay.textContent = score;
    } else {
        console.error("Score display element not found!");
    }
}

/** Начало новой игры */
function newGame() {
    // initializeGrid(); // initializeGrid теперь вызывается из redrawUI или DOMContentLoaded
    updateScore(0);
    // Инициализация сетки должна произойти перед генерацией блоков и рендерингом
    // Если redrawUI не вызывается при первой загрузке, нужно вызвать initializeGrid здесь.
    // Проверим, пустой ли gridContainer
    if (!gridContainer.hasChildNodes()) {
        initializeGrid(); // Вызываем, если сетка еще не создана
    } else {
         // Если сетка уже есть, очистим её логическое представление
         grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
         renderGrid(); // Обновим отображение очищенной сетки
    }
    generateNextBlocks();
    // renderGrid(); // Уже вызван в initializeGrid или выше
    updateHighScoreDisplay(); // <<-- Обновляем отображение рекорда при новой игре
    comboCounter = 0; // Сбрасываем счетчик комбо при новой игре
    updateComboDisplay(); // Скрываем/обновляем отображение комбо
}

// --- Обработчики событий ---

function handleDragStart(event) {
    const blockPreview = event.target.closest('.block-preview');
    if (!blockPreview) return;
    
    const blockIndex = parseInt(blockPreview.dataset.blockIndex);
    // Используем || {} для случая если currentBlocks[blockIndex] === null
    selectedBlock = {...(currentBlocks[blockIndex] || {}), index: blockIndex};
    
    if (!selectedBlock || !selectedBlock.type) {
        event.preventDefault(); // Предотвращаем начало перетаскивания, если блок невалиден
        return;
    }

    event.dataTransfer.setData('text/plain', blockIndex.toString());
    event.dataTransfer.effectAllowed = 'move';
    
    // --- Центрирование drag image по центру фигуры блока ---
    const dragImage = blockPreview.querySelector('div'); // Получаем мини-сетку
    if (dragImage && selectedBlock.cells) {
        // Находим границы фигуры блока в превью (размер ячейки превью 15px, gap 1px)
        const cellSize = 15;
        const gap = 1;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        selectedBlock.cells.forEach(cell => {
            const cellX = cell[1] * (cellSize + gap);
            const cellY = cell[0] * (cellSize + gap);
            minX = Math.min(minX, cellX);
            minY = Math.min(minY, cellY);
            maxX = Math.max(maxX, cellX + cellSize);
            maxY = Math.max(maxY, cellY + cellSize);
        });

        if (minX <= maxX) { // Убедимся, что блок не пустой
            const blockWidth = maxX - minX;
            const blockHeight = maxY - minY;
            const offsetX = minX + blockWidth / 2;
            const offsetY = minY + blockHeight / 2;
            event.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
        } else {
            // Фоллбэк: используем центр превью-контейнера
            const rect = blockPreview.getBoundingClientRect();
            event.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2);
        }

    } else {
        // Фоллбэк, если что-то пошло не так
        const rect = blockPreview.getBoundingClientRect();
        event.dataTransfer.setDragImage(blockPreview, rect.width / 2, rect.height / 2);
    }
    // --- Конец центрирования ---

    console.log("Начали тащить блок (mouse):", selectedBlock.type);
    updateGridRectCache(); // Обновляем кеш сетки при начале перетаскивания мышью
}

// --- Вспомогательная функция для расчета смещения центра блока ---
/**
 * Вычисляет смещение визуального центра блока относительно его левого верхнего угла (в ячейках сетки).
 * @param {object} block - Объект блока с массивом cells.
 * @returns {{offsetRow: number, offsetCol: number}} - Смещение центра.
 */
function getBlockAnchorOffset(block) {
    if (!block || !block.cells || block.cells.length === 0) {
        return { offsetRow: 0, offsetCol: 0 };
    }

    let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
    block.cells.forEach(cell => {
        minR = Math.min(minR, cell[0]);
        minC = Math.min(minC, cell[1]);
        maxR = Math.max(maxR, cell[0]);
        maxC = Math.max(maxC, cell[1]);
    });

    // Считаем смещение от левого верхнего угла *фигуры* до ее центра
    const offsetRow = Math.floor((maxR - minR) / 2);
    const offsetCol = Math.floor((maxC - minC) / 2);

    // Возвращаем смещение относительно ячейки [0, 0] массива cells
    return { offsetRow: minR + offsetRow, offsetCol: minC + offsetCol };
}
// --- Конец вспомогательной функции ---

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    // Получаем строку/колонку под курсором
    const gridPos = getRowColFromCoords(event.clientX, event.clientY);

    if (gridPos && selectedBlock) {
        isDraggingOverGrid = true;
        // Рассчитываем точку привязки (верхний левый угол) для подсветки
        const { offsetRow, offsetCol } = getBlockAnchorOffset(selectedBlock);
        const anchorRow = gridPos.row - offsetRow;
        const anchorCol = gridPos.col - offsetCol;
        highlightPlacementArea(anchorRow, anchorCol, selectedBlock);
    } else {
        isDraggingOverGrid = false;
        clearHighlight();
    }
}

// Подсветка области размещения
function highlightPlacementArea(row, col, block) {
    // Сначала убираем предыдущую подсветку
    clearHighlight(); 
    
    if (!block || !block.cells) return;
    
    const isValid = isValidPlacement(row, col, block);

    if (isValid) {
        // Если место валидное, подсвечиваем цветом блока
        block.cells.forEach(cell => {
            const r = row + cell[0];
            const c = col + cell[1];
            
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                const cellElement = gridContainer.querySelector(`[data-row='${r}'][data-col='${c}']`);
                if (cellElement) {
                    // Не изменяем стиль, если ячейка уже занята (на всякий случай)
                    if (!grid[r][c]) { 
                        cellElement.style.backgroundColor = block.color;
                        highlightedCells.add(cellElement); // Запоминаем ячейку
                    }
                }
            }
        });
    } else {
        // Если место невалидное - ничего не делаем (нет подсветки)
    }
}

// Убираем подсветку со всех ячеек (сбрасываем цвет запомненных ячеек)
function clearHighlight() {
    highlightedCells.forEach(cellElement => {
        // Сбрасываем стиль, браузер вернет значение из CSS
        cellElement.style.backgroundColor = ''; 
    });
    highlightedCells.clear(); // Очищаем набор
}

function handleDrop(event) {
    event.preventDefault();
    clearHighlight();

    const blockIndex = parseInt(event.dataTransfer.getData('text/plain'));
    const gridPos = getRowColFromCoords(event.clientX, event.clientY); // Получаем позицию по курсору

    // Используем gridPos для размещения
    if (gridPos && !isNaN(blockIndex) && selectedBlock) { // Добавляем проверку selectedBlock
        // Рассчитываем точку привязки (верхний левый угол) для размещения
        const { offsetRow, offsetCol } = getBlockAnchorOffset(selectedBlock);
        const anchorRow = gridPos.row - offsetRow;
        const anchorCol = gridPos.col - offsetCol;
        const blockToPlace = currentBlocks[blockIndex]; // Берем актуальный блок

        if (blockToPlace && isValidPlacement(anchorRow, anchorCol, blockToPlace)) {
            placeBlock(anchorRow, anchorCol, blockToPlace);
            currentBlocks[blockIndex] = null;
            handlePlacementLogic(blockIndex);
        } else {
             console.log("Drop - invalid placement at calculated anchor position");
        }
    } else {
        console.log("Drop - outside grid, invalid block index, or no block selected");
    }
    selectedBlock = null;
}

// Обработка клика по блоку
function handleClickBlock(event) {
    const blockPreview = event.currentTarget;
    const blockIndex = parseInt(blockPreview.dataset.blockIndex);
    
    // Если мы уже выбрали этот блок, отменяем выбор
    if (selectedBlock?.index === blockIndex) {
        selectedBlock = null;
        document.querySelectorAll('.block-preview').forEach(p => 
            p.classList.remove('selected-block'));
        return;
    }
    
    // Выбираем новый блок
    selectedBlock = {...currentBlocks[blockIndex], index: blockIndex};
    
    // Обновляем визуальное выделение
    document.querySelectorAll('.block-preview').forEach(p => 
        p.classList.remove('selected-block'));
    blockPreview.classList.add('selected-block');
}

// Обработка клика по сетке
function handleGridClick(event) {
    const cell = event.target.closest('.grid-cell');
    if (cell && selectedBlock) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const blockIndex = selectedBlock.index;
        const blockToPlace = currentBlocks[blockIndex];

        if (blockToPlace && isValidPlacement(row, col, blockToPlace)) {
            placeBlock(row, col, blockToPlace);
            currentBlocks[blockIndex] = null;
            document.querySelectorAll('.block-preview.selected-block').forEach(p => 
                p.classList.remove('selected-block'));
            handlePlacementLogic(blockIndex);
        } 
        // Сбрасываем выбранный блок независимо от успеха размещения
        selectedBlock = null; 
    }
}

/** Проверка возможности размещения блока */
function isValidPlacement(startRow, startCol, block) {
    if (!block || !block.cells) return false;
    
    for (const cell of block.cells) {
        const r = startRow + cell[0];
        const c = startCol + cell[1];

        // Проверка выхода за границы
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
            return false;
        }
        
        // Проверка наложения на занятые клетки
        if (grid[r][c] !== null) {
            return false;
        }
    }
    
    return true;
}

/** Размещение блока на поле */
function placeBlock(startRow, startCol, block) {
    block.cells.forEach(cell => {
        const r = startRow + cell[0];
        const c = startCol + cell[1];
        
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            grid[r][c] = block.color;
        }
    });
    triggerHapticFeedback('light'); // <<-- Вибрация при размещении
}

/** Проверка и удаление заполненных линий */
function clearLines() {
    let rowsToClear = [];
    let colsToClear = [];
    let clearedCellsCoords = [];
    const cellsToClearSet = new Set(); // Используем Set для уникальных координат в формате "r-c"

    // 1. Найти все полные строки
    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(cell => cell !== null)) {
            rowsToClear.push(r);
        }
    }

    // 2. Найти все полные столбцы
    for (let c = 0; c < GRID_SIZE; c++) {
        let colFull = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] === null) {
                colFull = false;
                break;
            }
        }
        if (colFull) {
            colsToClear.push(c);
        }
    }

    // 3. Собрать уникальные координаты всех ячеек в полных строках/столбцах
    for (const r of rowsToClear) {
        for (let c = 0; c < GRID_SIZE; c++) {
            cellsToClearSet.add(`${r}-${c}`);
        }
    }
    for (const c of colsToClear) {
        for (let r = 0; r < GRID_SIZE; r++) {
            // Добавляем, даже если уже есть от строки (Set обеспечит уникальность)
             if (grid[r][c] !== null) { // Убедимся, что ячейка не пуста
                 cellsToClearSet.add(`${r}-${c}`);
             }
        }
    }

    // 4. Преобразовать Set в массив объектов и очистить grid
    cellsToClearSet.forEach(coordString => {
        const [rStr, cStr] = coordString.split('-');
        const r = parseInt(rStr);
        const c = parseInt(cStr);
        
        // Проверяем еще раз, что координаты валидны и ячейка не пуста
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && grid[r][c] !== null) {
            clearedCellsCoords.push({ r, c });
            grid[r][c] = null; // Очищаем ячейку в массиве grid
        }
    });

    const rowsClearedCount = rowsToClear.length;
    const colsClearedCount = colsToClear.length;
    const totalLinesCleared = rowsClearedCount + colsClearedCount;

    console.log(`clearLines: Found ${rowsClearedCount} rows, ${colsClearedCount} cols. Total lines: ${totalLinesCleared}. Clearing ${clearedCellsCoords.length} unique cells.`);

    // Возвращаем объект с результатами
    return { 
        clearedCellsCoords, 
        rowsClearedCount, 
        colsClearedCount, 
        totalLinesCleared 
    }; 
}

/** Проверка на конец игры */
function isGameOver() {
    for (const block of currentBlocks) {
        if (block === null) continue;

        // Проверяем возможность размещения в любом месте поля
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (isValidPlacement(r, c, block)) {
                    return false; // Есть куда разместить блок
                }
            }
        }
        
        // Если блок можно вращать, проверяем все варианты
        if (block.rotations) {
            const originalRotation = block.currentRotation;
            
            for (let rot = 0; rot < block.rotations.length; rot++) {
                if (rot === originalRotation) continue;
                
                const rotatedBlock = { 
                    ...block, 
                    cells: block.rotations[rot] 
                };
                
                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        if (isValidPlacement(r, c, rotatedBlock)) {
                            return false; // Можно разместить повернутый блок
                        }
                    }
                }
            }
        }
    }
    
    // Если ни один блок нельзя разместить
    return true;
}

/** Вращение выбранного блока */
function rotateSelectedBlock() {
    if (!selectedBlock || !selectedBlock.rotations) {
        return;
    }

    // Обновляем вращение в selectedBlock
    selectedBlock.currentRotation = (selectedBlock.currentRotation + 1) % selectedBlock.rotations.length;
    selectedBlock.cells = selectedBlock.rotations[selectedBlock.currentRotation];

    // Обновляем блок в массиве currentBlocks
    const blockIndex = selectedBlock.index;
    if (blockIndex !== undefined && currentBlocks[blockIndex]) {
        currentBlocks[blockIndex].currentRotation = selectedBlock.currentRotation;
        currentBlocks[blockIndex].cells = selectedBlock.rotations[selectedBlock.currentRotation];
        renderNextBlocks();
    }
}

// Добавление стилей для подсветки (ТЕПЕРЬ ТОЛЬКО ДЛЯ ВЫБРАННОГО БЛОКА)
function addHighlightStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Убраны стили для .highlight-valid и .highlight-invalid */
        .selected-block {
            box-shadow: 0 0 0 2px #fff, 0 0 0 4px #007bff;
        }
    `;
    document.head.appendChild(style);
}

// Перерисовывает сетку и блоки с учетом текущих размеров
function redrawUI() {
    console.log("Redrawing UI due to resize...");
    
    const cellSize = calculateCellSize();

    gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${cellSize}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${cellSize}px)`;

    // Перерисовываем сетку (сохраняя состояние)
    renderGrid(); 
    // Перерисовываем превью
    renderNextBlocks();
}

// Добавляем обработчик изменения размера окна для пересчета сетки
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        redrawUI(); 
        updateGridRectCache(); // <<-- Обновляем кеш при ресайзе
    }, 250); 
});

// --- Touch Event Handlers --- 

function handleTouchStart(event) {
    // Игнорируем, если касание не одним пальцем или таймер уже запущен
    if (event.touches.length !== 1 || dragStartTimer) return;
    // Убираем preventDefault отсюда, чтобы клик по кнопкам работал
    // event.preventDefault(); 

    const touch = event.touches[0];
    const blockPreview = event.currentTarget; 
    touchTargetBlockIndex = parseInt(blockPreview.dataset.blockIndex);
    
    // --- Сразу выбираем блок (логика как в handleClickBlock) ---
    if (selectedBlock?.index === touchTargetBlockIndex) {
        // Повторный тап - отмена выбора (не будем делать, т.к. может помешать вращению)
        // selectedBlock = null;
        // document.querySelectorAll('.block-preview').forEach(p => p.classList.remove('selected-block'));
        // Вместо отмены просто обновим данные на случай вращения
        selectedBlock = {...(currentBlocks[touchTargetBlockIndex] || {}), index: touchTargetBlockIndex};
    } else {
        // Выбираем новый блок
        selectedBlock = {...(currentBlocks[touchTargetBlockIndex] || {}), index: touchTargetBlockIndex};
        // Обновляем визуальное выделение
        document.querySelectorAll('.block-preview').forEach(p => p.classList.remove('selected-block'));
        if (blockPreview && currentBlocks[touchTargetBlockIndex]) {
             blockPreview.classList.add('selected-block');
        }
    }
    // --- Конец выбора блока ---

    if (!selectedBlock || !selectedBlock.type) return; // Если блок невалиден

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isDragging = false; // Сбрасываем флаг перетаскивания

    // Запускаем таймер на начало перетаскивания
    dragStartTimer = setTimeout(() => {
        console.log("Drag timer fired - starting drag");
        startDrag(touch); // Начинаем перетаскивание, передаем событие touch
        dragStartTimer = null; // Сбрасываем таймер
    }, DRAG_START_DELAY);

    // Добавляем временные обработчики для отслеживания движения или отпускания
    document.addEventListener('touchmove', handleInitialTouchMove, { passive: false });
    document.addEventListener('touchend', handleInitialTouchEnd);
    document.addEventListener('touchcancel', handleInitialTouchEnd);

    console.log("Touch Start - block selected:", selectedBlock.type);
}

// Временный обработчик движения: если сдвинули палец до таймера - начать drag
function handleInitialTouchMove(event) {
    if (!selectedBlock || event.touches.length !== 1) return;
    event.preventDefault(); // Предотвращаем прокрутку, если начали двигать

    const touch = event.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    // Проверяем порог движения
    if (Math.sqrt(dx*dx + dy*dy) > DRAG_MOVE_THRESHOLD) {
        console.log("Movement threshold exceeded - starting drag early");
        // Отменяем таймер (если он еще не сработал)
        if (dragStartTimer) {
            clearTimeout(dragStartTimer);
            dragStartTimer = null;
        }
        // Начинаем перетаскивание
        startDrag(touch); 
    }
}

// Временный обработчик отпускания: если отпустили до таймера - это был tap
function handleInitialTouchEnd(event) {
     console.log("Initial touch end/cancel");
    // Отменяем таймер (если он еще не сработал и не был отменен движением)
    if (dragStartTimer) {
        clearTimeout(dragStartTimer);
        dragStartTimer = null;
        console.log("Drag timer cancelled - it was a tap.");
        // Блок уже выбран в handleTouchStart, ничего больше делать не нужно
    }
    // Удаляем временные обработчики в любом случае
    removeInitialTouchListeners();
}

// Функция для удаления временных обработчиков
function removeInitialTouchListeners() {
    document.removeEventListener('touchmove', handleInitialTouchMove);
    document.removeEventListener('touchend', handleInitialTouchEnd);
    document.removeEventListener('touchcancel', handleInitialTouchEnd);
}

// Функция для инициации перетаскивания
function startDrag(touch) {
    // Удаляем временные обработчики, если они еще есть
    removeInitialTouchListeners(); 
    // Если перетаскивание уже начато, выходим
    if (isDragging || !selectedBlock) return;
    
    isDragging = true;
    console.log("Starting drag logic for:", selectedBlock.type);

    // Создаем и позиционируем клон
    if (!draggingElement) {
        draggingElement = document.createElement('div');
        draggingElement.id = 'dragging-block';
        const blockPreview = document.querySelector(`.block-preview[data-block-index='${selectedBlock.index}']`);
        const previewGrid = blockPreview?.querySelector('div');
        if (previewGrid) {
            draggingElement.appendChild(previewGrid.cloneNode(true));
        } else {
            draggingElement.style.width = '60px';
            draggingElement.style.height = '60px';
            draggingElement.style.backgroundColor = selectedBlock.color;
        }
        document.body.appendChild(draggingElement);
        // --- Получаем размеры и вычисляем центр фигуры для тач-клона ---
        const rect = draggingElement.getBoundingClientRect();
        draggingElementWidth = rect.width;
        draggingElementHeight = rect.height;
        // Вычисляем центр фигуры аналогично handleDragStart (для touch)
        let figureOffsetX = draggingElementWidth / 2;
        let figureOffsetY = draggingElementHeight / 2;
        if (selectedBlock.cells) {
            const cellSize = 15;
            const gap = 1;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            selectedBlock.cells.forEach(cell => {
                const cellX = cell[1] * (cellSize + gap);
                const cellY = cell[0] * (cellSize + gap);
                minX = Math.min(minX, cellX);
                minY = Math.min(minY, cellY);
                maxX = Math.max(maxX, cellX + cellSize);
                maxY = Math.max(maxY, cellY + cellSize);
            });
            if (minX <= maxX) {
                figureOffsetX = minX + (maxX - minX) / 2;
                figureOffsetY = minY + (maxY - minY) / 2;
            }
        }
        draggingElement.dataset.figureOffsetX = figureOffsetX; // Сохраняем смещение
        draggingElement.dataset.figureOffsetY = figureOffsetY;
        // --- Конец вычисления центра фигуры ---
    }
    positionDraggingElement(touch.clientX, touch.clientY);
    updateGridRectCache();

    // Добавляем ОСНОВНЫЕ обработчики перетаскивания
    document.addEventListener('touchmove', handleDragMove, { passive: false }); // Используем новое имя для основного обработчика
    document.addEventListener('touchend', handleDragEnd); // Используем новое имя
    document.addEventListener('touchcancel', handleDragEnd);
}

// Переименовываем основные обработчики
function handleDragMove(event) {
    if (!isDragging || !draggingElement || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    positionDraggingElement(touch.clientX, touch.clientY);
    const gridPos = getRowColFromCoords(touch.clientX, touch.clientY);
    if (gridPos && selectedBlock) {
        isDraggingOverGrid = true;
        // Рассчитываем точку привязки (верхний левый угол) для подсветки
        const { offsetRow, offsetCol } = getBlockAnchorOffset(selectedBlock);
        const anchorRow = gridPos.row - offsetRow;
        const anchorCol = gridPos.col - offsetCol;
        highlightPlacementArea(anchorRow, anchorCol, selectedBlock);
    } else {
        isDraggingOverGrid = false;
        clearHighlight();
    }
}

function handleDragEnd(event) {
    if (!isDragging || !draggingElement) return;
    console.log("Drag End");

    const lastTouch = event.changedTouches[0];
    const endX = lastTouch.clientX;
    const endY = lastTouch.clientY;
    const gridPos = getRowColFromCoords(endX, endY);

    clearHighlight();

    if (gridPos && selectedBlock && selectedBlock.index !== undefined) {
        // Рассчитываем точку привязки (верхний левый угол) для размещения
        const { offsetRow, offsetCol } = getBlockAnchorOffset(selectedBlock);
        const anchorRow = gridPos.row - offsetRow;
        const anchorCol = gridPos.col - offsetCol;
        const blockIndex = selectedBlock.index;
        const blockToPlace = currentBlocks[blockIndex]; // Получаем актуальный блок (мог повернуться)

        if (blockToPlace && isValidPlacement(anchorRow, anchorCol, blockToPlace)) {
            placeBlock(anchorRow, anchorCol, blockToPlace);
            currentBlocks[blockIndex] = null;
            handlePlacementLogic(blockIndex);
             // Сбрасываем selectedBlock после успешного размещения
             selectedBlock = null;
             document.querySelectorAll('.block-preview.selected-block').forEach(p => p.classList.remove('selected-block'));
        } else {
             console.log("Touch Drop - invalid placement at calculated anchor position");
        }
    } else {
         console.log("Touch Drop - outside grid or no block selected");
    }

    // Убираем клон блока и сбрасываем состояние
    if (draggingElement) {
        draggingElement.remove();
        draggingElement = null;
    }
    isDragging = false; 
    // selectedBlock не сбрасываем здесь, если размещение не удалось, он остается выбранным
    
    // Удаляем ОСНОВНЫЕ обработчики с документа
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
    document.removeEventListener('touchcancel', handleDragEnd);
}

// Обновленная функция позиционирования
function positionDraggingElement(x, y) {
    if (!draggingElement) return;

    // Получаем смещение центра фигуры из dataset
    const figureOffsetX = parseFloat(draggingElement.dataset.figureOffsetX) || (draggingElementWidth / 2);
    const figureOffsetY = parseFloat(draggingElement.dataset.figureOffsetY) || (draggingElementHeight / 2);

    const gridPos = getRowColFromCoords(x, y);

    if (gridPos && gridRectCache && isDraggingOverGrid) { // Позиционируем по центру ячейки, только если над сеткой
        const padding = 5 * 2; // Обновляем padding из CSS (5px)
        const gap = 2;       // Обновляем gap из CSS (2px)
        const cellCenterX = gridRectCache.left + padding / 2 + gridPos.col * (gridPos.cellSize + gap) + gridPos.cellSize / 2;
        const cellCenterY = gridRectCache.top + padding / 2 + gridPos.row * (gridPos.cellSize + gap) + gridPos.cellSize / 2;

        // Позиционируем так, чтобы центр фигуры совпадал с центром ячейки
        draggingElement.style.left = `${cellCenterX - figureOffsetX}px`;
        draggingElement.style.top = `${cellCenterY - figureOffsetY}px`;

    } else {
        // Позиционируем так, чтобы центр фигуры совпадал с точкой касания/курсора
        draggingElement.style.left = `${x - figureOffsetX}px`;
        draggingElement.style.top = `${y - figureOffsetY}px`;
    }
}

// --- Вспомогательная функция для обновления кеша сетки ---
function updateGridRectCache() {
    if (gridContainer) {
        gridRectCache = gridContainer.getBoundingClientRect();
        console.log("Grid rect cache updated:", gridRectCache);
    } else {
        gridRectCache = null;
    }
}

// --- Вспомогательная функция для получения строки/колонки по координатам ---
function getRowColFromCoords(clientX, clientY) {
    if (!gridRectCache) return null;

    const relativeX = clientX - gridRectCache.left;
    const relativeY = clientY - gridRectCache.top;
    
    const gap = 2;       // Обновляем gap из CSS (2px)
    const padding = 5 * 2; // Обновляем padding из CSS (5px)
    const availableWidth = gridRectCache.width - padding - (GRID_SIZE - 1) * gap;
    const cellSize = Math.max(10, Math.floor(availableWidth / GRID_SIZE));
    
    if (cellSize <= 0) return null;

    const gridInnerLeft = gridRectCache.left + padding / 2;
    const gridInnerTop = gridRectCache.top + padding / 2;
    const gridInnerRight = gridRectCache.right - padding / 2;
    const gridInnerBottom = gridRectCache.bottom - padding / 2;

    if (clientX < gridInnerLeft || clientX > gridInnerRight || clientY < gridInnerTop || clientY > gridInnerBottom) {
        return null;
    }

    const relativeInnerX = clientX - gridInnerLeft;
    const relativeInnerY = clientY - gridInnerTop;
    
    const targetCol = Math.floor(relativeInnerX / (cellSize + gap));
    const targetRow = Math.floor(relativeInnerY / (cellSize + gap));

    const col = Math.max(0, Math.min(GRID_SIZE - 1, targetCol));
    const row = Math.max(0, Math.min(GRID_SIZE - 1, targetRow));

    return { row, col, cellSize };
}

// Новая функция для обработки логики после размещения блока
function handlePlacementLogic(placedBlockIndex) {
    
    renderGrid(); 
    renderNextBlocks(); 
    triggerHapticFeedback('light');

    const clearResult = clearLines(); // Получаем объект с результатами очистки
    const totalLinesCleared = clearResult.totalLinesCleared;
    const clearedCellsCoords = clearResult.clearedCellsCoords;

    let pointsEarned = 0;
    let baseScore = 0;
    let comboBonus = 0;

    if (totalLinesCleared > 0) {
        comboCounter++; // Увеличиваем счетчик комбо

        // Определение базового счета за одновременную очистку
        switch (totalLinesCleared) {
            case 1: baseScore = 100; break;
            case 2: baseScore = 300; break;
            case 3: baseScore = 500; break;
            case 4: baseScore = 800; break;
            default: baseScore = 800 + (totalLinesCleared - 4) * 200; // Бонус за 5+ линий
        }

        // Определение бонуса за комбо-цепочку (начиная со второго шага)
        if (comboCounter > 1) {
            comboBonus = (comboCounter - 1) * 50; // +50 очков за каждый шаг комбо
            console.log(`Combo x${comboCounter}! Bonus: ${comboBonus}`);
            // TODO: Позже можно добавить визуальное отображение комбо
        }

        pointsEarned = baseScore + comboBonus;
        console.log(`Lines cleared: ${totalLinesCleared}. Base score: ${baseScore}. Combo bonus: ${comboBonus}. Total points: ${pointsEarned}`);
        triggerHapticFeedback('medium');

    } else {
        // Если линии не очищены, сбрасываем счетчик комбо
        if (comboCounter > 0) {
             console.log("Combo chain broken.");
        }
        comboCounter = 0;
    }

    updateComboDisplay(); // <<< ВЫЗОВ: Обновляем отображение комбо

    // Асинхронная функция для проверок после анимации или сразу
    const runPostPlacementChecks = () => {
        if (currentBlocks.every(b => b === null)) {
            console.log("All blocks placed, generating new ones.");
            generateNextBlocks();
        }
        if (isGameOver()) {
             console.log("Game Over check returned true.");
             // --- Проверка и сохранение рекорда ---
             let isNewHighScore = false;
             if (score > highScore) {
                 highScore = score;
                 localStorage.setItem('blockBlastHighScore', highScore);
                 updateHighScoreDisplay(); // Обновляем отображение сразу
                 console.log("New high score saved:", highScore);
                 triggerHapticFeedback('success'); // Вибрация при новом рекорде
                 isNewHighScore = true;
             }
             // --- Конец проверки и сохранения рекорда ---
             // Показываем модальное окно Game Over вместо alert
             showGameOverModal(score, highScore, isNewHighScore);
        } else {
            console.log("Game Over check returned false.");
        }
    };

    if (clearedCellsCoords.length > 0) {
        triggerHapticFeedback('medium');
        console.log(`Starting clearing animation for ${clearedCellsCoords.length} cells.`);
        clearedCellsCoords.forEach(coord => {
            const cellElement = gridContainer.querySelector(`[data-row='${coord.r}'][data-col='${coord.c}']`);
            if (cellElement) {
                 cellElement.classList.add('clearing');
            }
        });

        setTimeout(() => {
            console.log("Clearing animation finished.");
            renderGrid(); 
            updateScore(score + pointsEarned);
            document.querySelectorAll('.grid-cell.clearing').forEach(cell => cell.classList.remove('clearing'));
            runPostPlacementChecks();
        }, 300);
    } else {
        console.log("No lines cleared, running checks immediately.");
        updateScore(score + pointsEarned); // Начисляем очки (0, если ничего не очищено)
        runPostPlacementChecks();
    }
}

// --- Вспомогательная функция для обновления рекорда ---
function updateHighScoreDisplay() {
    if (highScoreDisplay) {
        highScoreDisplay.innerHTML = `Рекорд: <span>${highScore}</span>`; // Используем innerHTML для вставки span
    } else {
        console.error("High score display element not found!");
    }
}

// --- Вспомогательная функция для вибрации ---
function triggerHapticFeedback(type) {
    if (!isVibrationEnabled) return;

    try {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            const haptic = window.Telegram.WebApp.HapticFeedback;
            switch (type) {
                case 'light':
                    haptic.impactOccurred('light');
                    break;
                case 'medium':
                    haptic.impactOccurred('medium');
                    break;
                case 'heavy':
                    haptic.impactOccurred('heavy');
                    break;
                case 'success':
                    haptic.notificationOccurred('success');
                    break;
                case 'error':
                    haptic.notificationOccurred('error');
                    break;
                case 'warning':
                    haptic.notificationOccurred('warning');
                    break;
                default:
                    console.warn('Unknown haptic type:', type);
            }
            console.log('Haptic feedback triggered:', type);
        } else {
            // console.log('Haptic feedback not available.'); 
        }
    } catch (error) {
        console.error('Error triggering haptic feedback:', error);
    }
}

// --- Новая функция для обработки клика по кнопке Поделиться ---
function handleShareClick() {
    try {
        if (window.Telegram?.WebApp) {
            const botUsername = 'BlockBlastRu_bot'; // Имя вашего бота
            const gameUrl = `https://t.me/${botUsername}`; // Ссылка на вашего бота/игру
            const shareText = `Я набрал ${score} очков в Block Blast! Мой рекорд: ${highScore}.

Попробуй побить!`;

            // Кодируем текст и URL для подстановки в ссылку
            const encodedText = encodeURIComponent(shareText);
            const encodedUrl = encodeURIComponent(gameUrl);

            // Формируем ссылку для шаринга
            const shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;

            // Открываем ссылку через Telegram API
            window.Telegram.WebApp.openTelegramLink(shareUrl);
            
            console.log('Opened Telegram share link:', shareUrl);
            triggerHapticFeedback('light'); // Небольшая вибрация при вызове
        } else {
            console.warn('Telegram WebApp API not available for sharing.');
            alert('Функция "Поделиться" доступна только в Telegram.');
        }
    } catch (error) {
        console.error('Error triggering share:', error);
        alert('Не удалось поделиться результатом.');
    }
}

// --- Новая функция для показа модального окна Game Over ---
function showGameOverModal(finalScore, finalHighScore, isNewRecord) {
    if (gameOverModal && gameOverScoreElement && gameOverHighScoreElement) {
        gameOverScoreElement.innerHTML = `Ваш счет: <span>${finalScore}</span>`;
        gameOverHighScoreElement.innerHTML = `Лучший счет: <span>${finalHighScore}</span>`;
        gameOverHighScoreElement.classList.remove('new-record');

        if (isNewRecord) {
            highScore = finalScore; // Update the global highScore variable
            localStorage.setItem('blockBlastHighScore', highScore); // Save to localStorage
            updateHighScoreDisplay(); // Update display in header
            gameOverHighScoreElement.innerHTML = `🎉 Новый рекорд: <span>${highScore}</span> 🎉`;
            gameOverHighScoreElement.classList.add('new-record');

            // <<< ВЫЗОВ: Сохраняем новый рекорд в CloudStorage >>>
            saveScoreToCloudStorage(highScore);

        } 
        // Опционально: Можно сохранять КАЖДЫЙ результат в CloudStorage, 
        // если не использовать ID в ключе, а, например, timestamp,
        // но это усложнит получение именно ЛУЧШЕГО счета каждого юзера.
        // Пока сохраняем только лучший.

        gameOverModal.classList.add('active');
        triggerHapticFeedback('heavy'); // Вибрация при конце игры
    } else {
        console.error("Game Over modal elements not found!");
        // Фоллбэк на alert, если модалка не найдена
        let fallbackMessage = `Игра окончена! Ваш счет: ${finalScore}.`;
        if (isNewRecord) {
             fallbackMessage += ` Новый рекорд: ${finalHighScore}!`;
        } else {
             fallbackMessage += ` Рекорд: ${finalHighScore}.`;
        }
        alert(fallbackMessage);
    }
}

// <<< НАЧАЛО: Функция сохранения рекорда в CloudStorage >>>
function saveScoreToCloudStorage(scoreToSave) {
    try {
        if (window.Telegram?.WebApp?.CloudStorage && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            const userId = window.Telegram.WebApp.initDataUnsafe.user.id;
            // Используем только лучший счет пользователя для ключа
            const key = `score_${userId}`;
            window.Telegram.WebApp.CloudStorage.setItem(key, String(scoreToSave), (error, success) => {
                if (error) {
                    console.error('CloudStorage.setItem error:', error);
                } else if (success) {
                    console.log(`Score ${scoreToSave} saved to CloudStorage for user ${userId} with key ${key}`);
                } else {
                    // Иногда callback вызывается без success, но запись происходит
                    console.log(`CloudStorage.setItem potentially saved score ${scoreToSave} for user ${userId}`);
                }
            });
        } else {
            console.warn('Telegram CloudStorage or User ID not available for saving score.');
        }
    } catch (e) {
        console.error('Error in saveScoreToCloudStorage:', e);
    }
}
// <<< КОНЕЦ: Функция сохранения рекорда в CloudStorage >>>

// <<< НАЧАЛО: Функция загрузки и отображения таблицы лидеров >>>
async function loadChatLeaderboard() {
    if (!leaderboardContainer || !leaderboardList) {
        console.error('Leaderboard elements not found.');
        return;
    }
    if (!window.Telegram?.WebApp?.CloudStorage) {
        console.warn('Telegram CloudStorage not available for leaderboard.');
        leaderboardList.innerHTML = '<li>Функция лидеров недоступна (API CloudStorage не найден).</li>';
        leaderboardContainer.style.display = 'block';
        return;
    }

    leaderboardContainer.style.display = 'block';
    leaderboardList.innerHTML = '<li><span class="player-name">Загрузка...</span></li>';

    try {
        // 1. Получаем все ключи
        const keys = await new Promise((resolve, reject) => {
            window.Telegram.WebApp.CloudStorage.getKeys((error, result) => {
                if (error) return reject(new Error(`CloudStorage.getKeys error: ${error}`));
                resolve(result || []); // Гарантируем массив
            });
        });

        // 2. Фильтруем ключи, относящиеся к счетам
        const scoreKeys = keys.filter(key => key.startsWith('score_'));

        if (scoreKeys.length === 0) {
             leaderboardList.innerHTML = '<li>Пока нет результатов в этом чате.</li>';
             return;
        }

        // 3. Получаем значения по отфильтрованным ключам
        const scoresData = await new Promise((resolve, reject) => {
             window.Telegram.WebApp.CloudStorage.getItems(scoreKeys, (error, result) => {
                 if (error) return reject(new Error(`CloudStorage.getItems error: ${error}`));
                 resolve(result || {}); // Гарантируем объект
             });
        });

        // 4. Формируем массив записей лидеров
        const leaderboardEntries = [];
        for (const key of scoreKeys) {
            // Извлекаем ID пользователя из ключа
            const userId = key.substring('score_'.length);
            const score = parseInt(scoresData[key], 10);
            // Добавляем только если есть ID и счет - число
            if (userId && !isNaN(score)) {
                // ПРИМЕЧАНИЕ: Отображаем User ID, т.к. имя получить сложно.
                leaderboardEntries.push({ userId: `User ${userId}`, score: score });
            }
        }

        // 5. Сортируем по убыванию счета
        leaderboardEntries.sort((a, b) => b.score - a.score);

        // 6. Отображаем таблицу лидеров
        if (leaderboardEntries.length > 0) {
            leaderboardList.innerHTML = leaderboardEntries.map(entry =>
                `<li><span class="player-name" title="${entry.userId}">${entry.userId}</span> <span class="player-score">${entry.score}</span></li>`
            ).join('');
        } else {
            // Если после парсинга не осталось валидных записей
            leaderboardList.innerHTML = '<li>Не найдено валидных результатов.</li>';
        }

         // Добавляем примечание о User ID
         const note = document.createElement('li');
         note.style.cssText = 'border-bottom: none; display: block; text-align: center; margin-top: 10px; opacity: 0.7; font-size: 0.8em;';
         note.innerHTML = '<small>Примечание: Отображаются идентификаторы пользователей Telegram, сохранивших свой лучший счет в этом приложении.</small>';
         leaderboardList.appendChild(note);

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardList.innerHTML = `<li><span class="player-name">Ошибка загрузки: ${error.message}</span></li>`;
    }
}
// <<< КОНЕЦ: Функция загрузки и отображения таблицы лидеров >>>

// <<< НАЧАЛО: Функция обновления отображения комбо >>>
function updateComboDisplay() {
    const displayElement = document.getElementById('combo-counter-display');
    if (displayElement && comboCountElement) {
        if (comboCounter >= 2) {
            comboCountElement.textContent = comboCounter;
            displayElement.classList.add('visible');
            displayElement.style.display = 'inline-block'; // Убедимся, что display правильный
        } else {
            displayElement.classList.remove('visible');
            // Даем время анимации на исчезновение перед скрытием
            setTimeout(() => {
                // Проверяем еще раз, вдруг комбо снова началось
                if (comboCounter < 2) { 
                    displayElement.style.display = 'none';
                }
            }, 300); // Время должно совпадать с transition в CSS
        }
    } else {
        console.error("Combo display elements not found!");
    }
}
// <<< КОНЕЦ: Функция обновления отображения комбо >>>

// ... остальные функции ...
