import Database from 'better-sqlite3';
import path from 'path';

// open the database file (better-sqlite3 creates it if it doesn't exist)
const dbPath = path.join(process.cwd(), 'main.db');
const db = new Database(dbPath);

//Enable foreign key constraints
db.exec('PRAGMA foreign_keys = ON;');

/*------------------------------------------------
  User table

  password
    ->  stores hashed passwords
-------------------------------------------------*/
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT
  )
`);

/*------------------------------------------------
  Trip table

  startDate and endDate 
    ->  YYYY-MM-DD format (ISO 8601)
-------------------------------------------------*/
db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    destination TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
  )
`);

/*------------------------------------------------
  Day Memo table

  date
    ->  YYYY-MM-DD format (ISO 8601)
-------------------------------------------------*/
db.exec(`
  CREATE TABLE IF NOT EXISTS day_memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tripId INTEGER NOT NULL,
    date TEXT NOT NULL,
    memo TEXT,
    UNIQUE(tripId, date),
    FOREIGN KEY (tripId) REFERENCES trips (id) ON DELETE CASCADE
  )
`);


/*------------------------------------------------
  Activities table

  date
    ->  YYYY-MM-DD format (ISO 8601)

  startTime and endTime
    -> HH:MM
-------------------------------------------------*/
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tripId INTEGER NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    address TEXT,
    category TEXT NOT NULL DEFAULT 'sightseeing',
    memo TEXT,
    lat REAL,
    lon REAL,
    FOREIGN KEY (tripId) REFERENCES trips (id) ON DELETE CASCADE
  )
`);

/*------------------------------------------------
  Accommodations table 

  checkinDate and checkoutDate
    ->  YYYY-MM-DD format (ISO 8601)

  checkinTime and checkoutTime
    -> HH:MM
-------------------------------------------------*/
db.exec(`
  CREATE TABLE IF NOT EXISTS accommodations(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tripId INTEGER NOT NULL,
    title TEXT NOT NULL,
    checkinDate TEXT NOT NULL,
    checkinTime TEXT NOT NULL,
    checkoutDate TEXT NOT NULL,
    checkoutTime TEXT NOT NULL,
    address TEXT,
    lat REAL,
    lon REAL,
    memo TEXT,
    FOREIGN KEY (tripId) REFERENCES trips (id) ON DELETE CASCADE
  )
`)

/*------------------------------------------------
  Indexes

  Created after every table exists so that a fresh
  database can build them without "no such table" errors.
-------------------------------------------------*/
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_trips_userId ON trips(userId);
  CREATE INDEX IF NOT EXISTS idx_activities_tripId_date ON activities(tripId, date);
  CREATE INDEX IF NOT EXISTS idx_accommodations_tripId ON accommodations(tripId);
`);

export default db;