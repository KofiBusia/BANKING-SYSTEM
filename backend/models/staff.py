import uuid
from datetime import datetime
from extensions import db


class Staff(db.Model):
    __tablename__ = 'staff'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), unique=True, nullable=False)
    staff_id = db.Column(db.String(20), unique=True, nullable=False)
    branch_id = db.Column(db.String(36), db.ForeignKey('branches.id'))
    department = db.Column(db.String(100))
    position = db.Column(db.String(100))
    hire_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'staff_id': self.staff_id,
            'branch_id': self.branch_id,
            'department': self.department,
            'position': self.position,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'status': self.status,
        }
