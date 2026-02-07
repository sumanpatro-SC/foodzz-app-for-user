#!/usr/bin/env python3
"""
Foodzz Backend - Food Ordering Application
Author: Foodzz Team
"""

from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import secrets
import os
from pathlib import Path
from werkzeug.utils import secure_filename

from connectiondb import (
    get_db, init_db, get_all_foods, get_food_by_id,
    get_all_orders, get_order_by_id, create_order,
    update_order_status, get_admin_stats, add_food_item,
    delete_food_item, update_food_item, get_featured_food_ids, set_featured
)

# Get the absolute path to the backend directory
BACKEND_DIR = Path(__file__).parent
ROOT_DIR = BACKEND_DIR.parent
TEMPLATE_DIR = ROOT_DIR / 'html'
STATIC_DIR = ROOT_DIR / 'static'

app = Flask(__name__, template_folder=str(TEMPLATE_DIR), static_folder=str(STATIC_DIR))
CORS(app)
app.secret_key = secrets.token_hex(16)

# Upload folder configuration
UPLOAD_FOLDER = STATIC_DIR / 'images'
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

@app.route('/')
def index():
    """Serve homepage"""
    return render_template('index.html')

@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Server is running"})

@app.route('/api/foods', methods=['GET'])
def get_foods():
    """Get all available foods"""
    foods = get_all_foods()
    return jsonify(foods)

