import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from extensions import db
from models import User, KYCInfo, KYCDocument, Notification, AuditLog
from utils.helpers import calculate_kyc_completion
from datetime import datetime

kyc_bp = Blueprint('kyc', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'gif', 'webp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@kyc_bp.route('/status', methods=['GET'])
@jwt_required()
def get_kyc_status():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    kyc_info = KYCInfo.query.filter_by(user_id=user_id).first()
    documents = KYCDocument.query.filter_by(user_id=user_id).all()

    completion = calculate_kyc_completion(user, kyc_info, documents)
    user.kyc_completion = completion
    db.session.commit()

    missing = []
    if not user.ghana_card_number:
        missing.append('Ghana Card Number')
    if not kyc_info or not kyc_info.date_of_birth:
        missing.append('Date of Birth')
    if not kyc_info or not kyc_info.residential_address:
        missing.append('Residential Address')
    if not kyc_info or not kyc_info.region:
        missing.append('Region')
    if not kyc_info or not kyc_info.employment_status:
        missing.append('Employment Details')
    if not kyc_info or not kyc_info.source_of_funds:
        missing.append('Source of Funds')
    if not kyc_info or not kyc_info.nok_first_name:
        missing.append('Next of Kin')
    doc_types = [d.document_type for d in documents]
    if 'ghana_card_front' not in doc_types:
        missing.append('Ghana Card (Front)')
    if 'selfie' not in doc_types:
        missing.append('Selfie / Photo')

    return jsonify({
        'success': True,
        'kyc_status': user.kyc_status,
        'kyc_completion': completion,
        'kyc_info': kyc_info.to_dict() if kyc_info else None,
        'documents': [d.to_dict() for d in documents],
        'missing_items': missing,
    }), 200


@kyc_bp.route('/personal', methods=['PUT'])
@jwt_required()
def update_personal_info():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    if 'first_name' in data:
        user.first_name = data['first_name'].strip()
    if 'last_name' in data:
        user.last_name = data['last_name'].strip()
    if 'other_names' in data:
        user.other_names = data['other_names'].strip()
    if 'gender' in data:
        user.gender = data['gender']
    if 'date_of_birth' in data and data['date_of_birth']:
        try:
            user.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    kyc_info = KYCInfo.query.filter_by(user_id=user_id).first()
    if not kyc_info:
        kyc_info = KYCInfo(id=str(uuid.uuid4()), user_id=user_id)
        db.session.add(kyc_info)

    fields = ['date_of_birth', 'place_of_birth', 'nationality', 'marital_status',
              'mother_maiden_name', 'tin_number', 'ssnit_number', 'nhis_number',
              'passport_number', 'voter_id', 'drivers_license', 'is_pep', 'pep_details']
    for field in fields:
        if field in data:
            if field == 'date_of_birth' and data[field]:
                try:
                    setattr(kyc_info, field, datetime.strptime(data[field], '%Y-%m-%d').date())
                except ValueError:
                    pass
            elif field == 'is_pep':
                setattr(kyc_info, field, bool(data[field]))
            else:
                setattr(kyc_info, field, data[field])

    kyc_info.updated_at = datetime.utcnow()
    _update_kyc_completion(user_id, user, kyc_info)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Personal information updated successfully', 'kyc_info': kyc_info.to_dict()}), 200


@kyc_bp.route('/address', methods=['PUT'])
@jwt_required()
def update_address():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    kyc_info = KYCInfo.query.filter_by(user_id=user_id).first()
    if not kyc_info:
        kyc_info = KYCInfo(id=str(uuid.uuid4()), user_id=user_id)
        db.session.add(kyc_info)

    address_fields = ['residential_address', 'digital_address', 'city', 'region',
                      'country', 'years_at_address', 'postal_address']
    for field in address_fields:
        if field in data:
            setattr(kyc_info, field, data[field])

    kyc_info.updated_at = datetime.utcnow()
    _update_kyc_completion(user_id, user, kyc_info)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Address updated successfully'}), 200


@kyc_bp.route('/employment', methods=['PUT'])
@jwt_required()
def update_employment():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    kyc_info = KYCInfo.query.filter_by(user_id=user_id).first()
    if not kyc_info:
        kyc_info = KYCInfo(id=str(uuid.uuid4()), user_id=user_id)
        db.session.add(kyc_info)

    emp_fields = ['employment_status', 'employer_name', 'employer_address', 'employer_phone',
                  'job_title', 'industry', 'monthly_income', 'annual_income',
                  'years_of_employment', 'source_of_funds', 'source_of_funds_details']
    for field in emp_fields:
        if field in data:
            setattr(kyc_info, field, data[field])

    kyc_info.updated_at = datetime.utcnow()
    _update_kyc_completion(user_id, user, kyc_info)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Employment details updated successfully'}), 200


@kyc_bp.route('/next-of-kin', methods=['PUT'])
@jwt_required()
def update_next_of_kin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    kyc_info = KYCInfo.query.filter_by(user_id=user_id).first()
    if not kyc_info:
        kyc_info = KYCInfo(id=str(uuid.uuid4()), user_id=user_id)
        db.session.add(kyc_info)

    nok_fields = ['nok_first_name', 'nok_last_name', 'nok_relationship', 'nok_phone',
                  'nok_email', 'nok_address', 'nok_ghana_card']
    for field in nok_fields:
        if field in data:
            setattr(kyc_info, field, data[field])

    kyc_info.updated_at = datetime.utcnow()
    _update_kyc_completion(user_id, user, kyc_info)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Next of kin updated successfully'}), 200


@kyc_bp.route('/documents/upload', methods=['POST'])
@jwt_required()
def upload_document():
    user_id = get_jwt_identity()

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    document_type = request.form.get('document_type', '')

    valid_doc_types = [
        'ghana_card_front', 'ghana_card_back', 'passport', 'voter_id',
        'drivers_license', 'utility_bill', 'bank_statement', 'selfie',
        'signature', 'business_registration', 'nhis_card', 'others'
    ]

    if document_type not in valid_doc_types:
        return jsonify({'success': False, 'message': 'Invalid document type'}), 400

    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'File type not allowed. Use PNG, JPG, PDF'}), 400

    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    user_folder = os.path.join(upload_folder, 'kyc', user_id)
    os.makedirs(user_folder, exist_ok=True)

    filename = secure_filename(f"{document_type}_{uuid.uuid4().hex[:8]}_{file.filename}")
    file_path = os.path.join(user_folder, filename)
    file.save(file_path)

    file_size = os.path.getsize(file_path)

    # Remove old document of same type
    old_doc = KYCDocument.query.filter_by(user_id=user_id, document_type=document_type).first()
    if old_doc:
        try:
            if os.path.exists(old_doc.file_path):
                os.remove(old_doc.file_path)
        except Exception:
            pass
        db.session.delete(old_doc)

    doc = KYCDocument(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_type=document_type,
        file_path=file_path,
        file_name=filename,
        original_name=file.filename,
        file_size=file_size,
        mime_type=file.content_type,
        status='pending',
    )
    db.session.add(doc)

    user = User.query.get(user_id)
    kyc_info = KYCInfo.query.filter_by(user_id=user_id).first()
    documents = KYCDocument.query.filter_by(user_id=user_id).all()
    user.kyc_completion = calculate_kyc_completion(user, kyc_info, documents)

    # Auto-submit for review if completion >= 80%
    if user.kyc_completion >= 80 and user.kyc_status == 'basic':
        user.kyc_status = 'pending'
        kyc_info.submitted_at = datetime.utcnow()
        db.session.add(Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title='KYC Submitted for Review',
            message='Your KYC has been submitted for review. We will notify you within 1-3 business days.',
            type='info',
            category='kyc',
        ))

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'{document_type.replace("_", " ").title()} uploaded successfully',
        'document': doc.to_dict(),
        'kyc_completion': user.kyc_completion,
    }), 200


@kyc_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_kyc():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    kyc_info = KYCInfo.query.filter_by(user_id=user_id).first()
    documents = KYCDocument.query.filter_by(user_id=user_id).all()

    if user.kyc_status == 'verified':
        return jsonify({'success': False, 'message': 'KYC already verified'}), 400

    completion = calculate_kyc_completion(user, kyc_info, documents)
    if completion < 60:
        return jsonify({
            'success': False,
            'message': f'KYC completion is {completion}%. Minimum 60% required to submit. Please fill in more details.'
        }), 400

    user.kyc_status = 'pending'
    user.kyc_completion = completion
    if kyc_info:
        kyc_info.submitted_at = datetime.utcnow()

    db.session.add(Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title='KYC Submitted for Review',
        message='Your KYC documents have been submitted for review. You will be notified within 1-3 business days.',
        type='info',
        category='kyc',
    ))
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'KYC submitted for review. You will be notified within 1-3 business days.',
        'kyc_status': user.kyc_status,
        'kyc_completion': user.kyc_completion,
    }), 200


def _update_kyc_completion(user_id, user, kyc_info):
    documents = KYCDocument.query.filter_by(user_id=user_id).all()
    user.kyc_completion = calculate_kyc_completion(user, kyc_info, documents)
