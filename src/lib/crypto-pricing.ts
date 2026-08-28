import axios from 'axios';

interface PriceCache {
  prices: Record<string, number>;
  timestamp: number;
}

let cache: PriceCache | null = null;
const CACHE_TTL = 300_000; // 5 minutes — keeps consecutive invoices consistent

const COIN_IDS: Record<string, string> = {
  btc: 'bitcoin',
  ltc: 'litecoin',
  eth: 'ethereum',
  doge: 'dogecoin',
};

// Last-resort estimates, only used when every price source fails.
const FALLBACK_PRICES: Record<string, number> = {
  btc: 65000,
  ltc: 80,
  eth: 3500,
  doge: 0.12,
};

async function fetchFromCoinGecko(coinId: string): Promise<number | null> {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { timeout: 5000 }
    );
    const price = response.data[coinId]?.usd;
    return typeof price === 'number' && price > 0 ? price : null;
  } catch {
    return null;
  }
}

async function fetchFromCoinbase(coin: string): Promise<number | null> {
  try {
    const response = await axios.get(
      `https://api.coinbase.com/v2/prices/${coin.toUpperCase()}-USD/spot`,
      { timeout: 5000 }
    );
    const price = parseFloat(response.data?.data?.amount);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

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

  // Two live sources before falling back to a static estimate:
  // CoinGecko (can rate-limit from shared hosting IPs) then Coinbase spot.
  const price =
    (await fetchFromCoinGecko(COIN_IDS[key] || key)) ??
    (await fetchFromCoinbase(key));

  if (price) {
    if (!cache) cache = { prices: {}, timestamp: now };
    cache.prices[key] = price;
    cache.timestamp = now;
    return price;
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
