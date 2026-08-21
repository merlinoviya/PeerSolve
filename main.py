from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import sqlite3
import hashlib
import jwt

# =========================================================
# CONFIGURATION
# =========================================================

SECRET_KEY = "peersolve-team12-secret-key"
ALGORITHM = "HS256"

app = FastAPI(title="PeerSolve API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# DATABASE
# =========================================================

DATABASE = "peersolve.db"


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def init_database():
    db = get_db()

    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'student',
            created_at TEXT NOT NULL
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            subject TEXT NOT NULL,
            description TEXT NOT NULL,
            author_id INTEGER NOT NULL,
            accepted_reply_id INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY(author_id) REFERENCES users(id)
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(question_id) REFERENCES questions(id),
            FOREIGN KEY(author_id) REFERENCES users(id)
        )
    """)

    db.commit()
    db.close()


init_database()

# =========================================================
# MODELS
# =========================================================

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class QuestionRequest(BaseModel):
    title: str
    subject: str
    description: str


class ReplyRequest(BaseModel):
    content: str


# =========================================================
# PASSWORD
# =========================================================

def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()


# =========================================================
# AUTHENTICATION
# =========================================================

def create_token(user_id: int, role: str):
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_user(authorization: Optional[str] = Header(None)):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication format"
        )

    token = authorization.split(" ")[1]

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Token expired"
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )


def require_admin(user=Depends(get_current_user)):

    if user.get("role") != "admin":

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return user


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message": "PeerSolve API is running!",
        "status": "online"
    }


# =========================================================
# REGISTER
# =========================================================

@app.post("/auth/register")
def register(data: RegisterRequest):

    db = get_db()

    existing = db.execute(
        "SELECT id FROM users WHERE email = ?",
        (data.email,)
    ).fetchone()

    if existing:

        db.close()

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    password_hash = hash_password(data.password)

    cursor = db.execute(
        """
        INSERT INTO users
        (name, email, password, role, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            data.name,
            data.email,
            password_hash,
            "student",
            datetime.now().isoformat()
        )
    )

    db.commit()

    user_id = cursor.lastrowid

    db.close()

    token = create_token(
        user_id,
        "student"
    )

    return {
        "message": "Registration successful",
        "token": token,
        "user": {
            "id": user_id,
            "name": data.name,
            "email": data.email,
            "role": "student"
        }
    }


# =========================================================
# LOGIN
# =========================================================

@app.post("/auth/login")
def login(data: LoginRequest):

    db = get_db()

    user = db.execute(
        "SELECT * FROM users WHERE email = ?",
        (data.email,)
    ).fetchone()

    db.close()

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if hash_password(data.password) != user["password"]:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_token(
        user["id"],
        user["role"]
    )

    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }


# =========================================================
# GET ALL QUESTIONS
# =========================================================

@app.get("/questions")
def get_questions():

    db = get_db()

    questions = db.execute(
        """
        SELECT
            questions.id,
            questions.title,
            questions.subject,
            questions.description,
            questions.created_at,
            users.name AS author
        FROM questions
        JOIN users
        ON questions.author_id = users.id
        ORDER BY questions.id DESC
        """
    ).fetchall()

    result = []

    for question in questions:

        reply_count = db.execute(
            """
            SELECT COUNT(*) AS count
            FROM replies
            WHERE question_id = ?
            """,
            (question["id"],)
        ).fetchone()["count"]

        result.append({
            "id": question["id"],
            "title": question["title"],
            "subject": question["subject"],
            "description": question["description"],
            "author": question["author"],
            "replies": reply_count,
            "time": question["created_at"]
        })

    db.close()

    return result


# =========================================================
# GET SINGLE QUESTION
# =========================================================

@app.get("/questions/{question_id}")
def get_question(question_id: int):

    db = get_db()

    question = db.execute(
        """
        SELECT
            questions.*,
            users.name AS author
        FROM questions
        JOIN users
        ON questions.author_id = users.id
        WHERE questions.id = ?
        """,
        (question_id,)
    ).fetchone()

    if not question:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    replies = db.execute(
        """
        SELECT
            replies.id,
            replies.content,
            replies.created_at,
            replies.author_id,
            users.name AS author
        FROM replies
        JOIN users
        ON replies.author_id = users.id
        WHERE replies.question_id = ?
        ORDER BY replies.id ASC
        """,
        (question_id,)
    ).fetchall()

    result_replies = []

    for reply in replies:

        result_replies.append({
            "id": reply["id"],
            "content": reply["content"],
            "author": reply["author"],
            "author_id": reply["author_id"],
            "created_at": reply["created_at"],
            "accepted": reply["id"] == question["accepted_reply_id"]
        })

    db.close()

    return {
        "id": question["id"],
        "title": question["title"],
        "subject": question["subject"],
        "description": question["description"],
        "author": question["author"],
        "author_id": question["author_id"],
        "accepted_reply_id": question["accepted_reply_id"],
        "replies": result_replies,
        "created_at": question["created_at"]
    }


