alert("JS connected");

// Global State
let currentUser = null;
let currentRole = 'customer';
let cart = [];
let orders = JSON.parse(localStorage.getItem('orders')) || [];
let products = JSON.parse(localStorage.getItem('products')) || [];
let nextOrderId = parseInt(localStorage.getItem('nextOrderId')) || 1;

// Initialize default products with uploaded images
if (products.length === 0) {
    products = [
        { id: 1, name: 'Ice Cream', price: 120, image: "../images/icecream.png" },
        { id: 2, name: 'Momos', price: 150, image: "../images/momo.png" },
        { id: 3, name: 'Burger', price: 199, image: "../images/burger.png" },
        { id: 4, name: 'Chicken Roll', price: 180, image: "../images/chicken-roll.png" },
        { id: 5, name: 'Pizza', price: 399, image: "../images/pizza.png" },
        { id: 6, name: 'Sandwich', price: 120, image: "../images/sandwich.png" },
        { id: 7, name: 'Fried Chicken', price: 250, image: "../images/fried-chicken.png" },
        { id: 8, name: 'Lasagna', price: 299, image: "../images/lasagna.png" },
        { id: 9, name: 'Spring Roll', price: 160, image: "../images/spring-roll.png" },
        { id: 10, name: 'Spaghetti', price: 220, image: "../images/spaghetti.png" }
    ];

    localStorage.setItem('products', JSON.stringify(products));
}

// Initialize
function init() {
    renderMenu();
    renderFeaturedItems();
    updateCartUI();
}

// Page Navigation
function showPage(page) {
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));

    if (page === 'home') {
        document.getElementById('homePage').classList.add('active');
    } else if (page === 'menu') {
        document.getElementById('menuPage').classList.add('active');
        renderMenu();
    } else if (page === 'about') {
        document.getElementById('aboutPage').classList.add('active');
    } else if (page === 'contact') {
        document.getElementById('contactPage').classList.add('active');
    } else if (page === 'admin') {
        if (currentUser && currentRole === 'admin') {
            document.getElementById('adminPage').classList.add('active');
            renderAdminDashboard();
        } else {
            alert('Please login as admin to access this page');
            showLoginModal();
        }
    }

    // Update cart icon visibility
    if (page === 'menu' && currentUser) {
        document.getElementById('cartIcon').style.display = 'flex';
    } else {
        document.getElementById('cartIcon').style.display = 'none';
    }
}

// Login Modal
function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function switchRole(role) {
    currentRole = role;
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    // Simple authentication
    if (currentRole === 'customer' && username === 'customer' && password === 'customer123') {
        currentUser = { username, role: 'customer' };
        alert('Login successful! Welcome customer.');
        closeModal('loginModal');
        updateNavigation();
        showPage('menu');
    } else if (currentRole === 'admin' && username === 'admin' && password === 'admin123') {
        currentUser = { username, role: 'admin' };
        alert('Login successful! Welcome admin.');
        closeModal('loginModal');
        updateNavigation();
        showPage('admin');
    } else {
        alert('Invalid credentials. Please try again.');
    }
}

function logout() {
    currentUser = null;
    cart = [];
    updateNavigation();
    updateCartUI();
    showPage('home');
    alert('Logged out successfully!');
}

function updateNavigation() {
    const navLinks = document.getElementById('navLinks');
    if (currentUser) {
        if (currentUser.role === 'admin') {
            navLinks.innerHTML = `
                        <li><a href="#" onclick="showPage('admin')">Dashboard</a></li>
                        <li><a href="#" class="login-btn" onclick="logout()">Logout (${currentUser.username})</a></li>
                    `;
        } else {
            navLinks.innerHTML = `
                        <li><a href="#" onclick="showPage('home')">Home</a></li>
                        <li><a href="#" onclick="showPage('menu')">Order Food</a></li>
                        <li><a href="#" onclick="showPage('about')">About</a></li>
                        <li><a href="#" onclick="showPage('contact')">Contact</a></li>
                        <li><a href="#" class="login-btn" onclick="logout()">Logout (${currentUser.username})</a></li>
                    `;
        }
    } else {
        navLinks.innerHTML = `
                    <li><a href="#" onclick="showPage('home')">Home</a></li>
                    <li><a href="#" onclick="showPage('menu')">Order Food</a></li>
                    <li><a href="#" onclick="showPage('about')">About</a></li>
                    <li><a href="#" onclick="showPage('contact')">Contact</a></li>
                    <li><a href="#" class="login-btn" onclick="showLoginModal()">Login</a></li>
                `;
    }
}

