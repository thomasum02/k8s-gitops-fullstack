const API_URL = process.env.REACT_APP_API_URL || '';

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
