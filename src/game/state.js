import { BLACK, WHITE } from "./rules.js";

export function createInitialBoard() {
  const board = Array(25).fill(0);
  board[24] = 2;
  board[13] = 5;
  board[8] = 3;
  board[6] = 5;
  board[1] = -2;
  board[12] = -5;
  board[17] = -3;
  board[19] = -5;
  return board;
}

export function createInitialState() {
  return {
    board: Array(25).fill(0),
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
    humanColor: WHITE,
    computerColor: BLACK,
    currentActor: 'human',
    status: 'setup',
    difficulty: 'medium',
    diceMode: 'manual',
    dice: [0, 0],
    remaining: [],
    freeMode: false,
    doubleExtra: false,
    chosenDouble: false,
    selected: null,
    legalChoices: [],
    undoStack: [],
    log: [],
    doubleStreak: { human: 0, computer: 0 },
    autoTimer: null,
    countdownTimer: null,
    countdown: 0,
    animating: false,
    gameOver: false,
    lastChance: null,
    gameMode: 'computer',
    localActor: 'human',
    roomCode: null,
    playerId: null,
    playerNames: { human: 'אתה', computer: 'המחשב' },
    onlineReady: { human: false, computer: false },
    applyingRemote: false,
    roomUnsub: null,
    reactionUnsub: null,
    lastMove: null,
    lastMoveSeen: null,
    lastVictorySeen: null,
    winnerColor: null,
    stolen: false,
    victoryId: null,
    lastChanceRollingSeen: null,
    lastChanceResultSeen: null,
  };
}

export function createNewGameStateValues() {
  return {
    humanColor: WHITE,
    computerColor: BLACK,
    currentActor: 'human',
    status: 'setup',
    dice: [0, 0],
    remaining: [],
    freeMode: false,
    doubleExtra: false,
    chosenDouble: false,
    selected: null,
    legalChoices: [],
    undoStack: [],
    log: [],
    doubleStreak: { human: 0, computer: 0 },
    animating: false,
    gameOver: false,
    lastChance: null,
    gameMode: 'computer',
    localActor: 'human',
    roomCode: null,
    playerId: null,
    playerNames: { human: 'אתה', computer: 'המחשב' },
    onlineReady: { human: false, computer: false },
    applyingRemote: false,
    lastMove: null,
    lastMoveSeen: null,
    lastVictorySeen: null,
    winnerColor: null,
    stolen: false,
    victoryId: null,
    lastChanceRollingSeen: null,
    lastChanceResultSeen: null,
  };
}
