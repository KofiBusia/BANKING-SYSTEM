from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models import User, Account, Transaction, Notification
from utils.helpers import generate_transaction_reference, get_client_ip
from utils.email_service import send_transaction_alert
from datetime import datetime
import uuid
import traceback

transactions_bp = Blueprint('transactions', __name__)

TRANSACTION_LIMITS = {
    'basic': {'single': 1000, 'daily': 2000},
    'pending': {'single': 2000, 'daily': 5000},
    'verified': {'single': 50000, 'daily': 100000},
}


def check_transaction_limit(user, amount):
    limits = TRANSACTION_LIMITS.get(user.kyc_status, TRANSACTION_LIMITS['basic'])
    if amount > limits['single']:
        return False, f"Single transaction limit is GHS {limits['single']:,.2f} for your KYC level. Complete KYC to increase."
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    user_accounts = Account.query.filter_by(user_id=user.id).all()
    account_ids = [a.id for a in user_accounts]
    today_total = db.session.query(db.func.sum(Transaction.amount)).filter(
        Transaction.account_id.in_(account_ids),
        Transaction.transaction_type.in_(['withdrawal', 'transfer_out']),
        Transaction.created_at >= today_start,
        Transaction.status == 'completed'
    ).scalar() or 0
    if today_total + amount > limits['daily']:
        remaining = limits['daily'] - today_total
        return False, f"Daily transfer limit exceeded. Remaining limit: GHS {remaining:,.2f}"
    return True, 'OK'


@transactions_bp.route('/deposit', methods=['POST'])
@jwt_required()
def deposit():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400

    account_id = data.get('account_id')
    try:
        amount = float(data.get('amount', 0))
    except (TypeError, ValueError):
        return jsonify({'success': False, 'message': 'Invalid amount'}), 400
    description = data.get('description', 'Cash Deposit')
    channel = data.get('channel', 'online')

    if amount <= 0:
        return jsonify({'success': False, 'message': 'Amount must be greater than 0'}), 400

    if amount < 1:
        return jsonify({'success': False, 'message': 'Minimum deposit amount is GHS 1.00'}), 400

    if not account_id:
        return jsonify({'success': False, 'message': 'Account ID is required'}), 400

    account = Account.query.filter_by(id=account_id, user_id=user_id, status='active').first()
    if not account:
        return jsonify({'success': False, 'message': 'Account not found or inactive'}), 404

    try:
        balance_before = float(account.balance or 0)
        account.balance = balance_before + amount
        account.available_balance = float(account.available_balance or 0) + amount
        account.ledger_balance = float(account.ledger_balance or 0) + amount
        account.last_transaction_date = datetime.utcnow()

        txn = Transaction(
            id=str(uuid.uuid4()),
            reference=generate_transaction_reference(),
            account_id=account.id,
            transaction_type='deposit',
            amount=amount,
            balance_before=balance_before,
            balance_after=float(account.balance),
            currency='GHS',
            description=description,
            channel=channel,
            status='completed',
            value_date=datetime.utcnow().date(),
        )
        db.session.add(txn)

        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title='Deposit Successful',
            message=f'GHS {amount:,.2f} has been credited to your account {account.account_number}. New balance: GHS {float(account.balance):,.2f}',
            type='success',
            category='transaction',
        )
        db.session.add(notification)
        db.session.commit()

        try:
            send_transaction_alert(user, txn, account)
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': f'GHS {amount:,.2f} deposited successfully',
            'transaction': txn.to_dict(),
            'new_balance': float(account.balance),
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Deposit error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'success': False, 'message': f'Deposit failed: {str(e)}'}), 500


