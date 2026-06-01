from django.contrib.auth.tokens import PasswordResetTokenGenerator

class EmailSentTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return (
            str(user.pk) +
            str(user.password) +
            str(timestamp)
        )

token_generator = EmailSentTokenGenerator()