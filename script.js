(function() {
    // Configuration
    const API_BASE_URL = 'http://localhost:3000/api'; // Change to your server URL

    // Helper: fetch with timeout using AbortController
    async function fetchWithTimeout(resource, options = {}, timeout = 15000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const resp = await fetch(resource, {...options, signal: controller.signal });
            clearTimeout(id);
            return resp;
        } catch (err) {
            clearTimeout(id);
            throw err;
        }
    }

    // Initialize Socket.IO client for realtime payment updates
    function initSocket() {
        try {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
            script.onload = () => {
                try {
                    const socketBase = API_BASE_URL.replace(/\/api\/?$/, '');
                    const socket = io(socketBase);
                    socket.on('connect', () => console.log('Socket connected:', socket.id));
                    socket.on('payment:update', (payload) => {
                        console.log('Realtime payment update:', payload);
                        // If this update matches the current checkout, handle it immediately
                        if (currentCheckoutRequestId && payload && payload.checkoutRequestId) {
                            const a = String(payload.checkoutRequestId || '');
                            const b = String(currentCheckoutRequestId || '');
                            if (a === b || a.includes(b) || b.includes(a)) {
                                if (payload.status === 'success') {
                                    handlePaymentSuccess(payload);
                                } else if (payload.status === 'failed') {
                                    handlePaymentFailure(payload);
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.error('Socket init error', e);
                }
            };
            script.onerror = (e) => console.error('Failed to load socket.io client', e);
            document.head.appendChild(script);
        } catch (e) {
            console.error('initSocket error', e);
        }
    }

    // DOM Elements
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const cartIcon = document.querySelector('.cart-icon');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const closeCart = document.querySelector('.close-cart');
    const productGrid = document.querySelector('.product-grid');
    const cartItems = document.querySelector('.cart-items');
    const cartTotal = document.querySelector('.total-amount');
    const checkoutBtn = document.querySelector('.checkout-btn');
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    document.body.appendChild(overlay);

    // Sample product data
    const products = [{
        id: 1,
        name: 'Silicone Phone Case',
        price: 0.009,
        image: "https://saruk-web-images.s3.eu-north-1.amazonaws.com/13%20silicone%20cover.png",
        category: 'Phone Cases',
        description: 'A durable and stylish silicone case for your phone.'
    }, {
        id: 2,
        name: 'Tempered Glass Screen Protector',
        price: 12.99,
        image: 'photos/scr.png',
        category: 'Screen Protectors',
        description: 'Crystal clear protection against scratches and cracks.'
    }, {
        id: 3,
        name: 'Fast Wireless Charger',
        price: 29.99,
        image: 'photos/image.png',
        category: 'Chargers',
        description: 'Fast wireless charging pad with LED indicator.'
    }, {
        id: 4,
        name: 'Bluetooth Earbuds',
        price: 49.99,
        image: 'photos/E1.png',
        category: 'Headphones',
        description: 'High-quality wireless earbuds with long battery life.'
    }, {
        id: 5,
        name: 'Power Bank',
        price: 9.99,
        image: 'photos/pwrbank.png',
        category: 'Chargers',
        description: 'Expandable grip and stand for your phone.'
    }, {
        id: 6,
        name: 'Car Phone Mount',
        price: 15.99,
        image: 'photos/s1.png',
        category: 'Phone Accessories',
        description: 'Secure phone mount for your car dashboard.'
    }, {
        id: 7,
        name: 'phone plugged Fans',
        price: 15.99,
        image: 'photos/fan1.jpg',
        category: 'Fans',
        description: 'Self Cooling fans plugged in the charging port of the phone .'
    }, {
        id: 8,
        name: 'Handheld Fans',
        price: 49.99,
        image: 'photos/f2.jpg',
        category: 'Fans',
        description: 'USB Rechargeable Handheld Fan .'
    }, {
        id: 9,
        name: 'iPhone12 Pro Max',
        price: 499.99,
        image: 'photos/ip12pro.jpg',
        category: 'Phones',
        description: 'Silver Iphone 12 pro max brand new.'
    }, {
        id: 10,
        name: 'iPhone 8 Plain',
        price: 499.99,
        image: 'photos/Ip8plain.jpg',
        category: 'Phones',
        description: 'Silver Iphone 12 pro max UK refurbish.'
    }, {
        id: 11,
        name: 'iPhone 9',
        price: 499.99,
        image: 'photos/Ip9.jpg',
        category: 'Phones',
        description: 'Silver Iphone 9 Dubai refurbished.'
    }, {
        id: 12,
        name: 'iPhone 11',
        price: 499.99,
        image: 'photos/Iph11.png',
        category: 'Phones',
        description: 'Silver Iphone 12 pro max brand new .'
    }, {
        id: 13,
        name: 'Smart Mirrors',
        price: 0.0019,
        image: 'photos/Smirrors.jpg',
        category: 'Accessories',
        description: 'Ubreakable smart mirrors                 .'
    }];

    // Cart state
    let cart = [];
    let currentCheckoutRequestId = null;

    // Initialize the app
    function init() {
        if (productGrid) {
            displayProducts(products);
        }
        setupEventListeners();
        loadCart();
        updateCartCount();
        setupFiltering();
    }

    // Display products in the grid
    function displayProducts(productsToShow) {
        productGrid.innerHTML = productsToShow.map(product => `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="price">$${product.price.toFixed(2)}</p>
                    <p>${product.description}</p>
                    <button class="btn add-to-cart" data-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        `).join('');
    }

    // Set up event listeners
    function setupEventListeners() {
        if (hamburger) {
            hamburger.addEventListener('click', toggleMobileMenu);
        }

        if (cartIcon) {
            cartIcon.addEventListener('click', toggleCart);
        }

        if (closeCart) {
            closeCart.addEventListener('click', toggleCart);
        }

        if (overlay) {
            overlay.addEventListener('click', closeAll);
        }

        if (productGrid) {
            productGrid.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-to-cart')) {
                    const productId = parseInt(e.target.dataset.id);
                    addToCart(productId);
                }
            });
        }

        if (cartItems) {
            cartItems.addEventListener('click', (e) => {
                const target = e.target.closest('.remove-item') ||
                    e.target.closest('.quantity-btn.decrease') ||
                    e.target.closest('.quantity-btn.increase');

                if (!target) return;

                const cartItem = target.closest('.cart-item');
                const productId = parseInt(cartItem.dataset.id);

                if (target.classList.contains('remove-item')) {
                    removeFromCart(productId);
                } else if (target.classList.contains('decrease')) {
                    updateCartItemQuantity(productId, -1);
                } else if (target.classList.contains('increase')) {
                    updateCartItemQuantity(productId, 1);
                }
            });
        }

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', handleCheckout);
        }
    }

    // Toggle mobile menu
    function toggleMobileMenu() {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    }

    // Toggle cart sidebar
    function toggleCart() {
        cartSidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = cartSidebar.classList.contains('active') ? 'hidden' : '';

        if (cartSidebar.classList.contains('active')) {
            updateCartUI();
        }
    }

    // Close all overlays
    function closeAll() {
        if (navLinks) navLinks.classList.remove('active');
        if (cartSidebar) cartSidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
        document.body.style.overflow = '';
        closePaymentModal();
    }

    // Add item to cart
    function addToCart(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = cart.find(item => item.id === productId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }

        saveCart();
        updateCartCount();
        showNotification(`${product.name} added to cart!`);
    }

    // Remove item from cart
    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        saveCart();
        updateCartUI();
        updateCartCount();
    }

    // Update cart item quantity
    function updateCartItemQuantity(productId, change) {
        const item = cart.find(item => item.id === productId);
        if (!item) return;

        item.quantity += change;

        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }

        updateCartCount();
    }

    // Update cart UI
    function updateCartUI() {
        if (!cartItems || !cartTotal) return;

        if (cart.length === 0) {
            cartItems.innerHTML = '<p>Your cart is empty</p>';
            cartTotal.textContent = '$0.00';
            return;
        }

        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p class="price">$${item.price.toFixed(2)}</p>
                    <div class="quantity">
                        <button class="quantity-btn decrease">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn increase">+</button>
                    </div>
                    <button class="remove-item">Remove</button>
                </div>
            </div>
        `).join('');

        updateCartTotal();
    }

    // Update cart total
    function updateCartTotal() {
        if (!cartTotal) return;
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = `$${total.toFixed(2)}`;
    }

    // Update cart count in header
    function updateCartCount() {
        const cartCountEl = document.querySelector('.cart-count');
        if (cartCountEl) {
            const count = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCountEl.textContent = count;
        }
    }

    // ============== M-PESA INTEGRATION ==============

    // Handle Checkout - Show M-Pesa Payment Modal
    function handleCheckout() {
        if (cart.length === 0) {
            showNotification('Your cart is empty!', 'error');
            return;
        }

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        showPaymentModal(total);
    }

    // Show Payment Modal
    function showPaymentModal(amount) {
        const modal = document.createElement('div');
        modal.className = 'payment-modal';
        modal.innerHTML = `
            <div class="payment-modal-content">
                <button class="close-modal">&times;</button>
                <div class="payment-header">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1200px-M-PESA_LOGO-01.svg.png" alt="M-Pesa" class="mpesa-logo">
                    <h2>Complete Payment</h2>
                </div>
                <div class="payment-body">
                    <div class="amount-display">
                        <p>Total Amount</p>
                        <h3>KES ${(amount * 130).toFixed(2)}</h3>
                        <small>~$${amount.toFixed(2)}</small>
                    </div>
                    <form id="mpesa-form">
                        <div class="form-group">
                            <label for="mpesa-phone">M-Pesa Phone Number</label>
                            <input 
                                type="tel" 
                                id="mpesa-phone" 
                                placeholder="e.g., 0712345678 or 254712345678" 
                                required
                            >
                            <small>Enter your Safaricom number (07XX or 01XX)</small>
                        </div>
                        <button type="submit" class="btn pay-btn" id="pay-btn">
                            <i class="fas fa-mobile-alt"></i> Pay with M-Pesa
                        </button>
                    </form>
                    <div id="payment-status" class="payment-status" style="display: none;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);

        // Event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => closePaymentModal());
        modal.querySelector('#mpesa-form').addEventListener('submit', (e) => {
            e.preventDefault();
            initiatePayment(amount);
        });
    }

    // Close Payment Modal
    function closePaymentModal() {
        const modal = document.querySelector('.payment-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    }

    // Initiate M-Pesa Payment
    async function initiatePayment(amount) {
        const phoneInput = document.getElementById('mpesa-phone');
        const payBtn = document.getElementById('pay-btn');
        const statusDiv = document.getElementById('payment-status');

        const phone = phoneInput.value.trim();

        // Validate phone number format before sending
        if (!phone || phone.length < 10) {
            statusDiv.style.display = 'block';
            statusDiv.className = 'payment-status error';
            statusDiv.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <p><strong>Invalid Phone Number</strong></p>
                <p>Please enter a valid phone number (format: 0712345678 or 254712345678)</p>
            `;
            return;
        }

        // Disable button and show loading
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            // Convert USD to KES (approximate rate: 1 USD = 130 KES)
            const amountKES = Math.ceil(amount * 130);

            const response = await fetchWithTimeout(`${API_BASE_URL}/mpesa/stkpush`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: phone,
                    amount: amountKES,
                    accountReference: 'PrimePicks',
                    transactionDesc: 'Payment for products'
                })
            }, 15000);

            const data = await response.json();

            if (data.success) {
                currentCheckoutRequestId = data.data.CheckoutRequestID;

                // Show success message
                statusDiv.style.display = 'block';
                statusDiv.className = 'payment-status success';
                statusDiv.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <p><strong>STK Push Sent!</strong></p>
                    <p>Check your phone and enter your M-Pesa PIN to complete the payment.</p>
                    <div class="loading-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <small>Waiting for payment confirmation...</small>
                `;

                // Start polling for payment status
                pollPaymentStatus(currentCheckoutRequestId);

            } else {
                throw new Error(data.message || 'Payment initiation failed');
            }

        } catch (error) {
            console.error('Payment error:', error);

            // Parse error message based on error type
            let errorMessage = (error && error.message) || 'Payment initiation failed';

            // Detect network/timeout errors from fetch (AbortError) or TypeError
            if ((error && error.name === 'AbortError') || error instanceof TypeError) {
                errorMessage = 'Cannot connect to payment server. Please ensure the backend is running on http://localhost:3000';
            } else if (errorMessage && errorMessage.includes('Invalid phone')) {
                errorMessage = 'Invalid phone number format. Use format: 0712345678 or 254712345678';
            } else if (errorMessage && errorMessage.toLowerCase().includes('fetch')) {
                errorMessage = 'Network error. Cannot reach the payment server.';
            }

            statusDiv.style.display = 'block';
            statusDiv.className = 'payment-status error';
            statusDiv.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <p><strong>Payment Failed</strong></p>
                <p>${errorMessage}</p>
                <small style="margin-top: 10px; display: block;">Troubleshooting:</small>
                <small style="display: block;">1. Ensure backend server is running on port 3000</small>
                <small style="display: block;">2. Check phone number format: 0712345678 (Kenya)</small>
                <small style="display: block;">3. Verify all .env variables are set correctly</small>
            `;

            // Re-enable button
            payBtn.disabled = false;
            payBtn.innerHTML = '<i class="fas fa-mobile-alt"></i> Pay with M-Pesa';
        }
    }

    // Poll Payment Status
    function pollPaymentStatus(checkoutRequestId, attempts = 0) {
        const maxAttempts = 60; // 60 attempts with adaptive timing
        const interval = attempts < 10 ? 500 : 1000; // Fast polling initially, then slower

        if (attempts >= maxAttempts) {
            showPaymentTimeout();
            return;
        }

        setTimeout(async() => {
            try {
                const response = await fetchWithTimeout(`${API_BASE_URL}/mpesa/query`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    body: JSON.stringify({
                        checkoutRequestId: checkoutRequestId
                    })
                }, 10000);

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const data = await response.json();

                if (data.success) {
                    if (data.status === 'success') {
                        handlePaymentSuccess(data.data);
                        return;
                    } else if (data.status === 'failed') {
                        handlePaymentFailure(data.data);
                        return;
                    }
                }

                // Still pending, continue polling with exponential backoff
                pollPaymentStatus(checkoutRequestId, attempts + 1);

            } catch (error) {
                console.error('Status check error:', error);
                // Only continue polling on non-critical errors
                if (attempts < maxAttempts - 5) {
                    pollPaymentStatus(checkoutRequestId, attempts + 1);
                } else {
                    showPaymentTimeout();
                }
            }
        }, interval); // Adaptive interval
    }

    // Handle Payment Success
    function handlePaymentSuccess(transactionData) {
        const statusDiv = document.getElementById('payment-status');

        statusDiv.className = 'payment-status success';
        statusDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <h3>Payment Successful!</h3>
            <p>Receipt: ${transactionData.mpesaReceiptNumber || 'N/A'}</p>
            <p>Thank you for your purchase!</p>
        `;

        // Show a small thank-you toast immediately
        try {
            showNotification('Thank you for shopping with us', 'success');
        } catch (e) {
            console.error('Toast error', e);
        }

        // Clear cart
        setTimeout(() => {
            cart = [];
            saveCart();
            updateCartUI();
            updateCartCount();
            closePaymentModal();
            showNotification('Order placed successfully!', 'success');
        }, 3000);
    }

    // Handle Payment Failure
    function handlePaymentFailure(transactionData) {
        const statusDiv = document.getElementById('payment-status');
        const payBtn = document.getElementById('pay-btn');

        statusDiv.className = 'payment-status error';
        statusDiv.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <h3>Payment Failed</h3>
            <p>${transactionData.resultDesc || 'Transaction was not completed'}</p>
            <p>Please try again.</p>
        `;

        // Re-enable button
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fas fa-mobile-alt"></i> Pay with M-Pesa';
    }

    // Handle Payment Timeout
    function showPaymentTimeout() {
        const statusDiv = document.getElementById('payment-status');
        const payBtn = document.getElementById('pay-btn');

        statusDiv.className = 'payment-status warning';
        statusDiv.innerHTML = `
            <i class="fas fa-clock"></i>
            <h3>Payment Timeout</h3>
            <p>We couldn't confirm your payment. Please check your M-Pesa messages.</p>
            <p>If payment was deducted, your order will be processed automatically.</p>
        `;

        // Re-enable button
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fas fa-mobile-alt"></i> Try Again';
    }

    // ============== END M-PESA INTEGRATION ==============

    // Show notification
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Save cart to localStorage
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Load cart from localStorage
    function loadCart() {
        const savedCart = localStorage.getItem('cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
        updateCartCount();
    }

    // Filtering functions
    function setupFiltering() {
        const searchInput = document.querySelector('#search-input');
        const categoryCards = document.querySelectorAll('.category-card');

        if (searchInput) {
            searchInput.addEventListener('input', () => filterProducts());
        }

        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                }
                filterProducts(card.dataset.category);
            });
        });
    }

    function filterProducts(category = 'all') {
        const searchInput = document.querySelector('#search-input');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        let filteredProducts = products;

        if (category !== 'all') {
            filteredProducts = filteredProducts.filter(product => product.category === category);
        }

        if (searchTerm) {
            filteredProducts = filteredProducts.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm)
            );
        }

        displayProducts(filteredProducts);
    }

    // Add styles for payment modal
    function addPaymentStyles() {
        const styles = `
            .payment-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .payment-modal.active {
                opacity: 1;
            }
            
            .payment-modal-content {
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 450px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .payment-modal.active .payment-modal-content {
                transform: scale(1);
            }
            
            .close-modal {
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: #666;
                line-height: 1;
                padding: 0;
                width: 30px;
                height: 30px;
            }
            
            .close-modal:hover {
                color: #000;
            }
            
            .payment-header {
                text-align: center;
                margin-bottom: 25px;
            }
            
            .mpesa-logo {
                width: 120px;
                margin-bottom: 15px;
            }
            
            .payment-header h2 {
                margin: 0;
                color: #333;
            }
            
            .amount-display {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 25px;
            }
            
            .amount-display p {
                margin: 0 0 5px 0;
                opacity: 0.9;
            }
            
            .amount-display h3 {
                margin: 0 0 5px 0;
                font-size: 32px;
            }
            
            .amount-display small {
                opacity: 0.8;
            }
            
            #mpesa-form .form-group {
                margin-bottom: 20px;
            }
            
            #mpesa-form label {
                display: block;
                margin-bottom: 8px;
                color: #333;
                font-weight: 500;
            }
            
            #mpesa-form input {
                width: 100%;
                padding: 12px;
                border: 2px solid #e5e7eb;
                border-radius: 6px;
                font-size: 16px;
                transition: border-color 0.3s;
            }
            
            #mpesa-form input:focus {
                outline: none;
                border-color: #10b981;
            }
            
            #mpesa-form small {
                display: block;
                margin-top: 5px;
                color: #666;
                font-size: 13px;
            }
            
            .pay-btn {
                width: 100%;
                padding: 14px;
                background: #10b981;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .pay-btn:hover:not(:disabled) {
                background: #059669;
            }
            
            .pay-btn:disabled {
                background: #9ca3af;
                cursor: not-allowed;
            }
            
            .payment-status {
                margin-top: 20px;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
            }
            
            .payment-status.success {
                background: #d1fae5;
                border: 1px solid #10b981;
                color: #065f46;
            }
            
            .payment-status.error {
                background: #fee2e2;
                border: 1px solid #ef4444;
                color: #991b1b;
            }
            
            .payment-status.warning {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                color: #92400e;
            }
            
            .payment-status i {
                font-size: 48px;
                margin-bottom: 10px;
            }
            
            .payment-status h3 {
                margin: 10px 0;
            }
            
            .payment-status p {
                margin: 5px 0;
            }
            
            .loading-dots {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin: 15px 0;
            }
            
            .loading-dots span {
                width: 10px;
                height: 10px;
                background: #10b981;
                border-radius: 50%;
                animation: bounce 1.4s infinite ease-in-out both;
            }
            
            .loading-dots span:nth-child(1) {
                animation-delay: -0.32s;
            }
            
            .loading-dots span:nth-child(2) {
                animation-delay: -0.16s;
            }
            
            @keyframes bounce {
                0%, 80%, 100% {
                    transform: scale(0);
                }
                40% {
                    transform: scale(1);
                }
            }
            
            .notification {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                padding: 12px 24px;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 1100;
                     
            }
            
            .notification.success {
                background: #10b981;
            }
            
            .notification.error {
                background: #ef4444;
            }
            
            .notification.show {
                transform: translateX(-50%) translateY(0);
            }
        `;

        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }

    // Initialize the app when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        init();
        initSocket();
        addPaymentStyles();
    });

})();