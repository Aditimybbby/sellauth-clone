import QRCode from 'qrcode';

export async function generatePaymentQR(
  address: string,
  amount: string,
  coin: string = 'bitcoin'
): Promise<string> {
  const coinPrefixes: Record<string, string> = {
    btc: 'bitcoin',
    ltc: 'litecoin',
    doge: 'dogecoin',
    eth: 'ethereum',
  };

  const prefix = coinPrefixes[coin] || coin;
  const uri = `${prefix}:${address}?amount=${amount}`;

  try {
    const dataUrl = await QRCode.toDataURL(uri, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch {
    return '';
  }
}
