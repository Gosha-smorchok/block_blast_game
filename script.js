// --- Константы ---
const GRID_SIZE = 8;
const CELL_SIZE = 40; // Совпадает с CSS
const blockColors = {
    'L': '#34C759',    // Green (L-shape)
    '2x2': '#007AFF', // Blue (2x2 square)
    '3x3': '#FF9500', // Orange (3x3 square)
    '2x3': '#5AC8FA'  // Light Blue (2x3 rect)
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

// --- Элементы DOM ---
let gameContainer;
let gridContainer;
let scoreDisplay;
let nextBlocksPanel;
let rotateButton;
let newGameButton;

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

        if (isValidPlacement(row, col, blockToPlace)) {
            placeBlock(row, col, blockToPlace);
            currentBlocks[blockIndex] = null;
            renderGrid();
            renderNextBlocks();

            // Проверка и очистка линий
            const linesCleared = clearLines();
            if (linesCleared > 0) {
                // Сначала перерисовываем сетку после очистки
                renderGrid(); 
                // Затем обновляем счет
                updateScore(score + linesCleared * 100); 
            }

            // Проверка на необходимость генерации новых блоков
            if (currentBlocks.every(b => b === null)) {
                generateNextBlocks();
            }

            // Проверка на конец игры
            if (isGameOver()) {
                setTimeout(() => {
                    alert(`Игра окончена! Ваш счёт: ${score}`);
                }, 300);
            }
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

        if (isValidPlacement(row, col, selectedBlock)) {
            placeBlock(row, col, selectedBlock);
            currentBlocks[selectedBlock.index] = null;
            
            document.querySelectorAll('.block-preview').forEach(p => 
                p.classList.remove('selected-block'));
                
            renderGrid();
            renderNextBlocks();

            const linesCleared = clearLines();
            if (linesCleared > 0) {
                 // Сначала перерисовываем сетку после очистки
                renderGrid();
                // Затем обновляем счет
                updateScore(score + linesCleared * 100);
            }

            if (currentBlocks.every(b => b === null)) {
                generateNextBlocks();
            }
            
            if (isGameOver()) {
                setTimeout(() => {
                    alert(`Игра окончена! Ваш счёт: ${score}`);
                }, 300);
            }
        }
        
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
}

/** Проверка и удаление заполненных линий */
function clearLines() {
    let linesCleared = 0;
    let rowsToClear = [];
    let colsToClear = [];

    // Проверка строк
    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(cell => cell !== null)) {
            rowsToClear.push(r);
            linesCleared++;
        }
    }

    // Проверка столбцов
    for (let c = 0; c < GRID_SIZE; c++) {
        let colFull = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            // Не считаем столбец полным, если он пересекает уже найденную полную строку
            // чтобы избежать двойного счета очков и двойной очистки
            if (grid[r][c] === null || rowsToClear.includes(r)) {
                colFull = false;
                break;
            }
        }
        
        if (colFull) {
            colsToClear.push(c);
            linesCleared++;
        }
    }

    // Очистка найденных строк
    if (rowsToClear.length > 0) {
        for (const rowIndex of rowsToClear) {
            for (let c = 0; c < GRID_SIZE; c++) {
                grid[rowIndex][c] = null; // Просто очищаем ячейки
            }
        }
    }

    // Очистка найденных столбцов
    if (colsToClear.length > 0) {
        for (const colIndex of colsToClear) {
            for (let r = 0; r < GRID_SIZE; r++) {
                // Пропускаем ячейки, которые уже были очищены как часть строки
                if (!rowsToClear.includes(r)) {
                     grid[r][colIndex] = null; // Просто очищаем ячейки
                }
            }
        }
    }

    console.log("Lines cleared in this step:", linesCleared); // Отладка
    // Возвращаем количество очищенных линий для подсчета очков
    return linesCleared;
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