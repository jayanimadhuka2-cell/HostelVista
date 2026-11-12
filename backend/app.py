
import os
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from functools import wraps

from flask import (
    Flask, request, jsonify, Response, session,
    send_from_directory
)
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from bson import ObjectId

# --------------------------------------------------
# 1. ENVIRONMENT CONFIGURATION
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(__name__)

app.secret_key = os.getenv(
    "SECRET_KEY",
    "hostelvista-local-dev-key"
)


app.config.update(
    SESSION_COOKIE_NAME="hostelvista_session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,
    MAX_CONTENT_LENGTH=5 * 1024 * 1024
)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://127.0.0.1:5500",
                "http://localhost:5500"
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type"],
            "supports_credentials": True
        }
    },
    supports_credentials=True
)

# --------------------------------------------------
# 2. MONGODB CONNECTION
# --------------------------------------------------

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://localhost:27017/"
)

DB_NAME = os.getenv("DB_NAME", "hostelvista")

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000
)

db = client[DB_NAME]

users = db["users"]
allocations = db["allocations"]
payments = db["payments"]
complaints = db["complaints"]
attendance = db["attendance"]
notifications = db["notifications"]
rooms = db["rooms"]
bookings = db["bookings"]

# --------------------------------------------------
# 3. RECEIPT UPLOAD CONFIGURATION
# --------------------------------------------------

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


def current_time():
    return datetime.now(timezone.utc)


# --------------------------------------------------
# 4. STUDENT LOGIN CHECK
# --------------------------------------------------

def student_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        if session.get("user_role") != "student":
            return jsonify({
                "success": False,
                "message": "Student login required."
            }), 401

        return function(*args, **kwargs)

    return wrapper

# --------------------------------------------------
# ADMIN LOGIN CHECK
# --------------------------------------------------

def admin_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        if session.get("user_role") != "admin":
            return jsonify({
                "success": False,
                "message": "Admin login required."
            }), 401

        return function(*args, **kwargs)

    return wrapper

# --------------------------------------------------
# 5. HOME AND HEALTH
# --------------------------------------------------

@app.get("/")
def home():
    return jsonify({
        "status": "success",
        "message": "HostelVista backend is running!"
    }), 200


@app.get("/favicon.ico")
def favicon():
    return Response(status=204)


@app.get("/api/health")
def health():

    try:
        client.admin.command("ping")

        return jsonify({
            "status": "success",
            "message": "HostelVista backend and MongoDB connected!"
        }), 200

    except Exception:
        app.logger.exception("MongoDB connection failed")

        return jsonify({
            "status": "error",
            "message": "Could not connect to MongoDB."
        }), 503


# --------------------------------------------------
# 6. LOGIN
# --------------------------------------------------

@app.post("/api/login")
def login():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "").strip().lower()

    if not email or not password or role not in ("admin", "student"):
        return jsonify({
            "success": False,
            "message": "Please provide valid login details."
        }), 400

    try:
        user = users.find_one({
            "email": email,
            "role": role
        })

        if not user or not check_password_hash(
            user.get("password_hash", ""),
            password
        ):
            return jsonify({
                "success": False,
                "message": "Invalid login details."
            }), 401

        session.clear()
        session["user_email"] = user["email"]
        session["user_role"] = user["role"]

        return jsonify({
            "success": True,
            "message": "Login successful.",
            "role": user["role"],
            "name": user.get("name", ""),
            "email": user.get("email", "")
        }), 200

    except Exception:
        app.logger.exception("Login failed")

        return jsonify({
            "success": False,
            "message": "A server error occurred."
        }), 500

# --------------------------------------------------
# ADMIN - ADD NEW STUDENT
# --------------------------------------------------

@app.post("/api/admin/students")
@admin_required
def add_student():

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    student_id = str(data.get("studentId", "")).strip()
    password = data.get("password", "")

    if not name or not email or not student_id or not password:
        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400

    if len(password) < 8:
        return jsonify({
            "success": False,
            "message": "Password must contain at least 8 characters."
        }), 400

    try:
        existing_email = users.find_one({
            "email": email
        })

        if existing_email:
            return jsonify({
                "success": False,
                "message": "This email is already registered."
            }), 409

        existing_id = users.find_one({
            "student_id": student_id
        })

        if existing_id:
            return jsonify({
                "success": False,
                "message": "This Student ID is already registered."
            }), 409

        student = {
            "name": name,
            "email": email,
            "student_id": student_id,
            "password_hash": generate_password_hash(password),
            "role": "student",
            "created_at": current_time()
        }

        users.insert_one(student)

        return jsonify({
            "success": True,
            "message": "Student account created successfully."
        }), 201

    except Exception:
        app.logger.exception("Student creation error")

        return jsonify({
            "success": False,
            "message": "Could not create student account."
        }), 500
        
