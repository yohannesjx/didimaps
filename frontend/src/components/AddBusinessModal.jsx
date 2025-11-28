import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginModal.css'; // Reuse modal styles

export default function AddBusinessModal({ isOpen, onClose, onPickLocation, pickedLocation }) {
    const { token } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        phone: '',
        description: '',
        lat: null,
        lng: null
    });

    useEffect(() => {
        if (pickedLocation) {
            setFormData(prev => ({ ...prev, lat: pickedLocation.lat, lng: pickedLocation.lng }));
        }
    }, [pickedLocation]);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (err) {
            console.error('Failed to fetch categories', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/business', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to create business');

            alert('Business created successfully!');
            onClose();
            // Reset form
            setFormData({ name: '', category_id: '', phone: '', description: '', lat: null, lng: null });
            setStep(1);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <button className="modal-close" onClick={onClose}>✕</button>

                <h2>Add New Business</h2>

                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <>
                            <div className="input-group">
                                <label>Business Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g. Tomoca Coffee"
                                />
                            </div>

                            <div className="input-group">
                                <label>Category</label>
                                <select
                                    value={formData.category_id}
                                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+251..."
                                />
                            </div>

                            <button type="button" className="primary-btn" onClick={() => setStep(2)}>
                                Next
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="input-group">
                                <label>Location</label>
                                {formData.lat ? (
                                    <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '8px', marginBottom: '12px', color: '#0066cc' }}>
                                        ✅ Location Selected ({formData.lat.toFixed(4)}, {formData.lng.toFixed(4)})
                                    </div>
                                ) : (
                                    <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '8px', marginBottom: '12px', color: '#856404' }}>
                                        ⚠️ No location selected
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="link-btn"
                                    style={{ border: '1px solid #1a73e8', borderRadius: '8px', padding: '8px' }}
                                    onClick={() => {
                                        onClose(); // Hide modal temporarily
                                        onPickLocation(); // Trigger map picker mode
                                    }}
                                >
                                    📍 Pick Location on Map
                                </button>
                            </div>

                            <div className="input-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                    placeholder="Tell us about your business..."
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" className="link-btn" onClick={() => setStep(1)} style={{ width: 'auto' }}>
                                    Back
                                </button>
                                <button type="submit" className="primary-btn" disabled={loading || !formData.lat}>
                                    {loading ? 'Creating...' : 'Create Business'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
