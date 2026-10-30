import { formatAmount } from '../format';

interface MoneyProps {
  value: number;
  /** "+" for money in, "-" for money out. */
  sign?: '+' | '-';
}

/** An amount in RWF, the currency set smaller and lighter than the figure. */
export function Money({ value, sign }: MoneyProps) {
  return (
    <span className="money">
      {sign}
      {formatAmount(value)}
      <span className="money__unit"> RWF</span>
    </span>
  );
}
