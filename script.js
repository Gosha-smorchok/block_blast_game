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
let touchStartX = 0;
let touchStartY = 0;
let touchTargetBlockIndex = -1;
let isVibrationEnabled = true; // По умолчанию вибрация включена

// --- Элементы DOM ---
let gameContainer;
let gridContainer;
let scoreDisplay;
let nextBlocksPanel;
let rotateButton;
let newGameButton;
let vibrationToggle; // Добавляем элемент чекбокса

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    gameContainer = document.getElementById('game-container');
    gridContainer = document.getElementById('grid-container');
    scoreDisplay = document.getElementById('score');
    nextBlocksPanel = document.getElementById('next-blocks-panel');
    rotateButton = document.getElementById('rotate-button');
    newGameButton = document.getElementById('new-game-button');
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal'); // Получаем модальное окно
    const modalNewGameButton = document.getElementById('modal-new-game');
    const modalContinueButton = document.getElementById('modal-continue');
    vibrationToggle = document.getElementById('vibration-toggle'); // Получаем чекбокс

    if(settingsButton && settingsModal) {
        settingsButton.addEventListener('click', () => { 
            settingsModal.classList.add('active'); // Показываем окно
        });
    }

    // Функция закрытия модального окна
    function closeModal() {
        if (settingsModal) {
            settingsModal.classList.remove('active');
        }
    }

    if (modalNewGameButton) {
        modalNewGameButton.addEventListener('click', () => {
            closeModal(); // Закрываем окно
            newGame(); // Начинаем новую игру
        });
    }

    if (modalContinueButton) {
        modalContinueButton.addEventListener('click', closeModal); // Просто закрываем окно
    }

    // Закрытие модального окна по клику вне его области
    if (settingsModal) {
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) { // Клик был по фону (самому .modal)
                closeModal();
            }
        });
    }
    
    // Назначение обработчиков
    gridContainer.addEventListener('dragover', handleDragOver);
    gridContainer.addEventListener('drop', handleDrop);
    gridContainer.addEventListener('click', handleGridClick);
    rotateButton?.addEventListener('click', rotateSelectedBlock);
    newGameButton?.addEventListener('click', newGame);
    addHighlightStyles();
    
    // Переносим вызов newGame внутрь DOMContentLoaded после инициализации элементов
    initializeGrid();
    newGame();

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
}

// --- Обработчики событий ---

function handleDragStart(event) {
    const blockIndex = parseInt(event.target.closest('.block-preview').dataset.blockIndex);
    selectedBlock = {...currentBlocks[blockIndex], index: blockIndex};
    
    if (!selectedBlock) return;

    // Сохраняем индекс блока
    event.dataTransfer.setData('text/plain', blockIndex.toString());
    event.dataTransfer.effectAllowed = 'move';
    
    console.log("Начали тащить блок:", selectedBlock.type);
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    // Подсветка ячеек
    const cell = event.target.closest('.grid-cell');
    if (cell && selectedBlock) {
        highlightPlacementArea(
            parseInt(cell.dataset.row), 
            parseInt(cell.dataset.col), 
            selectedBlock
        );
    }
}

// Подсветка области размещения
function highlightPlacementArea(row, col, block) {
    // Сначала убираем предыдущую подсветку
    clearHighlight();
    
    if (!block || !block.cells) return;
    
    const isValid = isValidPlacement(row, col, block);
    
    // Подсвечиваем ячейки
    block.cells.forEach(cell => {
        const r = row + cell[0];
        const c = col + cell[1];
        
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            const cellElement = gridContainer.querySelector(`[data-row='${r}'][data-col='${c}']`);
            if (cellElement) {
                cellElement.classList.add(isValid ? 'highlight-valid' : 'highlight-invalid');
            }
        }
    });
}

// Убираем подсветку со всех ячеек
function clearHighlight() {
    const cells = gridContainer.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.classList.remove('highlight-valid', 'highlight-invalid');
    });
}

function handleDrop(event) {
    event.preventDefault();
    clearHighlight();
    
    const blockIndex = parseInt(event.dataTransfer.getData('text/plain'));
    const targetCell = event.target.closest('.grid-cell');

    if (targetCell && !isNaN(blockIndex)) {
        const row = parseInt(targetCell.dataset.row);
        const col = parseInt(targetCell.dataset.col);
        const blockToPlace = currentBlocks[blockIndex];

        if (blockToPlace && isValidPlacement(row, col, blockToPlace)) {
            console.log("Touch End - размещаем блок", blockToPlace.type);
            placeBlock(row, col, blockToPlace);
            currentBlocks[blockIndex] = null; 
            handlePlacementLogic(blockIndex);
        } else {
            console.log("Touch End - неверное размещение");
        }
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

    console.log(`clearLines: Found ${rowsToClear.length} rows, ${colsToClear.length} cols. Clearing ${clearedCellsCoords.length} unique cells.`);

    // Возвращаем массив координат очищенных ячеек
    return clearedCellsCoords; 
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

// Добавление стилей для подсветки
function addHighlightStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .highlight-valid {
            background-color: rgba(76, 175, 80, 0.5) !important;
        }
        .highlight-invalid {
            background-color: rgba(255, 87, 34, 0.5) !important;
        }
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
    resizeTimeout = setTimeout(redrawUI, 250); // Вызываем только перерисовку UI
});

// --- Touch Event Handlers --- 

