const { getDb, initDb } = require('./db');

initDb();

const db = getDb();

// Clear existing data
db.exec('DELETE FROM employees');

const employees = [
  // Engineering
  { name: 'Alice Johnson', department: 'Engineering', status: 'IN', comment: '', estimated_return: '' },
  { name: 'Bob Smith', department: 'Engineering', status: 'Away from Desk', comment: 'Grabbing coffee', estimated_return: '' },
  { name: 'Carlos Rivera', department: 'Engineering', status: 'In Meeting', comment: 'Sprint planning', estimated_return: '10:30 AM' },
  { name: 'Diana Chen', department: 'Engineering', status: 'Working Remotely', comment: 'Available on Slack', estimated_return: '' },
  { name: 'Ethan Williams', department: 'Engineering', status: 'PTO', comment: 'Vacation', estimated_return: '2026-02-24' },
  { name: 'Fiona Park', department: 'Engineering', status: 'IN', comment: '', estimated_return: '' },
  { name: 'Greg Tanaka', department: 'Engineering', status: 'At Lunch', comment: '', estimated_return: '1:00 PM' },

  // Sales
  { name: 'Hannah Lee', department: 'Sales', status: 'IN', comment: 'At desk', estimated_return: '' },
  { name: 'Ian Foster', department: 'Sales', status: 'OUT', comment: 'Client visit', estimated_return: '3:00 PM' },
  { name: 'Julia Martinez', department: 'Sales', status: 'In Meeting', comment: 'Quarterly review', estimated_return: '11:00 AM' },
  { name: 'Kevin Brooks', department: 'Sales', status: 'On Break', comment: '', estimated_return: '' },
  { name: 'Laura Kim', department: 'Sales', status: 'IN', comment: '', estimated_return: '' },
  { name: 'Mike O\'Brien', department: 'Sales', status: 'Sick', comment: 'Out today', estimated_return: '2026-02-18' },

  // Operations
  { name: 'Nina Patel', department: 'Operations', status: 'IN', comment: '', estimated_return: '' },
  { name: 'Oscar Davis', department: 'Operations', status: 'IN', comment: '', estimated_return: '' },
  { name: 'Priya Sharma', department: 'Operations', status: 'Away from Desk', comment: 'Mail room', estimated_return: '' },
  { name: 'Quinn Murphy', department: 'Operations', status: 'At Lunch', comment: '', estimated_return: '12:30 PM' },
  { name: 'Rachel Wong', department: 'Operations', status: 'PTO', comment: 'Family leave', estimated_return: '2026-03-03' },
  { name: 'Sam Turner', department: 'Operations', status: 'IN', comment: 'Front desk', estimated_return: '' },
  { name: 'Tina Gonzalez', department: 'Operations', status: 'Working Remotely', comment: 'Reachable by email', estimated_return: '' },
];

const insert = db.prepare(`
  INSERT INTO employees (name, department, status, comment, estimated_return, last_changed)
  VALUES (@name, @department, @status, @comment, @estimated_return, datetime('now'))
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    insert.run(row);
  }
});

insertMany(employees);

console.log(`Seeded ${employees.length} employees.`);
db.close();
