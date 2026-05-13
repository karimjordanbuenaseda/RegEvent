import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

logger = logging.getLogger(__name__)


def _build_checkin_html(name: str, event_title: str, checkin_url: str) -> str:
    display_name = name or "there"
    primary = "#81A6C6"
    accent = "#AACDDC"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Check-in Link</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header gradient -->
          <tr>
            <td style="background:linear-gradient(to right,{primary},{accent});padding:28px 40px;">
              <p style="margin:0;color:#ffffff;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">RegEvent</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">{event_title}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">Hi <strong>{display_name}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                You're registered for <strong>{event_title}</strong>. Use the button below to check in on the day of the event — it also serves as your ticket.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td align="center" style="border-radius:8px;background:{primary};">
                    <a href="{checkin_url}"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Check In Now
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Or copy this link into your browser:</p>
              <p style="margin:0;font-size:12px;color:{primary};word-break:break-all;">{checkin_url}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
                Sent by RegEvent &mdash; if you didn't register for this event, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_revoke_html(name: str, event_title: str) -> str:
    display_name = name or "there"
    primary = "#81A6C6"
    accent = "#AACDDC"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registration Revoked</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(to right,{primary},{accent});padding:28px 40px;">
              <p style="margin:0;color:#ffffff;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">RegEvent</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">{event_title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">Hi <strong>{display_name}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                We're writing to let you know that your registration for <strong>{event_title}</strong> has been revoked by the event organizer. Your check-in link is no longer valid.
              </p>
              <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;">
                If you believe this was a mistake, please reach out to the event organizer directly.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
                Sent by RegEvent &mdash; this notification was generated automatically.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_revoke_email(to: str, name: str, event_title: str) -> None:
    smtp_host = os.environ.get("SMTP_HOST", "mailpit")
    smtp_port = int(os.environ.get("SMTP_PORT", "1025"))
    smtp_user = os.environ.get("SMTP_USER", "") or None
    smtp_password = os.environ.get("SMTP_PASSWORD", "") or None
    smtp_from = os.environ.get("SMTP_FROM", "noreply@regevent.local")
    use_tls = os.environ.get("SMTP_TLS", "false").lower() == "true"
    start_tls = os.environ.get("SMTP_STARTTLS", "false").lower() == "true"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your registration for {event_title} has been revoked"
    msg["From"] = smtp_from
    msg["To"] = to

    msg.attach(MIMEText(_build_revoke_html(name, event_title), "html"))

    send_kwargs: dict = dict(
        hostname=smtp_host,
        port=smtp_port,
        username=smtp_user,
        password=smtp_password,
    )
    if use_tls:
        send_kwargs["use_tls"] = True
    elif start_tls:
        send_kwargs["start_tls"] = True

    try:
        await aiosmtplib.send(msg, **send_kwargs)
        logger.info("[email] Revoke email sent to %s", to)
    except Exception:
        logger.exception("[email] Failed to send revoke email to %s", to)


def _build_cancellation_html(name: str, event_title: str) -> str:
    display_name = name or "there"
    primary = "#81A6C6"
    accent = "#AACDDC"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Event Cancelled</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(to right,{primary},{accent});padding:28px 40px;">
              <p style="margin:0;color:#ffffff;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">RegEvent</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">{event_title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">Hi <strong>{display_name}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                We regret to inform you that <strong>{event_title}</strong> has been <strong>cancelled</strong> by the organizer. Your registration has been removed and your check-in link is no longer valid.
              </p>
              <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;">
                If you have any questions, please reach out to the event organizer directly.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
                Sent by RegEvent &mdash; this notification was generated automatically.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_cancellation_email(to: str, name: str, event_title: str) -> None:
    smtp_host = os.environ.get("SMTP_HOST", "mailpit")
    smtp_port = int(os.environ.get("SMTP_PORT", "1025"))
    smtp_user = os.environ.get("SMTP_USER", "") or None
    smtp_password = os.environ.get("SMTP_PASSWORD", "") or None
    smtp_from = os.environ.get("SMTP_FROM", "noreply@regevent.local")
    use_tls = os.environ.get("SMTP_TLS", "false").lower() == "true"
    start_tls = os.environ.get("SMTP_STARTTLS", "false").lower() == "true"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{event_title} has been cancelled"
    msg["From"] = smtp_from
    msg["To"] = to

    msg.attach(MIMEText(_build_cancellation_html(name, event_title), "html"))

    send_kwargs: dict = dict(
        hostname=smtp_host,
        port=smtp_port,
        username=smtp_user,
        password=smtp_password,
    )
    if use_tls:
        send_kwargs["use_tls"] = True
    elif start_tls:
        send_kwargs["start_tls"] = True

    try:
        await aiosmtplib.send(msg, **send_kwargs)
        logger.info("[email] Cancellation email sent to %s", to)
    except Exception:
        logger.exception("[email] Failed to send cancellation email to %s", to)


async def send_checkin_email(to: str, name: str, event_title: str, checkin_url: str) -> None:
    smtp_host = os.environ.get("SMTP_HOST", "mailpit")
    smtp_port = int(os.environ.get("SMTP_PORT", "1025"))
    smtp_user = os.environ.get("SMTP_USER", "") or None
    smtp_password = os.environ.get("SMTP_PASSWORD", "") or None
    smtp_from = os.environ.get("SMTP_FROM", "noreply@regevent.local")
    use_tls = os.environ.get("SMTP_TLS", "false").lower() == "true"
    start_tls = os.environ.get("SMTP_STARTTLS", "false").lower() == "true"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your check-in link for {event_title}"
    msg["From"] = smtp_from
    msg["To"] = to

    msg.attach(MIMEText(_build_checkin_html(name, event_title, checkin_url), "html"))

    send_kwargs: dict = dict(
        hostname=smtp_host,
        port=smtp_port,
        username=smtp_user,
        password=smtp_password,
    )
    # use_tls and start_tls are mutually exclusive — only pass the active one
    if use_tls:
        send_kwargs["use_tls"] = True
    elif start_tls:
        send_kwargs["start_tls"] = True

    try:
        await aiosmtplib.send(msg, **send_kwargs)
        logger.info("[email] Check-in email sent to %s", to)
    except Exception:
        logger.exception("[email] Failed to send check-in email to %s", to)
