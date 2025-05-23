// server.js
require('dotenv').config(); // Carica le variabili d'ambiente da .env
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001; // Porta per il server backend

//Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:56271' // URL del frontend Vite o del sito deployato
    // Se il frontend gira su una porta diversa in locale, aggiornare localhost.
    // Per la produzione, impostare la variabile d'ambiente FRONTEND_URL al dominio soek.ch
}));
app.use(bodyParser.json()); // Per parsare JSON nel corpo della richiesta
app.use(bodyParser.urlencoded({ extended: true })); // Per parsare dati url-encoded

// --- Configurazione di Nodemailer ---
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail', // es. 'gmail', 'hotmail', o configurazione SMTP
    auth: {
        user: process.env.EMAIL_USER,         // La tua email da cui inviare
        pass: process.env.EMAIL_PASSWORD      // La tua password o password per le app
    }
});

// Verifica la connessione del transporter (opzionale, ma utile per debug)
transporter.verify(function(error, success) {
    if (error) {
        console.error("Errore configurazione Nodemailer:", error);
    } else {
        console.log("Nodemailer è pronto per inviare email.");
    }
});

// --- Rotta per l'invio dell'email ---
app.post('/send-email', async (req, res) => {
    const { name, email, subject, message } = req.body;

    // Validazione base
    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: "Please fill in all required fields." });
    }

    const mailOptions = {
        from: `"${name}" <${process.env.EMAIL_USER}>`, // Mittente
        replyTo: email, // Importante per permettere di rispondere direttamente all'utente
        to: process.env.SOEK_EMAIL, // L'indirizzo email di SOEK dove ricevere i contatti
        subject: subject || `Nuovo messaggio da ${name} (Sito SOEK)`,
        html: `
            <h2>Nuovo Contatto dal Sito Web di SOEK</h2>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Oggetto:</strong> ${subject || 'Nessun oggetto specificato'}</p>
            <hr>
            <p><strong>Messaggio:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p> 
            <hr>
            <p><small>Email inviata da ${email} attraverso il form di contatto del sito.</small></p>
        `,
        // text: `Nuovo messaggio da ${name} (${email}):\nOggetto: ${subject || 'N/D'}\nMessaggio: ${message}` // Versione testuale
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email inviata da: ${name} <${email}> a ${process.env.SOEK_EMAIL}`);
        res.status(200).json({ success: true, message: "Thank you! Your message has been sent." });
    } catch (error) {
        console.error("Errore durante l'invio dell'email:", error);
        res.status(500).json({ success: false, message: "Oops! There was a problem sending your message." });
    }
});

app.listen(PORT, () => {
    console.log(`Server backend in ascolto sulla porta ${PORT}`);
    console.log(`Accesso frontend previsto da: ${process.env.FRONTEND_URL || 'Configura FRONTEND_URL in .env'}`);
});