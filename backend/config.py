import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'crestline-dev-secret-key')
    _db_url = os.environ.get('DATABASE_URL', 'sqlite:///crestline.db')
    # Fix for SQLAlchemy compatibility with postgres:// URLs
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'crestline-jwt-secret')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'Crestline Solutions <noreply@crestlinesolutions.com>')

    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB max upload

    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

    BANK_NAME = os.environ.get('BANK_NAME', 'Crestline Solutions LTD')
    BANK_CODE = os.environ.get('BANK_CODE', 'CSL')
    BANK_SWIFT = os.environ.get('BANK_SWIFT', 'CSLKGHAC')
    BANK_SORT_CODE = os.environ.get('BANK_SORT_CODE', '040100')

    GHANA_REGIONS = [
        'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern',
        'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono',
        'Bono East', 'Ahafo', 'Western North', 'Oti', 'North East', 'Savannah'
    ]

    ACCOUNT_TYPES = {
        'savings': {'min_balance': 0, 'interest_rate': 3.5, 'name': 'Savings Account'},
        'current': {'min_balance': 0, 'interest_rate': 0, 'name': 'Current Account'},
        'fixed_deposit': {'min_balance': 500, 'interest_rate': 8.5, 'name': 'Fixed Deposit Account'},
        'susu': {'min_balance': 0, 'interest_rate': 2.0, 'name': 'Susu Account'},
        'student': {'min_balance': 0, 'interest_rate': 2.5, 'name': 'Student Account'},
        'business': {'min_balance': 0, 'interest_rate': 0, 'name': 'Business Account'},
    }

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
