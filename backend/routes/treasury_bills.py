from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User, Account, Transaction, Notification, TreasuryBill, TBillRate
from utils.helpers import generate_transaction_reference
from utils.email_service import send_treasury_bill_email
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid
import random
import string

tbills_bp = Blueprint('treasury_bills', __name__)


def _get_active_rates():
    """Return {tenure_days: TBillRate} for all active rates."""
    rates = TBillRate.query.filter_by(is_active=True).all()
    return {r.tenure_days: r for r in rates}


def _get_rate(tenure_days):
    """Return TBillRate for the given tenure, or None."""
    return TBillRate.query.filter_by(tenure_days=tenure_days, is_active=True).first()


def generate_tbill_reference():
    date_str = datetime.utcnow().strftime('%Y%m%d')
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f'TB{date_str}{random_part}'


def calculate_tbill_returns(principal: float, annual_rate: float, tenure_days: int, wht_rate: float = 8.0) -> dict:
    # Ghana T-bills use simple interest (discount basis)
    gross_interest = principal * (annual_rate / 100) * (tenure_days / 364)
    wht = gross_interest * (wht_rate / 100)
    net_interest = gross_interest - wht
    maturity_value = principal + net_interest
    effective_rate = (net_interest / principal) * (364 / tenure_days) * 100
    return {
        'principal': round(principal, 2),
        'gross_interest': round(gross_interest, 2),
        'withholding_tax': round(wht, 2),
        'net_interest': round(net_interest, 2),
        'maturity_value': round(maturity_value, 2),
        'effective_rate': round(effective_rate, 2),
    }


@tbills_bp.route('/rates', methods=['GET'])
def get_rates():
    active_rates = TBillRate.query.filter_by(is_active=True).order_by(TBillRate.tenure_days).all()
    rates = []
    for r in active_rates:
        annual_rate = float(r.annual_rate)
        wht = float(r.withholding_tax_rate)
        min_inv = float(r.min_investment)
        sample = calculate_tbill_returns(1000, annual_rate, r.tenure_days, wht)
        rates.append({
            'tenure_days': r.tenure_days,
            'tenure_label': r.label,
            'annual_rate': annual_rate,
            'withholding_tax': wht,
            'min_investment': min_inv,
            'sample_on_1000': sample,
            'effective_date': r.effective_date.isoformat() if r.effective_date else None,
        })
    return jsonify({'success': True, 'rates': rates, 'currency': 'GHS'}), 200


@tbills_bp.route('/calculate', methods=['POST'])
@jwt_required()
def calculate():
    data = request.get_json()
    principal = float(data.get('principal', 0))
    tenure_days = int(data.get('tenure_days', 364))

    rate_obj = _get_rate(tenure_days)
    if not rate_obj:
        return jsonify({'success': False, 'message': 'Selected tenure is not currently available'}), 400

    min_inv = float(rate_obj.min_investment)
    if principal < min_inv:
        return jsonify({'success': False, 'message': f'Minimum investment is GHS {min_inv:,.2f}'}), 400

    annual_rate = float(rate_obj.annual_rate)
    wht = float(rate_obj.withholding_tax_rate)
    result = calculate_tbill_returns(principal, annual_rate, tenure_days, wht)
    maturity_date = (date.today() + timedelta(days=tenure_days)).isoformat()

    return jsonify({
        'success': True,
        'principal': principal,
        'tenure_days': tenure_days,
        'annual_rate': annual_rate,
        'maturity_date': maturity_date,
        **result,
    }), 200