@app.get("/api/admin/bookings")
@admin_required
def get_admin_bookings():
    try:
        all_bookings = list(
            bookings.find(
                {},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        for booking in all_bookings:
            student = users.find_one(
                {"email": booking["student_email"]},
                {"_id": 0, "name": 1, "student_id": 1}
            )

            booking["student_name"] = (
                student.get("name", "Unknown Student")
                if student else "Unknown Student"
            )

            booking["student_id"] = (
                student.get("student_id", "N/A")
                if student else "N/A"
            )

        return jsonify({
            "success": True,
            "bookings": all_bookings
        }), 200

    except Exception:
        app.logger.exception("Admin bookings error")
        return jsonify({
            "success": False,
            "message": "Could not load booking requests."
        }), 500        

@app.put("/api/admin/bookings/<booking_id>")
@admin_required
def update_booking(booking_id):
    try:
        data = request.get_json(silent=True) or {}

        status = str(data.get("status", "")).strip().lower()
        admin_response = str(data.get("admin_response", "")).strip()

        if status not in ["approved", "rejected"]:
            return jsonify({
                "success": False,
                "message": "Invalid booking status."
            }), 400

        result = bookings.update_one(
            {"booking_id": booking_id, "status": "pending"},
            {
                "$set": {
                    "status": status,
                    "admin_response": admin_response,
                    "updated_at": current_time()
                }
            }
        )

        if result.matched_count == 0:
            return jsonify({
                "success": False,
                "message": "Booking not found or already reviewed."
            }), 404

        return jsonify({
            "success": True,
            "message": f"Booking {status} successfully."
        }), 200

    except Exception:
        app.logger.exception("Update booking error")
        return jsonify({
            "success": False,
            "message": "Could not update booking."
        }), 500     
        
        

# --------------------------------------------------
# ADMIN - HOSTEL OVERVIEW STATISTICS
# --------------------------------------------------

@app.get("/api/admin/overview")
@admin_required
def get_admin_overview():

    try:
        total_students = users.count_documents({
            "role": "student"
        })

        total_rooms = rooms.count_documents({})

        pending_bookings = bookings.count_documents({
            "status": "pending"
        })

        open_complaints = complaints.count_documents({
            "status": {
                "$in": ["pending", "in_progress"]
            }
        })

        return jsonify({
            "success": True,
            "overview": {
                "total_students": total_students,
                "total_rooms": total_rooms,
                "pending_bookings": pending_bookings,
                "open_complaints": open_complaints
            }
        }), 200

    except Exception:
        app.logger.exception("Overview loading error")

        return jsonify({
            "success": False,
            "message": "Could not load hostel overview."
        }), 500
  
        
# --------------------------------------------------
# ADMIN - GET ALL STUDENTS
# --------------------------------------------------

@app.get("/api/admin/students")
@admin_required
def get_admin_students():

    try:
        records = list(
            users.find(
                {"role": "student"},
                {
                    "_id": 0,
                    "password_hash": 0
                }
            ).sort("created_at", -1)
        )

        # Convert datetime into JSON-safe format
        for student in records:

            if student.get("created_at"):
                student["created_at"] = (
                    student["created_at"].isoformat()
                )

            # Handle students without Student ID
            student["student_id"] = student.get(
                "student_id", "N/A"
            )

        return jsonify({
            "success": True,
            "students": records,
            "total": len(records)
        }), 200

    except Exception:
        app.logger.exception("Admin student loading error")

        return jsonify({
            "success": False,
            "message": "Could not load students."
        }), 500
# --------------------------------------------------
# ADMIN - STUDENT REPORT
# --------------------------------------------------

@app.get("/api/admin/reports/students")
@admin_required
def get_student_report():

    try:
        students = list(
            users.find(
                {"role": "student"},
                {
                    "_id": 0,
                    "password_hash": 0
                }
            ).sort("created_at", -1)
        )

        for student in students:
            if isinstance(student.get("created_at"), datetime):
                student["created_at"] = (
                    student["created_at"].isoformat()
                )

        return jsonify({
            "success": True,
            "total_students": len(students),
            "students": students
        }), 200

    except Exception:
        app.logger.exception("Student report error")

        return jsonify({
            "success": False,
            "message": "Could not load student report."
        }), 500
        
# --------------------------------------------------
# ADMIN - ROOM OCCUPANCY REPORT
# --------------------------------------------------

@app.get("/api/admin/reports/rooms")
@admin_required
def get_room_report():
    try:
        all_rooms = list(rooms.find({}, {"_id": 0}))

        active_allocations = list(
            allocations.find({"status": "active"}, {"_id": 0})
        )

        room_reports = []
        total_capacity = 0
        total_occupied = 0

        for room in all_rooms:
            room_number = room.get("room_number")
            block = room.get("location", "")

            capacity = 2

            occupied = sum(
                1 for allocation in active_allocations
                if allocation.get("room_number") == room_number
                and allocation.get("block", "") == block
            )

            occupied = min(occupied, capacity)
            available = capacity - occupied

            room_reports.append({
                "room_number": room_number,
                "block": block,
                "capacity": capacity,
                "occupied_beds": occupied,
                "available_beds": available
            })

            total_capacity += capacity
            total_occupied += occupied

        return jsonify({
            "success": True,
            "total_rooms": len(all_rooms),
            "total_capacity": total_capacity,
            "total_occupied": total_occupied,
            "total_available": total_capacity - total_occupied,
            "rooms": room_reports
        }), 200

    except Exception:
        app.logger.exception("Room report error")
        return jsonify({
            "success": False,
            "message": "Could not load room occupancy report."
        }), 500       
        
# --------------------------------------------------
# ADMIN - PAYMENT SUMMARY REPORT
# --------------------------------------------------

@app.get("/api/admin/reports/payments")
@admin_required
def get_payment_report():

    try:
        all_payments = list(
            payments.find({}, {"_id": 0})
        )

        total_payments = len(all_payments)

        pending = 0
        verified = 0
        rejected = 0
        total_amount = 0
        verified_amount = 0

        for payment in all_payments:

            status = payment.get("status", "pending").lower()
            amount = float(payment.get("amount", 0))

            total_amount += amount

            if status == "pending":
                pending += 1

            elif status == "verified":
                verified += 1
                verified_amount += amount

            elif status == "rejected":
                rejected += 1

        return jsonify({
            "success": True,
            "total_payments": total_payments,
            "total_amount": round(total_amount, 2),
            "verified_amount": round(verified_amount, 2),
            "pending": pending,
            "verified": verified,
            "rejected": rejected
        }), 200

    except Exception:
        app.logger.exception("Payment report error")

        return jsonify({
            "success": False,
            "message": "Could not load payment report."
        }), 500
         
# --------------------------------------------------
# ADMIN - ADD ROOM
# --------------------------------------------------

@app.post("/api/admin/rooms")
@admin_required
def add_admin_room():

    try:
        data = request.get_json(silent=True) or {}

        room_number = str(data.get("room", "")).strip()
        capacity = data.get("capacity")
        status = str(data.get("status", "Available")).strip()
        location = str(data.get("location", "")).strip()

        # Validate required fields
        if not room_number or not capacity or not location:
            return jsonify({
                "success": False,
                "message": "All fields are required."
            }), 400

        try:
            capacity = int(capacity)
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Invalid room capacity."
            }), 400

        if capacity < 1:
            return jsonify({
                "success": False,
                "message": "Capacity must be at least 1."
            }), 400

        if status not in ["Available", "Occupied", "Maintenance"]:
            return jsonify({
                "success": False,
                "message": "Invalid room status."
            }), 400

        # Check duplicate room
        if rooms.find_one({"room_number": room_number}):
            return jsonify({
                "success": False,
                "message": "This room already exists."
            }), 409

        # Save room in MongoDB
        room = {
            "room_number": room_number,
            "capacity": capacity,
            "status": status,
            "location": location,
            "created_at": current_time()
        }

        rooms.insert_one(room)

        return jsonify({
            "success": True,
            "message": "Room added successfully."
        }), 201

    except Exception:
        app.logger.exception("Add room error")

        return jsonify({
            "success": False,
            "message": "Could not add room."
        }), 500
        
        # --------------------------------------------------
