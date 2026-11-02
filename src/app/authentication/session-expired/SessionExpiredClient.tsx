"use client";

import Link from "next/link";

export default function SessionExpiredPage() {

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
            Session Expired
          </div>

          <div className="text-amber-500">
      </div>

      <p className="text-gray-600 max-w-md">
        Your session is no longer valid. This can happen when your account
        permissions have been updated or your session has expired.
      </p>

      <p className="text-gray-500 text-sm max-w-md mb-4">
        Please log in again to continue.
      </p>

      <Link
        href="/authentication/login"
        className="self-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
      >
        Go to Login
      </Link>
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
