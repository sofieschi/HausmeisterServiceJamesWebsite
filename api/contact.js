import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, telefon, nachricht, website } = req.body;

    if (website) {
      return res.status(200).json({ success: true });
    }

    if (!name || !email || !nachricht) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await resend.emails.send({
      from: "Website Anfrage <onboarding@resend.dev>",
      to: "sofie.schi@gmail.com",
      subject: "Neue Anfrage über die Website",
      text: `
Name: ${name}
Email: ${email}
Telefon: ${telefon || "nicht angegeben"}

Nachricht:
${nachricht}
`,
    });

    try {
      await resend.emails.send({
        from: "Hausmeisterservice James GbR <onboarding@resend.dev>",
        to: email,
        subject: "Vielen Dank für Ihre Anfrage | Hausmeisterservice James GbR",
        text: `Hallo ${name},

vielen Dank für Ihre Anfrage an Hausmeisterservice James GbR.

Wir haben Ihre Nachricht erhalten und melden uns schnellstmöglich bei Ihnen zurück.

Ihre Angaben:
Name: ${name}
E-Mail: ${email}
Telefon: ${telefon || "nicht angegeben"}

Nachricht:
${nachricht}

Freundliche Grüße
Hausmeisterservice James GbR`,
      });
    } catch (confirmationError) {
      console.error("Confirmation email failed:", confirmationError);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Email failed" });
  }
}
