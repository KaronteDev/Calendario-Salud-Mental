import nodemailer from "nodemailer";

type InvitationMailPayload = {
  to: string;
  inviteUrl: string;
  role: "admin" | "user";
  invitedByName: string;
};

type PasswordResetMailPayload = {
  to: string;
  resetUrl: string;
  userName: string;
};

function readSmtpConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM ?? "WellFlow <no-reply@wellflow.local>",
  };
}

export function isEmailConfigured() {
  const config = readSmtpConfig();
  return Boolean(config.host && config.user && config.pass);
}

export async function sendInvitationEmail(payload: InvitationMailPayload) {
  if (!isEmailConfigured()) {
    return {
      sent: false,
      error: "SMTP_NOT_CONFIGURED",
    } as const;
  }

  const config = readSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const subject = payload.role === "admin" ? "Invitación a WellFlow como administrador" : "Invitación a WellFlow";
  const html = `
    <div style="font-family:Arial,sans-serif;background:#081833;padding:32px;color:#edf4ff;">
      <div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,#0c2350,#071731);border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.35);">
        <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="letter-spacing:0.28em;text-transform:uppercase;font-size:12px;color:#d7b66e;margin-bottom:12px;">WellFlow</div>
          <h1 style="margin:0;font-size:30px;line-height:1.15;">Tu invitación está lista</h1>
          <p style="margin:14px 0 0;color:#afc2e4;font-size:15px;line-height:1.6;">${payload.invitedByName} te ha invitado a entrar en WellFlow con rol <strong>${payload.role}</strong>.</p>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 20px;color:#d9e6ff;line-height:1.7;">Abre el siguiente enlace para crear tu cuenta y acceder a tu calendario de bienestar.</p>
          <a href="${payload.inviteUrl}" style="display:inline-block;background:#2f7cf6;color:white;text-decoration:none;padding:14px 22px;border-radius:16px;font-weight:700;">Aceptar invitación</a>
          <p style="margin:24px 0 8px;color:#8ea8cf;font-size:13px;">Si el botón no funciona, copia este enlace:</p>
          <p style="margin:0;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,0.06);word-break:break-all;color:#f4f7ff;font-size:13px;">${payload.inviteUrl}</p>
        </div>
      </div>
    </div>
  `;

  const text = [
    "WellFlow",
    "",
    `${payload.invitedByName} te ha invitado a entrar en WellFlow con rol ${payload.role}.`,
    "",
    `Acepta la invitación aquí: ${payload.inviteUrl}`,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: config.from,
      to: payload.to,
      subject,
      html,
      text,
    });

    return { sent: true, error: null } as const;
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "SMTP_SEND_FAILED",
    } as const;
  }
}

export async function sendPasswordResetEmail(payload: PasswordResetMailPayload) {
  if (!isEmailConfigured()) {
    return {
      sent: false,
      error: "SMTP_NOT_CONFIGURED",
    } as const;
  }

  const config = readSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const subject = "Recupera tu acceso a WellFlow";
  const html = `
    <div style="font-family:Arial,sans-serif;background:#081833;padding:32px;color:#edf4ff;">
      <div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,#0c2350,#071731);border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.35);">
        <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="letter-spacing:0.28em;text-transform:uppercase;font-size:12px;color:#d7b66e;margin-bottom:12px;">WellFlow</div>
          <h1 style="margin:0;font-size:30px;line-height:1.15;">Recupera tu contraseña</h1>
          <p style="margin:14px 0 0;color:#afc2e4;font-size:15px;line-height:1.6;">Hola ${payload.userName}, hemos preparado un enlace para que puedas definir una nueva contraseña.</p>
        </div>
        <div style="padding:32px;">
          <a href="${payload.resetUrl}" style="display:inline-block;background:#2f7cf6;color:white;text-decoration:none;padding:14px 22px;border-radius:16px;font-weight:700;">Restablecer contraseña</a>
          <p style="margin:24px 0 8px;color:#8ea8cf;font-size:13px;">Si el botón no funciona, copia este enlace:</p>
          <p style="margin:0;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,0.06);word-break:break-all;color:#f4f7ff;font-size:13px;">${payload.resetUrl}</p>
        </div>
      </div>
    </div>
  `;

  const text = ["WellFlow", "", `Hola ${payload.userName}, restablece tu contraseña aquí: ${payload.resetUrl}`].join("\n");

  try {
    await transporter.sendMail({
      from: config.from,
      to: payload.to,
      subject,
      html,
      text,
    });

    return { sent: true, error: null } as const;
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "SMTP_SEND_FAILED",
    } as const;
  }
}