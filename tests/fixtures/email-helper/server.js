const express = require('express');
const { sendEmail } = require('./email.cjs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/contact', async (req, res) => {
  const recipient = process.env.CONTACT_FORM_RECIPIENT_EMAIL;
  if (!recipient) {
    console.error('email.contact_form.recipient_unset');
    return res.status(500).json({ error: 'Email recipient not configured' });
  }
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    await sendEmail({
      to: recipient,
      replyTo: email,
      subject: `Contact form: ${name}`,
      text: `From: ${name} (${email})\n\n${message}`,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('email.send.failed', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.listen(port, () => console.log(`Listening on ${port}`));
