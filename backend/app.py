import os
import logging
from flask import Flask, jsonify, request
from config import config
from extensions import db, jwt, bcrypt, cors, mail, limiter
from apscheduler.schedulers.background import BackgroundScheduler
import atexit

_scheduler = None


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['default']))

    # Ensure upload folder exists
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)

    # Init extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*", "allow_headers": ["Authorization", "Content-Type"], "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}}, supports_credentials=False)
    mail.init_app(app)
    limiter.init_app(app)

    # Security headers
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        return response

    # Register blueprints
    from routes.auth import auth_bp
    from routes.accounts import accounts_bp
    from routes.transactions import transactions_bp
    from routes.kyc import kyc_bp
    from routes.loans import loans_bp
    from routes.admin import admin_bp
    from routes.notifications import notifications_bp
    from routes.treasury_bills import tbills_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(accounts_bp, url_prefix='/api/accounts')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
    app.register_blueprint(kyc_bp, url_prefix='/api/kyc')
    app.register_blueprint(loans_bp, url_prefix='/api/loans')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(tbills_bp, url_prefix='/api/treasury-bills')

    # Create tables
    with app.app_context():
        db.create_all()
        _seed_initial_data(app)

    # APScheduler: daily jobs for T-bill maturity and loan due alerts
    global _scheduler
    if _scheduler is None and not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        _scheduler = BackgroundScheduler(timezone='Africa/Accra')

        def run_daily_checks():
            with app.app_context():
                try:
                    from routes.treasury_bills import _process_maturity_checks
                    result = _process_maturity_checks()
                    app.logger.info(f"Daily checks: {result}")
                except Exception as e:
                    app.logger.error(f"Scheduler error: {str(e)}")

        _scheduler.add_job(
            func=run_daily_checks,
            trigger='cron',
            hour=7,
            minute=0,
            id='daily_checks',
            replace_existing=True,
        )
        _scheduler.start()
        atexit.register(lambda: _scheduler.shutdown(wait=False))
        app.logger.info("APScheduler started — daily checks at 07:00 WAT")

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'success': False, 'message': 'Token has expired', 'error': 'token_expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'success': False, 'message': 'Invalid token', 'error': 'invalid_token'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'success': False, 'message': 'Authentication required', 'error': 'authorization_required'}), 401

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'Resource not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'success': False, 'message': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

    @app.route('/api/health')
    def health():
        return jsonify({
            'success': True,
            'status': 'healthy',
            'bank': app.config.get('BANK_NAME', 'GhanaBank'),
            'version': '1.0.0',
        }), 200

    @app.route('/api/info')
    def info():
        return jsonify({
            'bank_name': app.config.get('BANK_NAME'),
            'bank_code': app.config.get('BANK_CODE'),
            'swift_code': app.config.get('BANK_SWIFT'),
            'sort_code': app.config.get('BANK_SORT_CODE'),
            'currency': 'GHS',
            'country': 'Ghana',
            'supported_features': [
                'savings_accounts', 'current_accounts', 'fixed_deposits', 'susu_accounts',
                'internal_transfers', 'mobile_money', 'loan_management', 'kyc_verification',
                'transaction_history', 'email_notifications', 'multi_role_access'
            ],
        }), 200

    return app


def _seed_initial_data(app):
    from models import User, Branch, Staff
    from extensions import bcrypt as bc
    import uuid

    # Seed default branch
    if not Branch.query.first():
        branch = Branch(
            id=str(uuid.uuid4()),
            name='Head Office - Accra',
            code='HO001',
            address='Liberation Road, Airport City',
            digital_address='GA-123-4567',
            city='Accra',
            region='Greater Accra',
            phone='0302000000',
            email='headoffice@ghanabank.com',
            opening_hours='Mon-Fri: 8AM-5PM, Sat: 9AM-1PM',
            status='active',
        )
        db.session.add(branch)

        branch2 = Branch(
            id=str(uuid.uuid4()),
            name='Kumasi Branch',
            code='KSI001',
            address='Asafo Market Area, Kumasi',
            city='Kumasi',
            region='Ashanti',
            phone='0322000000',
            email='kumasi@ghanabank.com',
            opening_hours='Mon-Fri: 8AM-5PM, Sat: 9AM-1PM',
            status='active',
        )
        db.session.add(branch2)
        db.session.commit()

    # Seed super admin
    if not User.query.filter_by(role='super_admin').first():
        admin = User(
            id=str(uuid.uuid4()),
            first_name='System',
            last_name='Administrator',
            email='admin@ghanabank.com',
            phone='0200000000',
            password_hash=bc.generate_password_hash('Admin@GhanaBank2024').decode('utf-8'),
            role='super_admin',
            kyc_status='verified',
            kyc_completion=100,
            account_status='active',
            email_verified=True,
        )
        db.session.add(admin)

        manager = User(
            id=str(uuid.uuid4()),
            first_name='Branch',
            last_name='Manager',
            email='manager@ghanabank.com',
            phone='0200000001',
            password_hash=bc.generate_password_hash('Manager@GhanaBank2024').decode('utf-8'),
            role='manager',
            kyc_status='verified',
            kyc_completion=100,
            account_status='active',
            email_verified=True,
        )
        db.session.add(manager)

        teller = User(
            id=str(uuid.uuid4()),
            first_name='Bank',
            last_name='Teller',
            email='teller@ghanabank.com',
            phone='0200000002',
            password_hash=bc.generate_password_hash('Teller@GhanaBank2024').decode('utf-8'),
            role='teller',
            kyc_status='verified',
            kyc_completion=100,
            account_status='active',
            email_verified=True,
        )
        db.session.add(teller)
        db.session.commit()

        app.logger.info("✅ Default staff accounts created:")
        app.logger.info("   Admin: admin@ghanabank.com / Admin@GhanaBank2024")
        app.logger.info("   Manager: manager@ghanabank.com / Manager@GhanaBank2024")
        app.logger.info("   Teller: teller@ghanabank.com / Teller@GhanaBank2024")


if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
