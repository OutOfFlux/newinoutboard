const { getDb, initDb } = require('./db');

initDb();

const db = getDb();

// Clear existing data
db.exec('DELETE FROM employees');
db.exec('DELETE FROM vehicles');

const vehicleList = [
  'X-Wing Starfighter',
  'Millennium Falcon',
  'TIE Fighter',
  'AT-AT Walker',
  'Slave I',
  'Lambda-class Shuttle',
  'Y-Wing Bomber',
  'Snowspeeder',
  'TIE Interceptor',
  'B-Wing Fighter',
];

const insertVehicle = db.prepare('INSERT INTO vehicles (name) VALUES (?)');
const vehicleIds = {};
for (const v of vehicleList) {
  const result = insertVehicle.run(v);
  vehicleIds[v] = result.lastInsertRowid;
}

const V = vehicleIds;

const employees = [
  // Jedi Order
  { name: 'Luke Skywalker', department: 'Jedi Order', status: 'IN', comment: '', estimated_return: '', vehicle_id: V['X-Wing Starfighter'] },
  { name: 'Obi-Wan Kenobi', department: 'Jedi Order', status: 'Away from Desk', comment: 'Grabbing blue milk', estimated_return: '', vehicle_id: V['Lambda-class Shuttle'] },
  { name: 'Mace Windu', department: 'Jedi Order', status: 'In Meeting', comment: 'High Council session', estimated_return: '10:30 AM', vehicle_id: null },
  { name: 'Ahsoka Tano', department: 'Jedi Order', status: 'Working Remotely', comment: 'Available on hologram', estimated_return: '', vehicle_id: V['Y-Wing Bomber'] },
  { name: 'Yoda', department: 'Jedi Order', status: 'PTO', comment: 'Meditating on Dagobah', estimated_return: '2026-02-24', vehicle_id: null },
  { name: 'Kit Fisto', department: 'Jedi Order', status: 'IN', comment: '', estimated_return: '', vehicle_id: V['X-Wing Starfighter'] },
  { name: 'Plo Koon', department: 'Jedi Order', status: 'At Lunch', comment: '', estimated_return: '1:00 PM', vehicle_id: V['Y-Wing Bomber'] },

  // Sith Affairs
  { name: 'Darth Vader', department: 'Sith Affairs', status: 'IN', comment: 'At desk, breathing loudly', estimated_return: '', vehicle_id: V['TIE Fighter'] },
  { name: 'Emperor Palpatine', department: 'Sith Affairs', status: 'OUT', comment: 'Senate visit', estimated_return: '3:00 PM', vehicle_id: V['Lambda-class Shuttle'] },
  { name: 'Count Dooku', department: 'Sith Affairs', status: 'In Meeting', comment: 'Separatist review', estimated_return: '11:00 AM', vehicle_id: null },
  { name: 'Darth Maul', department: 'Sith Affairs', status: 'On Break', comment: '', estimated_return: '', vehicle_id: V['TIE Interceptor'] },
  { name: 'Asajj Ventress', department: 'Sith Affairs', status: 'IN', comment: '', estimated_return: '', vehicle_id: V['TIE Fighter'] },
  { name: 'Grand Moff Tarkin', department: 'Sith Affairs', status: 'Sick', comment: 'Out today', estimated_return: '2026-02-18', vehicle_id: V['AT-AT Walker'] },

  // Rebel Operations
  { name: 'Han Solo', department: 'Rebel Operations', status: 'IN', comment: '', estimated_return: '', vehicle_id: V['Millennium Falcon'] },
  { name: 'Princess Leia', department: 'Rebel Operations', status: 'IN', comment: '', estimated_return: '', vehicle_id: null },
  { name: 'Lando Calrissian', department: 'Rebel Operations', status: 'Away from Desk', comment: 'Cloud City errands', estimated_return: '', vehicle_id: V['Millennium Falcon'] },
  { name: 'Wedge Antilles', department: 'Rebel Operations', status: 'At Lunch', comment: '', estimated_return: '12:30 PM', vehicle_id: V['X-Wing Starfighter'] },
  { name: 'Mon Mothma', department: 'Rebel Operations', status: 'PTO', comment: 'Family leave', estimated_return: '2026-03-03', vehicle_id: null },
  { name: 'Chewbacca', department: 'Rebel Operations', status: 'IN', comment: 'Front desk', estimated_return: '', vehicle_id: V['Millennium Falcon'] },
  { name: 'Admiral Ackbar', department: 'Rebel Operations', status: 'Working Remotely', comment: 'Reachable by holonet', estimated_return: '', vehicle_id: V['B-Wing Fighter'] },
];

const insert = db.prepare(`
  INSERT INTO employees (name, department, status, comment, estimated_return, last_changed, vehicle_id)
  VALUES (@name, @department, @status, @comment, @estimated_return, datetime('now'), @vehicle_id)
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    insert.run(row);
  }
});

insertMany(employees);

console.log(`Seeded ${vehicleList.length} vehicles and ${employees.length} employees.`);
db.close();
