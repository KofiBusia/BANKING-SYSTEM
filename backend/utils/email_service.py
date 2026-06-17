from flask import current_app, render_template_string
from flask_mail import Message
from extensions import mail


def send_email(to: str, subject: str, html_body: str, text_body: str = None):
    try:
        msg = Message(subject=subject, recipients=[to])
        msg.html = html_body
        if text_body:
            msg.body = text_body
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Email error: {str(e)}")
        return False


def send_welcome_email(user, temp_password: str = None):
    bank_name = current_app.config.get('BANK_NAME', 'GhanaBank')
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
    body{{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}}
    .container{{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}}
    .header{{background:linear-gradient(135deg,#1B3A6B,#2563EB);padding:40px;text-align:center;color:#fff}}
    .header h1{{margin:0;font-size:28px}}
    .header p{{margin:5px 0 0;opacity:.9;font-size:14px}}
    .body{{padding:40px}}
    .body h2{{color:#1B3A6B;margin-top:0}}
    .info-box{{background:#f0f7ff;border-left:4px solid #2563EB;padding:16px;border-radius:4px;margin:20px 0}}
    .btn{{display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0}}
    .footer{{background:#f8fafc;padding:20px;text-align:center;color:#666;font-size:12px}}
    .kyc-alert{{background:#fff3cd;border:1px solid #ffc107;padding:16px;border-radius:8px;margin:20px 0;color:#856404}}
    </style></head>
    <body>
    <div class="container">
      <div class="header">
        <h1>{bank_name}</h1>
        <p>Your Trusted Financial Partner</p>
      </div>
      <div class="body">
        <h2>Welcome to {bank_name}, {user.first_name}!</h2>
        <p>We are delighted to have you join the {bank_name} family. Your account has been successfully created.</p>
        <div class="info-box">
          <strong>Your Registration Details:</strong><br><br>
          <strong>Full Name:</strong> {user.full_name}<br>
          <strong>Email:</strong> {user.email}<br>
          <strong>Phone:</strong> {user.phone}<br>
          <strong>Ghana Card:</strong> {user.ghana_card_number or 'Not provided'}
        </div>
        <div class="kyc-alert">
          <strong>⚠️ Action Required: Complete Your KYC</strong><br>
          Your account is currently at basic level. Please complete your KYC verification to access all banking features including higher transaction limits, loans, and more.
          <br><br>
          <strong>Missing details:</strong> Personal info, Address, Employment, Documents & Next of Kin
        </div>
        <p>To complete your KYC, log in to your account and navigate to <strong>Profile > Complete KYC</strong>.</p>
        <a href="{current_app.config.get('FRONTEND_URL', 'http://localhost:5173')}/dashboard/kyc" class="btn">Complete KYC Now</a>
        <p style="color:#666;font-size:13px;">If you did not create this account, please contact us immediately at <a href="mailto:support@ghanabank.com">support@ghanabank.com</a></p>
      </div>
      <div class="footer">
        <p>&copy; 2024 {bank_name}. All rights reserved.</p>
        <p>Regulated by the Bank of Ghana | RC: GH-12345-2024</p>
      </div>
    </div>
    </body></html>
    """
    return send_email(user.email, f'Welcome to {bank_name} - Account Created Successfully', html)


def send_transaction_alert(user, transaction, account):
    bank_name = current_app.config.get('BANK_NAME', 'GhanaBank')
    is_credit = transaction.transaction_type in ['deposit', 'transfer_in', 'loan_disbursement', 'interest_credit', 'mobile_money_in']
    color = '#10B981' if is_credit else '#EF4444'
    sign = '+' if is_credit else '-'
    action = 'Credit' if is_credit else 'Debit'

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
    body{{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}}
    .container{{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}}
    .header{{background:linear-gradient(135deg,#1B3A6B,#2563EB);padding:30px;text-align:center;color:#fff}}
    .amount-box{{background:{color};color:#fff;padding:30px;text-align:center}}
    .amount-box .amount{{font-size:36px;font-weight:bold}}
    .body{{padding:30px}}
    .detail-row{{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0}}
    .detail-row:last-child{{border-bottom:none}}
    .label{{color:#666;font-size:14px}}
    .value{{font-weight:bold;color:#1a1a2e;font-size:14px}}
    .footer{{background:#f8fafc;padding:20px;text-align:center;color:#666;font-size:12px}}
    </style></head>
    <body>
    <div class="container">
      <div class="header">
        <h2 style="margin:0">{bank_name} Transaction Alert</h2>
      </div>
      <div class="amount-box">
        <div style="font-size:14px;opacity:.9">{action} Alert</div>
        <div class="amount">{sign} GHS {float(transaction.amount):,.2f}</div>
        <div style="font-size:13px;opacity:.9;margin-top:8px">{transaction.description or transaction.transaction_type.replace('_',' ').title()}</div>
      </div>
      <div class="body">
        <h3 style="color:#1B3A6B;margin-top:0">Transaction Details</h3>
        <div class="detail-row">
          <span class="label">Account Number</span>
          <span class="value">{account.account_number}</span>
        </div>
        <div class="detail-row">
          <span class="label">Transaction Type</span>
          <span class="value">{transaction.transaction_type.replace('_',' ').title()}</span>
        </div>
        <div class="detail-row">
          <span class="label">Reference</span>
          <span class="value">{transaction.reference}</span>
        </div>
        <div class="detail-row">
          <span class="label">Amount</span>
          <span class="value" style="color:{color}">{sign} GHS {float(transaction.amount):,.2f}</span>
        </div>
        <div class="detail-row">
          <span class="label">Previous Balance</span>
          <span class="value">GHS {float(transaction.balance_before):,.2f}</span>
        </div>
        <div class="detail-row">
          <span class="label">Current Balance</span>
          <span class="value">GHS {float(transaction.balance_after):,.2f}</span>
        </div>
        <div class="detail-row">
          <span class="label">Date & Time</span>
          <span class="value">{transaction.created_at.strftime('%d %b %Y %H:%M:%S') if transaction.created_at else 'N/A'}</span>
        </div>
        <p style="color:#666;font-size:13px;margin-top:20px">If you did not authorize this transaction, please contact us immediately on <strong>0800 000 000</strong> or email <a href="mailto:support@ghanabank.com">support@ghanabank.com</a></p>
      </div>
      <div class="footer">
        <p>&copy; 2024 {bank_name}. All rights reserved.</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
    </body></html>
    """
    return send_email(user.email, f'{bank_name} - Transaction Alert: {sign} GHS {float(transaction.amount):,.2f}', html)


def send_password_reset_email(user, reset_token: str):
    bank_name = current_app.config.get('BANK_NAME', 'GhanaBank')
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
    body{{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}}
    .container{{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}}
    .header{{background:linear-gradient(135deg,#1B3A6B,#2563EB);padding:40px;text-align:center;color:#fff}}
    .body{{padding:40px}}
    .btn{{display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0}}
    .warning{{background:#fff3cd;border:1px solid #ffc107;padding:16px;border-radius:8px;color:#856404;margin:20px 0;font-size:13px}}
    .footer{{background:#f8fafc;padding:20px;text-align:center;color:#666;font-size:12px}}
    </style></head>
    <body>
    <div class="container">
      <div class="header">
        <h1 style="margin:0">{bank_name}</h1>
        <p style="margin:5px 0 0;opacity:.9">Password Reset Request</p>
      </div>
      <div class="body">
        <h2 style="color:#1B3A6B">Reset Your Password</h2>
        <p>Hello {user.first_name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password. This link will expire in <strong>1 hour</strong>.</p>
        <div style="text-align:center">
          <a href="{reset_url}" class="btn">Reset My Password</a>
        </div>
        <div class="warning">
          <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email and your password will remain unchanged. Consider contacting us if you believe someone is trying to access your account.
        </div>
        <p style="font-size:13px;color:#666">If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="{reset_url}" style="color:#2563EB;word-break:break-all">{reset_url}</a></p>
      </div>
      <div class="footer">
        <p>&copy; 2024 {bank_name}. All rights reserved.</p>
      </div>
    </div>
    </body></html>
    """
    return send_email(user.email, f'{bank_name} - Password Reset Request', html)


def send_kyc_status_email(user, status: str, rejection_reason: str = None):
    bank_name = current_app.config.get('BANK_NAME', 'GhanaBank')
    if status == 'verified':
        subject = f'{bank_name} - KYC Verification Approved!'
        message = f"""
        <p>Congratulations, {user.first_name}!</p>
        <p>Your KYC verification has been <strong style="color:#10B981">approved</strong>. You now have full access to all {bank_name} banking services including:</p>
        <ul>
          <li>Higher transaction limits</li>
          <li>Loan applications</li>
          <li>Fixed deposit accounts</li>
          <li>International transfers</li>
        </ul>
        """
        color = '#10B981'
    else:
        subject = f'{bank_name} - KYC Verification Update'
        message = f"""
        <p>Hello {user.first_name},</p>
        <p>Your KYC verification has been <strong style="color:#EF4444">rejected</strong> for the following reason:</p>
        <div style="background:#fee2e2;border:1px solid #fecaca;padding:16px;border-radius:8px;color:#991b1b;margin:16px 0">
          {rejection_reason or 'Please resubmit your documents.'}
        </div>
        <p>Please log in and resubmit your KYC documents with the correct information.</p>
        """
        color = '#EF4444'

    html = f"""
    <!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}}
    .container{{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}}
    .header{{background:linear-gradient(135deg,#1B3A6B,#2563EB);padding:40px;text-align:center;color:#fff}}
    .status-badge{{background:{color};color:#fff;padding:20px;text-align:center;font-size:20px;font-weight:bold}}
    .body{{padding:40px}}
    .btn{{display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold}}
    .footer{{background:#f8fafc;padding:20px;text-align:center;color:#666;font-size:12px}}
    </style></head><body>
    <div class="container">
      <div class="header"><h1 style="margin:0">{bank_name}</h1></div>
      <div class="status-badge">KYC Status: {status.upper()}</div>
      <div class="body">{message}
        <div style="text-align:center;margin-top:20px">
          <a href="{current_app.config.get('FRONTEND_URL','http://localhost:5173')}/dashboard/kyc" class="btn">View KYC Status</a>
        </div>
      </div>
      <div class="footer"><p>&copy; 2024 {bank_name}. All rights reserved.</p></div>
    </div></body></html>
    """
    return send_email(user.email, subject, html)


def send_loan_status_email(user, loan, status: str):
    bank_name = current_app.config.get('BANK_NAME', 'GhanaBank')
    status_messages = {
        'approved': f'Your loan of GHS {float(loan.amount_approved or loan.amount_requested):,.2f} has been approved!',
        'rejected': f'Your loan application has been reviewed and unfortunately could not be approved at this time.',
        'disbursed': f'Your approved loan of GHS {float(loan.amount_approved or loan.amount_requested):,.2f} has been disbursed to your account.',
    }
    colors = {'approved': '#10B981', 'rejected': '#EF4444', 'disbursed': '#2563EB'}
    message = status_messages.get(status, f'Your loan status has been updated to {status}.')
    color = colors.get(status, '#1B3A6B')

    html = f"""
    <!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}}
    .container{{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}}
    .header{{background:linear-gradient(135deg,#1B3A6B,#2563EB);padding:40px;text-align:center;color:#fff}}
    .status-banner{{background:{color};color:#fff;padding:20px;text-align:center}}
    .body{{padding:40px}}
    .info-row{{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0}}
    .btn{{display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold}}
    .footer{{background:#f8fafc;padding:20px;text-align:center;color:#666;font-size:12px}}
    </style></head><body>
    <div class="container">
      <div class="header"><h1 style="margin:0">{bank_name}</h1><p style="margin:5px 0 0;opacity:.9">Loan Application Update</p></div>
      <div class="status-banner"><h2 style="margin:0">Loan {status.title()}</h2></div>
      <div class="body">
        <p>Hello {user.first_name},</p>
        <p>{message}</p>
        <div class="info-row"><span style="color:#666">Loan Number</span><strong>{loan.loan_number}</strong></div>
        <div class="info-row"><span style="color:#666">Loan Type</span><strong>{loan.loan_type.replace('_',' ').title()}</strong></div>
        <div class="info-row"><span style="color:#666">Amount Requested</span><strong>GHS {float(loan.amount_requested):,.2f}</strong></div>
        {f'<div class="info-row"><span style="color:#666">Amount Approved</span><strong>GHS {float(loan.amount_approved):,.2f}</strong></div>' if loan.amount_approved else ''}
        {f'<div class="info-row"><span style="color:#666">Reason</span><strong>{loan.rejection_reason}</strong></div>' if status == 'rejected' and loan.rejection_reason else ''}
        <div style="text-align:center;margin-top:24px">
          <a href="{current_app.config.get('FRONTEND_URL','http://localhost:5173')}/dashboard/loans" class="btn">View Loan Details</a>
        </div>
      </div>
      <div class="footer"><p>&copy; 2024 {bank_name}. All rights reserved.</p></div>
    </div></body></html>
    """
    return send_email(user.email, f'{bank_name} - Loan Application {status.title()}', html)


def send_treasury_bill_email(user, tbill, event_type: str):
    bank_name = current_app.config.get('BANK_NAME', 'GhanaBank')
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')

    if event_type == 'purchased':
        subject = f'{bank_name} - Treasury Bill Investment Confirmed'
        header_text = 'Investment Confirmed'
        color = '#2563EB'
        body = f"""
        <p>Hello {user.first_name},</p>
        <p>Your Treasury Bill investment has been confirmed. Here are your investment details:</p>
        <div style="background:#f0f7ff;border-left:4px solid #2563EB;padding:20px;border-radius:4px;margin:20px 0">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dce8f7">
            <span style="color:#666">Reference</span><strong>{tbill.reference}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dce8f7">
            <span style="color:#666">Principal</span><strong>GHS {float(tbill.principal):,.2f}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dce8f7">
            <span style="color:#666">Tenure</span><strong>{tbill.tenure_days} Days</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dce8f7">
            <span style="color:#666">Interest Rate (p.a.)</span><strong>{float(tbill.interest_rate):.1f}%</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dce8f7">
            <span style="color:#666">Investment Date</span><strong>{tbill.investment_date.strftime('%d %b %Y')}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dce8f7">
            <span style="color:#666">Maturity Date</span><strong>{tbill.maturity_date.strftime('%d %b %Y')}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dce8f7">
            <span style="color:#666">Gross Interest</span><strong>GHS {float(tbill.interest_earned):,.2f}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dce8f7">
            <span style="color:#666">WHT (8%)</span><strong style="color:#EF4444">- GHS {float(tbill.withholding_tax):,.2f}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dce8f7">
            <span style="color:#666">Net Interest</span><strong style="color:#10B981">GHS {float(tbill.net_interest):,.2f}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0">
            <span style="color:#666;font-weight:bold">Expected Maturity Value</span>
            <strong style="color:#2563EB;font-size:18px">GHS {float(tbill.maturity_value):,.2f}</strong>
          </div>
        </div>
        <p style="color:#666;font-size:13px">You will receive a reminder 7 days before maturity and a credit notification when funds are disbursed.</p>
        """
    elif event_type == 'pre_maturity':
        days_left = (tbill.maturity_date - __import__('datetime').date.today()).days
        subject = f'{bank_name} - Treasury Bill Matures in {days_left} Day(s)'
        header_text = f'T-Bill Matures in {days_left} Day(s)'
        color = '#F59E0B'
        body = f"""
        <p>Hello {user.first_name},</p>
        <p>This is a friendly reminder that your Treasury Bill investment is maturing soon.</p>
        <div style="background:#fffbeb;border:1px solid #fbbf24;padding:20px;border-radius:8px;margin:20px 0">
          <div style="text-align:center;font-size:32px;font-weight:bold;color:#D97706;margin-bottom:12px">{days_left} Day(s) to Maturity</div>
          <div style="padding:8px 0;border-bottom:1px solid #fde68a"><span style="color:#666">Reference: </span><strong>{tbill.reference}</strong></div>
          <div style="padding:8px 0;border-bottom:1px solid #fde68a"><span style="color:#666">Principal: </span><strong>GHS {float(tbill.principal):,.2f}</strong></div>
          <div style="padding:8px 0;border-bottom:1px solid #fde68a"><span style="color:#666">Maturity Date: </span><strong>{tbill.maturity_date.strftime('%d %b %Y')}</strong></div>
          <div style="padding:8px 0"><span style="color:#666">Maturity Value: </span><strong style="color:#10B981;font-size:18px">GHS {float(tbill.maturity_value):,.2f}</strong></div>
        </div>
        <p>Upon maturity, funds will be automatically credited to your linked account. You can also choose to roll over your investment for another term.</p>
        """
    else:  # matured
        subject = f'{bank_name} - Treasury Bill Matured! GHS {float(tbill.maturity_value):,.2f} Credited'
        header_text = 'Treasury Bill Matured'
        color = '#10B981'
        body = f"""
        <p>Hello {user.first_name},</p>
        <p>Great news! Your Treasury Bill investment has matured and funds have been credited to your account.</p>
        <div style="background:#f0fdf4;border:1px solid #86efac;padding:20px;border-radius:8px;margin:20px 0;text-align:center">
          <div style="font-size:14px;color:#166534;margin-bottom:8px">Total Amount Credited</div>
          <div style="font-size:40px;font-weight:bold;color:#16a34a">GHS {float(tbill.maturity_value):,.2f}</div>
          <div style="font-size:13px;color:#166534;margin-top:8px">Principal GHS {float(tbill.principal):,.2f} + Net Interest GHS {float(tbill.net_interest):,.2f}</div>
        </div>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
          <div style="padding:6px 0"><span style="color:#666">Reference: </span><strong>{tbill.reference}</strong></div>
          <div style="padding:6px 0"><span style="color:#666">Investment Date: </span><strong>{tbill.investment_date.strftime('%d %b %Y')}</strong></div>
          <div style="padding:6px 0"><span style="color:#666">Maturity Date: </span><strong>{tbill.maturity_date.strftime('%d %b %Y')}</strong></div>
          <div style="padding:6px 0"><span style="color:#666">Gross Interest: </span><strong>GHS {float(tbill.interest_earned):,.2f}</strong></div>
          <div style="padding:6px 0"><span style="color:#666">WHT Deducted (8%): </span><strong>GHS {float(tbill.withholding_tax):,.2f}</strong></div>
        </div>
        <p>Interested in reinvesting? Log in to roll over your funds into a new Treasury Bill.</p>
        """

    html = f"""
    <!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}}
    .container{{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}}
    .header{{background:linear-gradient(135deg,#1B3A6B,{color});padding:30px;text-align:center;color:#fff}}
    .badge{{background:{color};color:#fff;padding:12px;text-align:center;font-size:16px;font-weight:bold}}
    .body{{padding:30px}}
    .btn{{display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold}}
    .footer{{background:#f8fafc;padding:20px;text-align:center;color:#666;font-size:12px}}
    </style></head><body>
    <div class="container">
      <div class="header"><h2 style="margin:0">{bank_name}</h2><p style="margin:5px 0 0;opacity:.9">Treasury Bill Update</p></div>
      <div class="badge">{header_text}</div>
      <div class="body">
        {body}
        <div style="text-align:center;margin-top:24px">
          <a href="{frontend_url}/dashboard/treasury-bills" class="btn">View My Investments</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; 2024 {bank_name}. All rights reserved.</p>
        <p>Regulated by the Bank of Ghana | WHT deducted as required by Ghana Revenue Authority</p>
      </div>
    </div></body></html>
    """
    return send_email(user.email, subject, html)


def send_loan_due_alert(user, loan, repayment):
    bank_name = current_app.config.get('BANK_NAME', 'GhanaBank')
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
    from datetime import date
    today = date.today()
    days_until = (repayment.due_date - today).days
    is_overdue = days_until < 0

    if is_overdue:
        subject = f'{bank_name} - OVERDUE Loan Payment - {abs(days_until)} Day(s) Overdue'
        header_color = '#EF4444'
        urgency_text = f'OVERDUE by {abs(days_until)} Day(s)'
        urgency_color = '#fee2e2'
        urgency_border = '#fecaca'
        urgency_text_color = '#991b1b'
    elif days_until == 0:
        subject = f'{bank_name} - Loan Payment Due TODAY'
        header_color = '#F59E0B'
        urgency_text = 'DUE TODAY'
        urgency_color = '#fffbeb'
        urgency_border = '#fbbf24'
        urgency_text_color = '#92400e'
    else:
        subject = f'{bank_name} - Loan Payment Due in {days_until} Day(s)'
        header_color = '#F59E0B'
        urgency_text = f'Due in {days_until} Day(s)'
        urgency_color = '#fffbeb'
        urgency_border = '#fbbf24'
        urgency_text_color = '#92400e'

    html = f"""
    <!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}}
    .container{{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}}
    .header{{background:linear-gradient(135deg,#1B3A6B,{header_color});padding:30px;text-align:center;color:#fff}}
    .badge{{background:{header_color};color:#fff;padding:12px;text-align:center;font-size:16px;font-weight:bold}}
    .body{{padding:30px}}
    .btn{{display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold}}
    .footer{{background:#f8fafc;padding:20px;text-align:center;color:#666;font-size:12px}}
    </style></head><body>
    <div class="container">
      <div class="header"><h2 style="margin:0">{bank_name}</h2><p style="margin:5px 0 0;opacity:.9">Loan Payment Reminder</p></div>
      <div class="badge">{urgency_text}</div>
      <div class="body">
        <p>Hello {user.first_name},</p>
        <p>{'Your loan payment is overdue. Please make payment immediately to avoid further penalties.' if is_overdue else 'This is a reminder that your loan payment is due soon.'}</p>
        <div style="background:{urgency_color};border:1px solid {urgency_border};padding:20px;border-radius:8px;margin:20px 0;text-align:center">
          <div style="font-size:14px;color:{urgency_text_color}">Amount Due</div>
          <div style="font-size:36px;font-weight:bold;color:{urgency_text_color}">GHS {float(repayment.total_amount):,.2f}</div>
          <div style="font-size:13px;color:{urgency_text_color};margin-top:6px">Due: {repayment.due_date.strftime('%d %b %Y')}</div>
        </div>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
          <div style="padding:6px 0"><span style="color:#666">Loan Number: </span><strong>{loan.loan_number}</strong></div>
          <div style="padding:6px 0"><span style="color:#666">Loan Type: </span><strong>{loan.loan_type.replace('_', ' ').title()}</strong></div>
          <div style="padding:6px 0"><span style="color:#666">Installment #: </span><strong>{repayment.installment_number}</strong></div>
          <div style="padding:6px 0"><span style="color:#666">Principal: </span><strong>GHS {float(repayment.principal_amount):,.2f}</strong></div>
          <div style="padding:6px 0"><span style="color:#666">Interest: </span><strong>GHS {float(repayment.interest_amount):,.2f}</strong></div>
          <div style="padding:6px 0"><span style="color:#666">Outstanding Balance: </span><strong>GHS {float(loan.outstanding_balance):,.2f}</strong></div>
        </div>
        {'<p style="color:#EF4444;font-weight:bold">WARNING: Continued non-payment may result in loan penalty charges and affect your credit history.</p>' if is_overdue else ''}
        <div style="text-align:center;margin-top:24px">
          <a href="{frontend_url}/dashboard/loans" class="btn">Make Payment Now</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; 2024 {bank_name}. All rights reserved.</p>
        <p>For assistance, call 0800 000 000 or email support@ghanabank.com</p>
      </div>
    </div></body></html>
    """
    return send_email(user.email, subject, html)
