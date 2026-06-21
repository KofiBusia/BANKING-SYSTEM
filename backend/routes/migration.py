import csv
import io
import json
import uuid
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models import User, Account, Transaction, Loan, MigrationRecord
from utils.helpers import (
    generate_account_number, generate_loan_number,
    generate_transaction_reference, normalize_phone
)

migration_bp = Blueprint('migration', __name__)

ADMIN_ROLES = {'admin', 'super_admin', 'manager'}


def _require_admin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role not in ADMIN_ROLES:
        return None, (jsonify({'success': False, 'message': 'Unauthorized'}), 403)
    return user, None


# ── Templates (column definitions returned as JSON) ─────────────────────────


TEMPLATES = {
    'customers': {
        'columns': [
            'first_name', 'last_name', 'other_names', 'email', 'phone',
            'ghana_card_number', 'date_of_birth', 'gender', 'kyc_status',
            'account_status', 'account_type', 'initial_balance', 'opened_date',
        ],
        'example': [
            'Kwame', 'Mensah', '', 'kwame@email.com', '0241234567',
            'GHA-123456789-0', '1990-05-15', 'male', 'basic', 'active',
            'savings', '500.00', '2023-01-15',
        ],
        'notes': (
            'account_type: savings | current | fixed_deposit | susu | student | business. '
            'kyc_status: basic | pending | verified. '
            'opened_date: YYYY-MM-DD format. '
            'initial_balance: numeric, e.g. 1000.00'
        ),
    },
    'accounts': {
        'columns': [
            'customer_email', 'account_number', 'account_name', 'account_type',
            'balance', 'currency', 'status', 'interest_rate', 'opened_date',
        ],
        'example': [
            'kwame@email.com', '1012345678', 'Kwame Mensah', 'savings',
            '2500.00', 'GHS', 'active', '3.5', '2023-01-15',
        ],
        'notes': (
            'customer_email must match an existing customer. '
            'account_number: leave blank to auto-generate. '
            'opened_date: YYYY-MM-DD. '
            'balance: numeric, sets historical opening balance.'
        ),
    },
    'transactions': {
        'columns': [
            'account_number', 'transaction_type', 'amount', 'description',
            'reference', 'transaction_date', 'balance_after', 'channel', 'status',
        ],
        'example': [
            '1012345678', 'deposit', '500.00', 'Opening balance deposit',
            '', '2023-01-15', '500.00', 'branch', 'completed',
        ],
        'notes': (
            'transaction_type: deposit | withdrawal | transfer_in | transfer_out | '
            'mobile_money_in | mobile_money_out | loan_disbursement | loan_repayment | interest_credit. '
            'transaction_date: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS (historical dates allowed). '
            'reference: leave blank to auto-generate. '
            'balance_after: account balance after this transaction.'
        ),
    },
    'loans': {
        'columns': [
            'customer_email', 'loan_type', 'amount_approved', 'purpose',
            'interest_rate', 'tenure_months', 'outstanding_balance',
            'monthly_installment', 'status', 'disbursed_date', 'next_payment_date',
        ],
        'example': [
            'kwame@email.com', 'personal', '5000.00', 'Home renovation',
            '24.0', '12', '3500.00', '490.00', 'active', '2023-06-01', '2024-07-01',
        ],
        'notes': (
            'loan_type: personal | business | mortgage | auto | salary_advance | sme | education | agricultural. '
            'status: active | completed | defaulted | rejected. '
            'Dates: YYYY-MM-DD format.'
        ),
    },
}


@migration_bp.route('/templates', methods=['GET'])
@jwt_required()
def get_templates():
    user, err = _require_admin()
    if err:
        return err
    return jsonify({'success': True, 'templates': TEMPLATES}), 200


@migration_bp.route('/template/<mtype>/download', methods=['GET'])
@jwt_required()
def download_template(mtype):
    user, err = _require_admin()
    if err:
        return err

    if mtype not in TEMPLATES:
        return jsonify({'success': False, 'message': 'Unknown migration type'}), 400

    tpl = TEMPLATES[mtype]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(tpl['columns'])
    writer.writerow(tpl['example'])

    from flask import Response
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename=migration_template_{mtype}.csv'
        }
    )


