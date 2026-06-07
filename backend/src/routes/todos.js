const express = require('express');
const router = express.Router();

let todos = [
  { id: 1, title: 'Learn Kubernetes', completed: false },
  { id: 2, title: 'Setup CI/CD pipeline', completed: true },
  { id: 3, title: 'Deploy application', completed: false }
];

router.get('/', (req, res) => {
  res.json(todos);
});

router.post('/', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  
  const newTodo = {
    id: Math.max(...todos.map(t => t.id), 0) + 1,
    title,
    completed: false
  };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

router.put('/:id', (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id));
  if (!todo) return res.status(404).json({ error: 'Not found' });
  
  if (req.body.title) todo.title = req.body.title;
  if (req.body.completed !== undefined) todo.completed = req.body.completed;
  res.json(todo);
});

router.delete('/:id', (req, res) => {
  const index = todos.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  
  const deleted = todos.splice(index, 1)[0];
  res.json(deleted);
});

module.exports = router;
