from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Notification
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    unread_only = request.args.get('unread', 'false').lower() == 'true'

    query = Notification.query.filter_by(user_id=user_id)
    if unread_only:
        query = query.filter_by(is_read=False)

    query = query.order_by(Notification.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()

    return jsonify({
        'success': True,
        'notifications': [n.to_dict() for n in paginated.items],
        'unread_count': unread_count,
        'pagination': {'page': page, 'per_page': per_page, 'total': paginated.total, 'pages': paginated.pages}
    }), 200


@notifications_bp.route('/mark-read', methods=['POST'])
@jwt_required()
def mark_read():
    user_id = get_jwt_identity()
    data = request.get_json()
    notification_ids = data.get('ids', [])

    if notification_ids:
        Notification.query.filter(
            Notification.user_id == user_id,
            Notification.id.in_(notification_ids)
        ).update({'is_read': True, 'read_at': datetime.utcnow()}, synchronize_session=False)
    else:
        # Mark all as read
        Notification.query.filter_by(user_id=user_id, is_read=False).update(
            {'is_read': True, 'read_at': datetime.utcnow()}, synchronize_session=False
        )

    db.session.commit()
    return jsonify({'success': True, 'message': 'Notifications marked as read'}), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    user_id = get_jwt_identity()
    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({'success': True, 'count': count}), 200
