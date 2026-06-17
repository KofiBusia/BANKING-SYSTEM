import re
import uuid
import random
import string
from datetime import datetime, date
from decimal import Decimal


def generate_account_number(account_type: str = 'savings') -> str:
    prefixes = {
        'savings': '10',
        'current': '20',
        'fixed_deposit': '30',
        'susu': '40',
        'student': '50',
        'business': '60',
    }
    prefix = prefixes.get(account_type, '10')
    random_digits = ''.join([str(random.randint(0, 9)) for _ in range(8)])
    return f"{prefix}{random_digits}"


def generate_loan_number() -> str:
    year = datetime.utcnow().strftime('%Y')
    random_part = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    return f"LN{year}{random_part}"


def generate_transaction_reference() -> str:
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"TXN{timestamp}{random_part}"


def generate_otp(length: int = 6) -> str:
    return ''.join([str(random.randint(0, 9)) for _ in range(length)])


def generate_reset_token() -> str:
    return str(uuid.uuid4()).replace('-', '') + str(uuid.uuid4()).replace('-', '')


def generate_staff_id() -> str:
    year = datetime.utcnow().strftime('%y')
    random_part = ''.join([str(random.randint(0, 9)) for _ in range(4)])
    return f"GHB{year}{random_part}"


def validate_ghana_card(card_number: str) -> bool:
    pattern = r'^GHA-\d{9}-\d$'
    return bool(re.match(pattern, card_number.upper().strip()))


def validate_ghana_phone(phone: str) -> bool:
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    # Accepts: 0XX..., +233XX..., 233XX...
    pattern = r'^(\+?233|0)(2[0-9]|5[0-9])\d{7}$'
    return bool(re.match(pattern, cleaned))


def normalize_phone(phone: str) -> str:
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    if cleaned.startswith('+233'):
        return '0' + cleaned[4:]
    elif cleaned.startswith('233'):
        return '0' + cleaned[3:]
    return cleaned


def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, 'Password must be at least 8 characters long'
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter'
    if not re.search(r'[a-z]', password):
        return False, 'Password must contain at least one lowercase letter'
    if not re.search(r'\d', password):
        return False, 'Password must contain at least one digit'
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, 'Password must contain at least one special character'
    return True, 'Valid'


def calculate_loan_repayment(principal: float, annual_rate: float, months: int, interest_type: str = 'reducing') -> dict:
    monthly_rate = annual_rate / 100 / 12

    if interest_type == 'flat':
        total_interest = principal * (annual_rate / 100) * (months / 12)
        total_repayment = principal + total_interest
        monthly_payment = total_repayment / months
        schedule = []
        principal_per_month = principal / months
        interest_per_month = total_interest / months
        balance = principal
        for i in range(1, months + 1):
            balance -= principal_per_month
            schedule.append({
                'installment': i,
                'principal': round(principal_per_month, 2),
                'interest': round(interest_per_month, 2),
                'total': round(monthly_payment, 2),
                'balance': round(max(balance, 0), 2),
            })

    elif interest_type == 'reducing':
        if monthly_rate == 0:
            monthly_payment = principal / months
        else:
            monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** months) / ((1 + monthly_rate) ** months - 1)

        total_repayment = monthly_payment * months
        total_interest = total_repayment - principal
        schedule = []
        balance = principal
        for i in range(1, months + 1):
            interest = balance * monthly_rate
            principal_paid = monthly_payment - interest
            balance -= principal_paid
            schedule.append({
                'installment': i,
                'principal': round(principal_paid, 2),
                'interest': round(interest, 2),
                'total': round(monthly_payment, 2),
                'balance': round(max(balance, 0), 2),
            })
    else:
        # compound
        total_repayment = principal * (1 + monthly_rate) ** months
        total_interest = total_repayment - principal
        monthly_payment = total_repayment / months
        schedule = []
        balance = principal
        for i in range(1, months + 1):
            interest = balance * monthly_rate
            balance = balance * (1 + monthly_rate) - monthly_payment
            schedule.append({
                'installment': i,
                'principal': round(monthly_payment - interest, 2),
                'interest': round(interest, 2),
                'total': round(monthly_payment, 2),
                'balance': round(max(balance, 0), 2),
            })

    return {
        'monthly_payment': round(monthly_payment, 2),
        'total_repayment': round(total_repayment, 2),
        'total_interest': round(total_interest, 2),
        'schedule': schedule,
    }


def calculate_kyc_completion(user, kyc_info, documents) -> int:
    score = 20  # Base: registration done
    if user.ghana_card_number:
        score += 10
    if kyc_info:
        if kyc_info.date_of_birth:
            score += 5
        if kyc_info.residential_address:
            score += 5
        if kyc_info.region:
            score += 5
        if kyc_info.employment_status:
            score += 5
        if kyc_info.source_of_funds:
            score += 5
        if kyc_info.nok_first_name:
            score += 10
        if kyc_info.tin_number:
            score += 5
        if kyc_info.digital_address:
            score += 5
    doc_types = [d.document_type for d in documents]
    if 'ghana_card_front' in doc_types:
        score += 10
    if 'ghana_card_back' in doc_types:
        score += 5
    if 'selfie' in doc_types:
        score += 5
    if 'utility_bill' in doc_types or 'bank_statement' in doc_types:
        score += 5
    return min(score, 100)


def format_currency(amount: float, currency: str = 'GHS') -> str:
    if currency == 'GHS':
        return f'GHS {amount:,.2f}'
    return f'{currency} {amount:,.2f}'


def mask_account_number(account_number: str) -> str:
    if len(account_number) <= 4:
        return account_number
    return '*' * (len(account_number) - 4) + account_number[-4:]


def mask_phone(phone: str) -> str:
    if len(phone) <= 4:
        return phone
    return phone[:3] + '*' * (len(phone) - 6) + phone[-3:]


def get_client_ip(request) -> str:
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr or 'unknown'
