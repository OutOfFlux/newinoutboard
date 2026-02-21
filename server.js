const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { getDb, initDb } = require('./db');

const { version } = require('./package.json');
const PORT = process.env.PORT || 3000;

// Initialize database
initDb();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SQL helpers
const EMPLOYEE_SELECT = `
  SELECT e.*, v.name as vehicle_name
  FROM employees e
  LEFT JOIN vehicles v ON e.vehicle_id = v.id
`;

// GET /version
app.get('/version', (_req, res) => {
  res.json({ version });
});

// GET /employees — return all employees
app.get('/employees', (req, res) => {
  const db = getDb();
  try {
    const employees = db.prepare(`${EMPLOYEE_SELECT} ORDER BY e.name ASC`).all();
    res.json(employees);
  } finally {
    db.close();
  }
});

// PUT /employees/:id — update any employee fields
app.put('/employees/:id', (req, res) => {
  const { id } = req.params;
  const { name, department, status, comment, estimated_return, vehicle_id } = req.body;

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

      // Clear comment, estimated return, and vehicle when status is set back to IN
      if (status === 'IN') {
        fields.push('comment = @comment');
        values.comment = '';
        fields.push('estimated_return = @estimated_return');
        values.estimated_return = '';
        fields.push('vehicle_id = @vehicle_id');
        values.vehicle_id = null;
      }
    }
    if (comment !== undefined && values.comment === undefined) {
      fields.push('comment = @comment');
      values.comment = comment;
    }
    if (estimated_return !== undefined && values.estimated_return === undefined) {
      fields.push('estimated_return = @estimated_return');
      values.estimated_return = estimated_return;
    }
    if (vehicle_id !== undefined && values.vehicle_id === undefined) {
      fields.push('vehicle_id = @vehicle_id');
      values.vehicle_id = vehicle_id || null;
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

    const employee = db.prepare(`${EMPLOYEE_SELECT} WHERE e.id = ?`).get(Number(id));
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

    const employee = db.prepare(`${EMPLOYEE_SELECT} WHERE e.id = ?`).get(result.lastInsertRowid);
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

// GET /vehicles — return all vehicles
app.get('/vehicles', (req, res) => {
  const db = getDb();
  try {
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY name ASC').all();
    res.json(vehicles);
  } finally {
    db.close();
  }
});

// POST /vehicles — add a new vehicle
app.post('/vehicles', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO vehicles (name) VALUES (?)').run(name.trim());
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
    broadcast({ type: 'vehicle_added', vehicle });
    res.status(201).json(vehicle);
  } finally {
    db.close();
  }
});

// PUT /vehicles/:id — update a vehicle
app.put('/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const db = getDb();
  try {
    const result = db.prepare('UPDATE vehicles SET name = ? WHERE id = ?').run(name.trim(), Number(id));
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(Number(id));
    broadcast({ type: 'vehicle_updated', vehicle });
    res.json(vehicle);
  } finally {
    db.close();
  }
});

// DELETE /vehicles/:id — remove a vehicle
app.delete('/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(Number(id));
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Collect employees using this vehicle before nulling
    const affectedIds = db.prepare('SELECT id FROM employees WHERE vehicle_id = ?').all(Number(id)).map(r => r.id);

    // Release vehicle from any employees
    db.prepare('UPDATE employees SET vehicle_id = NULL WHERE vehicle_id = ?').run(Number(id));
    db.prepare('DELETE FROM vehicles WHERE id = ?').run(Number(id));

    broadcast({ type: 'vehicle_removed', id: Number(id) });

    // Notify clients about employees whose vehicle was cleared
    affectedIds.forEach(empId => {
      const employee = db.prepare(`${EMPLOYEE_SELECT} WHERE e.id = ?`).get(empId);
      if (employee) broadcast({ type: 'employee_updated', employee });
    });

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
    const employees = db.prepare(`${EMPLOYEE_SELECT} ORDER BY e.name ASC`).all();
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY name ASC').all();
    ws.send(JSON.stringify({ type: 'init', employees, vehicles }));
  } finally {
    db.close();
  }
});

server.listen(PORT, () => {
  console.log(`In/Out Board running at http://localhost:${PORT}`);
});
