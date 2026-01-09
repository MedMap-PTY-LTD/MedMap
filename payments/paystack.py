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
        """
        Initialize a transaction on Paystack.
        :param email: Customer's email
        :param amount: Amount in ZAR (will be converted to cents)
        :param callback_url: URL to redirect to after payment
        :param metadata: Optional metadata dict
        :return: Dict with authorization_url, access_code, reference
        """
        # Paystack expects amount in cents (kobo/cents)
        # ZAR 1.00 = 100 cents
        amount_cents = int(float(amount) * 100)
        
        url = f"{self.base_url}/transaction/initialize"
        data = {
            "email": email,
            "amount": amount_cents,
            "callback_url": callback_url,
            "currency": "ZAR",
        }
        if metadata:
            data["metadata"] = metadata

        response = requests.post(url, headers=self.headers, json=data)
        
        if response.status_code == 200:
            return response.json()
        
        # Raise exception or return error dict
        try:
            error_data = response.json()
            error_msg = error_data.get('message', 'Unknown Paystack error')
        except:
            error_msg = response.text
            
        raise Exception(f"Paystack Error: {error_msg}")

    def verify_transaction(self, reference):
        """
        Verify a transaction on Paystack.
        :param reference: Transaction reference
        :return: Dict with transaction status and data
        """
        url = f"{self.base_url}/transaction/verify/{reference}"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()
            
        raise Exception(f"Failed to verify transaction: {response.text}")
