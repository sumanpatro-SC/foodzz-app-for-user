"""
Foodzz Database Connection and Initialization
Handles all SQLite database operations and setup
"""

import sqlite3
from pathlib import Path

# Database file path
DB_PATH = Path(__file__).parent / "foodzz.db"


def get_db():
    """Get database connection with row factory"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize SQLite database with tables and sample data"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Drop existing tables (for fresh start)
    cursor.execute('DROP TABLE IF EXISTS order_items')
    cursor.execute('DROP TABLE IF EXISTS orders')
    cursor.execute('DROP TABLE IF EXISTS foods')
    
    # Create foods table
    cursor.execute('''
        CREATE TABLE foods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT,
            image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create orders table
    cursor.execute('''
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            delivery_address TEXT NOT NULL,
            phone TEXT NOT NULL,
            subtotal REAL NOT NULL,
            tax REAL NOT NULL,
            delivery_fee REAL NOT NULL,
            total_price REAL NOT NULL,
            payment_method TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create order_items table
    cursor.execute('''
        CREATE TABLE order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            food_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (food_id) REFERENCES foods(id)
        )
    ''')
    
    # Insert sample foods
    sample_foods = [
        ('Margherita Pizza', 'Fresh mozzarella, tomato, basil', 12.99, 'Pizza', '🍕'),
        ('Pepperoni Pizza', 'Classic pepperoni on cheese', 13.99, 'Pizza', '🍕'),
        ('Caesar Salad', 'Crispy romaine with parmesan', 8.99, 'Salad', '🥗'),
        ('Burger', 'Beef patty with cheese and veggies', 10.99, 'Burgers', '🍔'),
        ('Hot Dog', 'All-beef hot dog with toppings', 5.99, 'Hot Dogs', '🌭'),
        ('Fries', 'Golden crispy french fries', 3.99, 'Sides', '🍟'),
        ('Pasta Carbonara', 'Creamy Italian pasta', 11.99, 'Pasta', '🍝'),
        ('Grilled Salmon', 'Fresh salmon with lemon', 14.99, 'Seafood', '🐟'),
    ]
    
    for name, desc, price, category, image in sample_foods:
        cursor.execute(
            'INSERT INTO foods (name, description, price, category, image) VALUES (?, ?, ?, ?, ?)',
            (name, desc, price, category, image)
        )
    
    conn.commit()
    conn.close()
    print(f"✓ Database initialized at {DB_PATH}")


def get_all_foods():
    """Fetch all foods from database"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM foods')
    foods = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return foods


def get_food_by_id(food_id):
    """Fetch a single food by ID"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM foods WHERE id = ?', (food_id,))
    food = cursor.fetchone()
    conn.close()
    return dict(food) if food else None


def get_all_orders():
    """Fetch all orders from database"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM orders ORDER BY created_at DESC')
    orders = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return orders


def get_order_by_id(order_id):
    """Fetch a single order with its items"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,))
    order = cursor.fetchone()
    
    if not order:
        conn.close()
        return None
    
    # Get order items
    cursor.execute('''
        SELECT oi.*, f.name as food_name, f.image
        FROM order_items oi
        JOIN foods f ON oi.food_id = f.id
        WHERE oi.order_id = ?
    ''', (order_id,))
    items = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    order_dict = dict(order)
    order_dict['items'] = items
    return order_dict


def create_order(customer_name, customer_email, delivery_address, phone, 
                 subtotal, tax, delivery_fee, total_price, payment_method, items):
    """Create a new order with items"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Insert order
    cursor.execute('''
        INSERT INTO orders (customer_name, customer_email, delivery_address, phone, 
                          subtotal, tax, delivery_fee, total_price, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        customer_name,
        customer_email,
        delivery_address,
        phone,
        subtotal,
        tax,
        delivery_fee,
        total_price,
        payment_method,
        'confirmed'
    ))
    
    order_id = cursor.lastrowid
    
    # Insert order items
    for item in items:
        food_id = item.get('id') or item.get('food_id')
        quantity = item.get('quantity', 1)
        price = item.get('price', 0)
        
        cursor.execute('''
            INSERT INTO order_items (order_id, food_id, quantity, price)
            VALUES (?, ?, ?, ?)
        ''', (order_id, food_id, quantity, price))
    
    conn.commit()
    conn.close()
    
    return order_id


def update_order_status(order_id, status):
    """Update order status"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE orders SET status = ? WHERE id = ?', (status, order_id))
    conn.commit()
    conn.close()


def get_admin_stats():
    """Get admin dashboard statistics"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Total orders
    cursor.execute('SELECT COUNT(*) as count FROM orders')
    total_orders = cursor.fetchone()['count']
    
    # Total revenue
    cursor.execute('SELECT SUM(total_price) as total FROM orders')
    total_revenue = cursor.fetchone()['total'] or 0
    
    # Orders by status
    cursor.execute('SELECT status, COUNT(*) as count FROM orders GROUP BY status')
    orders_by_status = {row['status']: row['count'] for row in cursor.fetchall()}
    
    # Recent orders
    cursor.execute('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5')
    recent_orders = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "orders_by_status": orders_by_status,
        "recent_orders": recent_orders
    }
