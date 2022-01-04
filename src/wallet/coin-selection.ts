import { isTrue } from '../util';
import { wallet } from '../state/wallet';

interface Coin {
  magnitude: number;
  period: number;
}

type FindResult<T> = { found: T[]; excess: number, decay: number };

// we should shuffle based on oldest coins first, TODO
export function findAtLeast<T extends Coin>(coins: T[], target: number): FindResult<T> | number | undefined {
  isTrue(Number.isSafeInteger(target));
  isTrue(target > 0);

  const candidates = [...coins] // first we copy (avoid mutation)
    .sort((a, b) => b.magnitude - a.magnitude) // sort by biggest first...
    .slice(0, 255); // max coins a transfer can have

  shuffle(candidates);

  let amount = 0;
  let decay = 0;

  for (const [i, coin] of candidates.entries()) {
    let multiplier = ((wallet.config.custodian.blindCoinKeys.length - 1 - coin.period) / 100)

    if (multiplier > 1) { 
      multiplier = 1;
    } else if (multiplier < 0) { 
      multiplier = 0;
    }

    decay += Math.round(((2 ** coin.magnitude) * multiplier));
    amount += 2 ** coin.magnitude;

    if ((amount) >= (target + decay)) {
      return {
        found: candidates.slice(0, i + 1),
        excess: amount - target - decay,
        decay
      };
    }
  }
  if (amount < (target + decay)) {
    return (target + decay) - amount;
  }
  return undefined;
}

function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]]; // swap elements
  }
}