@transactions_bp.route('/withdraw', methods=['POST'])
@jwt_required()
def withdraw():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    account_id = data.get('account_id')
    amount = float(data.get('amount', 0))
    description = data.get('description', 'Cash Withdrawal')
    pin = data.get('pin', '')

    if amount <= 0:
        return jsonify({'success': False, 'message': 'Amount must be greater than 0'}), 400

    if user.pin_set and pin:
        if not bcrypt.check_password_hash(user.transaction_pin, pin):
            return jsonify({'success': False, 'message': 'Invalid transaction PIN'}), 400

    ok, msg = check_transaction_limit(user, amount)
    if not ok:
        return jsonify({'success': False, 'message': msg}), 403

    account = Account.query.filter_by(id=account_id, user_id=user_id, status='active').first()
    if not account:
        return jsonify({'success': False, 'message': 'Account not found'}), 404

    if float(account.available_balance) < amount:
        return jsonify({'success': False, 'message': 'Insufficient funds'}), 400

    if float(account.balance) - amount < float(account.minimum_balance):
        return jsonify({'success': False, 'message': f'Cannot go below minimum balance of GHS {float(account.minimum_balance):,.2f}'}), 400

    try:
        balance_before = float(account.balance)
        account.balance = balance_before - amount
        account.available_balance = float(account.available_balance) - amount
        account.ledger_balance = float(account.ledger_balance) - amount
        account.last_transaction_date = datetime.utcnow()

        txn = Transaction(
            id=str(uuid.uuid4()),
            reference=generate_transaction_reference(),
            account_id=account.id,
            transaction_type='withdrawal',
            amount=amount,
            balance_before=balance_before,
            balance_after=float(account.balance),
            currency='GHS',
            description=description,
            channel=data.get('channel', 'online'),
            status='completed',
            value_date=datetime.utcnow().date(),
        )
        db.session.add(txn)

        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title='Withdrawal Processed',
            message=f'GHS {amount:,.2f} withdrawn from account {account.account_number}. Balance: GHS {float(account.balance):,.2f}',
            type='info',
            category='transaction',
        )
        db.session.add(notification)
        db.session.commit()

        try:
            send_transaction_alert(user, txn, account)
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': f'GHS {amount:,.2f} withdrawn successfully',
            'transaction': txn.to_dict(),
            'new_balance': float(account.balance),
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Withdrawal failed. Please try again.'}), 500


@transactions_bp.route('/transfer', methods=['POST'])
@jwt_required()
def transfer():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    from_account_id = data.get('from_account_id')
    to_account_number = data.get('to_account_number', '').strip()
    amount = float(data.get('amount', 0))
    narration = data.get('narration', 'Funds Transfer')
    pin = data.get('pin', '')

    if amount <= 0:
        return jsonify({'success': False, 'message': 'Amount must be greater than 0'}), 400

    if amount < 1:
        return jsonify({'success': False, 'message': 'Minimum transfer amount is GHS 1.00'}), 400

    if user.pin_set and pin:
        if not bcrypt.check_password_hash(user.transaction_pin, pin):
            return jsonify({'success': False, 'message': 'Invalid transaction PIN'}), 400

    ok, msg = check_transaction_limit(user, amount)
    if not ok:
        return jsonify({'success': False, 'message': msg}), 403

    from_account = Account.query.filter_by(id=from_account_id, user_id=user_id, status='active').first()
    if not from_account:
        return jsonify({'success': False, 'message': 'Source account not found'}), 404

    to_account = Account.query.filter_by(account_number=to_account_number, status='active').first()
    if not to_account:
        return jsonify({'success': False, 'message': 'Destination account not found or inactive'}), 404

    if from_account.account_number == to_account_number:
        return jsonify({'success': False, 'message': 'Cannot transfer to the same account'}), 400

    if float(from_account.available_balance) < amount:
        return jsonify({'success': False, 'message': 'Insufficient funds'}), 400

    try:
        to_user = User.query.get(to_account.user_id)
        ref = generate_transaction_reference()

        # Debit sender
        from_balance_before = float(from_account.balance)
        from_account.balance = from_balance_before - amount
        from_account.available_balance = float(from_account.available_balance) - amount
        from_account.ledger_balance = float(from_account.ledger_balance) - amount
        from_account.last_transaction_date = datetime.utcnow()

        debit_txn = Transaction(
            id=str(uuid.uuid4()),
            reference=ref,
            account_id=from_account.id,
            transaction_type='transfer_out',
            amount=amount,
            balance_before=from_balance_before,
            balance_after=float(from_account.balance),
            currency='GHS',
            description=f'Transfer to {to_account.account_number} - {to_account.account_name}',
            narration=narration,
            channel='online',
            status='completed',
            counterparty_account=to_account.account_number,
            counterparty_name=to_account.account_name,
            value_date=datetime.utcnow().date(),
        )
        db.session.add(debit_txn)

        # Credit receiver
        to_balance_before = float(to_account.balance)
        to_account.balance = to_balance_before + amount
        to_account.available_balance = float(to_account.available_balance) + amount
        to_account.ledger_balance = float(to_account.ledger_balance) + amount
        to_account.last_transaction_date = datetime.utcnow()

        credit_txn = Transaction(
            id=str(uuid.uuid4()),
            reference=f'CR{ref[2:]}',
            account_id=to_account.id,
            transaction_type='transfer_in',
            amount=amount,
            balance_before=to_balance_before,
            balance_after=float(to_account.balance),
            currency='GHS',
            description=f'Transfer from {from_account.account_number} - {user.full_name}',
            narration=narration,
            channel='online',
            status='completed',
            counterparty_account=from_account.account_number,
            counterparty_name=user.full_name,
            value_date=datetime.utcnow().date(),
        )
        db.session.add(credit_txn)

        # Notifications
        db.session.add(Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title='Transfer Successful',
            message=f'GHS {amount:,.2f} transferred to {to_account.account_name} ({to_account.account_number}). Reference: {ref}',
            type='success',
            category='transaction',
        ))

        if to_account.user_id != user_id:
            db.session.add(Notification(
                id=str(uuid.uuid4()),
                user_id=to_account.user_id,
                title='Funds Received',
                message=f'GHS {amount:,.2f} received from {user.full_name}. Reference: {ref}. New balance: GHS {float(to_account.balance):,.2f}',
                type='success',
                category='transaction',
            ))

        db.session.commit()

        try:
            send_transaction_alert(user, debit_txn, from_account)
            if to_user and to_user.id != user_id:
                send_transaction_alert(to_user, credit_txn, to_account)
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': f'GHS {amount:,.2f} transferred successfully to {to_account.account_name}',
            'reference': ref,
            'transaction': debit_txn.to_dict(),
            'new_balance': float(from_account.balance),
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Transfer error: {str(e)}")
        return jsonify({'success': False, 'message': 'Transfer failed. Please try again.'}), 500