@tbills_bp.route('/invest', methods=['POST'])
@jwt_required()
def invest():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    if user.kyc_status not in ['verified', 'pending']:
        return jsonify({'success': False, 'message': 'KYC verification required to invest in Treasury Bills'}), 403

    account_id = data.get('account_id')
    principal = float(data.get('principal', 0))
    tenure_days = int(data.get('tenure_days', 364))

    rate_obj = _get_rate(tenure_days)
    if not rate_obj:
        return jsonify({'success': False, 'message': 'Selected tenure is not currently available'}), 400

    min_inv = float(rate_obj.min_investment)
    if principal < min_inv:
        return jsonify({'success': False, 'message': f'Minimum investment is GHS {min_inv:,.2f}'}), 400

    account = Account.query.filter_by(id=account_id, user_id=user_id, status='active').first()
    if not account:
        return jsonify({'success': False, 'message': 'Account not found'}), 404

    if float(account.available_balance) < principal:
        return jsonify({'success': False, 'message': 'Insufficient funds'}), 400

    annual_rate = float(rate_obj.annual_rate)
    wht_rate = float(rate_obj.withholding_tax_rate)
    returns = calculate_tbill_returns(principal, annual_rate, tenure_days, wht_rate)
    investment_date = date.today()
    maturity_date = investment_date + timedelta(days=tenure_days)

    try:
        # Debit account
        balance_before = float(account.balance)
        account.balance = balance_before - principal
        account.available_balance = float(account.available_balance) - principal
        account.ledger_balance = float(account.ledger_balance) - principal
        account.last_transaction_date = datetime.utcnow()

        txn = Transaction(
            id=str(uuid.uuid4()),
            reference=generate_transaction_reference(),
            account_id=account.id,
            transaction_type='treasury_bill_purchase',
            amount=principal,
            balance_before=balance_before,
            balance_after=float(account.balance),
            currency='GHS',
            description=f'Treasury Bill Investment - {tenure_days} days @ {annual_rate}%',
            channel='online',
            status='completed',
            value_date=investment_date,
        )
        db.session.add(txn)

        tbill = TreasuryBill(
            id=str(uuid.uuid4()),
            reference=generate_tbill_reference(),
            user_id=user_id,
            account_id=account_id,
            principal=principal,
            interest_rate=annual_rate,
            tenure_days=tenure_days,
            interest_earned=returns['gross_interest'],
            withholding_tax=returns['withholding_tax'],
            net_interest=returns['net_interest'],
            maturity_value=returns['maturity_value'],
            investment_date=investment_date,
            maturity_date=maturity_date,
            status='active',
        )
        db.session.add(tbill)

        db.session.add(Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title='Treasury Bill Investment Confirmed',
            message=f'GHS {principal:,.2f} invested in {tenure_days}-Day Treasury Bill @ {annual_rate}% p.a. Matures on {maturity_date.strftime("%d %b %Y")}. Expected return: GHS {returns["maturity_value"]:,.2f}',
            type='success',
            category='investment',
        ))

        db.session.commit()

        try:
            send_treasury_bill_email(user, tbill, 'purchased')
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': f'Treasury Bill investment of GHS {principal:,.2f} confirmed! Matures on {maturity_date.strftime("%d %b %Y")}',
            'treasury_bill': tbill.to_dict(),
            'returns': returns,
            'new_balance': float(account.balance),
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"T-bill investment error: {str(e)}")
        return jsonify({'success': False, 'message': 'Investment failed. Please try again.'}), 500


@tbills_bp.route('/', methods=['GET'])
@jwt_required()
def get_investments():
    user_id = get_jwt_identity()
    status = request.args.get('status')
    query = TreasuryBill.query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status)
    tbills = query.order_by(TreasuryBill.created_at.desc()).all()
    return jsonify({'success': True, 'treasury_bills': [t.to_dict() for t in tbills]}), 200


@tbills_bp.route('/<tbill_id>', methods=['GET'])
@jwt_required()
def get_investment(tbill_id):
    user_id = get_jwt_identity()
    tbill = TreasuryBill.query.filter_by(id=tbill_id, user_id=user_id).first()
    if not tbill:
        return jsonify({'success': False, 'message': 'Investment not found'}), 404
    return jsonify({'success': True, 'treasury_bill': tbill.to_dict()}), 200


