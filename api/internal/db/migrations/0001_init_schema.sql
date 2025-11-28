-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================
-- USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    name VARCHAR(255),
    photo_url TEXT,
    role VARCHAR(50) DEFAULT 'user', -- user, business_owner, admin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- =====================
-- SESSIONS TABLE (for refresh tokens)
-- =====================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- =====================
-- OTP CODES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);

-- =====================
-- BUSINESS CATEGORIES
-- =====================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_am VARCHAR(100), -- Amharic name
    icon VARCHAR(50),
    parent_id UUID REFERENCES categories(id),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Insert default categories
INSERT INTO categories (name, name_am, icon, sort_order) VALUES
    ('Restaurant', 'ምግብ ቤት', 'utensils', 1),
    ('Cafe', 'ካፌ', 'coffee', 2),
    ('Hotel', 'ሆቴል', 'bed', 3),
    ('Shop', 'ሱቅ', 'shopping-bag', 4),
    ('Bank', 'ባንክ', 'landmark', 5),
    ('Hospital', 'ሆስፒታል', 'hospital', 6),
    ('Pharmacy', 'ፋርማሲ', 'pill', 7),
    ('Gas Station', 'ነዳጅ ማደያ', 'fuel', 8),
    ('Gym', 'ጂም', 'dumbbell', 9),
    ('Salon', 'ሳሎን', 'scissors', 10),
    ('School', 'ትምህርት ቤት', 'graduation-cap', 11),
    ('Church', 'ቤተ ክርስቲያን', 'church', 12),
    ('Mosque', 'መስጊድ', 'moon', 13),
    ('Market', 'ገበያ', 'store', 14),
    ('Entertainment', 'መዝናኛ', 'music', 15)
ON CONFLICT DO NOTHING;

-- =====================
-- BUSINESSES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    name_am VARCHAR(255), -- Amharic name
    description TEXT,
    description_am TEXT,
    category_id UUID REFERENCES categories(id),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Location
    geom GEOMETRY(Point, 4326) NOT NULL,
    address TEXT,
    address_am TEXT,
    city VARCHAR(100) DEFAULT 'Addis Ababa',
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected, closed
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    
    -- Stats
    avg_rating DECIMAL(2,1) DEFAULT 0,
    review_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index for nearby queries
CREATE INDEX idx_businesses_geom ON businesses USING GIST(geom);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_businesses_name_trgm ON businesses USING GIN(name gin_trgm_ops);

-- =====================
-- BUSINESS HOURS
-- =====================
CREATE TABLE IF NOT EXISTS business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL, -- 0=Sunday, 1=Monday, etc.
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,
    UNIQUE(business_id, day_of_week)
);

CREATE INDEX idx_business_hours_business ON business_hours(business_id);

-- =====================
-- BUSINESS MEDIA (photos/videos)
-- =====================
CREATE TABLE IF NOT EXISTS business_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL, -- photo, video
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    sort_order INT DEFAULT 0,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_business_media_business ON business_media(business_id);

-- =====================
-- BUSINESS REVIEWS
-- =====================
CREATE TABLE IF NOT EXISTS business_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, user_id)
);

CREATE INDEX idx_business_reviews_business ON business_reviews(business_id);
CREATE INDEX idx_business_reviews_user ON business_reviews(user_id);

-- =====================
-- USER SAVED BUSINESSES
-- =====================
CREATE TABLE IF NOT EXISTS user_saved_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, business_id)
);

CREATE INDEX idx_saved_businesses_user ON user_saved_businesses(user_id);

-- =====================
-- POSTS (short video/photo posts pinned to map)
-- =====================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    
    -- Content
    content_type VARCHAR(20) NOT NULL, -- photo, video
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    
    -- Location
    geom GEOMETRY(Point, 4326),
    
    -- Stats
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, hidden, deleted
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- optional expiry for stories
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_business ON posts(business_id);
CREATE INDEX idx_posts_geom ON posts USING GIST(geom);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_status ON posts(status);

-- =====================
-- POST LIKES
-- =====================
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON post_likes(post_id);

-- =====================
-- HELPER FUNCTION: Update updated_at timestamp
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON business_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- HELPER FUNCTION: Update business rating
-- =====================
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE businesses SET
        avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM business_reviews WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)),
        review_count = (SELECT COUNT(*) FROM business_reviews WHERE business_id = COALESCE(NEW.business_id, OLD.business_id))
    WHERE id = COALESCE(NEW.business_id, OLD.business_id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rating_on_review AFTER INSERT OR UPDATE OR DELETE ON business_reviews
    FOR EACH ROW EXECUTE FUNCTION update_business_rating();
