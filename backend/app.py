import google.generativeai as genai
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
import random, smtplib, re
from email.mime.text import MIMEText
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

# LOCKED MODEL: gemini-flash-latest
genai.configure(api_key="AIzaSyCpk9dWYlfJ_2pYPT6lM3_j9a2ItQdn8p8")
model = genai.GenerativeModel('gemini-flash-latest')

client = MongoClient("mongodb+srv://admin:Palak.1505@zenith-trip.wg9gbwl.mongodb.net/?appName=zenith-trip")
db = client['zenith_db']

def _cors(res):
    res.headers.add("Access-Control-Allow-Origin", "*")
    return res

@app.route('/api/plan', methods=['POST', 'OPTIONS'])
def generate_plan():
    if request.method == 'OPTIONS': return make_response("", 200)
    try:
        d = request.json
        # Strictly instruction-based prompt to avoid "chatty" or "backticked" output
        prompt = f"""
        Act as a Zenith Premium Travel Concierge. Create a luxury 3-day itinerary for {d['destination']}.
        Total Budget: {d['budget']} INR. Duration: {d['days']} Days, {d['nights']} Nights.
        
        Strict Formatting Rules:
        1. Start directly with the itinerary headers.
        2. Use '### DAY X:' for headers.
        3. Use bullet points '•' for activities.
        4. No markdown code blocks (```).
        5. No long introductory or concluding AI notes.
        6. Focus on a balance of premium spots and budget management.
        """
        response = model.generate_content(prompt)
        
        # CLEANING: Remove any accidental markdown wrappers like ```markdown or ```
        raw_text = response.text
        clean_text = re.sub(r'```(?:markdown|json|text)?\n?', '', raw_text)
        clean_text = clean_text.replace('```', '').strip()
        
        return _cors(jsonify({"plan": clean_text}))
    except Exception as e: 
        return _cors(make_response(jsonify({"error": str(e)}), 500))

# --- Keep your OTP/Verify functions below ---
@app.route('/api/send-otp', methods=['POST', 'OPTIONS'])
def send_otp():
    if request.method == 'OPTIONS': return make_response("", 200)
    email = request.json.get('email')
    otp = str(random.randint(100000, 999999))
    db.otps.update_one({"email": email}, {"$set": {"otp": otp}}, upsert=True)
    try:
        msg = MIMEText(f"Zenith Code: {otp}")
        msg['Subject'] = 'Login Verification'; msg['From'] = "palak.it26@jecrc.ac.in"; msg['To'] = email
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as s:
            s.login("palak.it26@jecrc.ac.in", "iaak xefu ndim gvof")
            s.send_message(msg)
        return _cors(jsonify({"status": "sent"}))
    except Exception as e: return _cors(make_response(jsonify({"error": str(e)}), 500))

@app.route('/api/verify-otp', methods=['POST', 'OPTIONS'])
def verify_otp():
    if request.method == 'OPTIONS': return make_response("", 200)
    data = request.json
    record = db.otps.find_one({"email": data.get('email')})
    if record and record['otp'] == data.get('otp'): return _cors(jsonify({"status": "success"}))
    return _cors(make_response(jsonify({"status": "fail"}), 401))

if __name__ == '__main__':
    app.run(debug=True, port=5001)