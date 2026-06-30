-- Database schema for travel-planner (Turso / libSQL, SQLite-compatible).
-- Apply with: npm run db:migrate
--
-- Dates are stored as TEXT in ISO 8601 (YYYY-MM-DD); times as HH:MM.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,   -- stores hashed passwords
  name TEXT
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  destination TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS day_memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tripId INTEGER NOT NULL,
  date TEXT NOT NULL,
  memo TEXT,
  UNIQUE(tripId, date),
  FOREIGN KEY (tripId) REFERENCES trips (id) ON DELETE CASCADE
);

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
);

CREATE TABLE IF NOT EXISTS accommodations (
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
);

CREATE INDEX IF NOT EXISTS idx_trips_userId ON trips(userId);
CREATE INDEX IF NOT EXISTS idx_activities_tripId_date ON activities(tripId, date);
CREATE INDEX IF NOT EXISTS idx_accommodations_tripId ON accommodations(tripId);
