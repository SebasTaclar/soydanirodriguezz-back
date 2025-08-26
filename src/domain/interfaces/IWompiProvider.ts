export interface WompiPaymentData {
  wallpaperNumbers: number[];
  buyerEmail: string;
  buyerName: string;
  buyerIdentificationNumber: string;
  buyerContactNumber: string;
  amount: number; // En COP
}

export interface WompiPaymentResult {
  transactionId: string;
  paymentUrl: string;
  reference: string;
  status: string;
  publicKey: string;
  signature: string;
  amountInCents: number;
  currency: string;
}

export interface WompiTransactionStatus {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED';
  reference: string;
  amount_in_cents: number;
  currency: string;
  customer_email: string;
  payment_method?: {
    type: string;
    extra?: any;
  };
  created_at: string;
  finalized_at?: string;
}

export interface IWompiProvider {
  createPayment(data: WompiPaymentData): Promise<WompiPaymentResult>;
}
