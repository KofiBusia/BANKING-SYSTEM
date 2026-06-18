import uuid
from datetime import datetime
from extensions import db


class TBillRate(db.Model):
    __tablename__ = 'tbill_rates'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenure_days = db.Column(db.Integer, unique=True, nullable=False)
    label = db.Column(db.String(50), nullable=False)          # e.g. "91-Day Bill"
    annual_rate = db.Column(db.Numeric(6, 3), nullable=False) # e.g. 26.500
    withholding_tax_rate = db.Column(db.Numeric(5, 2), default=8.00)
    min_investment = db.Column(db.Numeric(15, 2), default=100.00)
    is_active = db.Column(db.Boolean, default=True)
    effective_date = db.Column(db.Date, default=datetime.utcnow)
    updated_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'tenure_days': self.tenure_days,
            'label': self.label,
            'annual_rate': float(self.annual_rate),
            'withholding_tax_rate': float(self.withholding_tax_rate),
            'min_investment': float(self.min_investment),
            'is_active': self.is_active,
            'effective_date': self.effective_date.isoformat() if self.effective_date else None,
            'updated_by': self.updated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<TBillRate {self.tenure_days}d @ {self.annual_rate}%>'
