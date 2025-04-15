// --- РљРѕРЅСЃС‚Р°РЅС‚С‹ ---
const GRID_SIZE = 8;
const CELL_SIZE = 40; // РЎРѕРІРїР°РґР°РµС‚ СЃ CSS
const blockColors = {
    'L': '#34C759',    // Green (L-shape)
    '2x2': '#007AFF', // Blue (2x2 square)
    '3x3': '#FF9500', // Orange (3x3 square)
    '2x3': '#5AC8FA'  // Light Blue (2x3 rect)
};

const blockShapes = {
    // РљРѕРѕСЂРґРёРЅР°С‚С‹ РєР»РµС‚РѕРє РѕС‚РЅРѕСЃРёС‚РµР»СЊРЅРѕ С‚РѕС‡РєРё РІСЃС‚Р°РІРєРё (РІРµСЂС…РЅРёР№ Р»РµРІС‹Р№ СѓРіРѕР»)
    '3x3': { 
        color: blockColors['3x3'], 
        cells: [[0,0], [0,1], [0,2], [1,0], [1,1], [1,2], [2,0], [2,1], [2,2]] 
    },
    '2x3': { // РџСЂСЏРјРѕСѓРіРѕР»СЊРЅРёРє 2x3
        color: blockColors['2x3'],
        rotations: [
            [[0,0], [0,1], [0,2], [1,0], [1,1], [1,2]], // 0 РіСЂР°РґСѓСЃРѕРІ
            [[0,0], [0,1], [1,0], [1,1], [2,0], [2,1]], // 90 РіСЂР°РґСѓСЃРѕРІ
            [[0,0], [0,1], [0,2], [1,0], [1,1], [1,2]], // 180 РіСЂР°РґСѓСЃРѕРІ (РєР°Рє 0)
            [[0,0], [0,1], [1,0], [1,1], [2,0], [2,1]], // 270 РіСЂР°РґСѓСЃРѕРІ (РєР°Рє 90)
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
            [[0,0], [1,0], [2,0], [2,1]], // 0 РіСЂР°РґСѓСЃРѕРІ
            [[0,0], [0,1], [0,2], [1,0]], // 90 РіСЂР°РґСѓСЃРѕРІ
            [[0,0], [0,1], [1,1], [2,1]], // 180 РіСЂР°РґСѓСЃРѕРІ
            [[1,0], [1,1], [1,2], [0,2]], // 270 РіСЂР°РґСѓСЃРѕРІ
        ],
        currentRotation: 0
    }
};
const blockTypes = Object.keys(blockShapes);

// --- РџРµСЂРµРјРµРЅРЅС‹Рµ СЃРѕСЃС‚РѕСЏРЅРёСЏ РёРіСЂС‹ ---
let grid = []; // Р”РІСѓРјРµСЂРЅС‹Р№ РјР°СЃСЃРёРІ СЃРѕСЃС‚РѕСЏРЅРёСЏ РїРѕР»СЏ (0 - РїСѓСЃС‚Рѕ, 1 - Р·Р°РЅСЏС‚Рѕ/С†РІРµС‚)
let score = 0;
let currentBlocks = []; // РўСЂРё С‚РµРєСѓС‰РёС… Р±Р»РѕРєР° РґР»СЏ РІС‹Р±РѕСЂР°
let selectedBlock = null; // РљР°РєРѕР№ Р±Р»РѕРє РІС‹Р±СЂР°РЅ РґР»СЏ РїРµСЂРµС‚Р°СЃРєРёРІР°РЅРёСЏ/СЂР°Р·РјРµС‰РµРЅРёСЏ
let dragOffsetX = 0;
let dragOffsetY = 0;
let draggingElement = null; // Р­Р»РµРјРµРЅС‚, РєРѕС‚РѕСЂС‹Р№ С‚Р°С‰РёРј РїР°Р»СЊС†РµРј
let touchStartX = 0;
let touchStartY = 0;
let touchTargetBlockIndex = -1;

// --- Р­Р»РµРјРµРЅС‚С‹ DOM ---
let gameContainer;
let gridContainer;
let scoreDisplay;
let nextBlocksPanel;
let rotateButton;
let newGameButton;

// РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ РїРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё DOM
document.addEventListener('DOMContentLoaded', function() {
    gameContainer = document.getElementById('game-container');
    gridContainer = document.getElementById('grid-container');
    scoreDisplay = document.getElementById('score');
    nextBlocksPanel = document.getElementById('next-blocks-panel');
    rotateButton = document.getElementById('rotate-button');
    newGameButton = document.getElementById('new-game-button');
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal'); // РџРѕР»СѓС‡Р°РµРј РјРѕРґР°Р»СЊРЅРѕРµ РѕРєРЅРѕ
    const modalNewGameButton = document.getElementById('modal-new-game');
    const modalContinueButton = document.getElementById('modal-continue');

    if(settingsButton && settingsModal) {
        settingsButton.addEventListener('click', () => { 
            settingsModal.classList.add('active'); // РџРѕРєР°Р·С‹РІР°РµРј РѕРєРЅРѕ
        });
    }

    // Р¤СѓРЅРєС†РёСЏ Р·Р°РєСЂС‹С‚РёСЏ РјРѕРґР°Р»СЊРЅРѕРіРѕ РѕРєРЅР°
    function closeModal() {
        if (settingsModal) {
            settingsModal.classList.remove('active');
        }
    }

    if (modalNewGameButton) {
        modalNewGameButton.addEventListener('click', () => {
            closeModal(); // Р—Р°РєСЂС‹РІР°РµРј РѕРєРЅРѕ
            newGame(); // РќР°С‡РёРЅР°РµРј РЅРѕРІСѓСЋ РёРіСЂСѓ
        });
    }

    if (modalContinueButton) {
        modalContinueButton.addEventListener('click', closeModal); // РџСЂРѕСЃС‚Рѕ Р·Р°РєСЂС‹РІР°РµРј РѕРєРЅРѕ
    }

    // Р—Р°РєСЂС‹С‚РёРµ РјРѕРґР°Р»СЊРЅРѕРіРѕ РѕРєРЅР° РїРѕ РєР»РёРєСѓ РІРЅРµ РµРіРѕ РѕР±Р»Р°СЃС‚Рё
    if (settingsModal) {
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) { // РљР»РёРє Р±С‹Р» РїРѕ С„РѕРЅСѓ (СЃР°РјРѕРјСѓ .modal)
                closeModal();
            }
        });
    }
    
    // РќР°Р·РЅР°С‡РµРЅРёРµ РѕР±СЂР°Р±РѕС‚С‡РёРєРѕРІ
    gridContainer.addEventListener('dragover', handleDragOver);
    gridContainer.addEventListener('drop', handleDrop);
    gridContainer.addEventListener('click', handleGridClick);
    rotateButton?.addEventListener('click', rotateSelectedBlock);
    newGameButton?.addEventListener('click', newGame);
    addHighlightStyles();
    
    // РџРµСЂРµРЅРѕСЃРёРј РІС‹Р·РѕРІ newGame РІРЅСѓС‚СЂСЊ DOMContentLoaded РїРѕСЃР»Рµ РёРЅРёС†РёР°Р»РёР·Р°С†РёРё СЌР»РµРјРµРЅС‚РѕРІ
    initializeGrid();
    newGame();
});

function calculateCellSize() {
    if (!gameContainer || !gridContainer) return 10; // Р’РѕР·РІСЂР°С‰Р°РµРј РјРёРЅРёРјСѓРј, РµСЃР»Рё СЌР»РµРјРµРЅС‚С‹ РЅРµ РЅР°Р№РґРµРЅС‹

    // РСЃРїРѕР»СЊР·СѓРµРј С€РёСЂРёРЅСѓ РІРЅРµС€РЅРµРіРѕ РєРѕРЅС‚РµР№РЅРµСЂР°
    const gameContainerWidth = gameContainer.offsetWidth; 
    
    // РџРѕР»СѓС‡Р°РµРј РІС‹С‡РёСЃР»РµРЅРЅС‹Рµ СЃС‚РёР»Рё gridContainer РґР»СЏ С‚РѕС‡РЅРѕРіРѕ padding
    const gridStyle = window.getComputedStyle(gridContainer);
    const gridPaddingLeft = parseFloat(gridStyle.paddingLeft) || 0;
    const gridPaddingRight = parseFloat(gridStyle.paddingRight) || 0;
    const gridTotalPadding = gridPaddingLeft + gridPaddingRight;

    const gap = 1; // РЎРѕРѕС‚РІРµС‚СЃС‚РІСѓРµС‚ gap РІ CSS РґР»СЏ gridContainer

    // Р”РѕСЃС‚СѓРїРЅР°СЏ С€РёСЂРёРЅР° РІРЅСѓС‚СЂРё padding СЃРµС‚РєРё
    // РСЃРїРѕР»СЊР·СѓРµРј gameContainerWidth, С‚.Рє. gridContainer РґРѕР»Р¶РµРЅ Р·Р°РЅРёРјР°С‚СЊ РµРіРѕ С€РёСЂРёРЅСѓ (Р·Р° РІС‹С‡РµС‚РѕРј СЃРІРѕРёС… padding)
    const availableWidth = gameContainerWidth - gridTotalPadding - (GRID_SIZE - 1) * gap; 
    const cellSize = Math.max(10, Math.floor(availableWidth / GRID_SIZE));

    console.log(`Game Container Width: ${gameContainerWidth}, Grid Padding: ${gridTotalPadding}, Available Width: ${availableWidth}, Cell Size: ${cellSize}`);
    
    if (cellSize <= 10 && gameContainerWidth > 100) { 
        console.warn("Calculated cell size is unexpectedly small (<= 10px). Check layout and calculations.");
    }

    return cellSize;
}

/** РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ РёР»Рё СЃР±СЂРѕСЃ РёРіСЂРѕРІРѕРіРѕ РїРѕР»СЏ */
function initializeGrid() {
    grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    gridContainer.innerHTML = '';
    console.log('Initializing grid...');

    const cellSize = calculateCellSize();

    // РџСЂРёРјРµРЅСЏРµРј СЂР°Р·РјРµСЂС‹ Рє СЃРµС‚РєРµ
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
    // Р’С‹Р·С‹РІР°РµРј renderGrid РїРѕСЃР»Рµ СЃРѕР·РґР°РЅРёСЏ РІСЃРµС… СЏС‡РµРµРє
    renderGrid(); 
}

/** РћС‚СЂРёСЃРѕРІРєР° С‚РµРєСѓС‰РµРіРѕ СЃРѕСЃС‚РѕСЏРЅРёСЏ СЃРµС‚РєРё */
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

/** Р“РµРЅРµСЂР°С†РёСЏ СЃР»СѓС‡Р°Р№РЅРѕРіРѕ Р±Р»РѕРєР° */
function generateBlock() {
    const type = blockTypes[Math.floor(Math.random() * blockTypes.length)];
    const shapeInfo = blockShapes[type];

    // РљР»РѕРЅРёСЂСѓРµРј РѕР±СЉРµРєС‚, С‡С‚РѕР±С‹ РЅРµ РёР·РјРµРЅСЏС‚СЊ РёСЃС…РѕРґРЅС‹Рµ С„РѕСЂРјС‹
    const newBlock = JSON.parse(JSON.stringify(shapeInfo));
    newBlock.type = type;

    // РћР±СЂР°Р±Р°С‚С‹РІР°РµРј РІСЂР°С‰РµРЅРёСЏ
    if (newBlock.rotations) {
        newBlock.cells = newBlock.rotations[newBlock.currentRotation];
    }

    return newBlock;
}

/** Р“РµРЅРµСЂР°С†РёСЏ Рё РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ СЃР»РµРґСѓСЋС‰РёС… С‚СЂРµС… Р±Р»РѕРєРѕРІ */
function generateNextBlocks() {
    currentBlocks = [generateBlock(), generateBlock(), generateBlock()];
    renderNextBlocks();
}

/** РћС‚РѕР±СЂР°Р¶РµРЅРёРµ Р±Р»РѕРєРѕРІ РІ РїР°РЅРµР»Рё РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂР° */
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

        // РЎРѕР·РґР°РµРј РјРёРЅРё-СЃРµС‚РєСѓ РґР»СЏ РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ Р±Р»РѕРєР°
        const blockSize = Math.max(
            ...block.cells.map(cell => Math.max(cell[0], cell[1]))
        ) + 1;
        
        const previewGrid = document.createElement('div');
        previewGrid.style.display = 'grid';
        previewGrid.style.gridTemplateColumns = `repeat(${blockSize}, 15px)`;
        previewGrid.style.gridTemplateRows = `repeat(${blockSize}, 15px)`;
        previewGrid.style.gap = '1px';

        // РЎРѕР·РґР°РµРј РєР°СЂС‚Сѓ Р·Р°РЅСЏС‚С‹С… СЏС‡РµРµРє
        const cellsMap = {};
        block.cells.forEach(cell => cellsMap[`${cell[0]}_${cell[1]}`] = true);

        // РћС‚СЂРёСЃРѕРІС‹РІР°РµРј РјРёРЅРё-СЃРµС‚РєСѓ
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

        // Р”РѕР±Р°РІР»СЏРµРј РѕР±СЂР°Р±РѕС‚С‡РёРєРё СЃРѕР±С‹С‚РёР№
        preview.draggable = true;
        preview.addEventListener('dragstart', handleDragStart);
        preview.addEventListener('click', handleClickBlock);
        // --- Р”РѕР±Р°РІР»СЏРµРј РѕР±СЂР°Р±РѕС‚С‡РёРєРё touch --- 
        preview.addEventListener('touchstart', handleTouchStart, { passive: false }); // passive: false РґР»СЏ РїСЂРµРґРѕС‚РІСЂР°С‰РµРЅРёСЏ РїСЂРѕРєСЂСѓС‚РєРё
    });
}

/** РћР±РЅРѕРІР»РµРЅРёРµ СЃС‡РµС‚Р° */
function updateScore(newScore) {
    console.log("Updating score to:", newScore, "Element:", scoreDisplay); // РћС‚Р»Р°РґРєР°
    score = newScore;
    if (scoreDisplay) { // Р”РѕР±Р°РІРёРј РїСЂРѕРІРµСЂРєСѓ РЅР° СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ СЌР»РµРјРµРЅС‚Р°
        scoreDisplay.textContent = score;
    } else {
        console.error("Score display element not found!");
    }
}

