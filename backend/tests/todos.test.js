const request = require('supertest');
const app = require('../src/index');

describe('Todo API', () => {
  it('should GET all todos', async () => {
    const res = await request(app).get('/api/todos');
    expect(res.statusCode).toBe(200);
    expect(res.body.todos).toBeDefined();
  });

  it('should POST a new todo', async () => {
    const res = await request(app).post('/api/todos').send({
      title: 'Test todo'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Test todo');
  });

  it('should GET health', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
