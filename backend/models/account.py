import uuid
from datetime import datetime
from extensions import db


class Account(db.Model):
    __tablename__ = 'accounts'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    branch_id = db.Column(db.String(36), db.ForeignKey('branches.id'))
    account_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    account_name = db.Column(db.String(255), nullable=False)
    account_type = db.Column(db.String(30), nullable=False)  # savings, current, fixed_deposit, susu, student, business
    currency = db.Column(db.String(3), default='GHS')

    balance = db.Column(db.Numeric(15, 2), default=0.00)
    available_balance = db.Column(db.Numeric(15, 2), default=0.00)
    ledger_balance = db.Column(db.Numeric(15, 2), default=0.00)

    interest_rate = db.Column(db.Numeric(5, 2), default=0.00)
    minimum_balance = db.Column(db.Numeric(15, 2), default=0.00)
    overdraft_limit = db.Column(db.Numeric(15, 2), default=0.00)
    overdraft_enabled = db.Column(db.Boolean, default=False)

    status = db.Column(db.String(20), default='active')  # active, dormant, frozen, closed

    # Fixed deposit specific
    maturity_date = db.Column(db.Date)
    fixed_term_months = db.Column(db.Integer)
    fixed_deposit_start_date = db.Column(db.Date)

    # Susu specific
    susu_amount = db.Column(db.Numeric(15, 2))
    susu_frequency = db.Column(db.String(20))  # daily, weekly, monthly
    susu_start_date = db.Column(db.Date)
    susu_target_date = db.Column(db.Date)

    last_transaction_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    transactions = db.relationship('Transaction', backref='account', lazy='dynamic',
                                   foreign_keys='Transaction.account_id')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'branch_id': self.branch_id,
            'account_number': self.account_number,
            'account_name': self.account_name,
            'account_type': self.account_type,
            'currency': self.currency,
            'balance': float(self.balance),
            'available_balance': float(self.available_balance),
            'ledger_balance': float(self.ledger_balance),
            'interest_rate': float(self.interest_rate),
            'minimum_balance': float(self.minimum_balance),
            'overdraft_limit': float(self.overdraft_limit),
            'overdraft_enabled': self.overdraft_enabled,
            'status': self.status,
            'maturity_date': self.maturity_date.isoformat() if self.maturity_date else None,
            'fixed_term_months': self.fixed_term_months,
            'last_transaction_date': self.last_transaction_date.isoformat() if self.last_transaction_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Account {self.account_number}>'