function handleTouchStart(event) {
    // Игнорируем, если касание не одним пальцем
    if (event.touches.length !== 1) return;
    // Предотвращаем прокрутку страницы во время перетаскивания блока
    event.preventDefault();

    const touch = event.touches[0];
    const blockPreview = event.currentTarget; // Это .block-preview
    touchTargetBlockIndex = parseInt(blockPreview.dataset.blockIndex);
    selectedBlock = {...currentBlocks[touchTargetBlockIndex], index: touchTargetBlockIndex};

    if (!selectedBlock) return;

    // Создаем визуальный клон блока для перетаскивания
    if (!draggingElement) {
        draggingElement = document.createElement('div');
        draggingElement.id = 'dragging-block';
        // Копируем мини-сетку из превью
        const previewGrid = blockPreview.querySelector('div'); 
        if (previewGrid) {
            draggingElement.appendChild(previewGrid.cloneNode(true));
            // Можно добавить масштабирование, если нужно
            // draggingElement.style.transform = 'scale(1.1)'; 
        } else {
            // Запасной вариант, если не нашли сетку
            draggingElement.style.width = '60px';
            draggingElement.style.height = '60px';
            draggingElement.style.backgroundColor = selectedBlock.color;
        }
        document.body.appendChild(draggingElement);
    }

    // Начальные координаты касания
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    // Позиционируем клон под пальцем
    positionDraggingElement(touch.clientX, touch.clientY);

    // Добавляем обработчики движения и отпускания на весь документ
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd); // На случай отмены касания

    console.log("Touch Start - тащим блок:", selectedBlock.type);
}

function handleTouchMove(event) {
    if (!draggingElement || event.touches.length !== 1) return;
    // Предотвращаем прокрутку
    event.preventDefault(); 

    const touch = event.touches[0];
    
    // Перемещаем клон блока
    positionDraggingElement(touch.clientX, touch.clientY);

    // Определяем элемент под пальцем
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    const cell = elementUnderTouch ? elementUnderTouch.closest('.grid-cell') : null;

    if (cell && selectedBlock) {
        highlightPlacementArea(
            parseInt(cell.dataset.row),
            parseInt(cell.dataset.col),
            selectedBlock
        );
    } else {
        clearHighlight(); // Очищаем подсветку, если палец не над сеткой
    }
}

function handleTouchEnd(event) {
    if (!draggingElement) return;

    // Определяем элемент под точкой отпускания
    // Используем last known position или changedTouches[0] если есть
    const lastTouch = event.changedTouches[0];
    const endX = lastTouch.clientX;
    const endY = lastTouch.clientY;
    const elementUnderTouch = document.elementFromPoint(endX, endY);
    const targetCell = elementUnderTouch ? elementUnderTouch.closest('.grid-cell') : null;

    clearHighlight();

    if (targetCell && selectedBlock && touchTargetBlockIndex !== -1) {
        const row = parseInt(targetCell.dataset.row);
        const col = parseInt(targetCell.dataset.col);
        const blockIndex = touchTargetBlockIndex;
        const blockToPlace = currentBlocks[blockIndex];

        if (blockToPlace && isValidPlacement(row, col, blockToPlace)) {
            placeBlock(row, col, blockToPlace);
            currentBlocks[blockIndex] = null;
            handlePlacementLogic(blockIndex);
        } 
        // Не сбрасываем selectedBlock здесь, он сбросится ниже
    }

    // Убираем клон блока и сбрасываем состояние
    if (draggingElement) {
        draggingElement.remove();
        draggingElement = null;
    }
    selectedBlock = null;
    touchTargetBlockIndex = -1;

    // Удаляем обработчики с документа
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchEnd);
}

// Вспомогательная функция для позиционирования перетаскиваемого элемента
function positionDraggingElement(x, y) {
    if (!draggingElement) return;
    // Центрируем элемент под точкой касания (или со смещением)
    const rect = draggingElement.getBoundingClientRect();
    draggingElement.style.left = `${x - rect.width / 2}px`;
    draggingElement.style.top = `${y - rect.height / 2}px`;
}

// Новая функция для обработки логики после размещения блока
function handlePlacementLogic(placedBlockIndex) {
    
    renderGrid(); 
    renderNextBlocks(); 
    triggerHapticFeedback('light'); // <<-- Вибрация при размещении

    const clearedCellsCoords = clearLines();

    const runPostPlacementChecks = () => {
        // Проверка на необходимость генерации новых блоков
        if (currentBlocks.every(b => b === null)) {
            console.log("All blocks placed, generating new ones.");
            generateNextBlocks();
        }
        // Проверка на конец игры (после возможной генерации новых блоков)
        if (isGameOver()) {
             console.log("Game Over check returned true.");
             // Используем setTimeout для alert, чтобы он не блокировал рендеринг
             setTimeout(() => {
                  alert(`Игра окончена! Ваш счёт: ${score}`);
             }, 50); 
        } else {
            console.log("Game Over check returned false.");
        }
    };

    if (clearedCellsCoords.length > 0) {
        triggerHapticFeedback('medium'); // <<-- Вибрация при очистке линий (перед анимацией)
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
            updateScore(score + clearedCellsCoords.length * 100);
            document.querySelectorAll('.grid-cell.clearing').forEach(cell => cell.classList.remove('clearing'));
            runPostPlacementChecks();
        }, 300);
    } else {
        console.log("No lines cleared, running checks immediately.");
        runPostPlacementChecks();
    }
}

// --- Вспомогательная функция для вибрации ---
function triggerHapticFeedback(type) {
    if (!isVibrationEnabled) return; // Проверяем настройку

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
            console.log('Haptic feedback triggered:', type); // Отладка
        } else {
            // console.log('Haptic feedback not available.'); // Можно раскомментировать для отладки в браузере
        }
    } catch (error) {
        console.error('Error triggering haptic feedback:', error);
    }
} 