@tbills_bp.route('/<tbill_id>/rollover', methods=['POST'])
@jwt_required()
def rollover(tbill_id):
    user_id = get_jwt_identity()
    tbill = TreasuryBill.query.filter_by(id=tbill_id, user_id=user_id, status='matured').first()
    if not tbill:
        return jsonify({'success': False, 'message': 'Matured Treasury Bill not found'}), 404

    data = request.get_json()
    tenure_days = int(data.get('tenure_days', tbill.tenure_days))
    rollover_principal = float(data.get('principal', tbill.maturity_value))

    rate_obj = _get_rate(tenure_days)
    if not rate_obj:
        return jsonify({'success': False, 'message': 'Selected tenure is not currently available'}), 400

    annual_rate = float(rate_obj.annual_rate)
    wht_rate = float(rate_obj.withholding_tax_rate)
    returns = calculate_tbill_returns(rollover_principal, annual_rate, tenure_days, wht_rate)
    investment_date = date.today()
    maturity_date = investment_date + timedelta(days=tenure_days)

    try:
        new_tbill = TreasuryBill(
            id=str(uuid.uuid4()),
            reference=generate_tbill_reference(),
            user_id=user_id,
            account_id=tbill.account_id,
            principal=rollover_principal,
            interest_rate=annual_rate,
            tenure_days=tenure_days,
            interest_earned=returns['gross_interest'],
            withholding_tax=returns['withholding_tax'],
            net_interest=returns['net_interest'],
            maturity_value=returns['maturity_value'],
            investment_date=investment_date,
            maturity_date=maturity_date,
            status='active',
            rolled_over_from=tbill.id,
        )
        db.session.add(new_tbill)
        tbill.status = 'rolled_over'
        tbill.rolled_over_to = new_tbill.id

        db.session.add(Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title='Treasury Bill Rolled Over',
            message=f'GHS {rollover_principal:,.2f} rolled over into new {tenure_days}-day T-bill @ {annual_rate}%. Matures {maturity_date.strftime("%d %b %Y")}.',
            type='success',
            category='investment',
        ))
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Treasury Bill rolled over successfully',
            'new_treasury_bill': new_tbill.to_dict(),
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Rollover failed'}), 500


@tbills_bp.route('/run-maturity-checks', methods=['POST'])
@jwt_required()
def run_maturity_checks():
    """Admin endpoint to process matured T-bills and send alerts."""
    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role not in ['admin', 'super_admin', 'manager']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    result = _process_maturity_checks()
    return jsonify({'success': True, **result}), 200


def _process_maturity_checks():
    today = date.today()
    in_7_days = today + timedelta(days=7)
    matured_count = 0
    pre_alert_count = 0
    errors = []

    # Process matured T-bills
    matured = TreasuryBill.query.filter(
        TreasuryBill.status == 'active',
        TreasuryBill.maturity_date <= today
    ).all()

    for tbill in matured:
        try:
            account = Account.query.get(tbill.account_id)
            user = User.query.get(tbill.user_id)
            if not account or not user:
                continue

            # Credit maturity value to account
            maturity_value = float(tbill.maturity_value)
            balance_before = float(account.balance)
            account.balance = balance_before + maturity_value
            account.available_balance = float(account.available_balance) + maturity_value
            account.ledger_balance = float(account.ledger_balance) + maturity_value
            account.last_transaction_date = datetime.utcnow()

            txn_ref = generate_transaction_reference()
            txn = Transaction(
                id=str(uuid.uuid4()),
                reference=txn_ref,
                account_id=account.id,
                transaction_type='treasury_bill_maturity',
                amount=maturity_value,
                balance_before=balance_before,
                balance_after=float(account.balance),
                currency='GHS',
                description=f'Treasury Bill Maturity - {tbill.reference} (Principal: GHS {float(tbill.principal):,.2f} + Interest: GHS {float(tbill.net_interest):,.2f})',
                channel='online',
                status='completed',
                value_date=today,
            )
            db.session.add(txn)

            tbill.status = 'matured'
            tbill.actual_maturity_date = today
            tbill.maturity_disbursement_txn = txn_ref
            tbill.maturity_alert_sent = True

            db.session.add(Notification(
                id=str(uuid.uuid4()),
                user_id=user.id,
                title='Treasury Bill Matured!',
                message=f'Your {tbill.tenure_days}-day T-bill (Ref: {tbill.reference}) has matured. GHS {maturity_value:,.2f} (Principal + Net Interest) credited to account {account.account_number}.',
                type='success',
                category='investment',
            ))

            try:
                send_treasury_bill_email(user, tbill, 'matured')
            except Exception:
                pass

            matured_count += 1

        except Exception as e:
            errors.append(str(e))

    # Send 7-day pre-maturity alerts
    upcoming = TreasuryBill.query.filter(
        TreasuryBill.status == 'active',
        TreasuryBill.maturity_date <= in_7_days,
        TreasuryBill.maturity_date > today,
        TreasuryBill.pre_maturity_alert_sent == False
    ).all()

    for tbill in upcoming:
        try:
            user = User.query.get(tbill.user_id)
            if not user:
                continue
            days_left = (tbill.maturity_date - today).days
            db.session.add(Notification(
                id=str(uuid.uuid4()),
                user_id=user.id,
                title=f'Treasury Bill Matures in {days_left} Day(s)',
                message=f'Your {tbill.tenure_days}-day T-bill (Ref: {tbill.reference}) matures on {tbill.maturity_date.strftime("%d %b %Y")}. Maturity value: GHS {float(tbill.maturity_value):,.2f}.',
                type='warning',
                category='investment',
            ))
            tbill.pre_maturity_alert_sent = True
            try:
                send_treasury_bill_email(user, tbill, 'pre_maturity')
            except Exception:
                pass
            pre_alert_count += 1
        except Exception as e:
            errors.append(str(e))

    # Loan overdue alerts
    loan_alerts_count = _send_loan_due_alerts()

    db.session.commit()

    return {
        'matured_count': matured_count,
        'pre_alert_count': pre_alert_count,
        'loan_alerts_count': loan_alerts_count,
        'errors': errors,
    }