/** РќР°С‡Р°Р»Рѕ РЅРѕРІРѕР№ РёРіСЂС‹ */
function newGame() {
    // initializeGrid(); // initializeGrid С‚РµРїРµСЂСЊ РІС‹Р·С‹РІР°РµС‚СЃСЏ РёР· redrawUI РёР»Рё DOMContentLoaded
    updateScore(0);
    // РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ СЃРµС‚РєРё РґРѕР»Р¶РЅР° РїСЂРѕРёР·РѕР№С‚Рё РїРµСЂРµРґ РіРµРЅРµСЂР°С†РёРµР№ Р±Р»РѕРєРѕРІ Рё СЂРµРЅРґРµСЂРёРЅРіРѕРј
    // Р•СЃР»Рё redrawUI РЅРµ РІС‹Р·С‹РІР°РµС‚СЃСЏ РїСЂРё РїРµСЂРІРѕР№ Р·Р°РіСЂСѓР·РєРµ, РЅСѓР¶РЅРѕ РІС‹Р·РІР°С‚СЊ initializeGrid Р·РґРµСЃСЊ.
    // РџСЂРѕРІРµСЂРёРј, РїСѓСЃС‚РѕР№ Р»Рё gridContainer
    if (!gridContainer.hasChildNodes()) {
        initializeGrid(); // Р’С‹Р·С‹РІР°РµРј, РµСЃР»Рё СЃРµС‚РєР° РµС‰Рµ РЅРµ СЃРѕР·РґР°РЅР°
    } else {
         // Р•СЃР»Рё СЃРµС‚РєР° СѓР¶Рµ РµСЃС‚СЊ, РѕС‡РёСЃС‚РёРј РµС‘ Р»РѕРіРёС‡РµСЃРєРѕРµ РїСЂРµРґСЃС‚Р°РІР»РµРЅРёРµ
         grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
         renderGrid(); // РћР±РЅРѕРІРёРј РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ РѕС‡РёС‰РµРЅРЅРѕР№ СЃРµС‚РєРё
    }
    generateNextBlocks();
    // renderGrid(); // РЈР¶Рµ РІС‹Р·РІР°РЅ РІ initializeGrid РёР»Рё РІС‹С€Рµ
}

// --- РћР±СЂР°Р±РѕС‚С‡РёРєРё СЃРѕР±С‹С‚РёР№ ---

function handleDragStart(event) {
    const blockIndex = parseInt(event.target.closest('.block-preview').dataset.blockIndex);
    selectedBlock = {...currentBlocks[blockIndex], index: blockIndex};
    
    if (!selectedBlock) return;

    // РЎРѕС…СЂР°РЅСЏРµРј РёРЅРґРµРєСЃ Р±Р»РѕРєР°
    event.dataTransfer.setData('text/plain', blockIndex.toString());
    event.dataTransfer.effectAllowed = 'move';
    
    console.log("РќР°С‡Р°Р»Рё С‚Р°С‰РёС‚СЊ Р±Р»РѕРє:", selectedBlock.type);
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    // РџРѕРґСЃРІРµС‚РєР° СЏС‡РµРµРє
    const cell = event.target.closest('.grid-cell');
    if (cell && selectedBlock) {
        highlightPlacementArea(
            parseInt(cell.dataset.row), 
            parseInt(cell.dataset.col), 
            selectedBlock
        );
    }
}

// РџРѕРґСЃРІРµС‚РєР° РѕР±Р»Р°СЃС‚Рё СЂР°Р·РјРµС‰РµРЅРёСЏ
function highlightPlacementArea(row, col, block) {
    // РЎРЅР°С‡Р°Р»Р° СѓР±РёСЂР°РµРј РїСЂРµРґС‹РґСѓС‰СѓСЋ РїРѕРґСЃРІРµС‚РєСѓ
    clearHighlight();
    
    if (!block || !block.cells) return;
    
    const isValid = isValidPlacement(row, col, block);
    
    // РџРѕРґСЃРІРµС‡РёРІР°РµРј СЏС‡РµР№РєРё
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

// РЈР±РёСЂР°РµРј РїРѕРґСЃРІРµС‚РєСѓ СЃРѕ РІСЃРµС… СЏС‡РµРµРє
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

            // РџСЂРѕРІРµСЂРєР° Рё РѕС‡РёСЃС‚РєР° Р»РёРЅРёР№
            const linesCleared = clearLines();
            if (linesCleared > 0) {
                // РЎРЅР°С‡Р°Р»Р° РїРµСЂРµСЂРёСЃРѕРІС‹РІР°РµРј СЃРµС‚РєСѓ РїРѕСЃР»Рµ РѕС‡РёСЃС‚РєРё
                renderGrid(); 
                // Р—Р°С‚РµРј РѕР±РЅРѕРІР»СЏРµРј СЃС‡РµС‚
                updateScore(score + linesCleared * 100); 
            }

            // РџСЂРѕРІРµСЂРєР° РЅР° РЅРµРѕР±С…РѕРґРёРјРѕСЃС‚СЊ РіРµРЅРµСЂР°С†РёРё РЅРѕРІС‹С… Р±Р»РѕРєРѕРІ
            if (currentBlocks.every(b => b === null)) {
                generateNextBlocks();
            }

            // РџСЂРѕРІРµСЂРєР° РЅР° РєРѕРЅРµС† РёРіСЂС‹
            if (isGameOver()) {
                setTimeout(() => {
                    alert(`РРіСЂР° РѕРєРѕРЅС‡РµРЅР°! Р’Р°С€ СЃС‡С‘С‚: ${score}`);
                }, 300);
            }
        }
    }
    
    selectedBlock = null;
}