# =========================================================
# CREATE QUESTION
# =========================================================

@app.post("/questions")
def create_question(
    data: QuestionRequest,
    user=Depends(get_current_user)
):

    db = get_db()

    cursor = db.execute(
        """
        INSERT INTO questions
        (title, subject, description, author_id, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            data.title,
            data.subject,
            data.description,
            user["user_id"],
            datetime.now().isoformat()
        )
    )

    db.commit()

    question_id = cursor.lastrowid

    db.close()

    return {
        "message": "Question created successfully",
        "question_id": question_id
    }


# =========================================================
# UPDATE QUESTION
# =========================================================

@app.put("/questions/{question_id}")
def update_question(
    question_id: int,
    data: QuestionRequest,
    user=Depends(get_current_user)
):

    db = get_db()

    question = db.execute(
        """
        SELECT author_id
        FROM questions
        WHERE id = ?
        """,
        (question_id,)
    ).fetchone()

    if not question:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    # Only question owner can edit
    if question["author_id"] != user["user_id"]:

        db.close()

        raise HTTPException(
            status_code=403,
            detail="Only the question owner can edit this question"
        )

    db.execute(
        """
        UPDATE questions
        SET title = ?,
            subject = ?,
            description = ?
        WHERE id = ?
        """,
        (
            data.title,
            data.subject,
            data.description,
            question_id
        )
    )

    db.commit()
    db.close()

    return {
        "message": "Question updated successfully"
    }


# =========================================================
# CREATE REPLY
# =========================================================

@app.post("/questions/{question_id}/replies")
def create_reply(
    question_id: int,
    data: ReplyRequest,
    user=Depends(get_current_user)
):

    db = get_db()

    question = db.execute(
        "SELECT id FROM questions WHERE id = ?",
        (question_id,)
    ).fetchone()

    if not question:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    db.execute(
        """
        INSERT INTO replies
        (question_id, author_id, content, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (
            question_id,
            user["user_id"],
            data.content,
            datetime.now().isoformat()
        )
    )

    db.commit()
    db.close()

    return {
        "message": "Reply posted successfully"
    }


# =========================================================
# UPDATE REPLY
# =========================================================

@app.put("/replies/{reply_id}")
def update_reply(
    reply_id: int,
    data: ReplyRequest,
    user=Depends(get_current_user)
):

    db = get_db()

    reply = db.execute(
        """
        SELECT author_id
        FROM replies
        WHERE id = ?
        """,
        (reply_id,)
    ).fetchone()

    if not reply:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Reply not found"
        )

    # Only reply owner can edit
    if reply["author_id"] != user["user_id"]:

        db.close()

        raise HTTPException(
            status_code=403,
            detail="Only the reply owner can edit this reply"
        )

    db.execute(
        """
        UPDATE replies
        SET content = ?
        WHERE id = ?
        """,
        (
            data.content,
            reply_id
        )
    )

    db.commit()
    db.close()

    return {
        "message": "Reply updated successfully"
    }


# =========================================================
# ACCEPT ANSWER
# =========================================================

@app.put("/questions/{question_id}/accept/{reply_id}")
def accept_answer(
    question_id: int,
    reply_id: int,
    user=Depends(get_current_user)
):

    db = get_db()

    question = db.execute(
        """
        SELECT author_id
        FROM questions
        WHERE id = ?
        """,
        (question_id,)
    ).fetchone()

    if not question:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    # IMPORTANT:
    # Only the student who created the question
    # can accept an answer.
    if question["author_id"] != user["user_id"]:

        db.close()

        raise HTTPException(
            status_code=403,
            detail="Only the question owner can accept an answer"
        )

    reply = db.execute(
        """
        SELECT id
        FROM replies
        WHERE id = ?
        AND question_id = ?
        """,
        (
            reply_id,
            question_id
        )
    ).fetchone()

    if not reply:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Reply not found"
        )

    db.execute(
        """
        UPDATE questions
        SET accepted_reply_id = ?
        WHERE id = ?
        """,
        (
            reply_id,
            question_id
        )
    )

    db.commit()
    db.close()

    return {
        "message": "Answer accepted successfully"
    }


