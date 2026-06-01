# 🛍️ Option 2 : E-COMMERCE APP - Backend (Node.js/Express)

## Structure

```
backend/
├── src/
│   ├── index.js
│   ├── routes/
│   │   └── products.js
│   └── data/
│       └── products.json
├── package.json
├── Dockerfile
├── .env.example
└── tests/
    └── products.test.js
```

---

## src/index.js

```javascript
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Counter, Histogram, register } = require('prom-client');

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// ============================================================================
// PROMETHEUS METRICS
// ============================================================================

const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const productOperations = new Counter({
  name: 'product_operations_total',
  help: 'Total product operations',
  labelNames: ['operation', 'status']
});

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Middleware: Enregistrer les métriques
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    httpRequests.labels(req.method, route, res.statusCode).inc();
    requestDuration.labels(req.method, route).observe(duration);
  });
  next();
});

// ============================================================================
// DATA STORAGE
// ============================================================================

let products = [
  {
    id: 1,
    name: 'Laptop Pro',
    price: 1299.99,
    category: 'Electronics',
    description: 'High-performance laptop',
    stock: 10
  },
  {
    id: 2,
    name: 'Wireless Mouse',
    price: 29.99,
    category: 'Accessories',
    description: 'Ergonomic wireless mouse',
    stock: 50
  },
  {
    id: 3,
    name: 'USB-C Hub',
    price: 49.99,
    category: 'Accessories',
    description: 'Multi-port USB-C hub',
    stock: 30
  },
  {
    id: 4,
    name: '4K Monitor',
    price: 449.99,
    category: 'Electronics',
    description: '27-inch 4K monitor',
    stock: 15
  }
];

// ============================================================================
// ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Get all products
app.get('/api/products', (req, res) => {
  const { category, minPrice, maxPrice, search } = req.query;
  
  let filtered = products;
  
  if (category) {
    filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  if (minPrice) {
    filtered = filtered.filter(p => p.price >= parseFloat(minPrice));
  }
  if (maxPrice) {
    filtered = filtered.filter(p => p.price <= parseFloat(maxPrice));
  }
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    );
  }
  
  productOperations.labels('GET', 'success').inc();
  res.json({ count: filtered.length, products: filtered });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  
  if (!product) {
    productOperations.labels('GET_BY_ID', 'not_found').inc();
    return res.status(404).json({ error: 'Product not found' });
  }
  
  productOperations.labels('GET_BY_ID', 'success').inc();
  res.json(product);
});

// Create product
app.post('/api/products', (req, res) => {
  const { name, price, category, description, stock } = req.body;
  
  if (!name || !price || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }
  
  const newProduct = {
    id: Math.max(...products.map(p => p.id), 0) + 1,
    name,
    price,
    category: category || 'Other',
    description,
    stock: stock || 0
  };
  
  products.push(newProduct);
  productOperations.labels('POST', 'success').inc();
  res.status(201).json(newProduct);
});

// Update product
app.put('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  if (req.body.name) product.name = req.body.name;
  if (req.body.price) product.price = req.body.price;
  if (req.body.category) product.category = req.body.category;
  if (req.body.description) product.description = req.body.description;
  if (req.body.stock !== undefined) product.stock = req.body.stock;
  
  productOperations.labels('PUT', 'success').inc();
  res.json(product);
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const deleted = products.splice(index, 1)[0];
  productOperations.labels('DELETE', 'success').inc();
  res.json(deleted);
});

// ============================================================================
// SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═════════════════════════════════════╗
║   E-Commerce API (Port ${PORT})       ║
║   Environment: ${NODE_ENV.padEnd(25)}║
╚═════════════════════════════════════╝
  `);
});

module.exports = app;
```

---

## package.json

```json
{
  "name": "ecommerce-api",
  "version": "1.0.0",
  "description": "E-Commerce API Backend",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest --coverage",
    "lint": "eslint src/"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "morgan": "^1.10.0",
    "prom-client": "^15.0.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.52.0"
  }
}
```

---

## .env.example

```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

---

## tests/products.test.js

```javascript
const request = require('supertest');
const app = require('../src/index');

describe('Products API', () => {
  it('should GET all products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
    expect(res.body.products).toBeDefined();
  });

  it('should GET a product by ID', async () => {
    const res = await request(app).get('/api/products/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('should POST a new product', async () => {
    const res = await request(app).post('/api/products').send({
      name: 'Test Product',
      price: 99.99,
      description: 'A test product'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Test Product');
  });

  it('should GET /health endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
```

