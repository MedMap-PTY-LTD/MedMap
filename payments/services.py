import hashlib
import urllib.parse
from django.conf import settings
import os

class PayFastService:
    def __init__(self):
        # Live credentials by default
        self.merchant_id = settings.MERCHANT_ID
        self.merchant_key = settings.MERCHANT_KEY
        self.passphrase = settings.PASSPHRASE
        self.base_url = 'https://sandbox.payfast.co.za' if getattr(settings, 'PAYFAST_SANDBOX', True) else 'https://www.payfast.co.za'

        if getattr(settings, 'PAYFAST_SANDBOX', True):
            # Sandbox test credentials (ignore live creds)
            self.merchant_id = '10000100'
            self.merchant_key = '46f0cd694581a'

    def _generate_signature(self, data: dict) -> str:
        """
        Generate PayFast signature for this class
        """
        clean_data = {k: str(v).strip() for k, v in data.items() if v is not None and str(v).strip() != "" and k != "signature"}
        sorted_keys = sorted(clean_data.keys())
        
        payload = ""
        for key in sorted_keys:
            value = str(clean_data[key])
            payload += f"{key}={urllib.parse.quote_plus(value)}&"

        payload = payload.rstrip("&")
        if self.passphrase:
            payload += f"&passphrase={self.passphrase}"

        return hashlib.md5(payload.encode("utf-8")).hexdigest()

    def create_payment_form_data(
        self,
        amount: float,
        item_name: str,
        return_url: str,
        cancel_url: str,
        email: str = None,
        first_name: str = None,
        last_name: str = None,
        custom_str1: str = None,
        notify_url: str = None
    ) -> dict:

        # Determine notify URL
        if not notify_url:
            notify_url = os.environ.get('PAYFAST_NOTIFY_URL')
        if not notify_url and hasattr(settings, 'PAYFAST_NOTIFY_URL'):
            notify_url = settings.PAYFAST_NOTIFY_URL
        if not notify_url:
            # fallback to frontend or local
            base_domain = settings.CORS_ALLOWED_ORIGINS[0] if getattr(settings, 'CORS_ALLOWED_ORIGINS', None) else 'http://localhost:8000'
            notify_url = f"{base_domain}/api/payments/notify/"

        data = {
            'merchant_id': self.merchant_id,
            'merchant_key': self.merchant_key,
            'return_url': return_url,
            'cancel_url': cancel_url,
            'notify_url': notify_url,
            'amount': f"{amount:.2f}",
            'item_name': item_name,
        }
        if email:
            data['email_address'] = email
        if first_name:
            data['name_first'] = first_name
        if last_name:
            data['name_last'] = last_name
        if custom_str1:
            data['custom_str1'] = custom_str1

        # Add correct signature
        data['signature'] = self._generate_signature(data)
        return data

    def generate_payment_url(self, data: dict) -> str:
        """
        Generate the full PayFast process URL with query string
        """
        if 'signature' not in data:
            data['signature'] = self._generate_signature(data)

        sorted_keys = sorted(data.keys())
        query_parts = []
        for key in sorted_keys:
            if data[key] is not None and data[key] != "":
                query_parts.append(f"{key}={urllib.parse.quote_plus(str(data[key]))}")

        query_string = "&".join(query_parts)
        return f"{self.base_url}/eng/process?{query_string}"


def generate_payfast_signature(data: dict) -> str:
    """
    Standalone function for generating PayFast signature (used in views)
    """
    clean_data = {k: str(v).strip() for k, v in data.items() if v is not None and str(v).strip() != "" and k != "signature"}
    sorted_keys = sorted(clean_data.keys())

    payload = ""
    for key in sorted_keys:
        value = str(clean_data[key])
        payload += f"{key}={urllib.parse.quote_plus(value)}&"

    payload = payload.rstrip("&")
    if getattr(settings, "PASSPHRASE", None):
        payload += f"&passphrase={settings.PASSPHRASE}"

    return hashlib.md5(payload.encode("utf-8")).hexdigest()
