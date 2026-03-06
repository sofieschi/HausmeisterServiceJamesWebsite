import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, telefon, nachricht } = req.body;

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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Email failed" });
  }
}
