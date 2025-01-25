

const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Crypto Dashboard</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    margin: 20px;
                    background-color: #f7f7f7;
                }
                h1 {
                    color: #333;
                    text-align: center;
                }
                table {
                    width: 80%;
                    margin: 20px auto;
                    border-collapse: collapse;
                    background-color: #fff;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }
                th, td {
                    padding: 15px;
                    text-align: left;
                    border: 1px solid #ddd;
                }
                th {
                    background-color: #4CAF50;
                    color: white;
                }
                tr:hover {
                    background-color: #f1f1f1;
                }
            </style>
        </head>
        <body>
            <h1>Cryptocurrency Dashboard</h1>
            <table id="crypto-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Price</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Dynamic rows will be inserted here -->
                </tbody>
            </table>

            <script>
                async function fetchLivePrices() {
                    try {
                        const response = await fetch('/api/live-prices');
                        const data = await response.json();

                        // Update the table with live data
                        const tableBody = document.querySelector('#crypto-table tbody');
                        tableBody.innerHTML = ''; // Clear existing rows

                        for (const [coin, info] of Object.entries(data)) {
                            const row = document.createElement('tr');
                            row.innerHTML = \`
                                <td>\${coin.charAt(0).toUpperCase() + coin.slice(1)}</td>
                                <td>$\${info.usd.toFixed(2)}</td>
                            \`;
                            tableBody.appendChild(row);
                        }
                    } catch (error) {
                        console.error('Error fetching live prices:', error);
                    }
                }

                // Fetch live prices every 10 seconds
                fetchLivePrices(); // Initial fetch
                setInterval(fetchLivePrices, 30000); // Fetch every 10 seconds
            </script>
        </body>
        </html>
    `


    export {
        html
    }