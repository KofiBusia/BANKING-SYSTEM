from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models import User, Account, Loan, LoanRepayment, Transaction, Notification
from utils.helpers import generate_loan_number, generate_transaction_reference, calculate_loan_repayment
from utils.email_service import send_loan_status_email
from datetime import datetime, timedelta, date
import uuid

loans_bp = Blueprint('loans', __name__)

LOAN_RATES = {
    'personal': 25.0,
    'business': 22.0,
    'mortgage': 18.0,
    'auto': 20.0,
    'salary_advance': 15.0,
    'sme': 20.0,
    'education': 15.0,
    'agricultural': 18.0,
}

LOAN_MAX_AMOUNTS = {
    'basic': 0,          # No loans for unverified
    'pending': 2000,
    'verified': 500000,
}


@loans_bp.route('/eligibility', methods=['GET'])
@jwt_required()
def check_eligibility():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    max_amount = LOAN_MAX_AMOUNTS.get(user.kyc_status, 0)
    eligible = max_amount > 0

    return jsonify({
        'success': True,
        'eligible': eligible,
        'max_amount': max_amount,
        'kyc_status': user.kyc_status,
        'message': 'Complete KYC verification to apply for loans' if not eligible else 'You are eligible to apply for loans',
        'available_types': list(LOAN_RATES.keys()) if eligible else [],
        'interest_rates': LOAN_RATES if eligible else {},
    }), 200


@loans_bp.route('/calculate', methods=['POST'])
@jwt_required()
def calculate_loan():
    data = request.get_json()
    amount = float(data.get('amount', 0))
    months = int(data.get('months', 12))
    loan_type = data.get('loan_type', 'personal')
    interest_type = data.get('interest_type', 'reducing')

    if amount <= 0 or months <= 0:
        return jsonify({'success': False, 'message': 'Invalid amount or tenure'}), 400

    rate = LOAN_RATES.get(loan_type, 25.0)
    result = calculate_loan_repayment(amount, rate, months, interest_type)
    processing_fee = round(amount * 0.02, 2)

    return jsonify({
        'success': True,
        'loan_type': loan_type,
        'amount': amount,
        'interest_rate': rate,
        'interest_type': interest_type,
        'tenure_months': months,
        'monthly_payment': result['monthly_payment'],
        'total_repayment': result['total_repayment'],
        'total_interest': result['total_interest'],
        'processing_fee': processing_fee,
        'total_cost': round(result['total_repayment'] + processing_fee, 2),
        'schedule': result['schedule'][:3],  # Preview first 3 installments
    }), 200


@loans_bp.route('/apply', methods=['POST'])
@jwt_required()
def apply_loan():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    max_amount = LOAN_MAX_AMOUNTS.get(user.kyc_status, 0)
    if max_amount == 0:
        return jsonify({'success': False, 'message': 'Please complete KYC verification before applying for a loan'}), 403

    loan_type = data.get('loan_type', 'personal')
    amount = float(data.get('amount', 0))
    tenure_months = int(data.get('tenure_months', 12))
    purpose = data.get('purpose', '').strip()
    account_id = data.get('account_id')
    interest_type = data.get('interest_type', 'reducing')

    if not purpose:
        return jsonify({'success': False, 'message': 'Loan purpose is required'}), 400

    if amount <= 0:
        return jsonify({'success': False, 'message': 'Invalid loan amount'}), 400

    if amount > max_amount:
        return jsonify({'success': False, 'message': f'Maximum loan amount for your KYC level is GHS {max_amount:,.2f}'}), 400

    if loan_type not in LOAN_RATES:
        return jsonify({'success': False, 'message': 'Invalid loan type'}), 400

    if tenure_months < 1 or tenure_months > 240:
        return jsonify({'success': False, 'message': 'Loan tenure must be between 1 and 240 months'}), 400

    account = Account.query.filter_by(id=account_id, user_id=user_id, status='active').first()
    if not account:
        return jsonify({'success': False, 'message': 'Account not found'}), 404

    # Check for existing active loans
    active_loans = Loan.query.filter_by(user_id=user_id).filter(
        Loan.status.in_(['active', 'disbursed', 'approved'])
    ).count()
    if active_loans >= 3:
        return jsonify({'success': False, 'message': 'Maximum of 3 active loans allowed'}), 400

    rate = LOAN_RATES[loan_type]
    calc = calculate_loan_repayment(amount, rate, tenure_months, interest_type)
    processing_fee = round(amount * 0.02, 2)

    loan = Loan(
        id=str(uuid.uuid4()),
        loan_number=generate_loan_number(),
        user_id=user_id,
        account_id=account_id,
        loan_type=loan_type,
        amount_requested=amount,
        interest_rate=rate,
        interest_type=interest_type,
        processing_fee=processing_fee,
        processing_fee_rate=2.0,
        tenure_months=tenure_months,
        monthly_payment=calc['monthly_payment'],
        total_repayment=calc['total_repayment'],
        total_interest=calc['total_interest'],
        purpose=purpose,
        description=data.get('description', ''),
        status='pending',
        collateral_type=data.get('collateral_type'),
        collateral_value=float(data.get('collateral_value', 0)) or None,
        collateral_description=data.get('collateral_description'),
        guarantor_name=data.get('guarantor_name'),
        guarantor_phone=data.get('guarantor_phone'),
        guarantor_email=data.get('guarantor_email'),
        guarantor_relationship=data.get('guarantor_relationship'),
        guarantor_ghana_card=data.get('guarantor_ghana_card'),
        guarantor_address=data.get('guarantor_address'),
    )
    db.session.add(loan)
    db.session.flush()

    # Generate repayment schedule
    start_date = datetime.utcnow().date()
    for inst in calc['schedule']:
        due_date = start_date + timedelta(days=30 * inst['installment'])
        repayment = LoanRepayment(
            id=str(uuid.uuid4()),
            loan_id=loan.id,
            installment_number=inst['installment'],
            due_date=due_date,
            principal_amount=inst['principal'],
            interest_amount=inst['interest'],
            total_amount=inst['total'],
            status='pending',
        )
        db.session.add(repayment)

    db.session.add(Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title='Loan Application Received',
        message=f'Your {loan_type.replace("_"," ").title()} loan application of GHS {amount:,.2f} (Loan #{loan.loan_number}) has been received and is under review.',
        type='info',
        category='loan',
    ))
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Loan application submitted successfully. You will be notified of the decision.',
        'loan': loan.to_dict(),
        'schedule': calc['schedule'],
    }), 201


