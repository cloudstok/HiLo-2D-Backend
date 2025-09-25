import { GameResult } from "../../interfaces";

const SUITS = ['S', 'H', 'D', 'C'] as const; // Spade, Heart, Diamond, Club
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

type Suit = typeof SUITS[number];
type Rank = typeof RANKS[number];

interface Card {
  rank: Rank;
  suit: Suit;
}

// Bet type mapping
const betTypeMap: Record<number, string> = {
  1: "High",                 // value >= 8
  2: "Low",                  // value <= 7
  3: "Red Heart",            // suit = H
  4: "Red Diamond",          // suit = D
  5: "Black Club",           // suit = C
  6: "Black Spade",          // suit = S
  7: "Red (Heart or Diamond)", // suit = H or D
  8: "Black (Club or Spade)"   // suit = C or S
};

// Multiplier mapping
const multiplierMap: Record<number, number> = {
  1: 1.27,
  2: 1.27,
  3: 3.92,
  4: 3.92,
  5: 3.92,
  6: 3.92,
  7: 2.04,
  8: 2.04
};

// Draw a random card
export function drawCard(): Card {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { rank, suit };
}

// Convert rank to numeric value for High/Low evaluation
function rankValue(rank: Rank): number {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank, 10);
}

