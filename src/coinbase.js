import fetch from 'node-fetch';

// List of coins to monitor
const coins = ['bitcoin', 'ethereum', 'ripple', 'tether', 'solana', 'binancecoin', 'dogecoin', 'tron',
    'chainlink', 'weth', 'litecoin', 'official-trump', 'pepe', 'binance-staked-sol', 'mantle-staked-ether',
    'msol', 'solv-btc'];

async function fetchCoinData() {
    const url = 'https://api.coingecko.com/api/v3/simple/price';
    const params = new URLSearchParams({
        ids: coins.join(','),
        vs_currencies: 'usd'
    });

    try {
        const response = await fetch(`${url}?${params}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching coin data:', error);
        throw error;
    }
}


export { fetchCoinData };