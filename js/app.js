// Simple auth state management
let currentUser = null;
let cart = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
    setupEventListeners();
});

// Check if user is already logged in
function checkUserSession() {
    const savedUser = localStorage.getItem('hackHubUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
    }
}

// Setup button listeners
function setupEventListeners() {
    document.getElementById('navSignInBtn').addEventListener('click', () => openModal('Sign In'));
    document.getElementById('navLogoutBtn').addEventListener('click', logout);
    document.getElementById('heroRegisterBtn').addEventListener('click', () => openModal('Register'));
    
    // Close modal on outside click
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('authModal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Open sign in/register modal
function openModal(title) {
    if (currentUser) {
        alert('You are already signed in as ' + currentUser.name);
        return;
    }
    const modal = document.getElementById('authModal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = '';
    document.getElementById('authForm').reset();
    modal.style.display = 'block';
}

// Open event registration modal
function openEventModal(eventName) {
    if (!currentUser) {
        openModal('Sign In to Register');
        return;
    }
    alert('✓ Registered for ' + eventName);
}

// Close modal
function closeModal() {
    document.getElementById('authModal').style.display = 'none';
}

// Handle authentication (sign in/register)
function handleAuth(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('userName');
    const emailInput = document.getElementById('userEmail');
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    
    if (!name || !email) {
        document.getElementById('modalMessage').textContent = 'Please fill all fields';
        return;
    }
    
    // Simple validation
    if (!email.includes('@')) {
        document.getElementById('modalMessage').textContent = 'Invalid email';
        return;
    }
    
    // Create user object
    currentUser = { name, email };
    
    // Save to localStorage
    localStorage.setItem('hackHubUser', JSON.stringify(currentUser));
    
    // Update UI
    updateUIForLoggedInUser();
    closeModal();
    
    alert('Welcome, ' + name + '! 🎉');
}

// Update UI when user logs in
function updateUIForLoggedInUser() {
    // Hide sign in button, show logout button
    document.getElementById('navSignInBtn').style.display = 'none';
    document.getElementById('navLogoutBtn').style.display = 'block';
    
    // Show user name in navbar
    document.getElementById('userName').textContent = currentUser.name;
    
    // Show gallery and store sections
    document.getElementById('gallery-section').style.display = 'block';
    document.getElementById('store-section').style.display = 'block';
}

// Logout
function logout() {
    currentUser = null;
    cart = [];
    localStorage.removeItem('hackHubUser');
    
    // Reset UI
    document.getElementById('navSignInBtn').style.display = 'block';
    document.getElementById('navLogoutBtn').style.display = 'none';
    document.getElementById('userName').textContent = '';
    document.getElementById('gallery-section').style.display = 'none';
    document.getElementById('store-section').style.display = 'none';
    document.getElementById('cartItems').innerHTML = '';
    document.getElementById('cartCount').textContent = '0';
    document.getElementById('cartTotal').textContent = '₹0';
    
    alert('You have been logged out');
}

// Cart functionality
function addToCart(itemName, price) {
    if (!currentUser) {
        openModal('Sign In to Shop');
        return;
    }
    
    cart.push({ name: itemName, price });
    updateCart();
    alert(itemName + ' added to cart!');
}

function updateCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    cartItemsDiv.innerHTML = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        total += item.price;
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <span>${item.name} - ₹${item.price}</span>
            <button onclick="removeFromCart(${index})" style="background: #ff4444; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer;">Remove</button>
        `;
        cartItemsDiv.appendChild(cartItem);
    });
    
    document.getElementById('cartCount').textContent = cart.length;
    document.getElementById('cartTotal').textContent = '₹' + total;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}
