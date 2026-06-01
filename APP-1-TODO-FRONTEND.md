# 📝 Option 1 : TODO APP - Frontend (React)

## Structure

```
frontend/
├── src/
│   ├── index.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── components/
│   │   ├── TodoList.jsx
│   │   ├── TodoForm.jsx
│   │   └── TodoItem.jsx
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
  <title>Todo App</title>
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
import TodoForm from './components/TodoForm';
import TodoList from './components/TodoList';
import { fetchTodos, addTodo, deleteTodo, updateTodo } from './services/api';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const data = await fetchTodos();
      setTodos(data.todos || []);
    } catch (err) {
      console.error('Error loading todos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (title) => {
    try {
      const newTodo = await addTodo(title);
      setTodos([...todos, newTodo]);
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      await deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  };

  const handleToggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    try {
      const updated = await updateTodo(id, { completed: !todo.completed });
      setTodos(todos.map(t => (t.id === id ? updated : t)));
    } catch (err) {
      console.error('Error updating todo:', err);
    }
  };

  const filteredTodos = todos.filter(t => {
    if (filter === 'completed') return t.completed;
    if (filter === 'pending') return !t.completed;
    return true;
  });

  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    pending: todos.filter(t => !t.completed).length
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>✓ Todo App</h1>
        <p>Stay organized and productive</p>
      </header>

      <main className="app-main">
        <div className="app-container">
          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{stats.completed}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pending</span>
              <span className="stat-value">{stats.pending}</span>
            </div>
          </div>

          <TodoForm onAddTodo={handleAddTodo} />

          <div className="filters">
            {['all', 'pending', 'completed'].map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading">Loading todos...</div>
          ) : filteredTodos.length === 0 ? (
            <div className="empty">No todos found</div>
          ) : (
            <TodoList
              todos={filteredTodos}
              onDelete={handleDeleteTodo}
              onToggle={handleToggleTodo}
            />
          )}
        </div>
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
  --primary: #4f46e5;
  --success: #10b981;
  --danger: #ef4444;
  --light: #f3f4f6;
  --dark: #1f2937;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--light);
  color: var(--dark);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  color: white;
  padding: 40px 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.app-main {
  flex: 1;
  padding: 40px 20px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.app-container {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: var(--light);
  border-radius: 8px;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--primary);
}

.filters {
  display: flex;
  gap: 10px;
  margin: 20px 0;
}

.filter-btn {
  flex: 1;
  padding: 10px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.filter-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.loading,
.empty {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.app-footer {
  background: var(--dark);
  color: white;
  text-align: center;
  padding: 20px;
  margin-top: auto;
}

@media (max-width: 640px) {
  .app-header h1 {
    font-size: 1.8rem;
  }
  
  .app-container {
    padding: 20px;
  }
}
```

---

## src/components/TodoForm.jsx

```javascript
import React, { useState } from 'react';

function TodoForm({ onAddTodo }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onAddTodo(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="todo-form">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Add a new todo..."
        className="todo-input"
      />
      <button type="submit" className="todo-btn">Add</button>
    </form>
  );
}

export default TodoForm;
```

---

## src/components/TodoList.jsx

```javascript
import React from 'react';
import TodoItem from './TodoItem';

function TodoList({ todos, onDelete, onToggle }) {
  return (
    <ul className="todo-list">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}

export default TodoList;
```

---

## src/components/TodoItem.jsx

```javascript
import React from 'react';

function TodoItem({ todo, onDelete, onToggle }) {
  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="todo-checkbox"
      />
      <span className="todo-text">{todo.title}</span>
      <button
        onClick={() => onDelete(todo.id)}
        className="todo-delete"
      >
        ✕
      </button>
    </li>
  );
}

export default TodoItem;
```

---

## src/services/api.js

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const fetchTodos = async () => {
  try {
    const res = await fetch(`${API_URL}/api/todos`);
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch (err) {
    console.error('Error:', err);
    throw err;
  }
};

export const addTodo = async (title) => {
  const res = await fetch(`${API_URL}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Failed to add');
  return await res.json();
};

export const updateTodo = async (id, updates) => {
  const res = await fetch(`${API_URL}/api/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update');
  return await res.json();
};

export const deleteTodo = async (id) => {
  const res = await fetch(`${API_URL}/api/todos/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete');
  return await res.json();
};
```

---

## package.json

```json
{
  "name": "todo-frontend",
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
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version"]
  }
}
```

---

## .env.example

```env
REACT_APP_API_URL=http://localhost:3001
```