// Menu Rendering
function renderMenu() {
    const menuContainer = document.getElementById('menuItems');
    menuContainer.innerHTML = products.map(item => `
                <div class="menu-card">
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22250%22%3E%3Crect fill=%22%23ddd%22 width=%22300%22 height=%22250%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E${item.name}%3C/text%3E%3C/svg%3E'">
                    <div class="menu-card-content">
                        <h3>${item.name}</h3>
                        <div class="price">₹${item.price}</div>
                        <button class="add-to-cart-btn" onclick="addToCart(${item.id})" ${!currentUser ? 'disabled' : ''}>
                            ${!currentUser ? 'Login to Order' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            `).join('');
}
function searchMenu() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const menuContainer = document.getElementById('menuItems');

    const filteredProducts = products.filter(item =>
        item.name.toLowerCase().includes(searchValue)
    );

    if (filteredProducts.length === 0) {
        menuContainer.innerHTML = `<div class="empty-state">No food items found 😕</div>`;
        return;
    }

    menuContainer.innerHTML = filteredProducts.map(item => `
        <div class="menu-card">
            <img src="${item.image}" alt="${item.name}">
            <div class="menu-card-content">
                <h3>${item.name}</h3>
                <div class="price">₹${item.price}</div>
                <button class="add-to-cart-btn" onclick="addToCart(${item.id})" ${!currentUser ? 'disabled' : ''}>
                    ${!currentUser ? 'Login to Order' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `).join('');
}

function renderFeaturedItems() {
    const featuredContainer = document.getElementById('featuredItems');
    const featured = products.slice(0, 6);
    featuredContainer.innerHTML = featured.map(item => `
                <div class="menu-card">
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22250%22%3E%3Crect fill=%22%23ddd%22 width=%22300%22 height=%22250%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E${item.name}%3C/text%3E%3C/svg%3E'">
                    <div class="menu-card-content">
                        <h3>${item.name}</h3>
                        <div class="price">₹${item.price}</div>
                        <button class="add-to-cart-btn" onclick="${!currentUser ? 'showLoginModal()' : `addToCart(${item.id})`}">
                            ${!currentUser ? 'Login to Order' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            `).join('');
}

// Cart Functions
function addToCart(productId) {
    if (!currentUser) {
        alert('Please login to add items to cart');
        showLoginModal();
        return;
    }

    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();

    // Show brief notification
    const btn = event.target;
    btn.textContent = 'Added!';
    btn.style.background = '#4CAF50';
    setTimeout(() => {
        btn.textContent = 'Add to Cart';
        btn.style.background = '';
    }, 1000);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    renderCartModal();
}

