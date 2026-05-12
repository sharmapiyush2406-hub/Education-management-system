from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import bcrypt
import jwt
import datetime
from functools import wraps

app = Flask(__name__)
CORS(app)

SECRET_KEY = "ems_super_secret_key_2026"

# MongoDB connection
client = MongoClient("mongodb+srv://emsuser:ems123@cluster0.p4omcbp.mongodb.net/ems_db")
db = client["ems_db"]

users = db["users"]
assignments = db["assignments"]

SUBJECTS = ["PYTHON", "DBMS", "DMS", "SALESFORCE", "GCCF"]


# ─────────────────────────────────────────────
#  JWT HELPER
# ─────────────────────────────────────────────
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token missing"}), 401
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(payload, *args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token missing"}), 401
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except Exception:
            return jsonify({"error": "Invalid token"}), 401
        if payload.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(payload, *args, **kwargs)
    return decorated


# ─────────────────────────────────────────────
#  AUTH
# ─────────────────────────────────────────────
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    user = users.find_one({"email": data.get("email", "")})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not bcrypt.checkpw(data["password"].encode(), user["password"]):
        return jsonify({"error": "Invalid password"}), 401

    token = jwt.encode({
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({
        "token": token,
        "name": user["name"],
        "role": user["role"],
        "email": user["email"]
    })


# ─────────────────────────────────────────────
#  STUDENT ROUTES
# ─────────────────────────────────────────────
@app.route("/api/my-record", methods=["GET"])
@token_required
def my_record(payload):
    """Student sees their own grades & attendance."""
    email = payload["email"]
    user = users.find_one({"email": email}, {"_id": 0, "password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "name": user["name"],
        "email": user["email"],
        "grades": user.get("grades", {}),
        "attendance": user.get("attendance", {})
    })


# ─────────────────────────────────────────────
#  ADMIN ROUTES
# ─────────────────────────────────────────────
@app.route("/api/students", methods=["GET"])
@admin_required
def get_students(payload):
    """Admin sees all students with their grades & attendance."""
    student_list = list(users.find(
        {"role": "student"},
        {"_id": 0, "password": 0}
    ))
    return jsonify(student_list)


@app.route("/api/assignment", methods=["POST"])
@admin_required
def add_assignment(payload):
    """Admin creates an assignment for a subject."""
    data = request.json
    subject = data.get("subject", "").upper()
    if subject not in SUBJECTS:
        return jsonify({"error": f"Invalid subject. Must be one of {SUBJECTS}"}), 400

    assignments.insert_one({
        "title": data["title"],
        "description": data["description"],
        "subject": subject,
        "due_date": data.get("due_date", ""),
        "created_by": payload["email"],
        "created_at": datetime.datetime.utcnow().isoformat()
    })
    return jsonify({"message": "Assignment created successfully"})


# ─────────────────────────────────────────────
#  SHARED ROUTES
# ─────────────────────────────────────────────
@app.route("/api/assignments", methods=["GET"])
@token_required
def get_assignments(payload):
    """Both admin and student can view assignments."""
    subject_filter = request.args.get("subject", "").upper()
    query = {}
    if subject_filter and subject_filter in SUBJECTS:
        query["subject"] = subject_filter

    data = list(assignments.find(query, {"_id": 0}))
    return jsonify(data)


# ─────────────────────────────────────────────
#  HOME
# ─────────────────────────────────────────────
@app.route("/")
def home():
    return jsonify({"message": "EMS API Running 🚀", "version": "2.0"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)