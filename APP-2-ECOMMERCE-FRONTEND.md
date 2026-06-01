# 🛍️ Option 2 : E-COMMERCE APP - Frontend (React)

## Structure

```
frontend/
├── src/
│   ├── index.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── components/
│   │   ├── ProductList.jsx
│   │   ├── ProductCard.jsx
│   │   ├── SearchBar.jsx
│   │   └── Cart.jsx
│   └── services/
│       └── api.js
├── public/
│   └── index.html
├── package.json
├── Dockerfile
└── .env.example
```

---

## public/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Commerce Store</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

---

## src/index.jsx

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

---

## src/App.jsx

```javascript
import React, { useState, useEffect } from 'react';
import ProductList from './components/ProductList';
import SearchBar from './components/SearchBar';
import Cart from './components/Cart';
import { fetchProducts } from './services/api';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: null,
    maxPrice: null
  });

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, filters]);

  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = products;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
      );
    }

    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }

    if (filters.minPrice) {
      result = result.filter(p => p.price >= filters.minPrice);
    }

    if (filters.maxPrice) {
      result = result.filter(p => p.price <= filters.maxPrice);
    }

    setFiltered(result);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleAddToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const handleUpdateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🛍️ E-Shop</h1>
          <button
            className="cart-btn"
            onClick={() => setShowCart(!showCart)}
          >
            🛒 Cart ({cart.length})
          </button>
        </div>
      </header>

      <main className="app-main">
        {showCart ? (
          <Cart
            items={cart}
            total={cartTotal}
            onRemove={handleRemoveFromCart}
            onUpdateQuantity={handleUpdateQuantity}
            onClose={() => setShowCart(false)}
          />
        ) : (
          <div className="shop">
            <SearchBar filters={filters} onFilterChange={handleFilterChange} />

            {loading ? (
              <div className="loading">Loading products...</div>
            ) : filtered.length === 0 ? (
              <div className="empty">No products found</div>
            ) : (
              <ProductList
                products={filtered}
                onAddToCart={handleAddToCart}
              />
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with React & Node.js</p>
      </footer>
    </div>
  );
}

export default App;
```

---

## src/App.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #8b5cf6;
  --dark: #1f2937;
  --light: #f3f4f6;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--light);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  color: white;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  font-size: 2rem;
}

.cart-btn {
  background: white;
  color: var(--primary);
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.cart-btn:hover {
  transform: scale(1.05);
}

.app-main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 20px;
}

.shop {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 20px;
}

.loading,
.empty {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
}

.app-footer {
  background: var(--dark);
  color: white;
  text-align: center;
  padding: 20px;
  margin-top: auto;
}

@media (max-width: 768px) {
  .shop {
    grid-template-columns: 1fr;
  }
}
```

---

## src/components/SearchBar.jsx

```javascript
import React from 'react';

function SearchBar({ filters, onFilterChange }) {
  return (
    <aside className="search-bar">
      <h3>Search & Filter</h3>

      <div className="filter-group">
        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="search-input"
        />
      </div>

      <div className="filter-group">
        <label>Category</label>
        <select
          value={filters.category}
          onChange={(e) => onFilterChange({ category: e.target.value })}
        >
          <option value="">All</option>
          <option value="Electronics">Electronics</option>
          <option value="Accessories">Accessories</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Min Price: ${filters.minPrice || 0}</label>
        <input
          type="number"
          min="0"
          onChange={(e) => onFilterChange({
            minPrice: e.target.value ? parseFloat(e.target.value) : null
          })}
        />
      </div>

      <div className="filter-group">
        <label>Max Price: ${filters.maxPrice || 2000}</label>
        <input
          type="number"
          min="0"
          onChange={(e) => onFilterChange({
            maxPrice: e.target.value ? parseFloat(e.target.value) : null
          })}
        />
      </div>
    </aside>
  );
}

export default SearchBar;
```

---

## src/components/ProductList.jsx

```javascript
import React from 'react';
import ProductCard from './ProductCard';

function ProductList({ products, onAddToCart }) {
  return (
    <div className="product-list">
      <h2>Products ({products.length})</h2>
      <div className="products-grid">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
}

export default ProductList;
```

---

## src/components/ProductCard.jsx

```javascript
import React from 'react';

function ProductCard({ product, onAddToCart }) {
  return (
    <div className="product-card">
      <div className="product-header">
        <h3>{product.name}</h3>
        <span className="category">{product.category}</span>
      </div>
      <p className="product-desc">{product.description}</p>
      <div className="product-footer">
        <span className="price">${product.price}</span>
        <button
          className="add-btn"
          onClick={() => onAddToCart(product)}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

export default ProductCard;
```

---

## src/components/Cart.jsx

```javascript
import React from 'react';

function Cart({ items, total, onRemove, onUpdateQuantity, onClose }) {
  return (
    <div className="cart">
      <button className="close-btn" onClick={onClose}>← Back to Shopping</button>
      
      <h2>Shopping Cart</h2>

      {items.length === 0 ? (
        <p className="empty-cart">Your cart is empty</p>
      ) : (
        <>
          <div className="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <p>${item.price} × {item.quantity}</p>
                </div>
                <div className="item-controls">
                  <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                  <button onClick={() => onRemove(item.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-summary">
            <h3>Total: ${total.toFixed(2)}</h3>
            <button className="checkout-btn">Checkout</button>
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
```

---

## src/services/api.js

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const fetchProducts = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

    const res = await fetch(`${API_URL}/api/products?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch (err) {
    console.error('Error:', err);
    throw err;
  }
};
```

---

## package.json

```json
{
  "name": "ecommerce-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
```

---

## .env.example

```env
REACT_APP_API_URL=http://localhost:3001
```