# ADMIN - GET ALL ROOMS
# --------------------------------------------------

@app.get("/api/admin/rooms")
@admin_required
def get_admin_rooms():

    try:
        room_documents = list(
            rooms.find(
                {},
                {"_id": 0}
            ).sort("room_number", 1)
        )

        for room in room_documents:
            if isinstance(room.get("created_at"), datetime):
                room["created_at"] = room["created_at"].isoformat()

        return jsonify({
            "success": True,
            "total": len(room_documents),
            "rooms": room_documents
        }), 200

    except Exception:
        app.logger.exception("Get rooms error")

        return jsonify({
            "success": False,
            "message": "Could not load rooms."
        }), 500
        
        
# --------------------------------------------------
# 7. STUDENT PROFILE
# --------------------------------------------------

@app.get("/api/student/profile")
@student_required
def student_profile():

    try:
        student = users.find_one(
            {
                "email": session["user_email"],
                "role": "student"
            },
            {
                "_id": 0,
                "password_hash": 0
            }
        )

        if not student:
            return jsonify({
                "success": False,
                "message": "Student not found."
            }), 404

        return jsonify({
            "success": True,
            "student": student
        }), 200

    except Exception:
        app.logger.exception("Student profile error")

        return jsonify({
            "success": False,
            "message": "Could not load student profile."
        }), 500