@transactions_bp.route('/mobile-money', methods=['POST'])
@jwt_required()
def mobile_money():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    account_id = data.get('account_id')
    phone = data.get('phone', '').strip()
    amount = float(data.get('amount', 0))
    network = data.get('network', '').upper()  # MTN, VODAFONE, AIRTELTIGO
    direction = data.get('direction', 'in')  # in (receive) or out (send)
    narration = data.get('narration', f'Mobile Money {direction.title()}')

    if amount <= 0:
        return jsonify({'success': False, 'message': 'Amount must be greater than 0'}), 400

    valid_networks = ['MTN', 'VODAFONE', 'AIRTELTIGO', 'TELECEL']
    if network not in valid_networks:
        return jsonify({'success': False, 'message': f'Invalid network. Choose: {", ".join(valid_networks)}'}), 400

    account = Account.query.filter_by(id=account_id, user_id=user_id, status='active').first()
    if not account:
        return jsonify({'success': False, 'message': 'Account not found'}), 404

    if direction == 'out' and float(account.available_balance) < amount:
        return jsonify({'success': False, 'message': 'Insufficient funds'}), 400

    try:
        balance_before = float(account.balance)
        tx_type = 'mobile_money_in' if direction == 'in' else 'mobile_money_out'

        if direction == 'in':
            account.balance = balance_before + amount
            account.available_balance = float(account.available_balance) + amount
            account.ledger_balance = float(account.ledger_balance) + amount
        else:
            account.balance = balance_before - amount
            account.available_balance = float(account.available_balance) - amount
            account.ledger_balance = float(account.ledger_balance) - amount

        account.last_transaction_date = datetime.utcnow()

        txn = Transaction(
            id=str(uuid.uuid4()),
            reference=generate_transaction_reference(),
            account_id=account.id,
            transaction_type=tx_type,
            amount=amount,
            balance_before=balance_before,
            balance_after=float(account.balance),
            currency='GHS',
            description=f'{network} Mobile Money - {phone}',
            narration=narration,
            channel='mobile_money',
            status='completed',
            counterparty_phone=phone,
            value_date=datetime.utcnow().date(),
        )
        db.session.add(txn)

        db.session.add(Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=f'Mobile Money {"Received" if direction == "in" else "Sent"}',
            message=f'GHS {amount:,.2f} {"received from" if direction == "in" else "sent to"} {network} {phone}. Balance: GHS {float(account.balance):,.2f}',
            type='success',
            category='transaction',
        ))
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Mobile money transaction successful',
            'transaction': txn.to_dict(),
            'new_balance': float(account.balance),
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Transaction failed. Please try again.'}), 500


@transactions_bp.route('/', methods=['GET'])
@jwt_required()
def get_transactions():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    account_id = request.args.get('account_id')
    tx_type = request.args.get('type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    user_accounts = Account.query.filter_by(user_id=user_id).all()
    account_ids = [a.id for a in user_accounts]

    query = Transaction.query.filter(Transaction.account_id.in_(account_ids))

    if account_id:
        query = query.filter_by(account_id=account_id)
    if tx_type:
        query = query.filter_by(transaction_type=tx_type)
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

    query = query.order_by(Transaction.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
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
