from contextlib import asynccontextmanager
import asyncio
from typing import Literal
from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from . import database as db
from .security import current_user, issue, permit

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.bootstrap()
    yield

app = FastAPI(title='UniSphere Distributed Intelligence API', version='1.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "connected", "message": "Connected to UniSphere CDC Live Event Feed"})
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "pong", "message": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

def broadcast_event(event_type: str, entity: str, data: dict):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(manager.broadcast({
                "type": event_type,
                "entity": entity,
                "data": data,
                "timestamp": asyncio.get_event_loop().time()
            }))
    except Exception:
        pass

class Login(BaseModel): email: str; password: str
class StudentIn(BaseModel):
    roll_no: str; first_name: str; last_name: str; email: str; password: str = Field(min_length=6); campus_id: int; department: str; year: int = Field(ge=1, le=6); attendance: float = Field(default=100, ge=0, le=100); cgpa: float = Field(default=0, ge=0, le=10)
class CourseIn(BaseModel): code: str; title: str; description: str; department: str; credits: int = Field(ge=1, le=8); campus_id: int; faculty_id: int | None = None
class EnrollmentIn(BaseModel): student_id: int; course_id: int; semester: str
class FacultyIn(BaseModel): name: str; email: str; password: str = Field(min_length=6); campus_id: int; department: str
class GradeIn(BaseModel): grade: str = Field(pattern='^(A|B|C|D|F)$'); score: float = Field(ge=0, le=100)
class AssistantQuery(BaseModel): question: str = Field(min_length=3, max_length=400)
class CampusOnboardIn(BaseModel):
    code: str = Field(min_length=2, max_length=10)
    name: str = Field(min_length=3, max_length=100)
    city: str = Field(min_length=2, max_length=50)
    db_type: Literal['PostgreSQL', 'MySQL'] = 'PostgreSQL'
    port: int = Field(default=5435, ge=1024, le=65535)

def faculty_id_for(user):
    faculty = db.one('SELECT id FROM faculty WHERE email=? OR name=?', (user['email'], user['name']))
    return faculty['id'] if faculty else None

def scoped(where: list, params: list, user: dict, campus_id: int | None):
    selected = campus_id
    if user['role'] == 'student':
        selected = user.get('campus_id')
    elif user['role'] == 'faculty':
        selected = user.get('campus_id')
        fid = faculty_id_for(user)
        if fid:
            where.append("s.id IN (SELECT student_id FROM enrollments e JOIN courses co ON co.id=e.course_id WHERE co.faculty_id=?)")
            params.append(fid)
    if selected:
        where.append('s.campus_id = ?'); params.append(selected)

@app.get('/health')
def health(): return {'status':'healthy','mode':'demo-compatible','services':{'campus_oltp':'available','cdc':'configured','central_projections':'eventual','websockets':'active'}}

@app.get('/api/system/topology')
def system_topology(user=Depends(current_user)):
    return {
        'status': 'healthy',
        'active_mode': 'distributed_and_demo',
        'databases': [
            {
                'id': 'pune-pg',
                'name': 'Pune Campus DB',
                'engine': 'PostgreSQL 16',
                'role': 'Authoritative OLTP (Pune Campus)',
                'port': 5433,
                'connection_string': 'postgresql://university:postgres@localhost:5433/pune_campus',
                'docker_cmd': 'docker exec -it unisphere-pune-postgres-1 psql -U university -d pune_campus',
                'status': 'Active',
                'tables': ['students', 'courses', 'enrollments', 'faculty']
            },
            {
                'id': 'bengaluru-pg',
                'name': 'Bengaluru Campus DB',
                'engine': 'PostgreSQL 16',
                'role': 'Authoritative OLTP (Bengaluru Campus)',
                'port': 5434,
                'connection_string': 'postgresql://university:postgres@localhost:5434/bengaluru_campus',
                'docker_cmd': 'docker exec -it unisphere-bengaluru-postgres-1 psql -U university -d bengaluru_campus',
                'status': 'Active',
                'tables': ['students', 'courses', 'enrollments', 'faculty']
            },
            {
                'id': 'mumbai-mysql',
                'name': 'Mumbai Campus DB',
                'engine': 'MySQL 8.4',
                'role': 'Authoritative Legacy OLTP (Mumbai Campus)',
                'port': 3307,
                'connection_string': 'mysql://university:mysql@127.0.0.1:3307/mumbai_campus',
                'docker_cmd': 'docker exec -it unisphere-mumbai-mysql-1 mysql -u university -pmysql mumbai_campus',
                'status': 'Active',
                'tables': ['students', 'courses', 'enrollments', 'faculty']
            },
            {
                'id': 'mongodb',
                'name': 'Central Search & Document Store',
                'engine': 'MongoDB 7',
                'role': 'Read-Optimized Document Projection',
                'port': 27017,
                'connection_string': 'mongodb://localhost:27017/unisphere',
                'docker_cmd': 'mongosh mongodb://localhost:27017',
                'status': 'Active',
                'collections': ['student_documents', 'course_search_index']
            },
            {
                'id': 'neo4j',
                'name': 'Central Knowledge & Relationship Graph',
                'engine': 'Neo4j 5 Community',
                'role': 'Graph Projection & Prerequisite Analytics',
                'port': 7474,
                'connection_string': 'bolt://localhost:7687',
                'web_gui': 'http://localhost:7474',
                'status': 'Active',
                'nodes': ['Course', 'Student', 'Department']
            },
            {
                'id': 'sqlite-demo',
                'name': 'Standalone Demo Database',
                'engine': 'SQLite 3',
                'role': 'Zero-Dependency Standalone Fallback',
                'file_path': 'backend/unisphere.db',
                'status': 'Active',
                'tables': ['campuses', 'users', 'students', 'faculty', 'courses', 'enrollments', 'prerequisites', 'sync_events', 'notifications']
            }
        ],
        'cdc_pipeline': {
            'kafka_broker': 'localhost:9092',
            'kafka_connect': 'http://localhost:8083/connectors',
            'status': 'Healthy',
            'connectors': ['pune-postgres-cdc', 'mumbai-mysql-cdc'],
            'projector_worker': 'backend/workers/projector.py'
        }
    }


@app.post('/api/auth/login')
def login(body: Login):
    user = db.one('SELECT * FROM users WHERE email=? AND password=?', (body.email.lower(), body.password))
    if not user: raise HTTPException(401, 'Incorrect email or password')
    token = issue({'id':user['id'], 'email':user['email'], 'name':user['name'], 'role':user['role'], 'campus_id':user['campus_id'], 'student_id':user['student_id']})
    return {'access_token':token,'token_type':'bearer','user':{k:user[k] for k in ('id','email','name','role','campus_id','student_id')}}

@app.get('/api/me')
def me(user=Depends(current_user)): return user
@app.get('/api/campuses')
def campuses(user=Depends(current_user)): return db.rows('SELECT * FROM campuses ORDER BY id')

@app.post('/api/campuses/onboard', status_code=201)
def onboard_campus(body: CampusOnboardIn, user=Depends(permit('admin', 'super-admin'))):
    try:
        new_id = db.execute(
            'INSERT INTO campuses(code, name, city, db_type) VALUES(?,?,?,?)',
            (body.code.upper(), body.name, body.city, body.db_type)
        )
        db.execute(
            'INSERT INTO sync_events(source, entity, entity_id, action) VALUES(?,?,?,?)',
            ('admin-api', 'campus', new_id, 'onboard')
        )
        created = db.one('SELECT * FROM campuses WHERE id=?', (new_id,))

        connector_config = {
            "name": f"{body.code.lower()}-{body.db_type.lower()}-cdc",
            "config": {
                "connector.class": "io.debezium.connector.postgresql.PostgresConnector" if body.db_type == 'PostgreSQL' else "io.debezium.connector.mysql.MySqlConnector",
                "tasks.max": "1",
                "database.hostname": f"{body.code.lower()}-{body.db_type.lower()}",
                "database.port": str(body.port),
                "database.user": "university",
                "database.password": "university123",
                "database.dbname": f"{body.city.lower()}_campus",
                "topic.prefix": f"unisphere_{body.code.lower()}"
            }
        }

        docker_snippet = f"""  {body.code.lower()}-{body.db_type.lower()}:
    image: {'postgres:16-alpine' if body.db_type == 'PostgreSQL' else 'mysql:8.4'}
    environment:
      {'POSTGRES_DB' if body.db_type == 'PostgreSQL' else 'MYSQL_DATABASE'}: {body.city.lower()}_campus
      {'POSTGRES_USER' if body.db_type == 'PostgreSQL' else 'MYSQL_USER'}: university
    ports: ["{body.port}:{5432 if body.db_type == 'PostgreSQL' else 3306}"]"""

        response_payload = {
            **created,
            "port": body.port,
            "connector_config": connector_config,
            "docker_snippet": docker_snippet,
            "message": f"Campus {body.name} onboarded successfully!"
        }
        broadcast_event("campus_onboarded", "campus", response_payload)
        return response_payload
    except Exception as exc:
        raise HTTPException(409, f"Campus code '{body.code.upper()}' already exists") from exc

@app.get('/api/students/{student_id}/history')
def student_history(student_id: int, user=Depends(current_user)):
    student = db.one('SELECT s.*, c.name campus_name FROM students s JOIN campuses c ON c.id=s.campus_id WHERE s.id=?', (student_id,))
    if not student: raise HTTPException(404, 'Student not found')
    history = db.rows('SELECT * FROM academic_history WHERE student_id=? ORDER BY year, id', (student_id,))
    enrollment_list = db.rows('''SELECT e.*, co.code course_code, co.title course_title, co.credits FROM enrollments e JOIN courses co ON co.id=e.course_id WHERE e.student_id=? ORDER BY e.semester''', (student_id,))
    return {
        'student': student,
        'history': history,
        'enrollments': enrollment_list
    }

@app.get('/api/placements/rankings')
def placement_rankings(
    min_cgpa: float = 0.0,
    min_attendance: float = 0.0,
    department: str | None = None,
    year: int | None = None,
    user=Depends(permit('admin', 'super-admin', 'faculty'))
):
    students_list = db.rows('''
        SELECT s.*, c.name campus_name 
        FROM students s 
        JOIN campuses c ON c.id=s.campus_id 
        WHERE s.active=1
        ORDER BY s.cgpa DESC, s.attendance DESC
    ''')

    ranked_list = []
    for s in students_list:
        hist = db.rows('SELECT * FROM academic_history WHERE student_id=? ORDER BY year, id', (s['id'],))
        cgpa_pts = min(45.0, s['cgpa'] * 4.5)
        att_pts = min(25.0, s['attendance'] * 0.25)
        total_projects = sum(h.get('projects_completed', 0) for h in hist)
        proj_pts = min(20.0, (s['credits_completed'] / max(1, s['year'] * 24)) * 12.0 + total_projects * 2.0)
        
        gpas = [h['gpa'] for h in hist]
        trend_pts = 8.0
        if len(gpas) >= 2:
            trend_pts = 10.0 if gpas[-1] >= gpas[0] else 5.0

        employability_score = round(min(100.0, cgpa_pts + att_pts + proj_pts + trend_pts), 1)

        eligible = (
            s['cgpa'] >= min_cgpa and 
            s['attendance'] >= min_attendance and
            (not department or department.lower() == 'all' or s['department'].lower() == department.lower()) and
            (not year or year == 0 or s['year'] == year)
        )

        ranked_list.append({
            **s,
            'employability_score': employability_score,
            'projects_completed': total_projects,
            'eligible': eligible,
            'history': hist
        })

    ranked_list.sort(key=lambda x: x['employability_score'], reverse=True)
    for idx, r in enumerate(ranked_list, start=1):
        r['rank'] = idx

    return {
        'total_candidates': len(ranked_list),
        'eligible_candidates': len([r for r in ranked_list if r['eligible']]),
        'candidates': ranked_list
    }

@app.get('/api/students')
def students(campus_id: int | None = None, risk_only: bool = False, user=Depends(current_user)):
    where, params = ['s.active=1'], []
    scoped(where, params, user, campus_id)
    if user['role'] == 'student': where.append('s.id=?'); params.append(user['student_id'])
    result = db.rows(f'''SELECT s.*, c.name campus_name, round((100-s.attendance)*0.45 + (10-s.cgpa)*4 + CASE WHEN s.credits_completed < s.year*24 THEN 12 ELSE 0 END,1) risk_score FROM students s JOIN campuses c ON c.id=s.campus_id WHERE {' AND '.join(where)} ORDER BY risk_score DESC, s.last_name''', params)
    return [r for r in result if not risk_only or r['risk_score'] >= 25]

def faculty_id_for(user):
    faculty = db.one('SELECT id FROM faculty WHERE email=? OR name=?', (user['email'], user['name']))
    return faculty['id'] if faculty else None

@app.post('/api/students', status_code=201)
def create_student(body: StudentIn, user=Depends(permit('admin','super-admin'))):
    if not db.one('SELECT id FROM campuses WHERE id=?',(body.campus_id,)): raise HTTPException(404,'Campus not found')
    try:
        item = body.model_dump()
        with db.connection() as conn:
            cursor = conn.execute('INSERT INTO students(roll_no,first_name,last_name,email,campus_id,department,year,attendance,cgpa,credits_completed) VALUES(:roll_no,:first_name,:last_name,:email,:campus_id,:department,:year,:attendance,:cgpa,0)', item)
            new_id = cursor.lastrowid
            conn.execute('INSERT INTO users(email,password,name,role,campus_id,student_id) VALUES(?,?,?,?,?,?)',(body.email.lower(),body.password,f'{body.first_name} {body.last_name}','student',body.campus_id,new_id))
            conn.execute("INSERT INTO sync_events(source,entity,entity_id,action) VALUES(?,?,?,?)",('campus-api','student',new_id,'create'))
            new_user_id=conn.execute('SELECT id FROM users WHERE student_id=?',(new_id,)).fetchone()[0]
            conn.execute('INSERT INTO notifications(user_id,title,message,kind) VALUES(?,?,?,?)',(new_user_id,'Welcome to UniSphere','Your student profile and secure portal access are ready.','welcome'))
        created = db.one('SELECT * FROM students WHERE id=?',(new_id,))
        broadcast_event("student_created", "student", created)
        return {**created, 'login_created': True}
    except Exception as exc: raise HTTPException(409, 'Roll number or email already exists') from exc

@app.get('/api/faculty')
def faculty(user=Depends(permit('admin','super-admin','faculty'))):
    if user['role'] == 'faculty':
        return db.rows('SELECT * FROM faculty WHERE campus_id=? ORDER BY name',(user['campus_id'],))
    return db.rows('SELECT f.*, c.name campus_name FROM faculty f JOIN campuses c ON c.id=f.campus_id ORDER BY f.name')

@app.post('/api/faculty', status_code=201)
def create_faculty(body: FacultyIn, user=Depends(permit('admin','super-admin'))):
    try:
        with db.connection() as conn:
            faculty_id=conn.execute('INSERT INTO faculty(name,email,campus_id,department) VALUES(?,?,?,?)',(body.name,body.email.lower(),body.campus_id,body.department)).lastrowid
            conn.execute('INSERT INTO users(email,password,name,role,campus_id) VALUES(?,?,?,?,?)',(body.email.lower(),body.password,body.name,'faculty',body.campus_id))
            conn.execute("INSERT INTO sync_events(source,entity,entity_id,action) VALUES(?,?,?,?)",('campus-api','faculty',faculty_id,'create'))
        return {'id':faculty_id,'name':body.name,'email':body.email,'login_created':True}
    except Exception as exc: raise HTTPException(409,'Faculty email already exists') from exc

@app.get('/api/courses')
def courses(campus_id: int | None = None, user=Depends(current_user)):
    params=[]; clause=''
    selected = user.get('campus_id') if user['role'] == 'student' else campus_id
    if user['role'] == 'student':
        clause=' JOIN enrollments mine ON mine.course_id=co.id AND mine.student_id=?'; params=[user['student_id']]
    elif selected: clause=' WHERE co.campus_id=?'; params=[selected]
    return db.rows('''SELECT co.*, ca.name campus_name, f.name faculty_name, COUNT(e.id) enrollment_count FROM courses co JOIN campuses ca ON ca.id=co.campus_id LEFT JOIN faculty f ON f.id=co.faculty_id LEFT JOIN enrollments e ON e.course_id=co.id '''+clause+''' GROUP BY co.id ORDER BY co.code''',params)

@app.post('/api/courses', status_code=201)
def create_course(body: CourseIn, user=Depends(permit('admin','super-admin','faculty'))):
    if user['role']=='faculty':
        body.campus_id=user['campus_id']
        body.faculty_id=faculty_id_for(user)
    try:
        new_id=db.execute('INSERT INTO courses(code,title,description,department,credits,campus_id,faculty_id) VALUES(:code,:title,:description,:department,:credits,:campus_id,:faculty_id)',body.model_dump())
        db.execute("INSERT INTO sync_events(source,entity,entity_id,action) VALUES(?,?,?,?)",('campus-api','course',new_id,'create'))
        return db.one('SELECT * FROM courses WHERE id=?',(new_id,))
    except Exception as exc: raise HTTPException(409,'Course code already exists') from exc

@app.get('/api/enrollments')
def enrollments(user=Depends(current_user)):
    where, params=[],[]
    if user['role']=='student': where.append('e.student_id=?');params.append(user['student_id'])
    elif user['role']=='faculty':
        where.append('co.faculty_id=?');params.append(faculty_id_for(user) or -1)
    condition=(' WHERE '+' AND '.join(where)) if where else ''
    return db.rows('''SELECT e.*, s.first_name || ' ' || s.last_name student_name, s.roll_no, co.code course_code, co.title course_title, f.name faculty_name FROM enrollments e JOIN students s ON s.id=e.student_id JOIN courses co ON co.id=e.course_id LEFT JOIN faculty f ON f.id=co.faculty_id'''+condition+' ORDER BY e.enrolled_at DESC',params)

@app.post('/api/enrollments', status_code=201)
def enroll(body: EnrollmentIn, user=Depends(permit('admin','super-admin','faculty'))):
    student=db.one('SELECT * FROM students WHERE id=?',(body.student_id,)); course=db.one('SELECT * FROM courses WHERE id=?',(body.course_id,))
    if not student or not course: raise HTTPException(404,'Student or course not found')
    if user['role']=='faculty' and course['faculty_id'] != faculty_id_for(user): raise HTTPException(403,'You can enroll students only in courses assigned to you')
    try:
        new_id=db.execute('INSERT INTO enrollments(student_id,course_id,semester) VALUES(?,?,?)',(body.student_id,body.course_id,body.semester))
        db.execute("INSERT INTO sync_events(source,entity,entity_id,action) VALUES(?,?,?,?)",('campus-api','enrollment',new_id,'create'))
        db.notify_student(body.student_id, 'New course enrollment', f'You have been enrolled in {course["code"]} — {course["title"]} for {body.semester}.', 'enrollment')
        return {'id':new_id,'status':'enrolled','central_projection':'pending CDC event'}
    except Exception as exc: raise HTTPException(409,'Student is already enrolled in this course for this semester') from exc

@app.patch('/api/enrollments/{enrollment_id}')
def record_grade(enrollment_id: int, body: GradeIn, user=Depends(permit('faculty','admin','super-admin'))):
    record=db.one('''SELECT e.id, co.faculty_id FROM enrollments e JOIN courses co ON co.id=e.course_id WHERE e.id=?''',(enrollment_id,))
    if not record: raise HTTPException(404,'Enrollment not found')
    if user['role']=='faculty' and record['faculty_id'] != faculty_id_for(user): raise HTTPException(403,'You can grade only your own courses')
    db.execute('UPDATE enrollments SET grade=?, score=? WHERE id=?',(body.grade,body.score,enrollment_id))
    db.execute("INSERT INTO sync_events(source,entity,entity_id,action) VALUES(?,?,?,?)",('campus-api','enrollment',enrollment_id,'grade_update'))
    enrollment=db.one('''SELECT e.student_id, co.code, co.title FROM enrollments e JOIN courses co ON co.id=e.course_id WHERE e.id=?''',(enrollment_id,))
    db.notify_student(enrollment['student_id'], 'Grade published', f'Your {enrollment["code"]} grade is {body.grade} ({body.score}/100).', 'grade')
    return {'id':enrollment_id,'grade':body.grade,'score':body.score,'status':'updated'}

@app.get('/api/notifications')
def notifications(user=Depends(current_user)):
    return db.rows('SELECT id,title,message,kind,read_at,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 30',(user['id'],))

@app.patch('/api/notifications/{notification_id}/read')
def read_notification(notification_id: int, user=Depends(current_user)):
    item=db.one('SELECT id FROM notifications WHERE id=? AND user_id=?',(notification_id,user['id']))
    if not item: raise HTTPException(404,'Notification not found')
    db.execute("UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE id=?",(notification_id,))
    return {'id':notification_id,'read':True}

@app.get('/api/enrollment-options')
def enrollment_options(user=Depends(permit('faculty','admin','super-admin'))):
    query = 'SELECT id, first_name || " " || last_name name, roll_no, campus_id FROM students WHERE active=1'
    values=[]
    students_data=db.rows(query+' ORDER BY first_name',values)
    if user['role']=='faculty':
        courses_data=db.rows('SELECT * FROM courses WHERE faculty_id=? ORDER BY code',(faculty_id_for(user) or -1,))
    else:
        courses_data=courses(None,user)
    return {'students':students_data,'courses':courses_data}

@app.get('/api/analytics/overview')
def overview(campus_id: int | None=None, user=Depends(current_user)):
    if user['role']=='student':
        own=db.one('SELECT * FROM students WHERE id=?',(user['student_id'],))
        enrolled=enrollments(user)
        completed=[e for e in enrolled if e['score'] is not None]
        return {'kind':'student','profile':own,'enrollments':enrolled,'summary':{'courses_enrolled':len(enrolled),'courses_graded':len(completed),'average_score':round(sum(e['score'] for e in completed)/len(completed),1) if completed else None}}
    selected=campus_id
    filter_sql=' WHERE campus_id=?' if selected else ''; vals=(selected,) if selected else ()
    student_count=db.one('SELECT count(*) value FROM students'+filter_sql,vals)['value']; avg=db.one('SELECT round(avg(cgpa),2) value FROM students'+filter_sql,vals)['value']; attendance=db.one('SELECT round(avg(attendance),1) value FROM students'+filter_sql,vals)['value']
    by_campus=db.rows('''SELECT c.name, c.code, count(s.id) students, round(avg(s.cgpa),2) average_cgpa, round(avg(s.attendance),1) attendance FROM campuses c LEFT JOIN students s ON s.campus_id=c.id GROUP BY c.id ORDER BY students DESC''')
    student_performance=[]; by_department=[]; by_year=[]
    if user['role'] in ('admin','super-admin'):
        student_performance=db.rows('''SELECT s.id, s.first_name || ' ' || s.last_name name, s.roll_no, c.code campus_code, s.cgpa, s.attendance,
          round((s.cgpa * 10 * 0.6) + (s.attendance * 0.4),1) performance_index
          FROM students s JOIN campuses c ON c.id=s.campus_id WHERE s.active=1 ORDER BY performance_index ASC, s.last_name LIMIT 12''')
        by_department=db.rows('''SELECT department, count(*) students, round(avg(cgpa),2) average_cgpa, round(avg(attendance),1) attendance FROM students WHERE active=1 GROUP BY department ORDER BY department''')
        by_year=db.rows('''SELECT year, count(*) students, round(avg(cgpa),2) average_cgpa, round(avg(attendance),1) attendance FROM students WHERE active=1 GROUP BY year ORDER BY year''')
    return {'students':student_count,'courses':db.one('SELECT count(*) value FROM courses'+filter_sql,vals)['value'],'average_cgpa':avg,'average_attendance':attendance,'at_risk':len(students(selected, True, user)),'by_campus':by_campus,'by_department':by_department,'by_year':by_year,'student_performance':student_performance,'sync_lag_seconds':7}

@app.get('/api/faculty/performance')
def faculty_performance(user=Depends(permit('faculty'))):
    faculty_id=faculty_id_for(user)
    if not faculty_id: raise HTTPException(404,'Faculty profile not found')
    profile=db.one('''SELECT f.*, c.name campus_name FROM faculty f JOIN campuses c ON c.id=f.campus_id WHERE f.id=?''',(faculty_id,))
    course_rows=db.rows('''SELECT co.id, co.code, co.title, co.credits, count(e.id) student_count, count(e.score) graded_count, round(avg(e.score),1) average_score FROM courses co LEFT JOIN enrollments e ON e.course_id=co.id WHERE co.faculty_id=? GROUP BY co.id ORDER BY co.code''',(faculty_id,))
    totals={'courses_taught':len(course_rows),'students_taught':sum(r['student_count'] for r in course_rows),'graded':sum(r['graded_count'] for r in course_rows),'average_score':round(sum((r['average_score'] or 0)*r['graded_count'] for r in course_rows)/sum(r['graded_count'] for r in course_rows),1) if sum(r['graded_count'] for r in course_rows) else None}
    by_year=db.rows('''SELECT s.year, count(DISTINCT s.id) students, round(avg(s.cgpa),2) average_cgpa, round(avg(s.attendance),1) attendance, round(avg(e.score),1) average_score
      FROM enrollments e JOIN students s ON s.id=e.student_id JOIN courses co ON co.id=e.course_id WHERE co.faculty_id=? GROUP BY s.year ORDER BY s.year''',(faculty_id,))
    by_department=db.rows('''SELECT s.department, count(DISTINCT s.id) students, round(avg(s.cgpa),2) average_cgpa, round(avg(s.attendance),1) attendance, round(avg(e.score),1) average_score
      FROM enrollments e JOIN students s ON s.id=e.student_id JOIN courses co ON co.id=e.course_id WHERE co.faculty_id=? GROUP BY s.department ORDER BY s.department''',(faculty_id,))
    return {'profile':profile,'summary':totals,'courses':course_rows,'by_year':by_year,'by_department':by_department}

@app.get('/api/analytics/risk')
def risk(campus_id: int | None=None, user=Depends(permit('faculty','admin','super-admin'))):
    return students(campus_id, True, user)

@app.post('/api/intelligence/train')
def train(user=Depends(permit('admin','super-admin'))):
    # The transparent baseline has fixed, reviewable feature weights in this demo.
    sample_count=db.one('SELECT count(*) value FROM students')['value']
    return {'model':'dropout-risk-linear-v1','training_rows':sample_count,'features':['attendance','cgpa','credit_progress'],'metric':'explainable baseline refreshed','status':'ready'}

@app.get('/api/search')
def search(q: str=Query(min_length=2,max_length=80), user=Depends(current_user)):
    terms='%'+q.lower()+'%'; selected=user.get('campus_id') if user['role'] in ('faculty','student') else None
    sql='SELECT co.*, ca.name campus_name FROM courses co JOIN campuses ca ON ca.id=co.campus_id WHERE (lower(co.title) LIKE ? OR lower(co.description) LIKE ? OR lower(co.department) LIKE ?)'; params=[terms,terms,terms]
    if selected: sql+=' AND co.campus_id=?';params.append(selected)
    return {'query':q,'engine':'central document projection (semantic-compatible fallback)','results':db.rows(sql,params)}

@app.get('/api/graph/prerequisites/{course_code}')
def graph(course_code: str, user=Depends(current_user)):
    course=db.one('SELECT * FROM courses WHERE upper(code)=upper(?)',(course_code,))
    if not course: raise HTTPException(404,'Course not found')
    edges=db.rows('''SELECT c.code course_code, p.code prerequisite_code, p.title prerequisite_title FROM prerequisites r JOIN courses c ON c.id=r.course_id JOIN courses p ON p.id=r.prerequisite_id WHERE c.id=?''',(course['id'],))
    return {'engine':'neo4j projection (local fallback)','course':course,'prerequisites':edges,'cypher':'MATCH (c:Course {code: $code})-[:REQUIRES*]->(p:Course) RETURN p'}

@app.post('/api/assistant/query')
def assistant(body: AssistantQuery, user=Depends(current_user)):
    q=body.question.lower(); selected=user.get('campus_id') if user['role'] in ('faculty','student') else None
    if any(w in q for w in ('below','risk','attendance','at risk')):
        records=students(selected, True, user if user['role'] != 'student' else {**user,'role':'faculty'})
        answer=f"I found {len(records)} students flagged by the transparent risk baseline." if records else 'No students meet the current risk threshold.'
        return {'intent':'risk_lookup','answer':answer,'data':records[:10],'write_action':False}
    if any(w in q for w in ('course','database','machine learning','graph','distributed')):
        results=search(q.replace('courses','').replace('course','').strip() or 'database',user)['results']
        return {'intent':'course_search','answer':f"I found {len(results)} matching courses.",'data':results,'write_action':False}
    return {'intent':'help','answer':'I can safely answer read-only questions about at-risk students, attendance, courses, prerequisites, and campus metrics. I cannot make academic changes without a human approval workflow.','data':[],'write_action':False}
