-- mccPilotLog mirror for plistCSV logbook API (schema: logbook)
CREATE SCHEMA IF NOT EXISTS logbook;

CREATE TABLE IF NOT EXISTS logbook.aircraft (
  aircraft_code INTEGER PRIMARY KEY,
  fin VARCHAR(50),
  reference VARCHAR(50),
  make VARCHAR(100),
  model VARCHAR(100),
  category INTEGER,
  power INTEGER,
  kg5700 INTEGER DEFAULT 0,
  fnpt INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS logbook.flights (
  flight_code INTEGER PRIMARY KEY,
  flight_date TIMESTAMP NOT NULL,
  aircraft_code INTEGER NOT NULL DEFAULT 0,
  dep_code INTEGER DEFAULT 0,
  arr_code INTEGER DEFAULT 0,
  flight_number VARCHAR(10),
  dep_time INTEGER DEFAULT 0,
  arr_time INTEGER DEFAULT 0,
  min_total INTEGER DEFAULT 0,
  min_pic INTEGER DEFAULT 0,
  min_cop INTEGER DEFAULT 0,
  min_dual INTEGER DEFAULT 0,
  min_night INTEGER DEFAULT 0,
  min_ifr INTEGER DEFAULT 0,
  min_xc INTEGER DEFAULT 0,
  to_day INTEGER DEFAULT 0,
  to_night INTEGER DEFAULT 0,
  ldg_day INTEGER DEFAULT 0,
  ldg_night INTEGER DEFAULT 0,
  remarks VARCHAR(1024),
  pairing VARCHAR(12),
  user_n2 VARCHAR(50),
  pf BOOLEAN DEFAULT FALSE,
  min_u1 INTEGER DEFAULT 0,
  min_u2 INTEGER DEFAULT 0,
  min_u3 INTEGER DEFAULT 0,
  min_u4 INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS flights_date_idx ON logbook.flights (flight_date);
CREATE INDEX IF NOT EXISTS flights_pairing_idx ON logbook.flights (pairing) WHERE pairing IS NOT NULL AND pairing <> '';
