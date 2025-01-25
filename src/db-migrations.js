
import { sendEmailAlert } from './email.js';
class Database {
    constructor(db) {
        this.db = db
    }
     runMigrations(){
        this.db.run(`CREATE TABLE IF NOT EXISTS prices (
            id INTEGER PRIMARY KEY,
            coin TEXT,
            price REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
     checkPriceChanges(coin, currentPrice) {
        this.db.get(`SELECT price FROM prices WHERE coin = ? ORDER BY timestamp DESC LIMIT 1`, [coin], (err, row) => {
            if (err) {
                console.error(err.message);
                return;
            }
            if (row) {
                const previousPrice = row.price;
                const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
    
                // Check for 5% price hike
                if (priceChange >= 5) {
                    sendEmailAlert(coin, priceChange);
                }
            }
        });
    }
    
}





export {
    Database
}