function updateCartUI() {
    const badge = document.getElementById('cartBadge');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = totalItems;

    if (currentUser && document.getElementById('menuPage').classList.contains('active')) {
        document.getElementById('cartIcon').style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function showCartModal() {
    renderCartModal();
    document.getElementById('cartModal').classList.add('active');
}

function renderCartModal() {
    const cartItemsContainer = document.getElementById('cartItems');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-state">Your cart is empty</div>';
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${item.name} (x${item.quantity})</div>
                            <div class="cart-item-price">₹${item.price * item.quantity}</div>
                        </div>
                        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Remove</button>
                    </div>
                `).join('');
    }

    document.getElementById('cartTotal').textContent = total;
}

function proceedToCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('checkoutTotal').textContent = total;
    closeModal('cartModal');
    document.getElementById('checkoutModal').classList.add('active');
}

function placeOrder(event) {
    event.preventDefault();

    const order = {
        id: nextOrderId++,
        customerName: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        address: document.getElementById('customerAddress').value,
        items: [...cart],
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: 'pending',
        date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    };

    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    localStorage.setItem('nextOrderId', nextOrderId);

    cart = [];
    updateCartUI();
    closeModal('checkoutModal');

    alert(`Order placed successfully! Order ID: #${order.id}`);

    // Clear form
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
}

// Admin Functions
function renderAdminDashboard() {
    updateAdminStats();
    renderOrders();
    renderAdminProducts();
}

function updateAdminStats() {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const preparing = orders.filter(o => o.status === 'preparing').length;
    const ready = orders.filter(o => o.status === 'ready').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);

    document.getElementById('totalOrders').textContent = total;
    document.getElementById('pendingOrders').textContent = pending;
    document.getElementById('preparingOrders').textContent = preparing;
    document.getElementById('readyOrders').textContent = ready;
    document.getElementById('deliveredOrders').textContent = delivered;
    document.getElementById('totalRevenue').textContent = revenue.toFixed(2);
}

function renderOrders() {
    const ordersContainer = document.getElementById('ordersContainer');

    if (orders.length === 0) {
        ordersContainer.innerHTML = '<div class="empty-state">No orders yet</div>';
        return;
    }

    ordersContainer.innerHTML = orders.slice().reverse().map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-id">Order #${order.id}</div>
                        <div class="order-status status-${order.status}">${order.status.toUpperCase()}</div>
                    </div>
                    <div class="order-details">
                        <p><strong>Customer:</strong> ${order.customerName}</p>
                        <p><strong>Phone:</strong> ${order.phone}</p>
                        <p><strong>Address:</strong> ${order.address}</p>
                        <p><strong>Date & Time:</strong> ${order.date}</p>
                        <p><strong>Total:</strong> ₹${order.total}</p>
                    </div>
                    <div class="order-items">
                        <strong>Items:</strong><br>
                        ${order.items.map(item => `${item.name} x${item.quantity} - ₹${item.price * item.quantity}`).join('<br>')}
                    </div>
                    <div class="status-buttons">
                        ${order.status === 'pending' ? `<button class="status-btn" style="background: #007BFF; color: white;" onclick="updateOrderStatus(${order.id}, 'preparing')">Mark as Preparing</button>` : ''}
                        ${order.status === 'preparing' ? `<button class="status-btn" style="background: #28A745; color: white;" onclick="updateOrderStatus(${order.id}, 'ready')">Mark as Ready</button>` : ''}
                        ${order.status === 'ready' ? `<button class="status-btn" style="background: #17A2B8; color: white;" onclick="updateOrderStatus(${order.id}, 'delivered')">Mark as Delivered</button>` : ''}
                    </div>
                </div>
            `).join('');
}

function updateOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        localStorage.setItem('orders', JSON.stringify(orders));
        renderAdminDashboard();
    }
}

// Product Management
function showAddProductModal() {
    document.getElementById('addProductModal').classList.add('active');
}

function previewImage(event) {
    const preview = document.getElementById('imagePreview');
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
}

function previewEditImage(event) {
    const preview = document.getElementById('editImagePreview');
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
}

function addProduct(event) {
    event.preventDefault();

    const name = document.getElementById('productName').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const imageFile = document.getElementById('productImage').files[0];

    if (!imageFile) {
        alert('Please select an image');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const newProduct = {
            id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
            name: name,
            price: price,
            image: e.target.result
        };

        products.push(newProduct);
        localStorage.setItem('products', JSON.stringify(products));

        closeModal('addProductModal');
        renderAdminProducts();
        renderMenu();
        renderFeaturedItems();

        // Reset form
        document.getElementById('productName').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productImage').value = '';
        document.getElementById('imagePreview').style.display = 'none';

        alert('Product added successfully!');
    };
    reader.readAsDataURL(imageFile);
}

function renderAdminProducts() {
    const container = document.getElementById('adminProducts');
    const grid = container.querySelector('.product-grid') || document.createElement('div');
    grid.className = 'product-grid';

    grid.innerHTML = products.map(product => `
                <div class="product-item">
                    <img src="${product.image}" alt="${product.name}">
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <div class="price">₹${product.price}</div>
                    </div>
                    <div class="product-actions">
                        <button class="edit-btn" onclick="showEditProductModal(${product.id})">Edit</button>
                        <button class="delete-btn" onclick="deleteProduct(${product.id})">Delete</button>
                    </div>
                </div>
            `).join('');

    if (!container.querySelector('.product-grid')) {
        container.appendChild(grid);
    }
}

function showEditProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('currentImage').src = product.image;
    document.getElementById('currentImage').style.display = 'block';
    document.getElementById('editImagePreview').style.display = 'none';

    document.getElementById('editProductModal').classList.add('active');
}

function updateProduct(event) {
    event.preventDefault();

    const id = parseInt(document.getElementById('editProductId').value);
    const name = document.getElementById('editProductName').value;
    const price = parseInt(document.getElementById('editProductPrice').value);
    const imageFile = document.getElementById('editProductImage').files[0];

    const product = products.find(p => p.id === id);
    if (!product) return;

    product.name = name;
    product.price = price;

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            product.image = e.target.result;
            saveAndUpdate();
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveAndUpdate();
    }

    function saveAndUpdate() {
        localStorage.setItem('products', JSON.stringify(products));
        closeModal('editProductModal');
        renderAdminProducts();
        renderMenu();
        renderFeaturedItems();
        alert('Product updated successfully!');
    }
}

function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    products = products.filter(p => p.id !== productId);
    localStorage.setItem('products', JSON.stringify(products));
    renderAdminProducts();
    renderMenu();
    renderFeaturedItems();
    alert('Product deleted successfully!');
}

// Initialize on load
window.onload = init;