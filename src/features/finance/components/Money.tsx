import { formatAmount } from '../format';

interface MoneyProps {
  /** Integer minor units, straight from the API (100 = 1 RWF). */
  minor: number;
  /** "+" for money in, "-" for money out. */
  sign?: '+' | '-';
  currency?: string;
}

/** An amount, "RWF 80,000": the currency first, smaller and lighter than the figure. */
export function Money({ minor, sign, currency = 'RWF' }: MoneyProps) {
  return (
    <span className="money">
      {sign && `${sign} `}
      <span className="money__unit">{currency} </span>
      {formatAmount(minor)}
    </span>
  );
}