# --------------------------------------------------
# 8. ROOM ALLOCATION
# --------------------------------------------------

@app.get("/api/student/allocation")
@student_required
def get_allocation():

    try:
         # Temporary debugging lines
        print("SESSION EMAIL:", repr(session.get("user_email")))
        print("DATABASE NAME:", db.name)
        print("ALLOCATION COUNT:", allocations.count_documents({}))
        
        allocation = allocations.find_one(
            {
                "student_email": session["user_email"],
                "status": "active"
            },
            {"_id": 0},
            sort=[("created_at", -1)]
        )

        return jsonify({
            "success": True,
            "allocation": allocation
        }), 200

    except Exception:
        app.logger.exception("Allocation error")

        return jsonify({
            "success": False,
            "message": "Could not load room allocation."
        }), 500
        
        
# --------------------------------------------------
# ADMIN - ALLOCATE ROOM TO STUDENT
# --------------------------------------------------

@app.post("/api/admin/allocations")
@admin_required
def create_allocation():

    data = request.get_json(silent=True) or {}

    student_email = str(
        data.get("student_email", "")
    ).strip().lower()

    room_number = str(
        data.get("room_number", "")
    ).strip()

    bed_number = str(
        data.get("bed_number", "")
    ).strip()

    if not student_email or not room_number or not bed_number:
        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400

    try:
        # Check student
        student = users.find_one({
            "email": student_email,
            "role": "student"
        })

        if not student:
            return jsonify({
                "success": False,
                "message": "Student not found."
            }), 404
            
         # Check approved booking
        approved_booking = bookings.find_one({
               "student_email": student_email,
                "status": "allocated"
})

        if not approved_booking:
         return jsonify({
        "success": False,
        "message": "Student does not have an approved booking request."
    }), 403  

        # Check existing active allocation
        existing = allocations.find_one({
            "student_email": student_email,
            "status": "active"
        })

        if existing:
            return jsonify({
                "success": False,
                "message": "Student already has an active allocation."
            }), 409

        # Check room
        room = rooms.find_one({
            "room_number": room_number
        })

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        if room.get("status") != "Available":
            return jsonify({
                "success": False,
                "message": "Room is not available."
            }), 409

        # Check available capacity
        active_count = allocations.count_documents({
            "room_number": room_number,
            "status": "active"
        })

        if active_count >= int(room.get("capacity", 0)):
            return jsonify({
                "success": False,
                "message": "Room is already full."
            }), 409

        # Prevent duplicate bed allocation
        occupied_bed = allocations.find_one({
            "room_number": room_number,
            "bed_number": bed_number,
            "status": "active"
        })

        if occupied_bed:
            return jsonify({
                "success": False,
                "message": "This bed is already allocated."
            }), 409

        # Save allocation
        allocation = {
            "allocation_id": uuid.uuid4().hex,
            "student_email": student_email,
            "block": room.get("location", ""),
            "room_number": room_number,
            "bed_number": bed_number,
            "status": "active",
            "created_at": current_time()
        }
        
        allocations.insert_one(allocation)

        # Update booking status after successful allocation
        bookings.update_one(
            {
                "booking_id": approved_booking["booking_id"],
                "status": "approved"
            },
            {
                "$set": {
                    "status": "allocated",
                    "updated_at": current_time()
                }
            }
        )

        return jsonify({
            "success": True,
            "message": "Room allocated successfully."
        }), 201

    except Exception:
        app.logger.exception("Room allocation error")

        return jsonify({
            "success": False,
            "message": "Could not allocate room."
        }), 500  
 