// РћР±СЂР°Р±РѕС‚РєР° РєР»РёРєР° РїРѕ Р±Р»РѕРєСѓ
function handleClickBlock(event) {
    const blockPreview = event.currentTarget;
    const blockIndex = parseInt(blockPreview.dataset.blockIndex);
    
    // Р•СЃР»Рё РјС‹ СѓР¶Рµ РІС‹Р±СЂР°Р»Рё СЌС‚РѕС‚ Р±Р»РѕРє, РѕС‚РјРµРЅСЏРµРј РІС‹Р±РѕСЂ
    if (selectedBlock?.index === blockIndex) {
        selectedBlock = null;
        document.querySelectorAll('.block-preview').forEach(p => 
            p.classList.remove('selected-block'));
        return;
    }
    
    // Р’С‹Р±РёСЂР°РµРј РЅРѕРІС‹Р№ Р±Р»РѕРє
    selectedBlock = {...currentBlocks[blockIndex], index: blockIndex};
    
    // РћР±РЅРѕРІР»СЏРµРј РІРёР·СѓР°Р»СЊРЅРѕРµ РІС‹РґРµР»РµРЅРёРµ
    document.querySelectorAll('.block-preview').forEach(p => 
        p.classList.remove('selected-block'));
    blockPreview.classList.add('selected-block');
}

// РћР±СЂР°Р±РѕС‚РєР° РєР»РёРєР° РїРѕ СЃРµС‚РєРµ
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
                 // РЎРЅР°С‡Р°Р»Р° РїРµСЂРµСЂРёСЃРѕРІС‹РІР°РµРј СЃРµС‚РєСѓ РїРѕСЃР»Рµ РѕС‡РёСЃС‚РєРё
                renderGrid();
                // Р—Р°С‚РµРј РѕР±РЅРѕРІР»СЏРµРј СЃС‡РµС‚
                updateScore(score + linesCleared * 100);
            }

            if (currentBlocks.every(b => b === null)) {
                generateNextBlocks();
            }
            
            if (isGameOver()) {
                setTimeout(() => {
                    alert(`РРіСЂР° РѕРєРѕРЅС‡РµРЅР°! Р’Р°С€ СЃС‡С‘С‚: ${score}`);
                }, 300);
            }
        }
        
        selectedBlock = null;
    }
}

/** РџСЂРѕРІРµСЂРєР° РІРѕР·РјРѕР¶РЅРѕСЃС‚Рё СЂР°Р·РјРµС‰РµРЅРёСЏ Р±Р»РѕРєР° */
function isValidPlacement(startRow, startCol, block) {
    if (!block || !block.cells) return false;
    
    for (const cell of block.cells) {
        const r = startRow + cell[0];
        const c = startCol + cell[1];

        // РџСЂРѕРІРµСЂРєР° РІС‹С…РѕРґР° Р·Р° РіСЂР°РЅРёС†С‹
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
            return false;
        }
        
        // РџСЂРѕРІРµСЂРєР° РЅР°Р»РѕР¶РµРЅРёСЏ РЅР° Р·Р°РЅСЏС‚С‹Рµ РєР»РµС‚РєРё
        if (grid[r][c] !== null) {
            return false;
        }
    }
    
    return true;
}

/** Р Р°Р·РјРµС‰РµРЅРёРµ Р±Р»РѕРєР° РЅР° РїРѕР»Рµ */
function placeBlock(startRow, startCol, block) {
    block.cells.forEach(cell => {
        const r = startRow + cell[0];
        const c = startCol + cell[1];
        
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            grid[r][c] = block.color;
        }
    });
}

