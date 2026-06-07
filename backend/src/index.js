const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Counter, Histogram, register } = require('prom-client');
const fs = require('fs').promises;

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

const todoOperations = new Counter({
  name: 'todo_operations_total',
  help: 'Total todo operations',
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

let todos = [
  { id: 1, title: 'Learn Kubernetes', completed: false },
  { id: 2, title: 'Setup CI/CD pipeline', completed: true },
  { id: 3, title: 'Deploy application', completed: false }
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

app.get('/api/todos', (req, res) => {
  todoOperations.labels('GET', 'success').inc();
  res.json({
    count: todos.length,
    todos: todos.sort((a, b) => a.id - b.id)
  });
});

app.get('/api/todos/:id', (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id));
  if (!todo) {
    todoOperations.labels('GET_BY_ID', 'not_found').inc();
    return res.status(404).json({ error: 'Todo not found' });
  }
  todoOperations.labels('GET_BY_ID', 'success').inc();
  res.json(todo);
});

app.post('/api/todos', (req, res) => {
  const { title } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  const newTodo = {
    id: Math.max(...todos.map(t => t.id), 0) + 1,
    title: title.trim(),
    completed: false
  };
  todos.push(newTodo);
  todoOperations.labels('POST', 'success').inc();
  res.status(201).json(newTodo);
});

app.put('/api/todos/:id', (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id));
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  if (req.body.title) todo.title = req.body.title.trim();
  if (req.body.completed !== undefined) todo.completed = req.body.completed;
  todoOperations.labels('PUT', 'success').inc();
  res.json(todo);
});

app.delete('/api/todos/:id', (req, res) => {
  const index = todos.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  const deleted = todos.splice(index, 1)[0];
  todoOperations.labels('DELETE', 'success').inc();
  res.json(deleted);
});

// ============================================================================
// SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═════════════════════════════════════╗
║   TODO API Server (Port ${PORT})      ║
║   Environment: ${NODE_ENV.padEnd(25)}║
╚═════════════════════════════════════╝
  `);
});

module.exports = app;
