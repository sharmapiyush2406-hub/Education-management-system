"""
EMS Database Seeder
Run: python seed.py
Seeds 20 students + 1 admin into MongoDB.
Admin:   admin@ems.com     / admin123
Students: student1@ems.com / student123  (through student20@ems.com)
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from pymongo import MongoClient
import bcrypt
import random

MONGO_URI = "mongodb+srv://emsuser:ems123@cluster0.p4omcbp.mongodb.net/ems_db"
client = MongoClient(MONGO_URI)
db = client["ems_db"]
users = db["users"]
assignments = db["assignments"]

SUBJECTS = ["PYTHON", "DBMS", "DMS", "SALESFORCE", "GCCF"]
GRADE_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"]

STUDENT_NAMES = [
    "Rahul Sharma",      "Priya Singh",       "Amit Patel",
    "Sneha Gupta",       "Vikram Yadav",      "Neha Joshi",
    "Arjun Mehta",       "Pooja Verma",       "Rohit Kumar",
    "Ananya Reddy",      "Karan Kapoor",      "Divya Nair",
    "Manish Tiwari",     "Shreya Bose",       "Aakash Malhotra",
    "Ritu Pandey",       "Siddharth Shah",    "Kavya Menon",
    "Tarun Bansal",      "Ishita Saxena"
]


def hash_pw(plain: str) -> bytes:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt())


def random_grades() -> dict:
    return {subj: random.choice(GRADE_OPTIONS) for subj in SUBJECTS}


def random_attendance() -> dict:
    return {subj: random.randint(55, 100) for subj in SUBJECTS}


def seed():
    # Clear existing data
    users.delete_many({})
    assignments.delete_many({})
    print("[OK] Cleared existing users and assignments.")

    # ── Admin ──
    users.insert_one({
        "name": "Admin User",
        "email": "admin@ems.com",
        "password": hash_pw("admin123"),
        "role": "admin",
        "grades": {},
        "attendance": {}
    })
    print("[OK] Admin inserted: admin@ems.com / admin123")

    # ── 20 Students ──
    student_docs = []
    for i, name in enumerate(STUDENT_NAMES, start=1):
        email = f"student{i}@ems.com"
        doc = {
            "name": name,
            "email": email,
            "password": hash_pw("student123"),
            "role": "student",
            "grades": random_grades(),
            "attendance": random_attendance()
        }
        student_docs.append(doc)

    users.insert_many(student_docs)
    print(f"[OK] {len(student_docs)} students inserted (student1@ems.com to student20@ems.com / student123)")

    # ── Sample Assignments ──
    sample_assignments = [
        {
            "title": "Python List Comprehensions",
            "description": "Write 5 programs demonstrating list comprehensions in Python.",
            "subject": "PYTHON",
            "due_date": "2026-05-25",
            "created_by": "admin@ems.com",
            "created_at": "2026-05-07T00:00:00"
        },
        {
            "title": "ER Diagram for Library System",
            "description": "Design and draw the ER Diagram for a Library Management System.",
            "subject": "DBMS",
            "due_date": "2026-05-28",
            "created_by": "admin@ems.com",
            "created_at": "2026-05-07T00:00:00"
        },
        {
            "title": "DMS File Organization Report",
            "description": "Write a 1500-word report on file organization techniques in DMS.",
            "subject": "DMS",
            "due_date": "2026-06-01",
            "created_by": "admin@ems.com",
            "created_at": "2026-05-07T00:00:00"
        },
        {
            "title": "Salesforce Lead Management",
            "description": "Create a demo Salesforce org and set up Lead-to-Opportunity conversion flow.",
            "subject": "SALESFORCE",
            "due_date": "2026-06-05",
            "created_by": "admin@ems.com",
            "created_at": "2026-05-07T00:00:00"
        },
        {
            "title": "GCCF Communication Case Study",
            "description": "Analyse a real-world business communication failure and present solutions.",
            "subject": "GCCF",
            "due_date": "2026-06-08",
            "created_by": "admin@ems.com",
            "created_at": "2026-05-07T00:00:00"
        },
        {
            "title": "Python OOP Mini Project",
            "description": "Build a simple bank account system using OOP concepts in Python.",
            "subject": "PYTHON",
            "due_date": "2026-06-10",
            "created_by": "admin@ems.com",
            "created_at": "2026-05-07T00:00:00"
        },
        {
            "title": "SQL Queries Practice Set",
            "description": "Solve 20 SQL queries on the given student database schema.",
            "subject": "DBMS",
            "due_date": "2026-06-12",
            "created_by": "admin@ems.com",
            "created_at": "2026-05-07T00:00:00"
        }
    ]

    assignments.insert_many(sample_assignments)
    print(f"[OK] {len(sample_assignments)} sample assignments inserted.")
    print("\n[DONE] Seeding complete! Start the backend: python app.py")


if __name__ == "__main__":
    seed()
