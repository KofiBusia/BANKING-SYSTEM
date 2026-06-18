from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from extensions import db, bcrypt, limiter
from models import User, Account, KYCInfo, Notification, PasswordResetToken, VerificationCode, AuditLog
from utils.helpers import (
    validate_ghana_card, validate_ghana_phone, validate_email,
    validate_password, generate_account_number, generate_reset_token,
    generate_otp, normalize_phone, get_client_ip, generate_staff_id
)
from utils.email_service import send_welcome_email, send_password_reset_email
from datetime import datetime, timedelta
import uuid

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("10 per hour")
def register():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400

    required_fields = ['first_name', 'last_name', 'email', 'phone', 'password']
    for field in required_fields:
        if not data.get(field, '').strip():
            return jsonify({'success': False, 'message': f'{field.replace("_", " ").title()} is required'}), 400

    first_name = data['first_name'].strip()
    last_name = data['last_name'].strip()
    other_names = data.get('other_names', '').strip()
    email = data['email'].strip().lower()
    phone = normalize_phone(data['phone'].strip())
    password = data['password']
    ghana_card = data.get('ghana_card_number', '').strip().upper()

    if not validate_email(email):
        return jsonify({'success': False, 'message': 'Invalid email address'}), 400

    if not validate_ghana_phone(phone):
        return jsonify({'success': False, 'message': 'Invalid Ghana phone number. Format: 024XXXXXXX or +233XXXXXXXXX'}), 400

    is_valid, msg = validate_password(password)
    if not is_valid:
        return jsonify({'success': False, 'message': msg}), 400

    if ghana_card and not validate_ghana_card(ghana_card):
        return jsonify({'success': False, 'message': 'Invalid Ghana Card number. Format: GHA-XXXXXXXXX-X'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email address is already registered'}), 409

    if User.query.filter_by(phone=phone).first():
        return jsonify({'success': False, 'message': 'Phone number is already registered'}), 409

    if ghana_card and User.query.filter_by(ghana_card_number=ghana_card).first():
        return jsonify({'success': False, 'message': 'Ghana Card number is already registered'}), 409

    try:
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

        user = User(
            id=str(uuid.uuid4()),
            first_name=first_name,
            last_name=last_name,
            other_names=other_names if other_names else None,
            email=email,
            phone=phone,
            password_hash=password_hash,
            ghana_card_number=ghana_card if ghana_card else None,
            kyc_status='basic',
            kyc_completion=20,
        )
        db.session.add(user)
        db.session.flush()

        # Create default savings account
        account = Account(
            id=str(uuid.uuid4()),
            user_id=user.id,
            account_number=generate_account_number('savings'),
            account_name=f"{first_name} {last_name}",
            account_type='savings',
            currency='GHS',
            balance=0.00,
            available_balance=0.00,
            ledger_balance=0.00,
            interest_rate=3.5,
            status='active',
        )
        db.session.add(account)

        # Create KYC record
        kyc_info = KYCInfo(
            id=str(uuid.uuid4()),
            user_id=user.id,
        )
        db.session.add(kyc_info)

        # Welcome notification
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title='Welcome to GhanaBank!',
            message=f'Hello {first_name}, your account has been created successfully. Please complete your KYC to access all features.',
            type='info',
            category='account',
            action_url='/dashboard/kyc',
        )
        db.session.add(notification)

        # KYC reminder notification
        kyc_notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title='Complete Your KYC Verification',
            message='Your account is at basic level. Complete your KYC to unlock higher limits, loans, and all banking features.',
            type='warning',
            category='kyc',
            action_url='/dashboard/kyc',
        )
        db.session.add(kyc_notification)

        # Audit log
        log = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user.id,
            action='REGISTER',
            entity_type='user',
            entity_id=user.id,
            description=f'New customer registered: {email}',
            ip_address=get_client_ip(request),
            user_agent=request.user_agent.string,
        )
        db.session.add(log)
        db.session.commit()

        # Send welcome email (non-blocking)
        try:
            send_welcome_email(user)
        except Exception:
            pass

        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return jsonify({
            'success': True,
            'message': 'Account created successfully! Please complete your KYC to access all features.',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict(),
            'account': account.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({'success': False, 'message': 'Registration failed. Please try again.'}), 500


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("20 per hour")
def login():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400

    identifier = data.get('email', data.get('identifier', '')).strip().lower()
    password = data.get('password', '')

    if not identifier or not password:
        return jsonify({'success': False, 'message': 'Email/phone and password are required'}), 400

    # Find user by email or phone
    user = User.query.filter(
        (User.email == identifier) | (User.phone == normalize_phone(identifier))
    ).first()

    if not user:
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    # Check if account is locked
    if user.locked_until and datetime.utcnow() < user.locked_until:
        remaining = (user.locked_until - datetime.utcnow()).seconds // 60
        return jsonify({'success': False, 'message': f'Account temporarily locked. Try again in {remaining} minutes.'}), 423

    if not bcrypt.check_password_hash(user.password_hash, password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=30)
            db.session.commit()
            return jsonify({'success': False, 'message': 'Too many failed attempts. Account locked for 30 minutes.'}), 423
        db.session.commit()
        return jsonify({'success': False, 'message': f'Invalid credentials. {5 - user.failed_login_attempts} attempts remaining.'}), 401

    if user.account_status == 'suspended':
        return jsonify({'success': False, 'message': 'Your account has been suspended. Contact support.'}), 403

    if user.account_status == 'closed':
        return jsonify({'success': False, 'message': 'This account is closed.'}), 403

    # Successful login
    user.last_login = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    user.failed_login_attempts = 0
    user.locked_until = None

    log = AuditLog(
        id=str(uuid.uuid4()),
        user_id=user.id,
        action='LOGIN',
        entity_type='user',
        entity_id=user.id,
        description=f'User logged in: {user.email}',
        ip_address=get_client_ip(request),
        user_agent=request.user_agent.string,
        status='success',
    )
    db.session.add(log)
    db.session.commit()

    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)

    accounts = Account.query.filter_by(user_id=user.id, status='active').all()

    return jsonify({
        'success': True,
        'message': 'Login successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict(),
        'accounts': [a.to_dict() for a in accounts],
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.account_status != 'active':
        return jsonify({'success': False, 'message': 'Access denied'}), 401
    access_token = create_access_token(identity=user_id)
    return jsonify({'success': True, 'access_token': access_token}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    accounts = Account.query.filter_by(user_id=user.id).all()
    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()

    return jsonify({
        'success': True,
        'user': user.to_dict(),
        'accounts': [a.to_dict() for a in accounts],
        'unread_notifications': unread_count,
    }), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()
    # Always return success to prevent email enumeration
    if not user:
        return jsonify({'success': True, 'message': 'If the email exists, a reset link has been sent.'}), 200

    # Invalidate old tokens
    PasswordResetToken.query.filter_by(user_id=user.id, is_used=False).update({'is_used': True})

    token = generate_reset_token()
    reset_token = PasswordResetToken(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db.session.add(reset_token)
    db.session.commit()

    try:
        send_password_reset_email(user, token)
    except Exception:
        pass

    return jsonify({'success': True, 'message': 'Password reset link has been sent to your email.'}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token', '').strip()
    new_password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    if not token or not new_password:
        return jsonify({'success': False, 'message': 'Token and new password are required'}), 400

    if new_password != confirm_password:
        return jsonify({'success': False, 'message': 'Passwords do not match'}), 400

    is_valid, msg = validate_password(new_password)
    if not is_valid:
        return jsonify({'success': False, 'message': msg}), 400

    reset_token = PasswordResetToken.query.filter_by(token=token, is_used=False).first()
    if not reset_token or not reset_token.is_valid():
        return jsonify({'success': False, 'message': 'Invalid or expired reset token'}), 400

    user = User.query.get(reset_token.user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.failed_login_attempts = 0
    user.locked_until = None
    reset_token.is_used = True

    log = AuditLog(
        id=str(uuid.uuid4()),
        user_id=user.id,
        action='PASSWORD_RESET',
        entity_type='user',
        entity_id=user.id,
        description='Password reset via email link',
        ip_address=get_client_ip(request),
        status='success',
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Password reset successfully. Please login with your new password.'}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')

    if not bcrypt.check_password_hash(user.password_hash, old_password):
        return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400

    is_valid, msg = validate_password(new_password)
    if not is_valid:
        return jsonify({'success': False, 'message': msg}), 400

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()

    return jsonify({'success': True, 'message': 'Password changed successfully'}), 200


@auth_bp.route('/set-pin', methods=['POST'])
@jwt_required()
def set_pin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    pin = data.get('pin', '')
    confirm_pin = data.get('confirm_pin', '')

    if len(pin) != 4 or not pin.isdigit():
        return jsonify({'success': False, 'message': 'PIN must be exactly 4 digits'}), 400

    if pin != confirm_pin:
        return jsonify({'success': False, 'message': 'PINs do not match'}), 400

    user.transaction_pin = bcrypt.generate_password_hash(pin).decode('utf-8')
    user.pin_set = True
    db.session.commit()

    return jsonify({'success': True, 'message': 'Transaction PIN set successfully'}), 200


@auth_bp.route('/verify-pin', methods=['POST'])
@jwt_required()
def verify_pin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    pin = data.get('pin', '')
    if not user.pin_set or not user.transaction_pin:
        return jsonify({'success': False, 'message': 'Transaction PIN not set'}), 400

    if not bcrypt.check_password_hash(user.transaction_pin, pin):
        return jsonify({'success': False, 'message': 'Invalid PIN'}), 400

    return jsonify({'success': True, 'message': 'PIN verified'}), 200