@migration_bp.route('/import', methods=['POST'])
@jwt_required()
def import_data():
    user, err = _require_admin()
    if err:
        return err

    mtype = request.form.get('type', '').strip()
    if mtype not in TEMPLATES:
        return jsonify({'success': False, 'message': 'Invalid migration type. Must be: customers, accounts, transactions, loans'}), 400

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No CSV file provided'}), 400

    f = request.files['file']
    if not f.filename or not f.filename.endswith('.csv'):
        return jsonify({'success': False, 'message': 'File must be a .csv'}), 400

    try:
        raw = f.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(raw))
        rows = list(reader)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Could not parse CSV: {str(e)}'}), 400

    if not rows:
        return jsonify({'success': False, 'message': 'CSV file is empty'}), 400

    errors = []
    success_count = 0

    if mtype == 'customers':
        success_count, errors = _import_customers(rows, user.id)
    elif mtype == 'accounts':
        success_count, errors = _import_accounts(rows)
    elif mtype == 'transactions':
        success_count, errors = _import_transactions(rows)
    elif mtype == 'loans':
        success_count, errors = _import_loans(rows)

    total = len(rows)
    error_count = len(errors)
    status = 'completed' if error_count == 0 else ('failed' if success_count == 0 else 'partial')

    record = MigrationRecord(
        id=str(uuid.uuid4()),
        migration_type=mtype,
        filename=f.filename,
        total_records=total,
        success_count=success_count,
        error_count=error_count,
        status=status,
        errors_json=json.dumps(errors[:50]),
        migrated_by=user.id,
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Migration complete: {success_count} imported, {error_count} errors out of {total} records.',
        'total': total,
        'success_count': success_count,
        'error_count': error_count,
        'status': status,
        'errors': errors[:20],
        'record_id': record.id,
    }), 200


@migration_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    user, err = _require_admin()
    if err:
        return err

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    mtype = request.args.get('type', '')

    q = MigrationRecord.query
    if mtype:
        q = q.filter_by(migration_type=mtype)
    q = q.order_by(MigrationRecord.created_at.desc())
    paginated = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'records': [r.to_dict() for r in paginated.items],
        'pagination': {
            'total': paginated.total,
            'page': page,
            'pages': paginated.pages,
        }
    }), 200


@migration_bp.route('/history/<record_id>', methods=['GET'])
@jwt_required()
def get_history_detail(record_id):
    user, err = _require_admin()
    if err:
        return err

    record = MigrationRecord.query.get(record_id)
    if not record:
        return jsonify({'success': False, 'message': 'Record not found'}), 404

    return jsonify({'success': True, 'record': record.to_dict()}), 200


# ── Importers ────────────────────────────────────────────────────────────────


def _parse_date(val, field='date'):
    if not val or not val.strip():
        return None
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(val.strip(), fmt)
        except ValueError:
            continue
    return None


