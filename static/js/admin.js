// Foodzz - Admin Dashboard JavaScript

let allOrders = [];
let filteredOrders = [];
let selectedOrderForUpdate = null;

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadAdminOrders();
    loadFoodItems();
    setupAdminEventListeners();
    setupStatusModal();
    
    // Refresh every 5 seconds
    setInterval(() => {
        loadStats();
        loadAdminOrders();
    }, 5000);
});

function setupAdminEventListeners() {
    const backBtn = document.getElementById('backToFront');
    const filterBtns = document.querySelectorAll('[data-status]');

    if (backBtn) {
        backBtn.onclick = () => {
            window.location.href = '/';
        };
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const status = btn.getAttribute('data-status');
            filterOrdersByStatus(status);
        });
    });
}

function setupStatusModal() {
    const modal = document.getElementById('statusModal');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancelStatusBtn');
    const updateBtn = document.getElementById('updateStatusBtn');

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    updateBtn.onclick = updateOrderStatus;
}

async function loadStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const stats = await response.json();

        document.getElementById('totalOrders').textContent = stats.total_orders;
        document.getElementById('totalRevenue').textContent = `₹${stats.total_revenue.toFixed(2)}`;
        document.getElementById('pendingOrders').textContent = stats.orders_by_status['pending'] || 0;
        document.getElementById('deliveredOrders').textContent = stats.orders_by_status['delivered'] || 0;
        
        // Display recent orders
        displayRecentOrders(stats.recent_orders);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadAdminOrders() {
    try {
        const response = await fetch('/api/admin/orders');
        allOrders = await response.json();
        filterOrdersByStatus('all');
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function filterOrdersByStatus(status) {
    if (status === 'all') {
        filteredOrders = allOrders;
    } else {
        filteredOrders = allOrders.filter(order => order.status === status);
    }
    displayAdminOrders();
}

function displayAdminOrders() {
    const tbody = document.getElementById('ordersTableBody');

    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = filteredOrders.map(order => {
        const items = `${order.total_price > 0 ? 'Multiple items' : 'N/A'}`;
        const date = new Date(order.created_at).toLocaleDateString();

        return `
            <tr>
                <td>#${String(order.id).padStart(4, '0')}</td>
                <td>${order.customer_name}</td>
                <td>${items}</td>
                <td>₹${order.total_price.toFixed(2)}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td>${date}</td>
                <td>
                    <button class="action-btn" onclick="openStatusModal(${order.id}, '${order.status}')">
                        Update
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openStatusModal(orderId, currentStatus) {
    selectedOrderForUpdate = {
        id: orderId,
        status: currentStatus
    };

    document.getElementById('modalOrderId').textContent = `#${String(orderId).padStart(4, '0')}`;
    document.getElementById('statusSelect').value = currentStatus;
    document.getElementById('statusModal').style.display = 'block';
}

function displayRecentOrders(recentOrders) {
    const container = document.getElementById('recentOrdersList');
    
    if (!recentOrders || recentOrders.length === 0) {
        container.innerHTML = '<p class="empty-state">No recent orders</p>';
        return;
    }
    
    container.innerHTML = recentOrders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="recent-order-card">
                <div class="recent-order-header">
                    <div class="recent-order-id">Order #${String(order.id).padStart(4, '0')}</div>
                    <span class="status-badge status-${order.status}">${order.status}</span>
                </div>
                <div class="recent-order-body">
                    <p><strong>${order.customer_name}</strong> - ${order.customer_email}</p>
                    <p class="order-address">${order.delivery_address}</p>
                    <p class="order-total">Total: ₹${order.total_price.toFixed(2)}</p>
                    <p class="order-date">${date}</p>
                </div>
            </div>
        `;
    }).join('');
}

async function updateOrderStatus() {
    const statusSelect = document.getElementById('statusSelect');
    const newStatus = statusSelect.value;

    if (!newStatus) {
        alert('Please select a status');
        return;
    }

    if (!selectedOrderForUpdate) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/orders/${selectedOrderForUpdate.id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: newStatus
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update status');
        }

        showAdminSuccess(`Order #${String(selectedOrderForUpdate.id).padStart(4, '0')} updated to ${newStatus}`);
        document.getElementById('statusModal').style.display = 'none';
        loadAdminOrders();
        loadStats();
    } catch (error) {
        console.error('Error updating order:', error);
        alert('Failed to update order status');
    }
}

function showAdminSuccess(message) {
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

// Food Items Management - Display only (Add via separate page)
let allFoodItems = [];
let featuredIds = new Set();

async function loadFoodItems() {
    try {
        const [foodsResp, featuredResp] = await Promise.all([
            fetch('/api/foods'),
            fetch('/api/admin/featured')
        ]);

        const foods = await foodsResp.json();
        const featuredJson = await featuredResp.json();
        const fids = (featuredJson && featuredJson.featured) ? featuredJson.featured : [];
        featuredIds = new Set(fids);

        allFoodItems = foods;
        displayFoodItems(foods);
    } catch (error) {
        console.error('Error loading food items:', error);
        document.getElementById('foodItemsList').innerHTML = '<p class="empty-state">Failed to load food items</p>';
    }
}

function displayFoodItems(foods) {
    const container = document.getElementById('foodItemsList');
    
    if (foods.length === 0) {
        container.innerHTML = '<p class="empty-state">No food items available</p>';
        return;
    }

    container.innerHTML = foods.map(food => {
        const isFeatured = featuredIds.has(food.id);
        return `
        <div class="food-item-card">
            <img src="/static/images/${food.image}" alt="${food.name}" class="food-item-image">
            <div class="food-item-details">
                <h4>${food.name} ${isFeatured ? '<span class="badge featured">★ Featured</span>' : ''}</h4>
                <p>${food.description}</p>
                <div class="food-item-price">₹${food.price.toFixed(2)}</div>
                <span class="food-item-category">${food.category}</span>
            </div>
            <div class="food-item-actions">
                <a class="btn" href="/admin/add-food?edit=${food.id}" style="margin-right:8px; text-decoration:none;">Edit</a>
                <button class="food-item-delete" onclick="deleteFood(${food.id})">Delete</button>
                <button class="food-item-feature" onclick="toggleFeatured(${food.id}, ${isFeatured})" style="margin-left:8px;">${isFeatured ? 'Unfeature' : 'Feature'}</button>
            </div>
        </div>
    `}).join('');
}


function toggleFeatured(foodId, currentlyFeatured) {
    const wanting = !currentlyFeatured;
    fetch(`/api/admin/foods/${foodId}/featured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: wanting })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showAdminSuccess(`Food #${foodId} ${wanting ? 'marked' : 'unmarked'} as featured`);
            // update local set and re-render
            if (wanting) featuredIds.add(foodId); else featuredIds.delete(foodId);
            displayFoodItems(allFoodItems);
        } else {
            alert('Error: ' + (data.error || 'Failed to update featured'));
        }
    })
    .catch(err => {
        console.error('Error toggling featured:', err);
        alert('Failed to update featured status');
    });
}

function deleteFood(foodId) {
    if (confirm('Are you sure you want to delete this food item?')) {
        fetch(`/api/admin/foods/${foodId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAdminSuccess('Food item deleted successfully!');
                loadFoodItems();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to delete food item');
        });
    }
}
