import requests
from django.conf import settings


class PaystackService:
    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY
        self.base_url = "https://api.paystack.co"
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    def initialize_transaction(self, email, amount, callback_url, metadata=None):
        # Paystack expects amount in cents
        amount_cents = int(float(amount) * 100)

        url = f"{self.base_url}/transaction/initialize"
        payload = {
            "email": email,
            "amount": amount_cents,
            "callback_url": callback_url,
            "currency": "ZAR",
        }

        if metadata:
            payload["metadata"] = metadata

        response = requests.post(url, headers=self.headers, json=payload)

        if response.status_code == 200:
            return response.json()

        raise Exception(response.text)
