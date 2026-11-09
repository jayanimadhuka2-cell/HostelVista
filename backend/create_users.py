
import os
from getpass import getpass

from dotenv import load_dotenv
from pymongo import MongoClient
from werkzeug.security import generate_password_hash

# Load the existing backend configuration
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

mongo_uri = os.getenv(
    "MONGO_URI",
    "mongodb://localhost:27017/"
)
db_name = os.getenv("DB_NAME", "hostelvista")

client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)


def create_account(db, role):
    print(f"\n--- Create {role.title()} Account ---")

    name = input("Full name: ").strip()
    email = input("Email: ").strip().lower()

    if not name or "@" not in email:
        print("Please enter a name and a valid email.")
        return

    # Do not display passwords while typing
    password = getpass("Create password (at least 8 characters): ")
    confirm = getpass("Confirm password: ")

    if len(password) < 8:
        print("Password must contain at least 8 characters.")
        return

    if password != confirm:
        print("Passwords do not match.")
        return

    users = db["users"]

    # Do not overwrite an existing account
    if users.find_one({"email": email}):
        print("This email already exists. No account was changed.")
        return

    user = {
        "name": name,
        "email": email,
        "role": role,
        "password_hash": generate_password_hash(password)
    }

    users.insert_one(user)
    print(f"{role.title()} account created successfully!")


try:
    # Check MongoDB connection first
    client.admin.command("ping")
    db = client[db_name]

    create_account(db, "admin")
    create_account(db, "student")

    print("\nAccount setup finished.")

except Exception as error:
    print("\nCould not create accounts.")
    print("Check that MongoDB is running and backend/.env is correct.")
    print("Error type:", type(error).__name__)

finally:
    client.close()
