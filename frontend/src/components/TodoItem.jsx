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