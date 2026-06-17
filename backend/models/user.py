import uuid
from datetime import datetime
from extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    other_names = db.Column(db.String(100))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    ghana_card_number = db.Column(db.String(20), unique=True, nullable=True, index=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(10))
    profile_photo = db.Column(db.String(255))

    role = db.Column(db.String(20), default='customer')  # customer, teller, manager, admin, super_admin
    kyc_status = db.Column(db.String(20), default='basic')  # basic, pending, verified, rejected
    kyc_completion = db.Column(db.Integer, default=20)
    account_status = db.Column(db.String(20), default='active')  # active, suspended, closed, dormant

    email_verified = db.Column(db.Boolean, default=False)
    phone_verified = db.Column(db.Boolean, default=False)
    two_factor_enabled = db.Column(db.Boolean, default=False)
    two_factor_secret = db.Column(db.String(32))

    transaction_pin = db.Column(db.String(255))
    pin_set = db.Column(db.Boolean, default=False)

    last_login = db.Column(db.DateTime)
    login_count = db.Column(db.Integer, default=0)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    accounts = db.relationship('Account', backref='owner', lazy='dynamic', foreign_keys='Account.user_id')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic')
    loans = db.relationship('Loan', backref='borrower', lazy='dynamic', foreign_keys='Loan.user_id')
    kyc_info = db.relationship('KYCInfo', backref='user', uselist=False)
    kyc_documents = db.relationship('KYCDocument', backref='user', lazy='dynamic')
    audit_logs = db.relationship('AuditLog', backref='actor', lazy='dynamic')

    @property
    def full_name(self):
        names = [self.first_name, self.other_names, self.last_name]
        return ' '.join(n for n in names if n)

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'other_names': self.other_names,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'ghana_card_number': self.ghana_card_number,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'profile_photo': self.profile_photo,
            'role': self.role,
            'kyc_status': self.kyc_status,
            'kyc_completion': self.kyc_completion,
            'account_status': self.account_status,
            'email_verified': self.email_verified,
            'phone_verified': self.phone_verified,
            'two_factor_enabled': self.two_factor_enabled,
            'pin_set': self.pin_set,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        return data

    def __repr__(self):
        return f'<User {self.email}>'
