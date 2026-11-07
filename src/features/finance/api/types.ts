/*
 * Shapes shared by the finance endpoints. They mirror the backend's
 * serializers (coop-backend `finance/serializers.py`, `cashflow_serializers.py`,
 * `account_serializers.py`). Money is always an integer in minor units:
 * 100 minor = 1 RWF, so `2000000` is 20,000 RWF. Enums are lowercase.
 */

/** A member as the finance API names them. */
export interface MemberRef {
  membership_id: string;
  full_name: string;
}

export type ContributionStatus = 'pending' | 'confirmed' | 'rejected' | 'reversed';
export type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer';
export type ContributionType = 'monthly' | 'one_off' | 'arrears' | 'fine' | 'dedicated';
