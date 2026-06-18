from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User, Account, Transaction, Notification, AccountProduct
from utils.helpers import generate_account_number
from datetime import datetime
import uuid

accounts_bp = Blueprint('accounts', __name__)


@accounts_bp.route('/', methods=['GET'])
@jwt_required()
def get_accounts():
    user_id = get_jwt_identity()
    accounts = Account.query.filter_by(user_id=user_id).all()
    return jsonify({'success': True, 'accounts': [a.to_dict() for a in accounts]}), 200


@accounts_bp.route('/<account_id>', methods=['GET'])
@jwt_required()
def get_account(account_id):
    user_id = get_jwt_identity()
    account = Account.query.filter_by(id=account_id, user_id=user_id).first()
    if not account:
        return jsonify({'success': False, 'message': 'Account not found'}), 404
    return jsonify({'success': True, 'account': account.to_dict()}), 200


@accounts_bp.route('/open', methods=['POST'])
@jwt_required()
def open_account():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    product_id = data.get('product_id', '').strip() or None
    product = None
    if product_id:
        product = AccountProduct.query.filter_by(id=product_id, is_active=True).first()

    # Fall back to account_type param if no product
    account_type = product.account_type if product else data.get('account_type', 'savings')
    valid_types = ['savings', 'current', 'fixed_deposit', 'susu', 'student', 'business']
    if account_type not in valid_types:
        return jsonify({'success': False, 'message': 'Invalid account type'}), 400

    kyc_req = product.kyc_required if product else ('verified' if account_type in ['fixed_deposit', 'business'] else 'basic')
    kyc_levels = {'basic': 0, 'pending': 1, 'verified': 2}
    user_level = kyc_levels.get(user.kyc_status, 0)
    required_level = kyc_levels.get(kyc_req, 0)
    if user_level < required_level:
        return jsonify({'success': False, 'message': f'KYC level "{kyc_req}" required to open this account'}), 403

    interest = float(product.interest_rate) if product else 0.0
    min_bal = float(product.min_balance) if product else 0.0
    od_enabled = product.overdraft_enabled if product else False
    od_limit = float(product.overdraft_limit) if product else 0.0

    account = Account(
        id=str(uuid.uuid4()),
        user_id=user_id,
        product_id=product.id if product else None,
        account_number=generate_account_number(account_type),
        account_name=f"{user.first_name} {user.last_name}",
        account_type=account_type,
        currency='GHS',
        balance=0.00,
        available_balance=0.00,
        ledger_balance=0.00,
        interest_rate=interest,
        minimum_balance=min_bal,
        overdraft_enabled=od_enabled,
        overdraft_limit=od_limit,
        status='active',
    )

    if account_type == 'fixed_deposit':
        term_months = data.get('term_months', 12)
        account.fixed_term_months = term_months
        from datetime import timedelta
        account.fixed_deposit_start_date = datetime.utcnow().date()
        account.maturity_date = (datetime.utcnow() + timedelta(days=30 * term_months)).date()
        if product:
            account.interest_rate = float(product.interest_rate)

    if account_type == 'susu':
        account.susu_amount = data.get('susu_amount', 50)
        account.susu_frequency = data.get('susu_frequency', 'daily')

    db.session.add(account)

    notification = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title='New Account Opened',
        message=f'Your new {account_type.replace("_", " ").title()} account ({account.account_number}) has been opened successfully.',
        type='success',
        category='account',
    )
    db.session.add(notification)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'{account_type.replace("_", " ").title()} account opened successfully',
        'account': account.to_dict(),
    }), 201


@accounts_bp.route('/lookup', methods=['POST'])
@jwt_required()
def lookup_account():
    data = request.get_json()
    account_number = data.get('account_number', '').strip()

    if not account_number:
        return jsonify({'success': False, 'message': 'Account number is required'}), 400

    account = Account.query.filter_by(account_number=account_number, status='active').first()
    if not account:
        return jsonify({'success': False, 'message': 'Account not found'}), 404

    owner = User.query.get(account.user_id)
    return jsonify({
        'success': True,
        'account': {
            'account_number': account.account_number,
            'account_name': account.account_name,
            'account_type': account.account_type,
            'owner_name': owner.full_name if owner else account.account_name,
        }
    }), 200


@accounts_bp.route('/<account_id>/statement', methods=['GET'])
@jwt_required()
def get_statement(account_id):
    user_id = get_jwt_identity()
    account = Account.query.filter_by(id=account_id, user_id=user_id).first()
    if not account:
        return jsonify({'success': False, 'message': 'Account not found'}), 404

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    tx_type = request.args.get('type')

    query = Transaction.query.filter_by(account_id=account_id)

    if start_date:
        try:
            query = query.filter(Transaction.created_at >= datetime.strptime(start_date, '%Y-%m-%d'))
        except ValueError:
            pass

    if end_date:
        try:
            query = query.filter(Transaction.created_at <= datetime.strptime(end_date + ' 23:59:59', '%Y-%m-%d %H:%M:%S'))
        except ValueError:
            pass

    if tx_type:
        query = query.filter_by(transaction_type=tx_type)

    query = query.order_by(Transaction.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'account': account.to_dict(),
        'transactions': [t.to_dict() for t in paginated.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': paginated.total,
            'pages': paginated.pages,
            'has_next': paginated.has_next,
            'has_prev': paginated.has_prev,
        }
    }), 200
