import axios from 'axios';

interface PriceCache {
  prices: Record<string, number>;
  timestamp: number;
}

let cache: PriceCache | null = null;
const CACHE_TTL = 60_000; // 60 seconds

const COIN_IDS: Record<string, string> = {
  btc: 'bitcoin',
  ltc: 'litecoin',
  eth: 'ethereum',
  doge: 'dogecoin',
};

// Rough estimates, only used if the price API is unreachable.
const FALLBACK_PRICES: Record<string, number> = {
  btc: 65000,
  ltc: 80,
  eth: 3500,
  doge: 0.12,
};

export async function getCryptoPrice(coin: string): Promise<number> {
  // The checkout sends coin codes in uppercase ('BTC' / 'LTC'), so normalise
  // before every lookup — otherwise the maps miss and the rate falls back to 1,
  // which generated invoices like "$0.10 => 0.1 LTC".
  const key = (coin || '').trim().toLowerCase();
  if (!key || key === 'test') return 1;

  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL && cache.prices[key]) {
    return cache.prices[key];
  }

  try {
    const coinId = COIN_IDS[key] || key;
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { timeout: 5000 }
    );

    const price = response.data[coinId]?.usd;
    if (price) {
      if (!cache) cache = { prices: {}, timestamp: now };
      cache.prices[key] = price;
      cache.timestamp = now;
      return price;
    }
  } catch (error) {
    console.error('Failed to fetch crypto price:', error);
  }

  return FALLBACK_PRICES[key] || 1;
}

export function usdToCrypto(usdAmount: number, cryptoPrice: number): string {
  const amount = usdAmount / cryptoPrice;
  return amount.toFixed(8);
}

export async function convertUsdToCrypto(
  usdAmount: number,
  coin: string
): Promise<{ cryptoAmount: string; rate: number }> {
  const rate = await getCryptoPrice(coin);
  const cryptoAmount = usdToCrypto(usdAmount, rate);
  return { cryptoAmount, rate };
}