# =========================================================
# DELETE QUESTION
# =========================================================

@app.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    user=Depends(get_current_user)
):

    db = get_db()

    question = db.execute(
        """
        SELECT author_id
        FROM questions
        WHERE id = ?
        """,
        (question_id,)
    ).fetchone()

    if not question:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    if (
        question["author_id"] != user["user_id"]
        and user["role"] != "admin"
    ):

        db.close()

        raise HTTPException(
            status_code=403,
            detail="You cannot delete this question"
        )

    db.execute(
        "DELETE FROM replies WHERE question_id = ?",
        (question_id,)
    )

    db.execute(
        "DELETE FROM questions WHERE id = ?",
        (question_id,)
    )

    db.commit()
    db.close()

    return {
        "message": "Question deleted successfully"
    }


# =========================================================
# DELETE REPLY
# =========================================================

@app.delete("/replies/{reply_id}")
def delete_reply(
    reply_id: int,
    user=Depends(get_current_user)
):

    db = get_db()

    reply = db.execute(
        """
        SELECT author_id, question_id
        FROM replies
        WHERE id = ?
        """,
        (reply_id,)
    ).fetchone()

    if not reply:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Reply not found"
        )

    if (
        reply["author_id"] != user["user_id"]
        and user["role"] != "admin"
    ):

        db.close()

        raise HTTPException(
            status_code=403,
            detail="You cannot delete this reply"
        )

    # If this reply was accepted, remove accepted status
    db.execute(
        """
        UPDATE questions
        SET accepted_reply_id = NULL
        WHERE id = ?
        AND accepted_reply_id = ?
        """,
        (
            reply["question_id"],
            reply_id
        )
    )

    db.execute(
        "DELETE FROM replies WHERE id = ?",
        (reply_id,)
    )

    db.commit()
    db.close()

    return {
        "message": "Reply deleted successfully"
    }


# =========================================================
# ADMIN - ALL USERS
# =========================================================

@app.get("/admin/users")
def admin_users(
    user=Depends(require_admin)
):

    db = get_db()

    users = db.execute(
        """
        SELECT
            id,
            name,
            email,
            role,
            created_at
        FROM users
        ORDER BY id DESC
        """
    ).fetchall()

    db.close()

    return [dict(user) for user in users]


# =========================================================
# ADMIN - ALL QUESTIONS
# =========================================================

@app.get("/admin/questions")
def admin_questions(
    user=Depends(require_admin)
):

    db = get_db()

    questions = db.execute(
        """
        SELECT
            questions.id,
            questions.title,
            questions.subject,
            users.name AS author,
            questions.created_at
        FROM questions
        JOIN users
        ON questions.author_id = users.id
        ORDER BY questions.id DESC
        """
    ).fetchall()

    db.close()

    return [dict(question) for question in questions]


# =========================================================
# ADMIN - DELETE ANY QUESTION
# =========================================================

@app.delete("/admin/questions/{question_id}")
def admin_delete_question(
    question_id: int,
    user=Depends(require_admin)
):

    db = get_db()

    db.execute(
        "DELETE FROM replies WHERE question_id = ?",
        (question_id,)
    )

    cursor = db.execute(
        "DELETE FROM questions WHERE id = ?",
        (question_id,)
    )

    if cursor.rowcount == 0:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    db.commit()
    db.close()

    return {
        "message": "Question removed by admin"
    }


# =========================================================
# ADMIN - DELETE ANY REPLY
# =========================================================

@app.delete("/admin/replies/{reply_id}")
def admin_delete_reply(
    reply_id: int,
    user=Depends(require_admin)
):

    db = get_db()

    reply = db.execute(
        """
        SELECT question_id
        FROM replies
        WHERE id = ?
        """,
        (reply_id,)
    ).fetchone()

    if not reply:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Reply not found"
        )

    # Remove accepted status if this was accepted
    db.execute(
        """
        UPDATE questions
        SET accepted_reply_id = NULL
        WHERE id = ?
        AND accepted_reply_id = ?
        """,
        (
            reply["question_id"],
            reply_id
        )
    )

    cursor = db.execute(
        "DELETE FROM replies WHERE id = ?",
        (reply_id,)
    )

    db.commit()
    db.close()

    return {
        "message": "Reply removed by admin"
    }