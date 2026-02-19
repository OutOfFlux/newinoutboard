const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { getDb, initDb } = require('./db');

const PORT = process.env.PORT || 3000;

// Initialize database
initDb();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /employees — return all employees
app.get('/employees', (req, res) => {
  const db = getDb();
  try {
    const employees = db.prepare('SELECT * FROM employees ORDER BY name ASC').all();
    res.json(employees);
  } finally {
    db.close();
  }
});

// PUT /employees/:id — update any employee fields
app.put('/employees/:id', (req, res) => {
  const { id } = req.params;
  const { name, department, status, comment, estimated_return } = req.body;

  const db = getDb();
  try {
    const fields = [];
    const values = {};

    if (name !== undefined) {
      fields.push('name = @name');
      values.name = name;
    }
    if (department !== undefined) {
      fields.push('department = @department');
      values.department = department;
    }
    if (status !== undefined) {
      fields.push('status = @status');
      values.status = status;
    }
    if (comment !== undefined) {
      fields.push('comment = @comment');
      values.comment = comment;
    }
    if (estimated_return !== undefined) {
      fields.push('estimated_return = @estimated_return');
      values.estimated_return = estimated_return;
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push("last_changed = datetime('now')");
    values.id = Number(id);

    const sql = `UPDATE employees SET ${fields.join(', ')} WHERE id = @id`;
    const result = db.prepare(sql).run(values);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(Number(id));
    broadcast({ type: 'employee_updated', employee });
    res.json(employee);
  } finally {
    db.close();
  }
});

// POST /employees — add a new employee
app.post('/employees', (req, res) => {
  const { name, department, status } = req.body;

  if (!name || !department) {
    return res.status(400).json({ error: 'Name and department are required' });
  }

  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO employees (name, department, status, comment, estimated_return, last_changed)
      VALUES (@name, @department, @status, '', '', datetime('now'))
    `).run({ name, department, status: status || 'IN' });

    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
    broadcast({ type: 'employee_added', employee });
    res.status(201).json(employee);
  } finally {
    db.close();
  }
});

// DELETE /employees/:id — remove an employee
app.delete('/employees/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(Number(id));
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    db.prepare('DELETE FROM employees WHERE id = ?').run(Number(id));
    broadcast({ type: 'employee_removed', id: Number(id) });
    res.json({ success: true, id: Number(id) });
  } finally {
    db.close();
  }
});

// Create HTTP server and attach WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  // Send initial data on connect
  const db = getDb();
  try {
    const employees = db.prepare('SELECT * FROM employees ORDER BY name ASC').all();
    ws.send(JSON.stringify({ type: 'init', employees }));
  } finally {
    db.close();
  }
});

server.listen(PORT, () => {
  console.log(`In/Out Board running at http://localhost:${PORT}`);
});