/** РџСЂРѕРІРµСЂРєР° Рё СѓРґР°Р»РµРЅРёРµ Р·Р°РїРѕР»РЅРµРЅРЅС‹С… Р»РёРЅРёР№ */
function clearLines() {
    let linesCleared = 0;
    let rowsToClear = [];
    let colsToClear = [];

    // РџСЂРѕРІРµСЂРєР° СЃС‚СЂРѕРє
    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(cell => cell !== null)) {
            rowsToClear.push(r);
            linesCleared++;
        }
    }

    // РџСЂРѕРІРµСЂРєР° СЃС‚РѕР»Р±С†РѕРІ
    for (let c = 0; c < GRID_SIZE; c++) {
        let colFull = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            // РќРµ СЃС‡РёС‚Р°РµРј СЃС‚РѕР»Р±РµС† РїРѕР»РЅС‹Рј, РµСЃР»Рё РѕРЅ РїРµСЂРµСЃРµРєР°РµС‚ СѓР¶Рµ РЅР°Р№РґРµРЅРЅСѓСЋ РїРѕР»РЅСѓСЋ СЃС‚СЂРѕРєСѓ
            // С‡С‚РѕР±С‹ РёР·Р±РµР¶Р°С‚СЊ РґРІРѕР№РЅРѕРіРѕ СЃС‡РµС‚Р° РѕС‡РєРѕРІ Рё РґРІРѕР№РЅРѕР№ РѕС‡РёСЃС‚РєРё
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

    // РћС‡РёСЃС‚РєР° РЅР°Р№РґРµРЅРЅС‹С… СЃС‚СЂРѕРє
    if (rowsToClear.length > 0) {
        for (const rowIndex of rowsToClear) {
            for (let c = 0; c < GRID_SIZE; c++) {
                grid[rowIndex][c] = null; // РџСЂРѕСЃС‚Рѕ РѕС‡РёС‰Р°РµРј СЏС‡РµР№РєРё
            }
        }
    }

    // РћС‡РёСЃС‚РєР° РЅР°Р№РґРµРЅРЅС‹С… СЃС‚РѕР»Р±С†РѕРІ
    if (colsToClear.length > 0) {
        for (const colIndex of colsToClear) {
            for (let r = 0; r < GRID_SIZE; r++) {
                // РџСЂРѕРїСѓСЃРєР°РµРј СЏС‡РµР№РєРё, РєРѕС‚РѕСЂС‹Рµ СѓР¶Рµ Р±С‹Р»Рё РѕС‡РёС‰РµРЅС‹ РєР°Рє С‡Р°СЃС‚СЊ СЃС‚СЂРѕРєРё
                if (!rowsToClear.includes(r)) {
                     grid[r][colIndex] = null; // РџСЂРѕСЃС‚Рѕ РѕС‡РёС‰Р°РµРј СЏС‡РµР№РєРё
                }
            }
        }
    }

    console.log("Lines cleared in this step:", linesCleared); // РћС‚Р»Р°РґРєР°
    // Р’РѕР·РІСЂР°С‰Р°РµРј РєРѕР»РёС‡РµСЃС‚РІРѕ РѕС‡РёС‰РµРЅРЅС‹С… Р»РёРЅРёР№ РґР»СЏ РїРѕРґСЃС‡РµС‚Р° РѕС‡РєРѕРІ
    return linesCleared;
}

/** РџСЂРѕРІРµСЂРєР° РЅР° РєРѕРЅРµС† РёРіСЂС‹ */
function isGameOver() {
    for (const block of currentBlocks) {
        if (block === null) continue;

        // РџСЂРѕРІРµСЂСЏРµРј РІРѕР·РјРѕР¶РЅРѕСЃС‚СЊ СЂР°Р·РјРµС‰РµРЅРёСЏ РІ Р»СЋР±РѕРј РјРµСЃС‚Рµ РїРѕР»СЏ
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (isValidPlacement(r, c, block)) {
                    return false; // Р•СЃС‚СЊ РєСѓРґР° СЂР°Р·РјРµСЃС‚РёС‚СЊ Р±Р»РѕРє
                }
            }
        }
        
        // Р•СЃР»Рё Р±Р»РѕРє РјРѕР¶РЅРѕ РІСЂР°С‰Р°С‚СЊ, РїСЂРѕРІРµСЂСЏРµРј РІСЃРµ РІР°СЂРёР°РЅС‚С‹
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
                            return false; // РњРѕР¶РЅРѕ СЂР°Р·РјРµСЃС‚РёС‚СЊ РїРѕРІРµСЂРЅСѓС‚С‹Р№ Р±Р»РѕРє
                        }
                    }
                }
            }
        }
    }
    
    // Р•СЃР»Рё РЅРё РѕРґРёРЅ Р±Р»РѕРє РЅРµР»СЊР·СЏ СЂР°Р·РјРµСЃС‚РёС‚СЊ
    return true;
}

/** Р’СЂР°С‰РµРЅРёРµ РІС‹Р±СЂР°РЅРЅРѕРіРѕ Р±Р»РѕРєР° */
function rotateSelectedBlock() {
    if (!selectedBlock || !selectedBlock.rotations) {
        return;
    }

    // РћР±РЅРѕРІР»СЏРµРј РІСЂР°С‰РµРЅРёРµ РІ selectedBlock
    selectedBlock.currentRotation = (selectedBlock.currentRotation + 1) % selectedBlock.rotations.length;
    selectedBlock.cells = selectedBlock.rotations[selectedBlock.currentRotation];

    // РћР±РЅРѕРІР»СЏРµРј Р±Р»РѕРє РІ РјР°СЃСЃРёРІРµ currentBlocks
    const blockIndex = selectedBlock.index;
    if (blockIndex !== undefined && currentBlocks[blockIndex]) {
        currentBlocks[blockIndex].currentRotation = selectedBlock.currentRotation;
        currentBlocks[blockIndex].cells = selectedBlock.rotations[selectedBlock.currentRotation];
        renderNextBlocks();
    }
}

// Р”РѕР±Р°РІР»РµРЅРёРµ СЃС‚РёР»РµР№ РґР»СЏ РїРѕРґСЃРІРµС‚РєРё
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

