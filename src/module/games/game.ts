import { GameResult, } from "../../interfaces";

const SUITS = ['S', 'H', 'D', 'C'] as const; // Spade, Heart, Diamond, Club
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'] as const;

type Suit = typeof SUITS[number];
type Rank = typeof RANKS[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

// Bet type mapping
const betTypeMap: Record<number, string> = {
  1: "High",                 
  2: "Low",                  
  3: "Heart",            // suit = H
  4: "Diamond",          // suit = D
  5: "Club",           // suit = C
  6: "Spade",          // suit = S
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


export const calculateWinnings = async(category:string, lastestCard:Card, secondLatestCard:Card): Promise<{ status: "win" | "loss"; mult: number }> => {
  const lastCard:Card = lastestCard
  const secondLastCard:Card = secondLatestCard
  let status: "win" | "loss" = "loss"
  let mult = 0;
  switch (category) {
    case "High":
      if (lastCard.rank > secondLastCard.rank) {
        status = "win";
        mult = 2;
      }
      break;

    case "Low":
      if (lastCard.rank < secondLastCard.rank) {
        status = "win";
        mult = 2;
      }
      break;

    case "Red":
      if (lastCard.suit === "H" || lastCard.suit === "D") {
        status = "win";
        mult = 1.5;
      }
      break;

    case "Black":
      if (lastCard.suit === "C" || lastCard.suit === "S") {
        status = "win";
        mult = 1.5;
      }
      break;

    case "SameSuit":
      if (lastCard.suit === secondLastCard.suit) {
        status = "win";
        mult = 3;
      }
      break;

    default:
      status = "loss";
      mult = 0;
  }

  return { status, mult };

  
}

