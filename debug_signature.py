import hashlib
import urllib.parse

# Production Credentials
MERCHANT_ID = '32963323'
MERCHANT_KEY = '16d8hpaaicfyc'
PASSPHRASE = 'MedMap.2025.'

def generate_signature(data, passphrase=None):
    payload = ""
    # 1. Sort by key
    for key in sorted(data.keys()):
        if data[key] is not None and data[key] != "":
            # 2. Encode value
            value = urllib.parse.quote_plus(str(data[key]))
            payload += f"{key}={value}&"
    
    # Remove trailing & if we are going to append passphrase?
    # Logic in services.py: 
    # if passphrase: payload += ... (it keeps the trailing & from loop)
    # else: payload = payload[:-1]
    
    # PayFast Guide: "Get the string... name=Value&...&passphrase=salt"
    # So if payload is "name=Value&", then adding "passphrase=salt" makes "name=Value&passphrase=salt"
    
    if passphrase:
        payload += f"passphrase={urllib.parse.quote_plus(passphrase)}"
    elif payload.endswith('&'):
        payload = payload[:-1]
        
    print(f"\nString to Hash:\n{payload}")
    return hashlib.md5(payload.encode()).hexdigest()

# Simulate Membership Payment Data
amount_rands = 39.00
data = {
    "merchant_id": MERCHANT_ID,
    "merchant_key": MERCHANT_KEY,
    "return_url": "https://medmap.co.za/memberships?status=success",
    "cancel_url": "https://medmap.co.za/memberships?status=cancelled",
    "notify_url": "https://medmap-backend-6t7y.onrender.com/api/payments/notify/",
    "amount": f"{amount_rands:.2f}",
    "item_name": "Premium membership (quarterly)",
    "custom_str1": "membership_123_premium",
    "email_address": "test@medmap.co.za",
    "name_first": "John",
    "name_last": "Doe"
}

# Clean data
clean_data = {k: v for k, v in data.items() if v is not None and v != ""}

print("--- Data being signed ---")
for k, v in clean_data.items():
    print(f"{k}: {v}")

sig = generate_signature(clean_data, PASSPHRASE)
print(f"\nGenerated Signature (Standard quote_plus): {sig}")

# Test Variation: Don't encode parens
def generate_signature_loose(data, passphrase=None):
    payload = ""
    for key in sorted(data.keys()):
        if data[key] is not None and data[key] != "":
            # Custom encoding: encode spaces to +, but leave parens?
            # Actually, let's just see what happens if we use quote instead of quote_plus
            # quote encodes spaces to %20. PayFast wants +.
            
            value = urllib.parse.quote_plus(str(data[key]))
            # Manually unquote parens to simulate browser behavior if needed?
            # value = value.replace('%28', '(').replace('%29', ')')
            payload += f"{key}={value}&"
    
    if passphrase:
        payload += f"passphrase={urllib.parse.quote_plus(passphrase)}"
    elif payload.endswith('&'):
        payload = payload[:-1]
    return hashlib.md5(payload.encode()).hexdigest()

# Test Variation: PHP style urlencode (spaces as +)
# Python quote_plus matches PHP urlencode.
