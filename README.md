# ANPAC ERP & POS System

Aplikasi ERP & POS untuk UMKM dengan React, Vite, Tailwind CSS, dan Supabase.

## Fitur Utama

- **Dashboard**: Overview penjualan, stok, dan profit
- **POS (Point of Sale)**: Sistem kasir dengan manajemen keranjang
- **Inventory Management**: Manajemen produk dan kategori
- **Transaction History**: Riwayat transaksi dengan fitur edit/delete
- **Settings**: Pengaturan informasi bisnis
- **Real-time Stock Management**: Stok otomatis berkurang saat transaksi

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React Icons
- **Backend**: Supabase (Database & Auth)
- **Charts**: Recharts
- **State Management**: React Context API
- **Routing**: React Router DOM

## Setup Database

### 1. Buat Database di Supabase

Copy dan jalankan SQL berikut di Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_settings table
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    app_title VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    buy_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    sell_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(10) NOT NULL CHECK (status IN ('PAID', 'DEBT')),
    customer_name VARCHAR(255),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_items table
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create operational_expenses table
CREATE TABLE operational_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all operations for anonymous users" ON app_settings
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for anonymous users" ON categories
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for anonymous users" ON products
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for anonymous users" ON transactions
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for anonymous users" ON transaction_items
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for anonymous users" ON operational_expenses
    FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product_id ON transaction_items(product_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Create function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Reduce stock when transaction item is added
        UPDATE products 
        SET stock = stock - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Return stock when transaction item is deleted
        UPDATE products 
        SET stock = stock + OLD.quantity,
            updated_at = NOW()
        WHERE id = OLD.product_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust stock if quantity changes
        UPDATE products 
        SET stock = stock + OLD.quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stock update
CREATE TRIGGER trigger_update_product_stock
    AFTER INSERT OR DELETE OR UPDATE ON transaction_items
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();

-- Create function to prevent negative stock
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent negative stock
CREATE TRIGGER trigger_prevent_negative_stock
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION prevent_negative_stock();

-- Insert seed data for app_settings
INSERT INTO app_settings (business_name, app_title, address, phone) VALUES 
('ANPAC Store', 'ANPAC ERP & POS', 'Jl. Contoh No. 123, Jakarta', '+62 812-3456-7890');

-- Insert sample categories
INSERT INTO categories (name) VALUES 
('Makanan'),
('Minuman'),
('Snack'),
('Elektronik'),
('Pakaian');

-- Insert sample products
INSERT INTO products (category_id, sku, name, buy_price, sell_price, stock) VALUES 
((SELECT id FROM categories WHERE name = 'Makanan'), 'MKN001', 'Nasi Goreng', 15000, 20000, 50),
((SELECT id FROM categories WHERE name = 'Makanan'), 'MKN002', 'Mie Ayam', 12000, 18000, 30),
((SELECT id FROM categories WHERE name = 'Minuman'), 'MIN001', 'Es Teh Manis', 3000, 5000, 100),
((SELECT id FROM categories WHERE name = 'Minuman'), 'MIN002', 'Kopi Susu', 8000, 12000, 80),
((SELECT id FROM categories WHERE name = 'Snack'), 'SNK001', 'Kentang Goreng', 10000, 15000, 40),
((SELECT id FROM categories WHERE name = 'Elektronik'), 'ELK001', 'Power Bank', 150000, 200000, 20),
((SELECT id FROM categories WHERE name = 'Pakaian'), 'PAK001', 'Kaos Polos', 50000, 75000, 60);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operational_expenses_updated_at BEFORE UPDATE ON operational_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Konfigurasi Supabase

Update konfigurasi Supabase di `src/lib/supabase.js`:

```javascript
const supabaseUrl = 'https://gtzdlniozpkifuhowgjs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emRsbmlvenBraWZ1aG93Z2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODA0MDcsImV4cCI6MjA3OTM1NjQwN30.ig_wkDwGtLZ0K6vZtxDaTzl-aUrsnKLXcRsrUfHEo1M'
```

## Cara Menjalankan

1. Install dependencies:
```bash
npm install
```

2. Setup Database Supabase:
   - Copy SQL schema ke Supabase SQL Editor
   - Update konfigurasi Supabase di `src/lib/supabase.js`

3. Setup Authentication Users:
   - Buat user accounts di Supabase Authentication
   - Atur role dan permissions sesuai kebutuhan

4. Jalankan development server:
```bash
npm run dev
```

5. Buka browser di http://localhost:3000

6. Login dengan credentials yang sudah Anda buat di Supabase

## Struktur Project

```
src/
├── components/          # Reusable UI components
│   ├── Layout.jsx      # Main layout with sidebar
│   ├── Sidebar.jsx     # Navigation sidebar
│   └── ProtectedRoute.jsx # Authentication wrapper
├── context/            # React Context providers
│   ├── AuthContext.jsx # Authentication state
│   └── AppContext.jsx  # Global app state
├── lib/               # Utilities and configurations
│   └── supabase.js    # Supabase client configuration
├── pages/             # Page components
│   ├── Login.jsx      # Login page
│   ├── Dashboard.jsx  # Dashboard with charts
│   ├── POS.jsx        # Point of Sale
│   ├── Inventory.jsx  # Product & Category management
│   ├── Transactions.jsx # Transaction history
│   └── Settings.jsx   # App settings
├── App.jsx            # Main app with routing
├── main.jsx           # Entry point
└── index.css          # Global styles
```

## Fitur Utama

### 1. Authentication
- Login dengan email/password
- Protected routes
- Session management

### 2. Dashboard
- Statistik penjualan hari ini
- Total stok produk
- Grafik penjualan 7 hari terakhir
- Profit calculation

### 3. Point of Sale (POS)
- Grid produk dengan search dan filter
- Shopping cart dengan quantity management
- Checkout modal dengan payment options
- Automatic stock reduction

### 4. Inventory Management
- CRUD produk dan kategori
- Stock tracking dengan warning system
- Search dan filter functionality
- Real-time stock updates

### 5. Transaction Management
- History transaksi lengkap
- Edit status (Debt → Paid)
- Void transaction dengan stock restoration
- Detail view dengan item breakdown

### 6. Settings
- Business information management
- App customization
- System information

## Database Features

### Automatic Stock Management
- **Trigger**: Saat transaksi terjadi, stok otomatis berkurang
- **Void Protection**: Saat transaksi dihapus, stok dikembalikan
- **Negative Stock Prevention**: Mencegah stok negatif

### Data Relationships
- Products → Categories (Many-to-One)
- Transactions → Transaction Items (One-to-Many)
- Transaction Items → Products (Many-to-One)

## Demo Credentials

Aplikasi menggunakan Supabase Authentication. Gunakan credentials yang sudah Anda buat di Supabase Authentication panel.

## Setup Authentication Users

1. Buka Supabase Dashboard
2. Pilih menu **Authentication** → **Users**
3. Klik **Add user** untuk membuat user baru
4. Isi email dan password
5. Atur role dan permissions sesuai kebutuhan
6. User bisa langsung login dengan credentials tersebut

## Production Deployment

1. Build aplikasi:
```bash
npm run build
```

2. Preview build:
```bash
npm run preview
```

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License