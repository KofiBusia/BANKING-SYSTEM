import uuid
from datetime import datetime
from extensions import db


class KYCInfo(db.Model):
    __tablename__ = 'kyc_info'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), unique=True, nullable=False)

    # Personal Information
    date_of_birth = db.Column(db.Date)
    place_of_birth = db.Column(db.String(100))
    nationality = db.Column(db.String(50), default='Ghanaian')
    marital_status = db.Column(db.String(20))  # single, married, divorced, widowed
    mother_maiden_name = db.Column(db.String(100))

    # Address
    residential_address = db.Column(db.String(500))
    digital_address = db.Column(db.String(20))  # Ghana Post GPS e.g. GA-123-4567
    city = db.Column(db.String(100))
    region = db.Column(db.String(100))
    country = db.Column(db.String(50), default='Ghana')
    years_at_address = db.Column(db.Integer)
    postal_address = db.Column(db.String(100))

    # Employment
    employment_status = db.Column(db.String(30))  # employed, self_employed, unemployed, student, retired
    employer_name = db.Column(db.String(255))
    employer_address = db.Column(db.String(500))
    employer_phone = db.Column(db.String(20))
    job_title = db.Column(db.String(100))
    industry = db.Column(db.String(100))
    monthly_income = db.Column(db.Numeric(15, 2))
    annual_income = db.Column(db.Numeric(15, 2))
    years_of_employment = db.Column(db.Integer)

    # Source of Funds
    source_of_funds = db.Column(db.String(100))  # salary, business, investment, inheritance, rental, other
    source_of_funds_details = db.Column(db.String(500))

    # Next of Kin
    nok_first_name = db.Column(db.String(100))
    nok_last_name = db.Column(db.String(100))
    nok_relationship = db.Column(db.String(50))
    nok_phone = db.Column(db.String(20))
    nok_email = db.Column(db.String(255))
    nok_address = db.Column(db.String(500))
    nok_ghana_card = db.Column(db.String(20))
    nok_date_of_birth = db.Column(db.Date)

    # Additional IDs
    passport_number = db.Column(db.String(30))
    passport_expiry = db.Column(db.Date)
    voter_id = db.Column(db.String(30))
    drivers_license = db.Column(db.String(30))
    drivers_license_expiry = db.Column(db.Date)
    nhis_number = db.Column(db.String(30))
    tin_number = db.Column(db.String(30))  # Tax Identification Number
    ssnit_number = db.Column(db.String(30))  # Social Security

    # PEP (Politically Exposed Person)
    is_pep = db.Column(db.Boolean, default=False)
    pep_details = db.Column(db.String(500))
    pep_relationship = db.Column(db.String(100))

    # Business (if applicable)
    business_name = db.Column(db.String(255))
    business_registration_number = db.Column(db.String(50))
    business_type = db.Column(db.String(100))
    business_address = db.Column(db.String(500))

    # Verification status
    identity_verified = db.Column(db.Boolean, default=False)
    address_verified = db.Column(db.Boolean, default=False)
    biometric_verified = db.Column(db.Boolean, default=False)
    selfie_verified = db.Column(db.Boolean, default=False)

    submitted_at = db.Column(db.DateTime)
    reviewed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.String(36))
    rejection_reason = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'place_of_birth': self.place_of_birth,
            'nationality': self.nationality,
            'marital_status': self.marital_status,
            'mother_maiden_name': self.mother_maiden_name,
            'residential_address': self.residential_address,
            'digital_address': self.digital_address,
            'city': self.city,
            'region': self.region,
            'country': self.country,
            'years_at_address': self.years_at_address,
            'postal_address': self.postal_address,
            'employment_status': self.employment_status,
            'employer_name': self.employer_name,
            'employer_address': self.employer_address,
            'employer_phone': self.employer_phone,
            'job_title': self.job_title,
            'industry': self.industry,
            'monthly_income': float(self.monthly_income) if self.monthly_income else None,
            'annual_income': float(self.annual_income) if self.annual_income else None,
            'source_of_funds': self.source_of_funds,
            'source_of_funds_details': self.source_of_funds_details,
            'nok_first_name': self.nok_first_name,
            'nok_last_name': self.nok_last_name,
            'nok_relationship': self.nok_relationship,
            'nok_phone': self.nok_phone,
            'nok_email': self.nok_email,
            'nok_address': self.nok_address,
            'tin_number': self.tin_number,
            'ssnit_number': self.ssnit_number,
            'nhis_number': self.nhis_number,
            'is_pep': self.is_pep,
            'pep_details': self.pep_details,
            'business_name': self.business_name,
            'business_registration_number': self.business_registration_number,
            'identity_verified': self.identity_verified,
            'address_verified': self.address_verified,
            'biometric_verified': self.biometric_verified,
            'selfie_verified': self.selfie_verified,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'rejection_reason': self.rejection_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class KYCDocument(db.Model):
    __tablename__ = 'kyc_documents'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    document_type = db.Column(db.String(50), nullable=False)
    # Types: ghana_card_front, ghana_card_back, passport, voter_id, drivers_license,
    #        utility_bill, bank_statement, selfie, signature, business_registration, others

    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(255))
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    original_name = db.Column(db.String(255))

    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    rejection_reason = db.Column(db.Text)
    reviewed_by = db.Column(db.String(36))
    reviewed_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'document_type': self.document_type,
            'file_name': self.file_name,
            'original_name': self.original_name,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'status': self.status,
            'rejection_reason': self.rejection_reason,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
