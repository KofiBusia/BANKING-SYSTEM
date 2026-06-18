import uuid
from datetime import datetime
from extensions import db


class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reference = db.Column(db.String(50), unique=True, nullable=False, index=True)
    account_id = db.Column(db.String(36), db.ForeignKey('accounts.id'), nullable=False, index=True)
    transaction_type = db.Column(db.String(30), nullable=False)
    # Types: deposit, withdrawal, transfer_in, transfer_out, loan_disbursement,
    #        loan_repayment, interest_credit, fee, charge, reversal, mobile_money_in,
    #        mobile_money_out, pos, atm_withdrawal

    amount = db.Column(db.Numeric(15, 2), nullable=False)
    fee = db.Column(db.Numeric(15, 2), default=0.00)
    balance_before = db.Column(db.Numeric(15, 2), nullable=False)
    balance_after = db.Column(db.Numeric(15, 2), nullable=False)
    currency = db.Column(db.String(3), default='GHS')

    description = db.Column(db.String(500))
    narration = db.Column(db.String(500))

    channel = db.Column(db.String(30))  # branch, mobile, online, atm, pos, ussd, mobile_money
    status = db.Column(db.String(20), default='completed')  # pending, completed, failed, reversed

    counterparty_account = db.Column(db.String(30))
    counterparty_name = db.Column(db.String(255))
    counterparty_bank = db.Column(db.String(100))
    counterparty_phone = db.Column(db.String(20))

    processed_by = db.Column(db.String(36))
    branch_id = db.Column(db.String(36))
    reversal_ref = db.Column(db.String(50))

    metadata_json = db.Column(db.Text)

    value_date = db.Column(db.Date, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'reference': self.reference,
            'account_id': self.account_id,
            'transaction_type': self.transaction_type,
            'amount': float(self.amount) if self.amount is not None else 0.0,
            'fee': float(self.fee) if self.fee is not None else 0.0,
            'balance_before': float(self.balance_before) if self.balance_before is not None else 0.0,
            'balance_after': float(self.balance_after) if self.balance_after is not None else 0.0,
            'currency': self.currency,
            'description': self.description,
            'narration': self.narration,
            'channel': self.channel,
            'status': self.status,
            'counterparty_account': self.counterparty_account,
            'counterparty_name': self.counterparty_name,
            'counterparty_bank': self.counterparty_bank,
            'counterparty_phone': self.counterparty_phone,
            'value_date': self.value_date.isoformat() if self.value_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Transaction {self.reference}>'
