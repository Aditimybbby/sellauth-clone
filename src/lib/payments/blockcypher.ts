import axios from 'axios';

const BLOCKCYPHER_TOKEN = process.env.BLOCKCYPHER_TOKEN || '';
const BASE_URL = 'https://api.blockcypher.com/v1';

export type SupportedCoin = 'btc' | 'ltc' | 'doge';

interface ForwarderResponse {
  id: string;
  input_address: string;
  destination: string;
  callback_url: string;
}

interface TransactionDetails {
  hash: string;
  confirmations: number;
  double_spend: boolean;
  total: number;
  block_height: number;
}

export async function createPaymentForwarder(
  coin: SupportedCoin,
  destinationAddress: string,
  invoiceId: string,
  webhookSecret: string
): Promise<ForwarderResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const callbackUrl = `${appUrl}/api/webhooks/blockcypher?invoice_id=${invoiceId}&secret=${webhookSecret}&coin=${coin}`;

  const response = await axios.post<ForwarderResponse>(
    `${BASE_URL}/${coin}/main/payments?token=${BLOCKCYPHER_TOKEN}`,
    {
      destination: destinationAddress,
      callback_url: callbackUrl,
    }
  );

  return response.data;
}

export async function verifyTransaction(
  coin: SupportedCoin,
  txHash: string
): Promise<TransactionDetails | null> {
  try {
    const response = await axios.get<TransactionDetails>(
      `${BASE_URL}/${coin}/main/txs/${txHash}?token=${BLOCKCYPHER_TOKEN}`
    );
    return response.data;
  } catch {
    return null;
  }
}

export async function getTransactionConfidence(
  coin: SupportedCoin,
  txHash: string
): Promise<number> {
  try {
    const response = await axios.get(
      `${BASE_URL}/${coin}/main/txs/${txHash}/confidence?token=${BLOCKCYPHER_TOKEN}`
    );
    return response.data.confidence || 0;
  } catch {
    return 0;
  }
}

export async function deleteForwarder(
  coin: SupportedCoin,
  forwarderId: string
): Promise<void> {
  try {
    await axios.delete(
      `${BASE_URL}/${coin}/main/payments/${forwarderId}?token=${BLOCKCYPHER_TOKEN}`
    );
  } catch {
    console.error('Failed to delete forwarder:', forwarderId);
  }
}

export async function getAddressBalance(
  coin: SupportedCoin,
  address: string
): Promise<{ balance: number; unconfirmedBalance: number }> {
  try {
    const response = await axios.get(
      `${BASE_URL}/${coin}/main/addrs/${address}/balance?token=${BLOCKCYPHER_TOKEN}`
    );
    return {
      balance: response.data.balance || 0,
      unconfirmedBalance: response.data.unconfirmed_balance || 0,
    };
  } catch {
    return { balance: 0, unconfirmedBalance: 0 };
  }
}