@app.post("/api/student/bookings")
@student_required
def create_booking():

    data = request.get_json(silent=True) or {}

    preferred_block = str(data.get("preferred_block", "")).strip()
    room_type = str(data.get("room_type", "")).strip()
    reason = str(data.get("reason", "")).strip()

    if not preferred_block or not room_type or not reason:
        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400

    try:
        student_email = session["user_email"]

        existing_allocation = allocations.find_one({
            "student_email": student_email,
            "status": "active"
        })

        if existing_allocation:
            return jsonify({
                "success": False,
                "message": "You already have a hostel room allocated."
            }), 409

        existing_booking = bookings.find_one({
            "student_email": student_email,
            "status": "pending"
        })

        if existing_booking:
            return jsonify({
                "success": False,
                "message": "You already have a pending booking request."
            }), 409

        booking = {
            "booking_id": uuid.uuid4().hex,
            "student_email": student_email,
            "preferred_block": preferred_block,
            "room_type": room_type,
            "reason": reason,
            "status": "pending",
            "admin_response": "",
            "created_at": current_time()
        }

        bookings.insert_one(booking)

        return jsonify({
            "success": True,
            "message": "Booking request submitted successfully."
        }), 201

    except Exception:
        app.logger.exception("Booking request error")

        return jsonify({
            "success": False,
            "message": "Could not submit booking request."
        }), 500