@loans_bp.route('/', methods=['GET'])
@jwt_required()
def get_loans():
    user_id = get_jwt_identity()
    status = request.args.get('status')
    query = Loan.query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status)
    loans = query.order_by(Loan.created_at.desc()).all()
    return jsonify({'success': True, 'loans': [l.to_dict() for l in loans]}), 200


@loans_bp.route('/<loan_id>', methods=['GET'])
@jwt_required()
def get_loan(loan_id):
    user_id = get_jwt_identity()
    loan = Loan.query.filter_by(id=loan_id, user_id=user_id).first()
    if not loan:
        return jsonify({'success': False, 'message': 'Loan not found'}), 404

    repayments = LoanRepayment.query.filter_by(loan_id=loan_id).order_by(LoanRepayment.installment_number).all()

    return jsonify({
        'success': True,
        'loan': loan.to_dict(),
        'repayments': [r.to_dict() for r in repayments],
    }), 200


@loans_bp.route('/<loan_id>/repay', methods=['POST'])
@jwt_required()
def repay_loan(loan_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    loan = Loan.query.filter_by(id=loan_id, user_id=user_id).first()
    if not loan:
        return jsonify({'success': False, 'message': 'Loan not found'}), 404

    if loan.status not in ['active', 'disbursed']:
        return jsonify({'success': False, 'message': 'Loan is not active'}), 400

    account_id = data.get('account_id')
    amount = float(data.get('amount', 0))

    account = Account.query.filter_by(id=account_id, user_id=user_id, status='active').first()
    if not account:
        return jsonify({'success': False, 'message': 'Account not found'}), 404

    if float(account.available_balance) < amount:
        return jsonify({'success': False, 'message': 'Insufficient funds'}), 400

    if amount <= 0:
        return jsonify({'success': False, 'message': 'Invalid amount'}), 400

    try:
        balance_before = float(account.balance)
        account.balance = balance_before - amount
        account.available_balance = float(account.available_balance) - amount
        account.ledger_balance = float(account.ledger_balance) - amount

        txn = Transaction(
            id=str(uuid.uuid4()),
            reference=generate_transaction_reference(),
            account_id=account.id,
            transaction_type='loan_repayment',
            amount=amount,
            balance_before=balance_before,
            balance_after=float(account.balance),
            currency='GHS',
            description=f'Loan Repayment - {loan.loan_number}',
            channel='online',
            status='completed',
            value_date=datetime.utcnow().date(),
        )
        db.session.add(txn)

        # Update loan outstanding balance
        remaining = float(loan.outstanding_balance or loan.amount_requested) - amount
        loan.outstanding_balance = max(remaining, 0)
        loan.total_paid = float(loan.total_paid or 0) + amount

        # Mark installments as paid
        pending_installments = LoanRepayment.query.filter_by(
            loan_id=loan_id, status='pending'
        ).order_by(LoanRepayment.installment_number).all()

        remaining_payment = amount
        for inst in pending_installments:
            if remaining_payment <= 0:
                break
            if remaining_payment >= float(inst.total_amount):
                inst.status = 'paid'
                inst.paid_amount = float(inst.total_amount)
                inst.payment_date = datetime.utcnow()
                inst.transaction_id = txn.id
                remaining_payment -= float(inst.total_amount)
            else:
                inst.paid_amount = float(inst.paid_amount or 0) + remaining_payment
                inst.status = 'partial'
                inst.payment_date = datetime.utcnow()
                remaining_payment = 0

        # Check if loan is fully paid
        if loan.outstanding_balance <= 0.01:
            loan.status = 'completed'
            loan.actual_completion_date = datetime.utcnow().date()

        db.session.add(Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title='Loan Payment Successful',
            message=f'GHS {amount:,.2f} repayment made on loan {loan.loan_number}. Outstanding balance: GHS {float(loan.outstanding_balance):,.2f}',
            type='success',
            category='loan',
        ))
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Loan repayment of GHS {amount:,.2f} processed successfully',
            'transaction': txn.to_dict(),
            'outstanding_balance': float(loan.outstanding_balance),
            'loan_status': loan.status,
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Repayment failed. Please try again.'}), 500
