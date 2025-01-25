import { fetchCoinData } from './coinbase.js';
import {Database} from './db-migrations.js';
// List of coins to monitor
const coins = ['bitcoin', 'ethereum', 'ripple', 'tether', 'solana', 'binancecoin', 'dogecoin', 'tron',
    'chainlink', 'weth', 'litecoin', 'official-trump', 'pepe', 'binance-staked-sol', 'mantle-staked-ether',
    'msol', 'solv-btc'];



async function monitor(sqlitedb) {
    try {
        const coinData = await fetchCoinData();
        console.log('Fetched coin data:', coinData);
        const db = new Database(sqlitedb);
        for (const coin of coins) {
            const currentPrice = coinData[coin].usd;
            console.log(`Current price of ${coin}: $${currentPrice}`);

            // Insert current price into database
            sqlitedb.run(`INSERT INTO prices (coin, price) VALUES (?, ?)`, [coin, currentPrice], (err) => {
                if (err) {
                    console.error('Error inserting price into database:', err);
                }
            });

            // Check for price changes
            db.checkPriceChanges(coin, currentPrice);
        }
    } catch (error) {
        console.error('Error during monitoring:', error);
    }
}



export { monitor };