def _send_loan_due_alerts():
    from models import Loan, LoanRepayment
    from utils.email_service import send_loan_due_alert

    today = date.today()
    in_3_days = today + timedelta(days=3)
    in_7_days = today + timedelta(days=7)
    count = 0

    # Find installments due in 3 and 7 days
    upcoming_repayments = LoanRepayment.query.filter(
        LoanRepayment.status.in_(['pending', 'partial']),
        LoanRepayment.due_date.between(today, in_7_days)
    ).all()

    alerted_loans = set()
    for repayment in upcoming_repayments:
        if repayment.loan_id in alerted_loans:
            continue
        try:
            loan = Loan.query.get(repayment.loan_id)
            if not loan or loan.status not in ['active', 'disbursed']:
                continue
            user = User.query.get(loan.user_id)
            if not user:
                continue

            days_left = (repayment.due_date - today).days
            db.session.add(Notification(
                id=str(uuid.uuid4()),
                user_id=user.id,
                title=f'Loan Payment Due in {days_left} Day(s)',
                message=f'Your loan (#{loan.loan_number}) payment of GHS {float(repayment.total_amount):,.2f} is due on {repayment.due_date.strftime("%d %b %Y")}. Please ensure sufficient funds in your account.',
                type='warning',
                category='loan',
            ))

            try:
                send_loan_due_alert(user, loan, repayment)
            except Exception:
                pass

            alerted_loans.add(repayment.loan_id)
            count += 1
        except Exception:
            pass

    # Overdue alerts
    overdue_repayments = LoanRepayment.query.filter(
        LoanRepayment.status.in_(['pending', 'partial']),
        LoanRepayment.due_date < today
    ).all()

    for repayment in overdue_repayments:
        if repayment.loan_id in alerted_loans:
            continue
        try:
            loan = Loan.query.get(repayment.loan_id)
            if not loan:
                continue
            user = User.query.get(loan.user_id)
            if not user:
                continue
            days_overdue = (today - repayment.due_date).days
            db.session.add(Notification(
                id=str(uuid.uuid4()),
                user_id=user.id,
                title='Overdue Loan Payment',
                message=f'Your loan payment of GHS {float(repayment.total_amount):,.2f} for loan #{loan.loan_number} is {days_overdue} day(s) overdue. Please make payment immediately to avoid penalties.',
                type='error',
                category='loan',
            ))
            alerted_loans.add(repayment.loan_id)
            count += 1
        except Exception:
            pass

    return count
