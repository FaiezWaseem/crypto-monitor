import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function sendEmailAlert(coin, priceChange) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.RECIPIENT_EMAIL,
        subject: `Price Alert for ${coin.charAt(0).toUpperCase() + coin.slice(1)}`,
        text: `The price of ${coin} has changed by ${priceChange.toFixed(2)}% in the last 12 hours.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log('Error sending email:', error);
        }
        console.log('Email sent:', info.response);
    });
}

export { sendEmailAlert };