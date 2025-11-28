import { useAuth } from '../contexts/AuthContext';
import './BusinessSidebar.css';

export default function ProfileSidebar({ isOpen, onClose, onAddBusiness }) {
    const { user, logout } = useAuth();

    return (
        <div className={`business-list ${!isOpen ? 'hidden' : ''}`} style={{ zIndex: 1100 }}>
            <div className="business-list-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>My Profile</h2>
                    <button className="close-sidebar-btn" onClick={onClose}>✕</button>
                </div>
            </div>

            <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                    <div className="user-profile-circle" style={{ width: 64, height: 64, fontSize: 24, margin: 0 }}>
                        {user?.name?.[0] || user?.phone?.[1] || 'U'}
                    </div>
                    <div style={{ marginLeft: '16px' }}>
                        <h3 style={{ margin: 0 }}>{user?.name || 'User'}</h3>
                        <p style={{ margin: 0, color: '#666' }}>{user?.phone}</p>
                    </div>
                </div>

                <button className="action-btn primary" onClick={onAddBusiness} style={{ width: '100%', marginBottom: '12px', justifyContent: 'center' }}>
                    + Add Business
                </button>

                <div className="menu-list" style={{ marginTop: '16px' }}>
                    <div style={{ padding: '12px 0', borderBottom: '1px solid #eee', cursor: 'pointer' }}>My Favorites</div>
                    <div style={{ padding: '12px 0', borderBottom: '1px solid #eee', cursor: 'pointer' }}>My Reviews</div>
                    <div style={{ padding: '12px 0', borderBottom: '1px solid #eee', cursor: 'pointer' }}>Settings</div>
                </div>

                <button
                    onClick={() => { logout(); onClose(); }}
                    style={{
                        marginTop: '24px',
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        background: 'white',
                        borderRadius: '8px',
                        color: '#d93025',
                        cursor: 'pointer'
                    }}
                >
                    Log Out
                </button>
            </div>
        </div>
    );
}
