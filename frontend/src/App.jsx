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