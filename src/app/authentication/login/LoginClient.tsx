"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface LoginFormData {
    identifier: string;
    password: string;
}

export default function LoginClient() {

    // Auth context and router
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshAuth } = useAuth();
    const emailVerified = searchParams.get('verified') === 'true';

    // Form state
    const [loginFormData, setLoginFormData] = useState<LoginFormData>({
        identifier: "",
        password: "",
    });

    // General error state for form submission
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [errorSubmit, setErrorSubmit] = useState<string | null>(null);
    const [errorResponse, setErrorResponse] = useState<string | null>(null);

    // Handle form input changes
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setLoginFormData((prev) => ({
            ...prev,
            [name]: value,
            identifier: name === "identifier" ? value.trim().toLowerCase() : prev.identifier, // Trim identifier
        }));
    };

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorSubmit(null);
        setErrorResponse(null);
        setLoadingSubmit(true);

        try {
            const loginRes = await fetch(`/api/authentication/login`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: loginFormData.identifier, password: loginFormData.password }),
            });

            if (loginRes.ok) {
                await refreshAuth();
                router.push("/");
            } else {
                const loginData = await loginRes.json();
                setErrorResponse(loginData.error || loginData.message || "Login failed");
            }
        } catch {
            setErrorSubmit("An error occurred during login");
        } finally {
            setLoadingSubmit(false);
        }
    };

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
                    <form onSubmit={handleSubmit}>
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
                                content: '',
                                height: '18px',
                                width: '18px',
                                borderRadius: '50%',
                                left: '0px',
                                backgroundColor: '#488ccc'
                            }}></div>
                            <div style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                borderRadius: '50%',
                                left: '0px',
                                backgroundColor: '#367bb5',
                                animation: 'pulse 1s linear infinite'
                            }}></div>
                            Login
                        </div>

                        <p style={{
                            color: 'rgba(88, 87, 87, 0.822)',
                            fontSize: '14px',
                            marginBottom: '20px'
                        }}>Login to access your account.</p>

                        {emailVerified && (
                            <div style={{
                                backgroundColor: '#f0fff4',
                                border: '1px solid #9ae6b4',
                                borderRadius: '8px',
                                padding: '10px',
                                marginBottom: '15px'
                            }}>
                                <p style={{ color: '#276749', fontSize: '14px', margin: 0 }}>Email verified! Your account is pending admin approval.</p>
                            </div>
                        )}

                        {/* Identifier Input */}
                        <div style={{ position: 'relative', marginBottom: '15px' }}>
                            <label htmlFor="login-identifier" className="sr-only">Username or email address</label>
                            <input
                                id="login-identifier"
                                required
                                aria-required="true"
                                placeholder=""
                                type="text"
                                name="identifier"
                                title="Username or email address"
                                value={loginFormData.identifier}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 20px 10px',
                                    outline: '0',
                                    border: '1px solid rgba(105, 105, 105, 0.397)',
                                    borderRadius: '10px',
                                    background: '#fff'
                                }}
                            />
                            <span style={{
                                position: 'absolute',
                                left: '10px',
                                top: '15px',
                                color: 'grey',
                                fontSize: '0.9em',
                                cursor: 'text',
                                transition: '0.3s ease',
                                pointerEvents: 'none'
                            }} aria-hidden="true">Username or email address</span>
                        </div>

                        {/* Password Input */}
                        <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <label htmlFor="login-password" className="sr-only">Password</label>
                            <input
                                id="login-password"
                                name="password"
                                required
                                aria-required="true"
                                type="password"
                                autoComplete="current-password"
                                title="Password"
                                value={loginFormData.password}
                                onChange={handleChange}
                                spellCheck="false"
                                autoCapitalize="none"
                                autoCorrect="off"
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 20px 10px',
                                    outline: '0',
                                    border: '1px solid rgba(105, 105, 105, 0.397)',
                                    borderRadius: '10px',
                                    background: '#fff'
                                }}
                            />
                            <span style={{
                                position: 'absolute',
                                left: '10px',
                                top: '15px',
                                color: 'grey',
                                fontSize: '0.9em',
                                cursor: 'text',
                                transition: '0.3s ease',
                                pointerEvents: 'none'
                            }} aria-hidden="true">Password</span>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loadingSubmit}
                            style={{
                                border: 'none',
                                outline: 'none',
                                backgroundColor: loadingSubmit ? '#cccccc' : '#488ccc',
                                padding: '10px',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '16px',
                                transition: '0.3s ease',
                                cursor: loadingSubmit ? 'not-allowed' : 'pointer',
                                width: '100%',
                                marginTop: '10px',
                                marginBottom: '10px'
                            }}
                            onMouseOver={(e) => {
                                if (!loadingSubmit) {
                                    (e.target as HTMLElement).style.backgroundColor = '#367bb5';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!loadingSubmit) {
                                    (e.target as HTMLElement).style.backgroundColor = '#488ccc';
                                }
                            }}
                        >
                            {loadingSubmit ? "Submitting..." : "Login"}
                        </button>

                        {/* Error Display */}
                        {(errorSubmit || errorResponse) && (
                            <div role="alert" style={{
                                backgroundColor: '#fee',
                                border: '1px solid #fcc',
                                borderRadius: '8px',
                                padding: '10px',
                                marginTop: '10px'
                            }}>
                                <p style={{ color: 'red', fontSize: '14px', marginBottom: '10px' }}>Login failed. Please fix the following:</p>
                                <ul style={{ color: 'red', fontSize: '12px', listStyleType: 'disc', paddingLeft: '20px', margin: '0' }}>
                                    {errorResponse && <li style={{ margin: '5px 0' }}>{errorResponse}</li>}
                                </ul>
                            </div>
                        )}

                        {/* Reset/Register Link */}
                        <p style={{
                            color: 'rgba(88, 87, 87, 0.822)',
                            fontSize: '14px',
                            textAlign: 'center',
                            marginTop: '10px'
                        }}>
                            Forgot your password? <Link href="/authentication/forgot-password" style={{ color: '#488ccc', textDecoration: 'none' }}>Reset Password</Link>
                        </p>
                        <p style={{
                            color: 'rgba(88, 87, 87, 0.822)',
                            fontSize: '14px',
                            textAlign: 'center',
                            marginTop: '10px'
                        }}>
                            Don&apos;t have an account? <Link href="/authentication/register" style={{ color: '#488ccc', textDecoration: 'none' }}>Register</Link>
                        </p>
                    </form>
                </div>

                {/* CSS Animation */}
                <style jsx>{`
                @keyframes pulse {
                    from {
                        transform: scale(0.9);
                        opacity: 1;
                    }
                    to {
                        transform: scale(1.8);
                        opacity: 0;
                    }
                }

                input:focus + span,
                input:valid + span {
                    top: 30px !important;
                    font-size: 0.7em !important;
                    font-weight: 600 !important;
                }

                input:valid + span {
                    color: green !important;
                }
            `}</style>
            </div>
        </div>
    );
}
