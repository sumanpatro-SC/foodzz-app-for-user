// Foodzz - Frontend JavaScript with Shopping Cart & Checkout

let allFoods = [];
let filteredFoods = [];
let cart = [];
let selectedFood = null;
let currentOrder = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFoods();
    loadCart();
    setupEventListeners();
    setupFilterButtons();
    setupPageNavigation();
    setupCheckout();
    setupAdmin();
});

// Page Navigation
function setupPageNavigation() {
    const viewCartBtn = document.getElementById('viewCartBtn');
    const adminBtn = document.getElementById('adminBtn');
    const continueShopping = document.getElementById('continueShopping');
    const proceedCheckout = document.getElementById('proceedCheckout');
    const backToCart = document.getElementById('backToCart');
    const backToHome = document.getElementById('backToHome');

    viewCartBtn.onclick = () => showPage('cartPage');
    adminBtn.onclick = () => window.location.href = '/admin';
    continueShopping.onclick = () => showPage('homePage');
    proceedCheckout.onclick = () => showPage('checkoutPage');
    backToCart.onclick = () => showPage('cartPage');
    backToHome.onclick = () => showPage('homePage');
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show selected page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        
        if (pageId === 'cartPage') {
            displayCart();
        } else if (pageId === 'checkoutPage') {
            displayCheckoutPreview();
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    const modal = document.getElementById('foodModal');
    const closeBtn = document.querySelector('.close');
    const decreaseQtyBtn = document.getElementById('decreaseQty');
    const increaseQtyBtn = document.getElementById('increaseQty');
    const addToCartBtn = document.getElementById('addToCartBtn');

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    decreaseQtyBtn.onclick = () => {
        const input = document.getElementById('orderQty');
        if (input.value > 1) {
            input.value = parseInt(input.value) - 1;
        }
    };

    increaseQtyBtn.onclick = () => {
        const input = document.getElementById('orderQty');
        input.value = parseInt(input.value) + 1;
    };

    addToCartBtn.onclick = () => {
        const quantity = parseInt(document.getElementById('orderQty').value);
        if (selectedFood && quantity > 0) {
            addToCart(selectedFood, quantity);
        }
    };
}

// Setup filter buttons
function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filters .filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.getAttribute('data-category');
            filterFoods(category);
        });
    });
}

// Load foods from API
async function loadFoods() {
    try {
        const response = await fetch('/api/foods');
        allFoods = await response.json();
        filteredFoods = allFoods;
        displayFoods(filteredFoods);
    } catch (error) {
        console.error('Error loading foods:', error);
        showError('Failed to load foods');
    }
}

// Filter foods by category
function filterFoods(category) {
    if (category === 'all') {
        filteredFoods = allFoods;
    } else {
        filteredFoods = allFoods.filter(food => food.category === category);
    }
    displayFoods(filteredFoods);
}

// Display foods in grid
function displayFoods(foods) {
    const grid = document.getElementById('foodsGrid');
    
    if (foods.length === 0) {
        grid.innerHTML = '<p class="empty-state">No foods found</p>';
        return;
    }

    grid.innerHTML = foods.map(food => `
        <div class="food-card" onclick="openFoodModal(${food.id})">
            <span class="food-emoji">${food.image}</span>
            <h3>${food.name}</h3>
            <p>${food.description}</p>
            <span class="price">$${food.price.toFixed(2)}</span>
        </div>
    `).join('');
}

// Open food details modal
function openFoodModal(foodId) {
    const food = allFoods.find(f => f.id === foodId);
    if (!food) return;

    selectedFood = food;
    document.getElementById('modalFoodName').textContent = food.name;
    document.getElementById('modalFoodDesc').textContent = food.description;
    document.getElementById('modalFoodPrice').textContent = `$${food.price.toFixed(2)}`;
    document.getElementById('orderQty').value = 1;
    
    document.getElementById('foodModal').style.display = 'block';
}

// Shopping Cart Functions
function addToCart(food, quantity) {
    const existingItem = cart.find(item => item.id === food.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: food.id,
            name: food.name,
            price: food.price,
            quantity: quantity,
            image: food.image
        });
    }
    
    saveCart();
    updateCartCount();
    document.getElementById('foodModal').style.display = 'none';
    showSuccess(`Added ${quantity}x ${food.name} to cart!`);
}

