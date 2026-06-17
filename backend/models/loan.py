import uuid
from datetime import datetime
from extensions import db


class Loan(db.Model):
    __tablename__ = 'loans'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    loan_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    account_id = db.Column(db.String(36), db.ForeignKey('accounts.id'), nullable=False)

    loan_type = db.Column(db.String(30), nullable=False)
    # Types: personal, business, mortgage, auto, salary_advance, sme, education, agricultural

    amount_requested = db.Column(db.Numeric(15, 2), nullable=False)
    amount_approved = db.Column(db.Numeric(15, 2))
    outstanding_balance = db.Column(db.Numeric(15, 2))
    total_paid = db.Column(db.Numeric(15, 2), default=0.00)

    interest_rate = db.Column(db.Numeric(5, 2), nullable=False)
    interest_type = db.Column(db.String(20), default='reducing')  # flat, reducing, compound
    processing_fee = db.Column(db.Numeric(15, 2), default=0.00)
    processing_fee_rate = db.Column(db.Numeric(5, 2), default=2.0)
    insurance_fee = db.Column(db.Numeric(15, 2), default=0.00)

    tenure_months = db.Column(db.Integer, nullable=False)
    monthly_payment = db.Column(db.Numeric(15, 2))
    total_repayment = db.Column(db.Numeric(15, 2))
    total_interest = db.Column(db.Numeric(15, 2))

    purpose = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)

    status = db.Column(db.String(20), default='pending')
    # Statuses: pending, under_review, approved, disbursed, active, completed, rejected, defaulted, cancelled

    application_date = db.Column(db.DateTime, default=datetime.utcnow)
    review_date = db.Column(db.DateTime)
    approval_date = db.Column(db.DateTime)
    disbursement_date = db.Column(db.DateTime)
    expected_completion_date = db.Column(db.Date)
    actual_completion_date = db.Column(db.Date)
    next_payment_date = db.Column(db.Date)

    # Collateral
    collateral_type = db.Column(db.String(100))
    collateral_value = db.Column(db.Numeric(15, 2))
    collateral_description = db.Column(db.Text)
    collateral_document = db.Column(db.String(255))

    # Guarantor
    guarantor_name = db.Column(db.String(255))
    guarantor_phone = db.Column(db.String(20))
    guarantor_email = db.Column(db.String(255))
    guarantor_relationship = db.Column(db.String(50))
    guarantor_ghana_card = db.Column(db.String(20))
    guarantor_address = db.Column(db.String(500))

    # Processing
    processed_by = db.Column(db.String(36))
    approved_by = db.Column(db.String(36))
    disbursed_by = db.Column(db.String(36))
    rejection_reason = db.Column(db.Text)
    admin_notes = db.Column(db.Text)

    # Delinquency
    missed_payments = db.Column(db.Integer, default=0)
    days_past_due = db.Column(db.Integer, default=0)
    penalty_amount = db.Column(db.Numeric(15, 2), default=0.00)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    repayments = db.relationship('LoanRepayment', backref='loan', lazy='dynamic', order_by='LoanRepayment.installment_number')

    def to_dict(self):
        return {
            'id': self.id,
            'loan_number': self.loan_number,
            'user_id': self.user_id,
            'account_id': self.account_id,
            'loan_type': self.loan_type,
            'amount_requested': float(self.amount_requested),
            'amount_approved': float(self.amount_approved) if self.amount_approved else None,
            'outstanding_balance': float(self.outstanding_balance) if self.outstanding_balance else None,
            'total_paid': float(self.total_paid),
            'interest_rate': float(self.interest_rate),
            'interest_type': self.interest_type,
            'processing_fee': float(self.processing_fee),
            'tenure_months': self.tenure_months,
            'monthly_payment': float(self.monthly_payment) if self.monthly_payment else None,
            'total_repayment': float(self.total_repayment) if self.total_repayment else None,
            'total_interest': float(self.total_interest) if self.total_interest else None,
            'purpose': self.purpose,
            'status': self.status,
            'application_date': self.application_date.isoformat() if self.application_date else None,
            'approval_date': self.approval_date.isoformat() if self.approval_date else None,
            'disbursement_date': self.disbursement_date.isoformat() if self.disbursement_date else None,
            'expected_completion_date': self.expected_completion_date.isoformat() if self.expected_completion_date else None,
            'next_payment_date': self.next_payment_date.isoformat() if self.next_payment_date else None,
            'collateral_type': self.collateral_type,
            'collateral_value': float(self.collateral_value) if self.collateral_value else None,
            'guarantor_name': self.guarantor_name,
            'guarantor_phone': self.guarantor_phone,
            'rejection_reason': self.rejection_reason,
            'missed_payments': self.missed_payments,
            'days_past_due': self.days_past_due,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class LoanRepayment(db.Model):
    __tablename__ = 'loan_repayments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    installment_number = db.Column(db.Integer, nullable=False)
    due_date = db.Column(db.Date, nullable=False)

    principal_amount = db.Column(db.Numeric(15, 2), nullable=False)
    interest_amount = db.Column(db.Numeric(15, 2), nullable=False)
    total_amount = db.Column(db.Numeric(15, 2), nullable=False)
    penalty_amount = db.Column(db.Numeric(15, 2), default=0.00)

    paid_amount = db.Column(db.Numeric(15, 2), default=0.00)
    payment_date = db.Column(db.DateTime)

    status = db.Column(db.String(20), default='pending')  # pending, paid, overdue, partial, waived
    transaction_id = db.Column(db.String(36))
    processed_by = db.Column(db.String(36))
    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'loan_id': self.loan_id,
            'installment_number': self.installment_number,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'principal_amount': float(self.principal_amount),
            'interest_amount': float(self.interest_amount),
            'total_amount': float(self.total_amount),
            'penalty_amount': float(self.penalty_amount),
            'paid_amount': float(self.paid_amount),
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'status': self.status,
        }