@app.get("/api/student/bookings")
@student_required
def get_student_bookings():

    try:
        student_email = session["user_email"]

        student_bookings = list(
            bookings.find(
                {"student_email": student_email},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        return jsonify({
            "success": True,
            "bookings": student_bookings
        }), 200

    except Exception:
        app.logger.exception("Get student bookings error")

        return jsonify({
            "success": False,
            "message": "Could not load booking history."
        }), 500

        
# --------------------------------------------------
# GET STUDENT PAYMENT HISTORY
# --------------------------------------------------

@app.get("/api/student/payments")
@student_required
def get_payments():

    try:
        records = list(
            payments.find(
                {"student_email": session["user_email"]},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        # Convert MongoDB values into JSON-safe values
        for payment in records:
            if "created_at" in payment:
                payment["created_at"] = payment["created_at"].isoformat()

        return jsonify({
            "success": True,
            "payments": records
        }), 200

    except Exception:
        app.logger.exception("Payment history loading error")

        return jsonify({
            "success": False,
            "message": "Could not load payment history."
        }), 500

# --------------------------------------------------
# 9. PAYMENTS AND RECEIPT UPLOAD
# --------------------------------------------------


@app.post("/api/student/payments")
@student_required
def submit_payment():

    try:
        payment_type = request.form.get("type", "").strip()
        amount = request.form.get("amount", "").strip()
        payment_date = request.form.get("payment_date", "").strip()
        receipt = request.files.get("receipt")

        if payment_type not in [
            "Hostel Fee", "Electricity", "Water Bill", "Other"
        ]:
            return jsonify({
                "success": False,
                "message": "Please select a valid payment type."
            }), 400

        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Enter a valid payment amount."
            }), 400

        if not payment_date:
            return jsonify({
                "success": False,
                "message": "Payment date is required."
            }), 400

        if not receipt or receipt.filename == "":
            return jsonify({
                "success": False,
                "message": "Please upload your payment receipt."
            }), 400

        if not allowed_file(receipt.filename):
            return jsonify({
                "success": False,
                "message": "Only PNG, JPG, JPEG and PDF files are allowed."
            }), 400

        original_name = secure_filename(receipt.filename)
        extension = original_name.rsplit(".", 1)[1].lower()
        saved_name = f"{uuid.uuid4().hex}.{extension}"

        receipt.save(
            os.path.join(UPLOAD_FOLDER, saved_name)
        )

        payment = {
            "payment_id": uuid.uuid4().hex,
            "student_email": session["user_email"],
            "type": payment_type,
            "amount": amount,
            "payment_date": payment_date,
            "receipt_file": saved_name,
            "status": "pending",
            "created_at": current_time()
        }

        payments.insert_one(payment)

        return jsonify({
            "success": True,
            "message": "Payment receipt submitted successfully.",
            "payment_id": payment["payment_id"],
            "status": "pending"
        }), 201

    except Exception:
        app.logger.exception("Payment submission error")

        return jsonify({
            "success": False,
            "message": "Could not submit payment."
        }), 500



# --------------------------------------------------
# 10. COMPLAINTS
# --------------------------------------------------

@app.get("/api/student/complaints")
@student_required
def get_complaints():

    try:
        records = list(
            complaints.find(
                {"student_email": session["user_email"]},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        return jsonify({
            "success": True,
            "complaints": records
        }), 200

    except Exception:
        app.logger.exception("Complaint loading error")

        return jsonify({
            "success": False,
            "message": "Could not load complaints."
        }), 500


@app.post("/api/student/complaints")
@student_required
def submit_complaint():

    data = request.get_json(silent=True) or {}

    category = data.get("category", "").strip()
    description = data.get("description", "").strip()

    if not category or not description:
        return jsonify({
            "success": False,
            "message": "Category and description are required."
        }), 400

    if len(description) > 2000:
        return jsonify({
            "success": False,
            "message": "Description is too long."
        }), 400

    try:
        complaint = {
            "complaint_id": uuid.uuid4().hex,
            "student_email": session["user_email"],
            "category": category,
            "description": description,
            "status": "pending",
            "admin_response": "",
            "created_at": current_time()
        }

        complaints.insert_one(complaint)

        return jsonify({
            "success": True,
            "message": "Complaint submitted successfully.",
            "complaint_id": complaint["complaint_id"]
        }), 201

    except Exception:
        app.logger.exception("Complaint submission error")

        return jsonify({
            "success": False,
            "message": "Could not submit complaint."
        }), 500
        
        
# --------------------------------------------------
# ADMIN - COMPLAINT MANAGEMENT
# --------------------------------------------------

@app.get("/api/admin/complaints")
@admin_required
def get_admin_complaints():

    try:
        records = list(
            complaints.find(
                {},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        for complaint in records:
            if isinstance(complaint.get("created_at"), datetime):
                complaint["created_at"] = (
                    complaint["created_at"].isoformat()
                )

            student = users.find_one(
                {
                    "email": complaint.get("student_email"),
                    "role": "student"
                },
                {
                    "_id": 0,
                    "name": 1,
                    "student_id": 1
                }
            )

            complaint["student_name"] = (
                student.get("name", "Unknown")
                if student else "Unknown"
            )

            complaint["student_id"] = (
                student.get("student_id", "N/A")
                if student else "N/A"
            )

        return jsonify({
            "success": True,
            "complaints": records,
            "total": len(records)
        }), 200

    except Exception:
        app.logger.exception("Admin complaint loading error")

        return jsonify({
            "success": False,
            "message": "Could not load complaints."
        }), 500


# --------------------------------------------------
# ADMIN - UPDATE COMPLAINT
# --------------------------------------------------

@app.put("/api/admin/complaints/<complaint_id>")
@admin_required
def update_admin_complaint(complaint_id):

    data = request.get_json(silent=True) or {}

    status = str(data.get("status", "")).strip().lower()
    admin_response = str(
        data.get("admin_response", "")
    ).strip()

    allowed_statuses = [
        "pending",
        "in_progress",
        "resolved"
    ]

    if status not in allowed_statuses:
        return jsonify({
            "success": False,
            "message": "Invalid complaint status."
        }), 400

    if len(admin_response) > 2000:
        return jsonify({
            "success": False,
            "message": "Admin response is too long."
        }), 400

    try:
        result = complaints.update_one(
            {"complaint_id": complaint_id},
            {
                "$set": {
                    "status": status,
                    "admin_response": admin_response,
                    "reviewed_at": current_time(),
                    "reviewed_by": session["user_email"]
                }
            }
        )

        if result.matched_count == 0:
            return jsonify({
                "success": False,
                "message": "Complaint not found."
            }), 404

        return jsonify({
            "success": True,
            "message": "Complaint updated successfully.",
            "complaint_id": complaint_id,
            "status": status
        }), 200

    except Exception:
        app.logger.exception("Complaint update error")

        return jsonify({
            "success": False,
            "message": "Could not update complaint."
        }), 500


# --------------------------------------------------
# 11. IN / OUT RECORDS
# --------------------------------------------------

@app.get("/api/student/attendance")
@student_required
def get_attendance():

    try:
        records = list(
            attendance.find(
                {"student_email": session["user_email"]},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        latest = records[0] if records else None

        current_status = (
            "inside"
            if latest and latest["action"] == "check_in"
            else "outside"
        )

        return jsonify({
            "success": True,
            "current_status": current_status,
            "records": records
        }), 200

    except Exception:
        app.logger.exception("Attendance loading error")

        return jsonify({
            "success": False,
            "message": "Could not load attendance records."
        }), 500



@app.post("/api/student/attendance")
@student_required
def record_attendance():

    data = request.get_json(silent=True) or {}

    action = data.get("action", "").strip().lower()
    late_reason = data.get("late_reason", "").strip()
    late_description = data.get("late_description", "").strip()

    if action not in ("check_in", "check_out"):
        return jsonify({
            "success": False,
            "message": "Invalid attendance action."
        }), 400

    try:
        # Get Sri Lankan local time from server
        now_local = datetime.now(ZoneInfo("Asia/Colombo"))

        # Late period: 8:30 PM to 5:00 AM
        current_minutes = now_local.hour * 60 + now_local.minute
      

        late_start = (20 * 60) + 30
        late_end = 5 * 60

        is_late = (
           current_minutes >= late_start
           or current_minutes < late_end
)

        # Late reason validation
        allowed_reasons = [
            "Medical Reason",
            "Transport Delay",
            "University Work",
            "Personal Emergency",
            "Other"
        ]

        if is_late:
            if late_reason not in allowed_reasons:
                return jsonify({
                    "success": False,
                    "message": "Please select a valid late reason."
                }), 400

            if not late_description:
                return jsonify({
                    "success": False,
                    "message": "Please explain your late reason."
                }), 400

            if len(late_description) > 1000:
                return jsonify({
                    "success": False,
                    "message": "Late description is too long."
                }), 400

        # Check current attendance status
        latest = attendance.find_one(
            {"student_email": session["user_email"]},
            sort=[("created_at", -1)]
        )

        current_status = (
            "inside"
            if latest and latest["action"] == "check_in"
            else "outside"
        )

        if action == "check_in" and current_status == "inside":
            return jsonify({
                "success": False,
                "message": "You are already checked in."
            }), 409

        if action == "check_out" and current_status == "outside":
            return jsonify({
                "success": False,
                "message": "You are already checked out."
            }), 409

        # Create attendance record
        record = {
            "record_id": uuid.uuid4().hex,
            "student_email": session["user_email"],
            "action": action,
            "is_late": is_late,
            "late_reason": late_reason if is_late else "",
            "late_description": late_description if is_late else "",
            "created_at": current_time()
        }

        attendance.insert_one(record)

        # Create Admin notification for late activity
        if is_late:

            notification = {
                "notification_id": uuid.uuid4().hex,
                "student_email": session["user_email"],
                "title": "Late Attendance Alert",
                "message": (
                    f"Student {session['user_email']} "
                    f"performed {action.replace('_', ' ')} after 8:30 PM."
                ),
                "action": action,
                "late_reason": late_reason,
                "late_description": late_description,
                "activity_time": now_local.isoformat(),
                "status": "unread",
                "created_at": current_time()
            }

            notifications.insert_one(notification)

        return jsonify({
            "success": True,
            "message": (
                "Late attendance submitted successfully. "
                "Admin has been notified."
                if is_late
                else "Attendance recorded successfully."
            ),
            "action": action,
            "late_activity": is_late,
            "created_at": record["created_at"].isoformat()
        }), 201

    except Exception:
        app.logger.exception("Attendance recording error")

        return jsonify({
            "success": False,
            "message": "Could not record attendance."
        }), 500
        
# --------------------------------------------------
# ADMIN - LATE ATTENDANCE NOTIFICATIONS
# --------------------------------------------------

@app.get("/api/admin/notifications")
@admin_required
def get_admin_notifications():

    try:
        records = list(
            notifications.find(
                {},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        for record in records:
            if record.get("created_at"):
                record["created_at"] = (
                    record["created_at"].isoformat()
                )

        unread_count = notifications.count_documents({
            "status": "unread"
        })

        return jsonify({
            "success": True,
            "notifications": records,
            "unread_count": unread_count
        }), 200

    except Exception:
        app.logger.exception("Notification loading error")

        return jsonify({
            "success": False,
            "message": "Could not load notifications."
        }), 500


# --------------------------------------------------
# ADMIN - MARK NOTIFICATION AS READ
# --------------------------------------------------

@app.post("/api/admin/notifications/<notification_id>/read")
@admin_required
def mark_notification_as_read(notification_id):

    try:
        result = notifications.update_one(
            {
                "notification_id": notification_id
            },
            {
                "$set": {
                    "status": "read"
                }
            }
        )

        if result.matched_count == 0:
            return jsonify({
                "success": False,
                "message": "Notification not found."
            }), 404

        return jsonify({
            "success": True,
            "message": "Notification marked as read."
        }), 200

    except Exception:
        app.logger.exception("Mark notification error")

        return jsonify({
            "success": False,
            "message": "Could not update notification."
        }), 500


# --------------------------------------------------
# ADMIN - PAYMENT MANAGEMENT
# --------------------------------------------------

# 1. GET ALL STUDENT PAYMENTS

@app.get("/api/admin/payments")
@admin_required
def get_admin_payments():

    try:
        records = list(
            payments.find(
                {},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        for payment in records:

            if payment.get("created_at"):
                payment["created_at"] = (
                    payment["created_at"].isoformat()
                )

            # Get student details
            student = users.find_one(
                {
                    "email": payment.get("student_email"),
                    "role": "student"
                },
                {
                    "_id": 0,
                    "name": 1,
                    "student_id": 1
                }
            )

            payment["student_name"] = (
                student.get("name", "Unknown")
                if student else "Unknown"
            )

            payment["student_id"] = (
                student.get("student_id", "N/A")
                if student else "N/A"
            )

            # Add receipt URL
            payment["receipt_url"] = (
                f"/api/admin/payments/"
                f"{payment.get('payment_id')}/receipt"
            )

        return jsonify({
            "success": True,
            "payments": records,
            "total": len(records)
        }), 200

    except Exception:
        app.logger.exception("Admin payment loading error")

        return jsonify({
            "success": False,
            "message": "Could not load payments."
        }), 500


# 2. VIEW PAYMENT RECEIPT

@app.get("/api/admin/payments/<payment_id>/receipt")
@admin_required
def view_payment_receipt(payment_id):

    try:
        payment = payments.find_one({
            "payment_id": payment_id
        })

        if not payment:
            return jsonify({
                "success": False,
                "message": "Payment not found."
            }), 404

        receipt_file = payment.get("receipt_file", "")

        if not receipt_file:
            return jsonify({
                "success": False,
                "message": "Receipt not found."
            }), 404

        # Prevent unsafe file paths
        if os.path.basename(receipt_file) != receipt_file:
            return jsonify({
                "success": False,
                "message": "Invalid receipt file."
            }), 400

        file_path = os.path.join(
            UPLOAD_FOLDER,
            receipt_file
        )

        if not os.path.isfile(file_path):
            return jsonify({
                "success": False,
                "message": "Receipt file does not exist."
            }), 404

        return send_from_directory(
            UPLOAD_FOLDER,
            receipt_file,
            as_attachment=False
        )

    except Exception:
        app.logger.exception("Receipt viewing error")

        return jsonify({
            "success": False,
            "message": "Could not open receipt."
        }), 500


# 3. APPROVE OR REJECT PAYMENT

@app.post("/api/admin/payments/<payment_id>/decision")
@admin_required
def update_payment_decision(payment_id):

    data = request.get_json(silent=True) or {}

    decision = str(
        data.get("decision", "")
    ).strip().lower()

    if decision not in ("verified", "rejected"):
        return jsonify({
            "success": False,
            "message": "Invalid payment decision."
        }), 400

    try:
        result = payments.update_one(
            {
                "payment_id": payment_id,
                "status": "pending"
            },
            {
                "$set": {
                    "status": decision,
                    "reviewed_at": current_time(),
                    "reviewed_by": session["user_email"]
                }
            }
        )

        if result.matched_count == 0:

            payment = payments.find_one({
                "payment_id": payment_id
            })

            if not payment:
                return jsonify({
                    "success": False,
                    "message": "Payment not found."
                }), 404

            return jsonify({
                "success": False,
                "message": "This payment has already been reviewed."
            }), 409

        return jsonify({
            "success": True,
            "message": (
                "Payment verified successfully."
                if decision == "verified"
                else "Payment rejected successfully."
            ),
            "payment_id": payment_id,
            "status": decision
        }), 200

    except Exception:
        app.logger.exception("Payment decision error")

        return jsonify({
            "success": False,
            "message": "Could not update payment status."
        }), 500


# --------------------------------------------------
# 12. LOGOUT
# --------------------------------------------------

@app.post("/api/logout")
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    }), 200


# --------------------------------------------------
# 13. ERROR HANDLERS
# --------------------------------------------------

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({
        "success": False,
        "message": "File is too large. Maximum size is 5 MB."
    }), 413


# --------------------------------------------------
# 14. RUN SERVER
# --------------------------------------------------

if __name__ == "__main__":
    try:
        client.admin.command("ping")
        print("MongoDB Connected Successfully!")
    except Exception:
        print("WARNING: MongoDB connection failed!")

    app.run(
        host="127.0.0.1",
        port=int(os.getenv("PORT", "5000")),
        debug=False
    )
