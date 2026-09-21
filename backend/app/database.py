import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DATA_FILE = Path(os.getenv("DEMO_DB_PATH", Path(__file__).parents[1] / "unisphere.db"))

SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS campuses (id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, city TEXT NOT NULL, db_type TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, campus_id INTEGER, student_id INTEGER);
CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY, roll_no TEXT NOT NULL CONSTRAINT uq_students_roll_no UNIQUE, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, campus_id INTEGER NOT NULL, department TEXT NOT NULL, year INTEGER NOT NULL, attendance REAL NOT NULL DEFAULT 100, cgpa REAL NOT NULL DEFAULT 0, credits_completed INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, FOREIGN KEY(campus_id) REFERENCES campuses(id));
CREATE TABLE IF NOT EXISTS faculty (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, campus_id INTEGER NOT NULL, department TEXT NOT NULL, FOREIGN KEY(campus_id) REFERENCES campuses(id));
CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, department TEXT NOT NULL, credits INTEGER NOT NULL, campus_id INTEGER NOT NULL, faculty_id INTEGER, FOREIGN KEY(campus_id) REFERENCES campuses(id), FOREIGN KEY(faculty_id) REFERENCES faculty(id));
CREATE TABLE IF NOT EXISTS enrollments (id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL, course_id INTEGER NOT NULL, semester TEXT NOT NULL, grade TEXT, score REAL, enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(student_id, course_id, semester), FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(course_id) REFERENCES courses(id));
CREATE TABLE IF NOT EXISTS prerequisites (course_id INTEGER NOT NULL, prerequisite_id INTEGER NOT NULL, PRIMARY KEY(course_id, prerequisite_id));
CREATE TABLE IF NOT EXISTS sync_events (id INTEGER PRIMARY KEY, source TEXT NOT NULL, entity TEXT NOT NULL, entity_id INTEGER NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'info', read_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS academic_history (id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL, year INTEGER NOT NULL, semester TEXT NOT NULL, gpa REAL NOT NULL, attendance REAL NOT NULL, credits_completed INTEGER NOT NULL, projects_completed INTEGER NOT NULL DEFAULT 0, remarks TEXT, FOREIGN KEY(student_id) REFERENCES students(id));
"""

@contextmanager
def connection():
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATA_FILE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def bootstrap():
    with connection() as db:
        db.executescript(SCHEMA)
        if db.execute("SELECT count(*) FROM campuses").fetchone()[0]:
            return
        db.executemany("INSERT INTO campuses(id,code,name,city,db_type) VALUES(?,?,?,?,?)", [
          (1,'PUN','Pune Institute of Technology','Pune','PostgreSQL'), (2,'MUM','Mumbai School of Engineering','Mumbai','MySQL'), (3,'BLR','Bengaluru Digital Campus','Bengaluru','PostgreSQL')])
        db.executemany("INSERT INTO faculty(id,name,email,campus_id,department) VALUES(?,?,?,?,?)", [
          (1,'Dr. Anika Rao','anika.rao@unisphere.edu',1,'Computer Science'),(2,'Prof. Kunal Mehta','kunal.mehta@unisphere.edu',2,'Computer Science'),(3,'Dr. Neha Iyer','neha.iyer@unisphere.edu',3,'Data Science')])
        db.executemany("INSERT INTO students(id,roll_no,first_name,last_name,email,campus_id,department,year,attendance,cgpa,credits_completed) VALUES(?,?,?,?,?,?,?,?,?,?,?)", [
          (1,'PUN-CS-001','Aarav','Shah','aarav.shah@unisphere.edu',1,'Computer Science',4,68,6.1,102),
          (2,'PUN-CS-002','Diya','Patel','diya.patel@unisphere.edu',1,'Computer Science',3,91,8.5,76),
          (3,'MUM-CS-003','Kabir','Singh','kabir.singh@unisphere.edu',2,'Computer Science',2,72,7.0,42),
          (4,'BLR-DS-004','Meera','Nair','meera.nair@unisphere.edu',3,'Data Science',4,96,9.1,112),
          (5,'MUM-CS-005','Rohan','Das','rohan.das@unisphere.edu',2,'Computer Science',3,59,5.7,63),
          (6,'BLR-DS-006','Sara','Khan','sara.khan@unisphere.edu',3,'Data Science',2,84,7.7,38),
          (7,'PUN-EE-007','Ishaan','Patil','ishaan.patil@unisphere.edu',1,'Electrical',3,82,8.2,70),
          (8,'PUN-CS-008','Ananya','Verma','ananya.verma@unisphere.edu',1,'Computer Science',1,95,9.0,24),
          (9,'MUM-CS-009','Vedant','Vashisht','vedant.v@unisphere.edu',2,'Computer Science',4,62,6.1,98),
          (10,'MUM-EE-010','Vikram','Joshi','vikram.j@unisphere.edu',2,'Electrical',2,88,7.8,48),
          (11,'BLR-DS-011','Priya','Kulkarni','priya.k@unisphere.edu',3,'Data Science',3,90,8.8,74),
          (12,'BLR-CS-012','Aditya','Sharma','aditya.s@unisphere.edu',3,'Computer Science',2,78,7.2,50)
        ])
        db.executemany("INSERT INTO courses(id,code,title,description,department,credits,campus_id,faculty_id) VALUES(?,?,?,?,?,?,?,?)", [
          (1,'CS101','Programming Foundations','Core programming, algorithms and problem solving.','Computer Science',4,1,1),(2,'CS201','Database Systems','Relational design, transactions, indexing and distributed data.','Computer Science',4,1,1),(3,'CS301','Distributed Systems','Replication, consistency, streams and resilient systems.','Computer Science',4,2,2),(4,'DS210','Applied Machine Learning','Supervised learning and explainable prediction.','Data Science',4,3,3),(5,'DS310','Graph Analytics','Graph modeling and network analysis with Neo4j.','Data Science',3,3,3)])
        db.executemany("INSERT INTO enrollments(student_id,course_id,semester,grade,score) VALUES(?,?,?,?,?)", [(1,2,'Sem 5','C',61),(1,3,'Sem 5',None,None),(2,1,'Sem 5','A',89),(2,2,'Sem 5','A',92),(3,3,'Sem 3','B',75),(4,4,'Sem 7','A',94),(4,5,'Sem 7','A',91),(5,3,'Sem 5','D',53),(6,4,'Sem 3','B',79)])
        db.executemany("INSERT INTO prerequisites(course_id,prerequisite_id) VALUES(?,?)", [(2,1),(3,2),(5,4)])
        db.executemany("INSERT INTO users(id,email,password,name,role,campus_id,student_id) VALUES(?,?,?,?,?,?,?)", [(1,'admin@unisphere.edu','admin123','System Administrator','super-admin',None,None),(2,'faculty@unisphere.edu','faculty123','Dr. Anika Rao','faculty',1,None),(3,'student@unisphere.edu','student123','Aarav Shah','student',1,1)])

def rows(query, values=()):
    with connection() as db:
        return [dict(r) for r in db.execute(query, values).fetchall()]

def one(query, values=()):
    result = rows(query, values)
    return result[0] if result else None

def execute(query, values=()):
    with connection() as db:
        cursor = db.execute(query, values)
        return cursor.lastrowid

def notify_student(student_id, title, message, kind='info'):
    account = one('SELECT id FROM users WHERE student_id=?', (student_id,))
    if account:
        execute('INSERT INTO notifications(user_id,title,message,kind) VALUES(?,?,?,?)', (account['id'], title, message, kind))
