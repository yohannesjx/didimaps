import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginModal.css';

export default function LoginModal({ isOpen, onClose }) {
    const { requestOtp, verifyOtp } = useAuth();
    const [step, setStep] = useState('phone'); // phone, otp
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await requestOtp(phone);
            setStep('otp');
        } catch (err) {
            setError(err.message || 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await verifyOtp(phone, code);
            onClose();
        } catch (err) {
            setError(err.message || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}>✕</button>

                {step === 'phone' ? (
                    <form onSubmit={handlePhoneSubmit}>
                        <h2>Welcome</h2>
                        <p>Enter your phone number to continue</p>

                        <div className="input-group">
                            <input
                                type="tel"
                                placeholder="0911234567"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        {error && <div className="error-msg">{error}</div>}

                        <button type="submit" className="primary-btn" disabled={loading}>
                            {loading ? 'Sending...' : 'Continue'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleOtpSubmit}>
                        <h2>Verify Phone</h2>
                        <p>Enter the code sent to {phone}</p>

                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                autoFocus
                                maxLength={6}
                            />
                        </div>

                        {error && <div className="error-msg">{error}</div>}

                        <button type="submit" className="primary-btn" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>

                        <button
                            type="button"
                            className="link-btn"
                            onClick={() => setStep('phone')}
                        >
                            Change Phone Number
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
