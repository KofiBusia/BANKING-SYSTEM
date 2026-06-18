import uuid
from datetime import datetime
from extensions import db


class AccountProduct(db.Model):
    __tablename__ = 'account_products'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(30), unique=True, nullable=False)  # e.g. savings_basic
    account_type = db.Column(db.String(30), nullable=False)       # savings, current, fixed_deposit, student, business, susu

    description = db.Column(db.Text)
    features = db.Column(db.Text)  # newline-separated bullet points

    interest_rate = db.Column(db.Numeric(6, 3), default=0.000)
    min_balance = db.Column(db.Numeric(15, 2), default=0.00)
    min_opening_deposit = db.Column(db.Numeric(15, 2), default=0.00)
    monthly_fee = db.Column(db.Numeric(10, 2), default=0.00)

    overdraft_enabled = db.Column(db.Boolean, default=False)
    overdraft_limit = db.Column(db.Numeric(15, 2), default=0.00)

    kyc_required = db.Column(db.String(20), default='basic')  # basic, pending, verified

    is_active = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'account_type': self.account_type,
            'description': self.description,
            'features': self.features.split('\n') if self.features else [],
            'interest_rate': float(self.interest_rate) if self.interest_rate is not None else 0.0,
            'min_balance': float(self.min_balance) if self.min_balance is not None else 0.0,
            'min_opening_deposit': float(self.min_opening_deposit) if self.min_opening_deposit is not None else 0.0,
            'monthly_fee': float(self.monthly_fee) if self.monthly_fee is not None else 0.0,
            'overdraft_enabled': self.overdraft_enabled,
            'overdraft_limit': float(self.overdraft_limit) if self.overdraft_limit is not None else 0.0,
            'kyc_required': self.kyc_required,
            'is_active': self.is_active,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<AccountProduct {self.code}>'
