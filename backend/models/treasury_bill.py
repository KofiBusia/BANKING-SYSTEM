import uuid
from datetime import datetime
from extensions import db


class TreasuryBill(db.Model):
    __tablename__ = 'treasury_bills'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reference = db.Column(db.String(30), unique=True, nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    account_id = db.Column(db.String(36), db.ForeignKey('accounts.id'), nullable=False)

    # Investment details
    principal = db.Column(db.Numeric(15, 2), nullable=False)
    interest_rate = db.Column(db.Numeric(5, 2), nullable=False)  # annual rate e.g. 29.5
    tenure_days = db.Column(db.Integer, nullable=False, default=364)

    # Returns
    interest_earned = db.Column(db.Numeric(15, 2), default=0.00)
    withholding_tax = db.Column(db.Numeric(15, 2), default=0.00)  # 8% WHT in Ghana
    net_interest = db.Column(db.Numeric(15, 2), default=0.00)
    maturity_value = db.Column(db.Numeric(15, 2), default=0.00)

    # Dates
    investment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    maturity_date = db.Column(db.Date, nullable=False)
    actual_maturity_date = db.Column(db.Date)

    # Status
    status = db.Column(db.String(20), default='active')
    # Statuses: active, matured, rolled_over, liquidated, cancelled

    # Rollover
    rolled_over_to = db.Column(db.String(36))   # ID of new T-bill if rolled over
    rolled_over_from = db.Column(db.String(36))  # ID of previous T-bill if this is a rollover

    # Maturity notification
    maturity_alert_sent = db.Column(db.Boolean, default=False)
    pre_maturity_alert_sent = db.Column(db.Boolean, default=False)  # 7-day pre-maturity alert

    # Processing
    processed_by = db.Column(db.String(36))
    maturity_disbursement_txn = db.Column(db.String(36))
    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'reference': self.reference,
            'user_id': self.user_id,
            'account_id': self.account_id,
            'principal': float(self.principal),
            'interest_rate': float(self.interest_rate),
            'tenure_days': self.tenure_days,
            'interest_earned': float(self.interest_earned),
            'withholding_tax': float(self.withholding_tax),
            'net_interest': float(self.net_interest),
            'maturity_value': float(self.maturity_value),
            'investment_date': self.investment_date.isoformat() if self.investment_date else None,
            'maturity_date': self.maturity_date.isoformat() if self.maturity_date else None,
            'actual_maturity_date': self.actual_maturity_date.isoformat() if self.actual_maturity_date else None,
            'status': self.status,
            'rolled_over_to': self.rolled_over_to,
            'rolled_over_from': self.rolled_over_from,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<TreasuryBill {self.reference}>'
