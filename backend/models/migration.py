import uuid
import json
from datetime import datetime
from extensions import db


class MigrationRecord(db.Model):
    __tablename__ = 'migration_records'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    migration_type = db.Column(db.String(50), nullable=False)  # customers, accounts, transactions, loans
    filename = db.Column(db.String(255))
    total_records = db.Column(db.Integer, default=0)
    success_count = db.Column(db.Integer, default=0)
    error_count = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='completed')  # completed, partial, failed
    errors_json = db.Column(db.Text)
    migrated_by = db.Column(db.String(36), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    migrator = db.relationship('User', foreign_keys=[migrated_by])

    def to_dict(self):
        errors = json.loads(self.errors_json) if self.errors_json else []
        return {
            'id': self.id,
            'migration_type': self.migration_type,
            'filename': self.filename,
            'total_records': self.total_records,
            'success_count': self.success_count,
            'error_count': self.error_count,
            'status': self.status,
            'errors': errors,
            'migrated_by': self.migrator.full_name if self.migrator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
