"""Development email backend: prints to console and saves each message as a .txt file."""

import os
from datetime import datetime
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings


class FileConsoleEmailBackend(BaseEmailBackend):
    """
    Writes every outbound email to backend/sent_emails/ and prints to the terminal.
    Use for local development when SMTP is not configured.
    """

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        out_dir = getattr(settings, "EMAIL_FILE_PATH", None)
        if not out_dir:
            out_dir = str(settings.BASE_DIR / "sent_emails")
        os.makedirs(out_dir, exist_ok=True)

        sent = 0
        for message in email_messages:
            recipients = message.to or []
            subject = message.subject or "(no subject)"
            body = message.body or ""

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            safe_to = (recipients[0] if recipients else "unknown").replace("@", "_at_")
            filename = f"{timestamp}_{safe_to}.txt"
            filepath = os.path.join(out_dir, filename)

            file_content = (
                f"To: {', '.join(recipients)}\n"
                f"From: {message.from_email}\n"
                f"Subject: {subject}\n"
                f"Date: {datetime.now().isoformat()}\n"
                f"{'=' * 60}\n\n"
                f"{body}\n"
            )

            try:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(file_content)
            except OSError:
                pass

            print("\n" + "=" * 60)
            print(f"EMAIL SAVED: {filepath}")
            print(f"To: {', '.join(recipients)}")
            print(f"Subject: {subject}")
            print("-" * 60)
            print(body)
            print("=" * 60 + "\n")

            sent += 1

        return sent
