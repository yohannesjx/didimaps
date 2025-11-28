import { useState } from 'react';
import './AuthModal.css';

export default function AuthModal({ onClose, onSuccess }) {
    const [step, setStep] = useState('phone'); // 'phone' or 'otp'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });

            if (!response.ok) throw new Error('Failed to send OTP');

            setStep('otp');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code: otp }),
            });

            if (!response.ok) throw new Error('Invalid OTP');

            const data = await response.json();
            localStorage.setItem('token', data.token);
            onSuccess({ phone, token: data.token });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-modal" onClick={onClose}>✕</button>

                <div className="auth-modal-header">
                    <h2>Sign In</h2>
                    <p>Add your business to Didi Maps</p>
                </div>

                {step === 'phone' ? (
                    <form onSubmit={handleSendOTP} className="auth-form">
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                placeholder="+251 9XX XXX XXX"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                className="auth-input"
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>

                        <p className="auth-note">
                            We'll send you a verification code via SMS
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="auth-form">
                        <div className="form-group">
                            <label>Enter OTP Code</label>
                            <input
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength="6"
                                required
                                className="auth-input otp-input"
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Sign In'}
                        </button>

                        <button
                            type="button"
                            className="auth-back-btn"
                            onClick={() => setStep('phone')}
                        >
                            ← Change Phone Number
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