def _import_customers(rows, admin_id):
    errors = []
    success = 0
    for i, row in enumerate(rows, start=2):
        try:
            first_name = row.get('first_name', '').strip()
            last_name = row.get('last_name', '').strip()
            email = row.get('email', '').strip().lower()
            phone_raw = row.get('phone', '').strip()

            if not first_name or not last_name or not email or not phone_raw:
                errors.append({'row': i, 'error': 'first_name, last_name, email, phone are required'})
                continue

            phone = normalize_phone(phone_raw)

            if User.query.filter_by(email=email).first():
                errors.append({'row': i, 'error': f'Email already exists: {email}'})
                continue
            if User.query.filter_by(phone=phone).first():
                errors.append({'row': i, 'error': f'Phone already exists: {phone}'})
                continue

            ghana_card = row.get('ghana_card_number', '').strip().upper() or None
            if ghana_card and User.query.filter_by(ghana_card_number=ghana_card).first():
                errors.append({'row': i, 'error': f'Ghana card already exists: {ghana_card}'})
                continue

            dob_val = _parse_date(row.get('date_of_birth', ''))
            opened_val = _parse_date(row.get('opened_date', ''))

            kyc_status = row.get('kyc_status', 'basic').strip() or 'basic'
            account_status = row.get('account_status', 'active').strip() or 'active'
            account_type = row.get('account_type', 'savings').strip() or 'savings'
            initial_balance = float(row.get('initial_balance', '0') or 0)

            temp_pw = bcrypt.generate_password_hash('Crestline@Migrate2024').decode('utf-8')

            new_user = User(
                id=str(uuid.uuid4()),
                first_name=first_name,
                last_name=last_name,
                other_names=row.get('other_names', '').strip() or None,
                email=email,
                phone=phone,
                password_hash=temp_pw,
                ghana_card_number=ghana_card,
                date_of_birth=dob_val.date() if dob_val else None,
                gender=row.get('gender', '').strip() or None,
                role='customer',
                kyc_status=kyc_status,
                kyc_completion=20 if kyc_status == 'basic' else (60 if kyc_status == 'pending' else 100),
                account_status=account_status,
                created_at=opened_val or datetime.utcnow(),
            )
            db.session.add(new_user)
            db.session.flush()

            acct_num = generate_account_number(account_type)
            account = Account(
                id=str(uuid.uuid4()),
                user_id=new_user.id,
                account_number=acct_num,
                account_name=f"{first_name} {last_name}",
                account_type=account_type,
                currency='GHS',
                balance=initial_balance,
                available_balance=initial_balance,
                ledger_balance=initial_balance,
                status='active',
                created_at=opened_val or datetime.utcnow(),
            )
            db.session.add(account)
            db.session.commit()
            success += 1
        except Exception as e:
            db.session.rollback()
            errors.append({'row': i, 'error': str(e)})

    return success, errors


def _import_accounts(rows):
    errors = []
    success = 0
    for i, row in enumerate(rows, start=2):
        try:
            email = row.get('customer_email', '').strip().lower()
            if not email:
                errors.append({'row': i, 'error': 'customer_email is required'})
                continue

            owner = User.query.filter_by(email=email).first()
            if not owner:
                errors.append({'row': i, 'error': f'Customer not found: {email}'})
                continue

            acct_num = row.get('account_number', '').strip()
            account_type = row.get('account_type', 'savings').strip() or 'savings'

            if acct_num and Account.query.filter_by(account_number=acct_num).first():
                errors.append({'row': i, 'error': f'Account number already exists: {acct_num}'})
                continue

            if not acct_num:
                acct_num = generate_account_number(account_type)

            balance = float(row.get('balance', '0') or 0)
            opened = _parse_date(row.get('opened_date', ''))

            account = Account(
                id=str(uuid.uuid4()),
                user_id=owner.id,
                account_number=acct_num,
                account_name=row.get('account_name', '').strip() or owner.full_name,
                account_type=account_type,
                currency=row.get('currency', 'GHS').strip() or 'GHS',
                balance=balance,
                available_balance=balance,
                ledger_balance=balance,
                interest_rate=float(row.get('interest_rate', '3.5') or 3.5),
                status=row.get('status', 'active').strip() or 'active',
                created_at=opened or datetime.utcnow(),
            )
            db.session.add(account)
            db.session.commit()
            success += 1
        except Exception as e:
            db.session.rollback()
            errors.append({'row': i, 'error': str(e)})

    return success, errors


