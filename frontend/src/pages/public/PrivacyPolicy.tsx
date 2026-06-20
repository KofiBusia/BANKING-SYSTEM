export default function PrivacyPolicy() {
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
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1B3A6B', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 32 }}>Last updated: June 20, 2025</p>

        <div style={{ background: 'white', borderRadius: 16, padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', lineHeight: 1.7, color: '#374151' }}>

          <p style={{ marginBottom: 24 }}>
            Crestline Solutions LTD ("we," "us," or "our") operates the Crestline Bank mobile application and web platform (the "Service"). This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our Service.
          </p>
          <p style={{ marginBottom: 32 }}>
            By using our Service, you agree to the collection and use of information in accordance with this policy. This policy complies with the Data Protection Act, 2012 (Act 843) of Ghana and applicable regulations of the Bank of Ghana.
          </p>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 }}>1. Information We Collect</h2>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>1.1 Personal Information</h3>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>Full name, date of birth, and nationality</li>
            <li>Email address and phone number</li>
            <li>Residential address</li>
            <li>Ghana Card number or other government-issued ID</li>
            <li>Profile photograph (for KYC verification)</li>
          </ul>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>1.2 Financial Information</h3>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>Account balances and account numbers</li>
            <li>Transaction history and payment records</li>
            <li>Loan applications and repayment details</li>
            <li>Treasury bill investments</li>
          </ul>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>1.3 Technical Information</h3>
          <ul style={{ paddingLeft: 20, marginBottom: 32 }}>
            <li>Device type, operating system, and app version</li>
            <li>IP address and session tokens</li>
            <li>App usage data and feature interactions</li>
          </ul>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 }}>2. How We Use Your Information</h2>
          <ul style={{ paddingLeft: 20, marginBottom: 32 }}>
            <li>To create and manage your bank account</li>
            <li>To process transactions, transfers, and payments</li>
            <li>To verify your identity (KYC) as required by Bank of Ghana regulations</li>
            <li>To detect and prevent fraud and unauthorized access</li>
            <li>To send you account alerts, statements, and important notices</li>
            <li>To comply with legal and regulatory obligations</li>
            <li>To improve our products and services</li>
          </ul>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 }}>3. How We Share Your Information</h2>
          <p style={{ marginBottom: 12 }}>We do not sell your personal information. We may share your data with:</p>
          <ul style={{ paddingLeft: 20, marginBottom: 32 }}>
            <li><strong>Bank of Ghana and regulatory authorities</strong> — as required by law</li>
            <li><strong>Ghana Interbank Payment and Settlement Systems (GhIPSS)</strong> — for interbank transfers</li>
            <li><strong>Mobile money operators (MTN, Vodafone, AirtelTigo)</strong> — to process mobile money transactions</li>
            <li><strong>Credit reference bureaus</strong> — for loan assessments</li>
            <li><strong>Cloud service providers</strong> — who host our infrastructure under strict data protection agreements</li>
          </ul>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 }}>4. Data Security</h2>
          <p style={{ marginBottom: 32 }}>
            We implement industry-standard security measures including AES-256 encryption for data at rest, TLS 1.3 for data in transit, JWT-based authentication with token expiry, and regular security audits. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 }}>5. Data Retention</h2>
          <p style={{ marginBottom: 32 }}>
            We retain your personal and financial data for a minimum of 7 years as required by Ghanaian banking regulations. After account closure, data is archived securely and deleted upon expiry of the statutory retention period.
          </p>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 }}>6. Your Rights</h2>
          <p style={{ marginBottom: 12 }}>Under the Data Protection Act, 2012 (Act 843), you have the right to:</p>
          <ul style={{ paddingLeft: 20, marginBottom: 32 }}>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Object to certain types of processing</li>
            <li>Request deletion of data (subject to legal retention requirements)</li>
            <li>Lodge a complaint with the Data Protection Commission of Ghana</li>
          </ul>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 }}>7. Children's Privacy</h2>
          <p style={{ marginBottom: 32 }}>
            Our Service is not directed at persons under 18 years of age. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal data, please contact us immediately.
          </p>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 }}>8. Third-Party Links</h2>
          <p style={{ marginBottom: 32 }}>
            Our app may open external web pages (including our full banking portal). These third-party sites have their own privacy policies and we are not responsible for their practices.
          </p>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 }}>9. Changes to This Policy</h2>
          <p style={{ marginBottom: 32 }}>
            We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. Continued use of the Service after changes constitutes your acceptance.
          </p>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B3A6B', marginBottom: 12 }}>10. Contact Us</h2>
          <p style={{ marginBottom: 8 }}>If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:</p>
          <div style={{ background: '#F5F7FA', borderRadius: 12, padding: '16px 20px', marginTop: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#1B3A6B' }}>Crestline Solutions LTD</p>
            <p style={{ margin: '4px 0 0', color: '#6B7280' }}>Email: privacy@crestlinesolutions.com</p>
            <p style={{ margin: '4px 0 0', color: '#6B7280' }}>Ghana, West Africa</p>
          </div>
        </div>
      </div>
    </div>
  );
}
