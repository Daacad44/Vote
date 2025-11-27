import nodemailer from "nodemailer";
import { env } from "../config/env";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const hasSmtp =
  env.SMTP_HOST &&
  env.SMTP_PORT &&
  env.SMTP_USER &&
  env.SMTP_PASSWORD;

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    })
  : nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });

export async function sendEmail(payload: EmailPayload) {
  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      ...payload,
      text: payload.text ?? payload.html.replace(/<[^>]+>/g, ""),
    });

    if (!hasSmtp) {
      console.info("[email] Preview messageId:", info.messageId);
    }
  } catch (error) {
    console.error("[email] Failed to send email", error);
    throw error;
  }
}
