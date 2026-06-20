export default function DeleteAccount() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ background: '#1B3A6B', padding: '20px 0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, background: '#F4A100', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 22, fontFamily: 'Georgia, serif' }}>C</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>Crestline Bank</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Crestline Solutions LTD</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1B3A6B', marginBottom: 8 }}>Delete Your Account</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 32 }}>Crestline Bank · Crestline Solutions LTD</p>

        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12, padding: '16px 20px', marginBottom: 28, display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <p style={{ color: '#92400E', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            Account deletion is permanent and cannot be undone. Please read this page carefully before submitting a request.
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', lineHeight: 1.7, color: '#374151', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 16 }}>How to Request Account Deletion</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { step: '1', title: 'Send an email request', desc: 'Email us at privacy@crestlinesolutions.com with the subject line "Account Deletion Request".' },
              { step: '2', title: 'Include your details', desc: 'Provide your full name, registered email address, and account number so we can locate your account.' },
              { step: '3', title: 'Identity verification', desc: 'We will contact you to verify your identity before processing the deletion, as required by Bank of Ghana regulations.' },
              { step: '4', title: 'Processing time', desc: 'Your request will be processed within 30 business days of identity verification.' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, background: '#1B3A6B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{item.step}</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ color: '#6B7280', fontSize: 14 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28, background: '#EFF6FF', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#1B3A6B', marginBottom: 4 }}>📧 Contact</p>
            <p style={{ margin: 0, color: '#374151', fontSize: 14 }}>privacy@crestlinesolutions.com</p>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', lineHeight: 1.7, color: '#374151', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 16 }}>What Data is Deleted</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 8 }}>Your profile information (name, email, phone number, address)</li>
            <li style={{ marginBottom: 8 }}>Your KYC documents and identity verification records</li>
            <li style={{ marginBottom: 8 }}>Your login credentials and authentication tokens</li>
            <li style={{ marginBottom: 8 }}>Your app preferences and settings</li>
          </ul>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', lineHeight: 1.7, color: '#374151' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 16 }}>What Data is Retained</h2>
          <p style={{ marginBottom: 12, fontSize: 14, color: '#6B7280' }}>
            As required by the Bank of Ghana and the Anti-Money Laundering Act of Ghana, certain financial records must be retained for a minimum of <strong>7 years</strong> after account closure, including:
          </p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 8 }}>Transaction history and payment records</li>
            <li style={{ marginBottom: 8 }}>Account statements and balance history</li>
            <li style={{ marginBottom: 8 }}>Loan records and repayment history</li>
            <li style={{ marginBottom: 8 }}>Records required for regulatory compliance and audit purposes</li>
          </ul>
          <p style={{ marginTop: 16, fontSize: 13, color: '#9CA3AF' }}>
            These records are archived securely and are not used for marketing or any other purpose after account closure.
          </p>
        </div>
      </div>
    </div>
  );
}
