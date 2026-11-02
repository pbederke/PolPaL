"use client";

export default function Success() {

  return (
    <div className="pt-20 justify-center bg-white px-4">
      <div style={{
        minHeight: '10vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        padding: '48px 16px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '400px',
          width: '100%',
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '20px',
          position: 'relative',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Title */}
          <div style={{
            fontSize: '28px',
            color: '#488ccc',
            fontWeight: '600',
            letterSpacing: '-1px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '30px',
            marginBottom: '10px'
          }}>
            <div style={{
              position: 'absolute',
              height: '18px',
              width: '18px',
              borderRadius: '50%',
              left: '0px',
              backgroundColor: '#488ccc'
            }} />
            <div style={{
              position: 'absolute',
              height: '18px',
              width: '18px',
              borderRadius: '50%',
              left: '0px',
              backgroundColor: '#367bb5',
              animation: 'pulse 1s linear infinite'
            }} />
            Check your inbox!
          </div>

          <p style={{ color: 'rgba(88, 87, 87, 0.822)', fontSize: '14px', marginBottom: '5px', textAlign: 'justify' }}>
            A verification email has been sent to your address. Please click the link in the email to verify your account.
          </p>
          <p style={{ color: 'rgba(88, 87, 87, 0.822)', fontSize: '14px', marginBottom: '5px', textAlign: 'justify' }}>
            After verifying your email, your account will be reviewed for approval by an administrator before you can log in.
          </p>
          <p style={{ color: 'rgba(88, 87, 87, 0.822)', fontSize: '14px', textAlign: 'justify' }}>
            The verification link expires in 24 hours. If you did not receive the email, check your spam folder or request a new link on the{' '}
            <a href="/authentication/verify-email?error=expired_token" style={{ color: '#488ccc', textDecoration: 'none' }}>verification page</a>.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          from { transform: scale(0.9); opacity: 1; }
          to { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