// РџРµСЂРµСЂРёСЃРѕРІС‹РІР°РµС‚ СЃРµС‚РєСѓ Рё Р±Р»РѕРєРё СЃ СѓС‡РµС‚РѕРј С‚РµРєСѓС‰РёС… СЂР°Р·РјРµСЂРѕРІ
function redrawUI() {
    console.log("Redrawing UI due to resize...");
    
    const cellSize = calculateCellSize();

    gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${cellSize}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${cellSize}px)`;

    // РџРµСЂРµСЂРёСЃРѕРІС‹РІР°РµРј СЃРµС‚РєСѓ (СЃРѕС…СЂР°РЅСЏСЏ СЃРѕСЃС‚РѕСЏРЅРёРµ)
    renderGrid(); 
    // РџРµСЂРµСЂРёСЃРѕРІС‹РІР°РµРј РїСЂРµРІСЊСЋ
    renderNextBlocks();
}

// Р”РѕР±Р°РІР»СЏРµРј РѕР±СЂР°Р±РѕС‚С‡РёРє РёР·РјРµРЅРµРЅРёСЏ СЂР°Р·РјРµСЂР° РѕРєРЅР° РґР»СЏ РїРµСЂРµСЃС‡РµС‚Р° СЃРµС‚РєРё
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(redrawUI, 250); // Р’С‹Р·С‹РІР°РµРј С‚РѕР»СЊРєРѕ РїРµСЂРµСЂРёСЃРѕРІРєСѓ UI
});

// --- Touch Event Handlers --- 

function handleTouchStart(event) {
    // РРіРЅРѕСЂРёСЂСѓРµРј, РµСЃР»Рё РєР°СЃР°РЅРёРµ РЅРµ РѕРґРЅРёРј РїР°Р»СЊС†РµРј
    if (event.touches.length !== 1) return;
    // РџСЂРµРґРѕС‚РІСЂР°С‰Р°РµРј РїСЂРѕРєСЂСѓС‚РєСѓ СЃС‚СЂР°РЅРёС†С‹ РІРѕ РІСЂРµРјСЏ РїРµСЂРµС‚Р°СЃРєРёРІР°РЅРёСЏ Р±Р»РѕРєР°
    event.preventDefault();

    const touch = event.touches[0];
    const blockPreview = event.currentTarget; // Р­С‚Рѕ .block-preview
    touchTargetBlockIndex = parseInt(blockPreview.dataset.blockIndex);
    selectedBlock = {...currentBlocks[touchTargetBlockIndex], index: touchTargetBlockIndex};

    if (!selectedBlock) return;

    // РЎРѕР·РґР°РµРј РІРёР·СѓР°Р»СЊРЅС‹Р№ РєР»РѕРЅ Р±Р»РѕРєР° РґР»СЏ РїРµСЂРµС‚Р°СЃРєРёРІР°РЅРёСЏ
    if (!draggingElement) {
        draggingElement = document.createElement('div');
        draggingElement.id = 'dragging-block';
        // РљРѕРїРёСЂСѓРµРј РјРёРЅРё-СЃРµС‚РєСѓ РёР· РїСЂРµРІСЊСЋ
        const previewGrid = blockPreview.querySelector('div'); 
        if (previewGrid) {
            draggingElement.appendChild(previewGrid.cloneNode(true));
            // РњРѕР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ РјР°СЃС€С‚Р°Р±РёСЂРѕРІР°РЅРёРµ, РµСЃР»Рё РЅСѓР¶РЅРѕ
            // draggingElement.style.transform = 'scale(1.1)'; 
        } else {
            // Р—Р°РїР°СЃРЅРѕР№ РІР°СЂРёР°РЅС‚, РµСЃР»Рё РЅРµ РЅР°С€Р»Рё СЃРµС‚РєСѓ
            draggingElement.style.width = '60px';
            draggingElement.style.height = '60px';
            draggingElement.style.backgroundColor = selectedBlock.color;
        }
        document.body.appendChild(draggingElement);
    }

    // РќР°С‡Р°Р»СЊРЅС‹Рµ РєРѕРѕСЂРґРёРЅР°С‚С‹ РєР°СЃР°РЅРёСЏ
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    // РџРѕР·РёС†РёРѕРЅРёСЂСѓРµРј РєР»РѕРЅ РїРѕРґ РїР°Р»СЊС†РµРј
    positionDraggingElement(touch.clientX, touch.clientY);

    // Р”РѕР±Р°РІР»СЏРµРј РѕР±СЂР°Р±РѕС‚С‡РёРєРё РґРІРёР¶РµРЅРёСЏ Рё РѕС‚РїСѓСЃРєР°РЅРёСЏ РЅР° РІРµСЃСЊ РґРѕРєСѓРјРµРЅС‚
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd); // РќР° СЃР»СѓС‡Р°Р№ РѕС‚РјРµРЅС‹ РєР°СЃР°РЅРёСЏ

    console.log("Touch Start - С‚Р°С‰РёРј Р±Р»РѕРє:", selectedBlock.type);
}

function handleTouchMove(event) {
    if (!draggingElement || event.touches.length !== 1) return;
    // РџСЂРµРґРѕС‚РІСЂР°С‰Р°РµРј РїСЂРѕРєСЂСѓС‚РєСѓ
    event.preventDefault(); 

    const touch = event.touches[0];
    
    // РџРµСЂРµРјРµС‰Р°РµРј РєР»РѕРЅ Р±Р»РѕРєР°
    positionDraggingElement(touch.clientX, touch.clientY);

    // РћРїСЂРµРґРµР»СЏРµРј СЌР»РµРјРµРЅС‚ РїРѕРґ РїР°Р»СЊС†РµРј
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    const cell = elementUnderTouch ? elementUnderTouch.closest('.grid-cell') : null;

    if (cell && selectedBlock) {
        highlightPlacementArea(
            parseInt(cell.dataset.row),
            parseInt(cell.dataset.col),
            selectedBlock
        );
    } else {
        clearHighlight(); // РћС‡РёС‰Р°РµРј РїРѕРґСЃРІРµС‚РєСѓ, РµСЃР»Рё РїР°Р»РµС† РЅРµ РЅР°Рґ СЃРµС‚РєРѕР№
    }
}

function handleTouchEnd(event) {
    if (!draggingElement) return;

    // РћРїСЂРµРґРµР»СЏРµРј СЌР»РµРјРµРЅС‚ РїРѕРґ С‚РѕС‡РєРѕР№ РѕС‚РїСѓСЃРєР°РЅРёСЏ
    // РСЃРїРѕР»СЊР·СѓРµРј last known position РёР»Рё changedTouches[0] РµСЃР»Рё РµСЃС‚СЊ
    const lastTouch = event.changedTouches[0];
    const endX = lastTouch.clientX;
    const endY = lastTouch.clientY;
    const elementUnderTouch = document.elementFromPoint(endX, endY);
    const targetCell = elementUnderTouch ? elementUnderTouch.closest('.grid-cell') : null;

    clearHighlight();

    if (targetCell && selectedBlock && touchTargetBlockIndex !== -1) {
        const row = parseInt(targetCell.dataset.row);
        const col = parseInt(targetCell.dataset.col);
        const blockToPlace = currentBlocks[touchTargetBlockIndex]; // Р‘РµСЂРµРј Р±Р»РѕРє РїРѕ СЃРѕС…СЂР°РЅРµРЅРЅРѕРјСѓ РёРЅРґРµРєСЃСѓ

        if (blockToPlace && isValidPlacement(row, col, blockToPlace)) {
            console.log("Touch End - СЂР°Р·РјРµС‰Р°РµРј Р±Р»РѕРє", blockToPlace.type);
            placeBlock(row, col, blockToPlace);
            currentBlocks[touchTargetBlockIndex] = null; // РЈР±РёСЂР°РµРј РёР· РґРѕСЃС‚СѓРїРЅС‹С…
            renderGrid();
            renderNextBlocks();

            const linesCleared = clearLines();
            if (linesCleared > 0) {
                renderGrid();
                updateScore(score + linesCleared * 100);
            }

            if (currentBlocks.every(b => b === null)) {
                generateNextBlocks();
            }

            if (isGameOver()) {
                setTimeout(() => {
                    alert(`РРіСЂР° РѕРєРѕРЅС‡РµРЅР°! Р’Р°С€ СЃС‡С‘С‚: ${score}`);
                }, 300);
            }
        } else {
            console.log("Touch End - РЅРµРІРµСЂРЅРѕРµ СЂР°Р·РјРµС‰РµРЅРёРµ");
        }
    }

    // РЈР±РёСЂР°РµРј РєР»РѕРЅ Р±Р»РѕРєР° Рё СЃР±СЂР°СЃС‹РІР°РµРј СЃРѕСЃС‚РѕСЏРЅРёРµ
    if (draggingElement) {
        draggingElement.remove();
        draggingElement = null;
    }
    selectedBlock = null;
    touchTargetBlockIndex = -1;

    // РЈРґР°Р»СЏРµРј РѕР±СЂР°Р±РѕС‚С‡РёРєРё СЃ РґРѕРєСѓРјРµРЅС‚Р°
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchEnd);
}

// Р’СЃРїРѕРјРѕРіР°С‚РµР»СЊРЅР°СЏ С„СѓРЅРєС†РёСЏ РґР»СЏ РїРѕР·РёС†РёРѕРЅРёСЂРѕРІР°РЅРёСЏ РїРµСЂРµС‚Р°СЃРєРёРІР°РµРјРѕРіРѕ СЌР»РµРјРµРЅС‚Р°
function positionDraggingElement(x, y) {
    if (!draggingElement) return;
    // Р¦РµРЅС‚СЂРёСЂСѓРµРј СЌР»РµРјРµРЅС‚ РїРѕРґ С‚РѕС‡РєРѕР№ РєР°СЃР°РЅРёСЏ (РёР»Рё СЃРѕ СЃРјРµС‰РµРЅРёРµРј)
    const rect = draggingElement.getBoundingClientRect();
    draggingElement.style.left = `${x - rect.width / 2}px`;
    draggingElement.style.top = `${y - rect.height / 2}px`;
} 
