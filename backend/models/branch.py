import uuid
from datetime import datetime
from extensions import db


class Branch(db.Model):
    __tablename__ = 'branches'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    code = db.Column(db.String(10), unique=True, nullable=False)
    address = db.Column(db.String(500), nullable=False)
    digital_address = db.Column(db.String(20))
    city = db.Column(db.String(100), nullable=False)
    region = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(255))
    manager_id = db.Column(db.String(36))
    opening_hours = db.Column(db.String(255))
    status = db.Column(db.String(20), default='active')

    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'address': self.address,
            'digital_address': self.digital_address,
            'city': self.city,
            'region': self.region,
            'phone': self.phone,
            'email': self.email,
            'opening_hours': self.opening_hours,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