def _import_transactions(rows):
    errors = []
    success = 0
    for i, row in enumerate(rows, start=2):
        try:
            acct_num = row.get('account_number', '').strip()
            if not acct_num:
                errors.append({'row': i, 'error': 'account_number is required'})
                continue

            account = Account.query.filter_by(account_number=acct_num).first()
            if not account:
                errors.append({'row': i, 'error': f'Account not found: {acct_num}'})
                continue

            amount = float(row.get('amount', '0') or 0)
            if amount <= 0:
                errors.append({'row': i, 'error': f'Amount must be positive: {amount}'})
                continue

            txn_type = row.get('transaction_type', '').strip()
            valid_types = {
                'deposit', 'withdrawal', 'transfer_in', 'transfer_out',
                'mobile_money_in', 'mobile_money_out', 'loan_disbursement',
                'loan_repayment', 'interest_credit', 'fee', 'charge',
            }
            if txn_type not in valid_types:
                errors.append({'row': i, 'error': f'Invalid transaction_type: {txn_type}'})
                continue

            ref = row.get('reference', '').strip() or generate_transaction_reference()
            if Transaction.query.filter_by(reference=ref).first():
                ref = generate_transaction_reference()

            balance_after = float(row.get('balance_after', str(account.balance)) or account.balance)
            txn_date = _parse_date(row.get('transaction_date', '')) or datetime.utcnow()

            credit_types = {'deposit', 'transfer_in', 'mobile_money_in', 'loan_disbursement', 'interest_credit'}
            balance_before = balance_after - amount if txn_type in credit_types else balance_after + amount

            txn = Transaction(
                id=str(uuid.uuid4()),
                reference=ref,
                account_id=account.id,
                transaction_type=txn_type,
                amount=amount,
                fee=0.00,
                balance_before=balance_before,
                balance_after=balance_after,
                currency=account.currency,
                description=row.get('description', '').strip() or f'Migrated {txn_type}',
                channel=row.get('channel', 'migration').strip() or 'migration',
                status=row.get('status', 'completed').strip() or 'completed',
                value_date=txn_date.date() if txn_date else date.today(),
                created_at=txn_date or datetime.utcnow(),
            )
            db.session.add(txn)

            # Update account balance to the latest balance_after for this account
            account.balance = balance_after
            account.available_balance = balance_after
            account.ledger_balance = balance_after
            db.session.commit()
            success += 1
        except Exception as e:
            db.session.rollback()
            errors.append({'row': i, 'error': str(e)})

    return success, errors


def _import_loans(rows):
    errors = []
    success = 0
    for i, row in enumerate(rows, start=2):
        try:
            email = row.get('customer_email', '').strip().lower()
            if not email:
                errors.append({'row': i, 'error': 'customer_email is required'})
                continue

            owner = User.query.filter_by(email=email).first()
            if not owner:
                errors.append({'row': i, 'error': f'Customer not found: {email}'})
                continue

            # Use first active account
            account = Account.query.filter_by(user_id=owner.id, status='active').first()
            if not account:
                errors.append({'row': i, 'error': f'No active account for: {email}'})
                continue

            amount_approved = float(row.get('amount_approved', '0') or 0)
            if amount_approved <= 0:
                errors.append({'row': i, 'error': 'amount_approved must be positive'})
                continue

            interest_rate = float(row.get('interest_rate', '24') or 24)
            tenure = int(row.get('tenure_months', '12') or 12)
            outstanding = float(row.get('outstanding_balance', str(amount_approved)) or amount_approved)
            monthly = float(row.get('monthly_installment', '0') or 0)
            disbursed = _parse_date(row.get('disbursed_date', ''))
            next_payment = _parse_date(row.get('next_payment_date', ''))

            loan_num = generate_loan_number()
            status = row.get('status', 'active').strip() or 'active'

            loan = Loan(
                id=str(uuid.uuid4()),
                loan_number=loan_num,
                user_id=owner.id,
                account_id=account.id,
                loan_type=row.get('loan_type', 'personal').strip() or 'personal',
                amount_requested=amount_approved,
                amount_approved=amount_approved,
                outstanding_balance=outstanding,
                total_paid=max(0, amount_approved - outstanding),
                interest_rate=interest_rate,
                tenure_months=tenure,
                monthly_payment=monthly or round(amount_approved / tenure, 2),
                purpose=row.get('purpose', 'Migrated loan').strip() or 'Migrated loan',
                status=status,
                application_date=disbursed or datetime.utcnow(),
                approval_date=disbursed or datetime.utcnow(),
                disbursement_date=disbursed or datetime.utcnow(),
                next_payment_date=next_payment.date() if next_payment else None,
            )
            db.session.add(loan)
            db.session.commit()
            success += 1
        except Exception as e:
            db.session.rollback()
            errors.append({'row': i, 'error': str(e)})

    return success, errors