@app.route('/api/foods/<int:food_id>', methods=['GET'])
def get_food(food_id):
    """Get specific food"""
    food = get_food_by_id(food_id)
    
    if not food:
        return jsonify({"error": "Food not found"}), 404
    
    return jsonify(food)

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Get all orders"""
    orders = get_all_orders()
    return jsonify(orders)

@app.route('/admin')
def admin():
    """Admin dashboard"""
    return render_template('admin.html')

@app.route('/admin/add-food')
def add_food_page():
    """Add food item page"""
    return render_template('add-food.html')

@app.route('/order-confirmation')
def order_confirmation():
    """Order confirmation page (separate HTML page)"""
    return render_template('confirmation.html')

@app.route('/api/admin/orders', methods=['GET'])
def admin_get_orders():
    """Get all orders for admin"""
    orders = get_all_orders()
    return jsonify(orders)

@app.route('/api/admin/orders/<int:order_id>/status', methods=['PUT'])
def admin_update_order_status(order_id):
    """Update order status (admin only)"""
    data = request.get_json()
    
    if not data or 'status' not in data:
        return jsonify({"error": "Missing status"}), 400
    
    valid_statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']
    if data['status'] not in valid_statuses:
        return jsonify({"error": "Invalid status"}), 400
    
    update_order_status(order_id, data['status'])
    
    return jsonify({"success": True, "order_id": order_id, "status": data['status']})

@app.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    """Get admin statistics"""
    stats = get_admin_stats()
    return jsonify(stats)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/admin/foods', methods=['POST'])
def add_food_admin():
    """Add a new food item"""
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No image selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Only PNG, JPG, JPEG, GIF allowed"}), 400
    
    # Get form data
    name = request.form.get('name', '').strip()
    description = request.form.get('description', '').strip()
    price = request.form.get('price', '')
    category = request.form.get('category', '').strip()
    
    if not all([name, description, price, category]):
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        price = float(price)
    except ValueError:
        return jsonify({"error": "Invalid price"}), 400
    
    # Save file with secure filename
    filename = secure_filename(file.filename)
    # Add timestamp to filename to avoid conflicts
    import time
    filename = f"{int(time.time())}_{filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Add to database
    try:
        food_id = add_food_item(name, description, price, category, filename)
        return jsonify({
            "success": True,
            "food_id": food_id,
            "message": "Food item added successfully"
        }), 201
    except Exception as e:
        # Delete the uploaded file if database insert fails
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/foods/<int:food_id>', methods=['PUT'])
def update_food_admin(food_id):
    """Update an existing food item"""
    # If image is present, handle file upload
    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '':
            if not allowed_file(file.filename):
                return jsonify({"error": "Invalid file type. Only PNG, JPG, JPEG, GIF allowed"}), 400
            filename = secure_filename(file.filename)
            import time
            filename = f"{int(time.time())}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            image_filename = filename

    # Get form data
    name = request.form.get('name', '').strip()
    description = request.form.get('description', '').strip()
    price = request.form.get('price', '')
    category = request.form.get('category', '').strip()

    if not all([name, description, price, category]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        price = float(price)
    except ValueError:
        return jsonify({"error": "Invalid price"}), 400

    # Update in database
    try:
        update_food_item(food_id, name, description, price, category, image_filename)
        return jsonify({"success": True, "food_id": food_id, "message": "Food item updated successfully"})
    except Exception as e:
        # If upload happened and DB update failed, remove file
        if image_filename:
            fp = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
            if os.path.exists(fp):
                os.remove(fp)
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/featured', methods=['GET'])
def admin_get_featured():
    """Return list of featured food IDs"""
    ids = get_featured_food_ids()
    return jsonify({"featured": ids})


@app.route('/api/admin/foods/<int:food_id>/featured', methods=['POST'])
def admin_set_featured(food_id):
    """Set or unset featured flag for a food item. Expects JSON {featured: true|false}"""
    data = request.get_json(silent=True)
    if not data or 'featured' not in data:
        return jsonify({"error": "Missing featured field"}), 400
    flag = bool(data['featured'])
    try:
        set_featured(food_id, flag)
        return jsonify({"success": True, "food_id": food_id, "featured": flag})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/foods/<int:food_id>', methods=['DELETE'])
def delete_food_admin(food_id):
    """Delete a food item"""
    try:
        delete_food_item(food_id)
        return jsonify({"success": True, "message": "Food item deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cart', methods=['GET'])
def get_cart():
    """Get shopping cart from session"""
    cart = session.get('cart', [])
    return jsonify({"items": cart, "count": len(cart)})

@app.route('/api/cart/add', methods=['POST'])
def add_to_cart():
    """Add item to cart"""
    data = request.get_json()
    
    if not data or 'food_id' not in data or 'quantity' not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    food_id = data['food_id']
    quantity = data['quantity']
    
    # Validate food exists
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM foods WHERE id = ?', (food_id,))
    food = cursor.fetchone()
    conn.close()
    
    if not food:
        return jsonify({"error": "Food not found"}), 404
    
    cart = session.get('cart', [])
    
    # Check if item already in cart
    existing = next((item for item in cart if item['id'] == food_id), None)
    if existing:
        existing['quantity'] += quantity
    else:
        cart.append({
            'id': food_id,
            'name': food['name'],
            'price': food['price'],
            'quantity': quantity,
            'image': food['image']
        })
    
    session['cart'] = cart
    return jsonify({"success": True, "cart": cart})

@app.route('/api/cart/remove', methods=['POST'])
def remove_from_cart():
    """Remove item from cart"""
    data = request.get_json()
    
    if not data or 'food_id' not in data:
        return jsonify({"error": "Missing food_id"}), 400
    
    cart = session.get('cart', [])
    cart = [item for item in cart if item['id'] != data['food_id']]
    session['cart'] = cart
    
    return jsonify({"success": True, "cart": cart})

@app.route('/api/cart/update', methods=['POST'])
def update_cart():
    """Update item quantity in cart"""
    data = request.get_json()
    
    if not data or 'food_id' not in data or 'quantity' not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    cart = session.get('cart', [])
    item = next((i for i in cart if i['id'] == data['food_id']), None)
    
    if not item:
        return jsonify({"error": "Item not in cart"}), 404
    
    if data['quantity'] <= 0:
        cart = [i for i in cart if i['id'] != data['food_id']]
    else:
        item['quantity'] = data['quantity']
    
    session['cart'] = cart
    return jsonify({"success": True, "cart": cart})

@app.route('/api/cart/clear', methods=['POST'])
def clear_cart():
    """Clear shopping cart"""
    session['cart'] = []
    return jsonify({"success": True})

@app.route('/api/checkout', methods=['POST'])
def checkout():
    """Process checkout"""
    data = request.get_json()
    # Accept cart items from request (frontend localStorage) or fall back to session cart
    cart = data.get('items') if data and data.get('items') is not None else session.get('cart', [])

    if not cart:
        return jsonify({"error": "Cart is empty"}), 400
    
    required_fields = ['customer_name', 'customer_email', 'delivery_address', 'phone', 'payment_method']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Calculate totals
    subtotal = sum(item['price'] * item['quantity'] for item in cart)
    tax = round(subtotal * 0.08, 2)  # 8% tax
    delivery_fee = 5.00 if subtotal < 30 else 0
    total = subtotal + tax + delivery_fee
    
    # Create order using helper function from connectiondb
    from connectiondb import create_order as db_create_order
    order_id = db_create_order(
        customer_name=data['customer_name'],
        customer_email=data['customer_email'],
        delivery_address=data['delivery_address'],
        phone=data['phone'],
        subtotal=subtotal,
        tax=tax,
        delivery_fee=delivery_fee,
        total_price=total,
        payment_method=data['payment_method'],
        items=cart
    )
    
    # Clear cart
    session['cart'] = []
    
    return jsonify({
        "success": True,
        "order_id": order_id,
        "subtotal": subtotal,
        "tax": tax,
        "delivery_fee": delivery_fee,
        "total": total,
        "status": "confirmed"
    }), 201

@app.route('/api/orders', methods=['POST'])
def create_order_legacy():
    """Create new order (legacy - for direct orders)"""
    data = request.get_json()
    
    if not data or 'food_id' not in data or 'quantity' not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    food_id = data['food_id']
    quantity = data['quantity']
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Get food price
    cursor.execute('SELECT price FROM foods WHERE id = ?', (food_id,))
    food = cursor.fetchone()
    
    if not food:
        return jsonify({"error": "Food not found"}), 404
    
    total_price = food['price'] * quantity
    
    # Create simple order
    cursor.execute(
        'INSERT INTO orders (customer_name, customer_email, delivery_address, phone, subtotal, tax, delivery_fee, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ('Guest', 'guest@foodzz.com', 'Not specified', 'N/A', total_price, 0, 0, total_price, 'pending')
    )
    
    order_id = cursor.lastrowid
    
    cursor.execute(
        'INSERT INTO order_items (order_id, food_id, quantity, price) VALUES (?, ?, ?, ?)',
        (order_id, food_id, quantity, food['price'])
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "id": order_id,
        "food_id": food_id,
        "quantity": quantity,
        "total_price": total_price,
        "status": "pending"
    }), 201

@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    """Get specific order"""
    order = get_order_by_id(order_id)
    
    if not order:
        return jsonify({"error": "Order not found"}), 404
    
    return jsonify(order)

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    """Update order status"""
    data = request.get_json()
    
    if not data or 'status' not in data:
        return jsonify({"error": "Missing status field"}), 400
    
    # Only admins can update status
    if not request.headers.get('Authorization') or request.headers.get('Authorization') != 'Admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    update_order_status(order_id, data['status'])
    
    return jsonify({"id": order_id, "status": data['status']})

if __name__ == '__main__':
    import os
    init_db()
    # Allow overriding the port via the PORT environment variable (useful in CI/Codespaces)
    port = int(os.environ.get('PORT', '8000'))
    print(f"🚀 Foodzz Server starting on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
