// server.js
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

// =================================================================
// CONFIGURAZIONE CENTRALE
// =================================================================

const app = express();
const PORT = process.env.PORT || 3001;

// Whitelist di domini e configurazione CORS
const allowedOrigins = [
  'https://soek.ch',
  'https://www.soek.ch',
  process.env.DEV_ORIGIN, // Utile per lo sviluppo locale (es. http://localhost:5500)
].filter(Boolean); // Rimuove valori 'undefined' se DEV_ORIGIN non è impostato

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
};

// Testo mappato per i motivi di contatto (più facile da gestire)
const INQUIRY_REASONS = {
  booking: "Booking & Collaborations",
  licensing: "Music Licensing",
  press: "Press & Media",
  feedback: "Feedback & Questions",
  other: "Other"
};

// =================================================================
// MIDDLEWARE
// =================================================================

app.use(cors(corsOptions));
app.use(bodyParser.json());

// =================================================================
// SERVIZIO EMAIL (LOGICA DI BUSINESS SEPARATA)
// =================================================================

/**
 * Crea e configura il transporter di Nodemailer.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Funzione helper per costruire il contenuto HTML dell'email.
 * @param {object} data - Dati dal form.
 * @returns {string} - Contenuto HTML dell'email.
 */
const buildEmailHtml = ({ name, email, reasonText, newsletter_signup, message }) => {
  const newsletterRow = newsletter_signup === 'true'
    ? `<tr style="background-color: #eaf7e9; border-bottom: 1px solid #eee;">
         <td style="padding: 8px; width: 120px;"><strong>Newsletter:</strong></td>
         <td style="padding: 8px;">✅ <strong>Sì, vuole iscriversi!</strong></td>
       </tr>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #1b263b;">Nuovo Contatto dal Sito Web di SOEK</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; width: 120px;"><strong>Nome:</strong></td>
          <td style="padding: 8px;">${name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px;"><strong>Email:</strong></td>
          <td style="padding: 8px;">${email}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px;"><strong>Motivo:</strong></td>
          <td style="padding: 8px;"><strong>${reasonText}</strong></td>
        </tr>
        ${newsletterRow}
      </table>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p><strong>Messaggio:</strong></p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</div> 
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p><small>Email inviata da ${email} attraverso il form di contatto.</small></p>
    </div>
  `;
};

// =================================================================
// GESTORE DELLA ROTTA (CONTROLLER)
// =================================================================

/**
 * Gestisce la richiesta di invio email.
 * @param {express.Request} req - L'oggetto richiesta.
 * @param {express.Response} res - L'oggetto risposta.
 */
const handleSendEmail = async (req, res) => {
  const { name, email, inquiry_reason, message, newsletter_signup } = req.body;

  if (!name || !email || !message || !INQUIRY_REASONS[inquiry_reason]) {
    return res.status(400).json({ success: false, message: "Please fill in all required fields." });
  }

  // Futura logica per la newsletter
  if (newsletter_signup === 'true') {
    console.log(`ISCRIZIONE NEWSLETTER: Richiesta da ${email}.`);
    // await addToMailingList(email, name);
  }
  
  const reasonText = INQUIRY_REASONS[inquiry_reason];
  const emailSubject = `[Sito SOEK] Nuovo Messaggio: ${reasonText} da ${name}`;
  const emailHtml = buildEmailHtml({ name, email, reasonText, newsletter_signup, message });

  const mailOptions = {
    from: `"${name}" <${process.env.EMAIL_USER}>`,
    replyTo: email,
    to: process.env.SOEK_EMAIL,
    subject: emailSubject,
    html: emailHtml,
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Email inviata con successo da: ${email} (Motivo: ${reasonText})`);
    res.status(200).json({ success: true, message: "Thank you! Your message has been sent." });
  } catch (error) {
    console.error("Errore nell'invio dell'email:", error.message);
    res.status(500).json({ success: false, message: "Oops! There was a problem sending your message." });
  }
};

// =================================================================
// DEFINIZIONE ROTTE
// =================================================================

app.post('/send-email', handleSendEmail);

// Rotta di health check per verificare che il server sia attivo
app.get('/health', (req, res) => {
  res.status(200).send('Server is healthy and running.');
});

// =================================================================
// AVVIO DEL SERVER
// =================================================================

const startServer = async () => {
  try {
    // Verifica la configurazione di Nodemailer all'avvio
    const transporter = createTransporter();
    await transporter.verify();
    console.log("Nodemailer è pronto per inviare email.");

    app.listen(PORT, () => {
      console.log(`Server backend in ascolto sulla porta ${PORT}`);
      console.log(`Domini frontend permessi: ${allowedOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error("Errore critico all'avvio - Impossibile verificare Nodemailer:", error.message);
    process.exit(1); // Esce dal processo se la configurazione email non è valida
  }
};

startServer();