function saveCart() {
    localStorage.setItem('foodzz_cart', JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem('foodzz_cart');
    cart = saved ? JSON.parse(saved) : [];
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function displayCart() {
    const cartItems = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-state">Your cart is empty</p>';
        updateCartTotals(0, 0, 0);
        return;
    }

    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08;
    const deliveryFee = subtotal < 30 && subtotal > 0 ? 5.00 : 0;

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
            </div>
            <div class="cart-item-qty">
                <button onclick="updateQty(${item.id}, ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQty(${item.id}, ${item.quantity + 1})">+</button>
            </div>
            <div class="cart-item-total">$${(item.price * item.quantity).toFixed(2)}</div>
            <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Remove</button>
        </div>
    `).join('');

    updateCartTotals(subtotal, tax, deliveryFee);
}

function updateQty(foodId, newQty) {
    if (newQty <= 0) {
        removeFromCart(foodId);
    } else {
        const item = cart.find(i => i.id === foodId);
        if (item) {
            item.quantity = newQty;
            saveCart();
            displayCart();
            updateCartCount();
        }
    }
}

function removeFromCart(foodId) {
    cart = cart.filter(item => item.id !== foodId);
    saveCart();
    updateCartCount();
    displayCart();
}

function updateCartTotals(subtotal, tax, deliveryFee) {
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('deliveryFee').textContent = `$${deliveryFee.toFixed(2)}`;
    document.getElementById('total').textContent = `$${(subtotal + tax + deliveryFee).toFixed(2)}`;
}

function displayCheckoutPreview() {
    if (cart.length === 0) {
        showError('Cart is empty!');
        showPage('homePage');
        return;
    }

    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08;
    const deliveryFee = subtotal < 30 ? 5.00 : 0;
    const total = subtotal + tax + deliveryFee;

    const checkoutItems = document.getElementById('checkoutItems');
    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <span>${item.name} × ${item.quantity}</span>
            <span class="checkout-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');

    document.getElementById('checkoutSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('checkoutTax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('checkoutDelivery').textContent = `$${deliveryFee.toFixed(2)}`;
    document.getElementById('checkoutTotal').textContent = `$${total.toFixed(2)}`;
}

// Checkout Setup
function setupCheckout() {
    const paymentRadios = document.querySelectorAll('input[name="payment"]');
    const cardPayment = document.getElementById('cardPayment');
    const placeOrderBtn = document.getElementById('placeOrder');

    paymentRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'card') {
                cardPayment.style.display = 'block';
            } else {
                cardPayment.style.display = 'none';
            }
        });
    });

    placeOrderBtn.onclick = () => processCheckout();
}

async function processCheckout() {
    const customerName = document.getElementById('customerName').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    // Validate
    if (!customerName || !customerEmail || !customerPhone || !customerAddress) {
        showError('Please fill in all fields');
        return;
    }

    if (paymentMethod === 'card') {
        const cardNumber = document.getElementById('cardNumber').value;
        const cardExpiry = document.getElementById('cardExpiry').value;
        const cardCVV = document.getElementById('cardCVV').value;

        if (!cardNumber || !cardExpiry || !cardCVV) {
            showError('Please fill in all card details');
            return;
        }
    }

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customer_name: customerName,
                customer_email: customerEmail,
                phone: customerPhone,
                delivery_address: customerAddress,
                payment_method: paymentMethod,
                items: cart
            })
        });

        if (!response.ok) {
            throw new Error('Checkout failed');
        }

        const result = await response.json();
        
        // Redirect to standalone confirmation page with order id
        // Clear local cart first
        const orderId = result.order_id;
        cart = [];
        saveCart();
        updateCartCount();

        // Attach payment method in query for display (optional)
        const params = new URLSearchParams({ order_id: orderId, payment: paymentMethod });
        window.location.href = `/order-confirmation?${params.toString()}`;
    } catch (error) {
        console.error('Error processing checkout:', error);
        showError('Failed to process order. Please try again.');
    }
}

// Admin Setup
function setupAdmin() {
    // Admin setup will be in separate admin.js file
}

// Utility functions
function showSuccess(message) {
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    alert.textContent = `✓ ${message}`;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

function showError(message) {
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    alert.textContent = `✗ ${message}`;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

// CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
