"""
CREDIX AI - Flask Application Backend
BFSI Underwriting Engine & AI Advisory Proxy
"""

import os
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests

app = Flask(__name__, static_folder='.')
CORS(app)

DATA_STORE_PATH = os.path.join(os.path.dirname(__file__), 'records_db.json')

def load_local_db():
    if os.path.exists(DATA_STORE_PATH):
        try:
            with open(DATA_STORE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_local_db(records):
    try:
        with open(DATA_STORE_PATH, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2)
    except Exception as e:
        print(f"Error saving to DB: {e}")

@app.route('/')
def index():
    """Serve main static index.html"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve static CSS, JS, and asset files"""
    return send_from_directory('.', path)

@app.route('/api/check-eligibility', methods=['POST'])
def check_eligibility():
    """
    Loan Eligibility Underwriting Endpoint
    Rules:
    - Monthly Salary > 30,000
    - Credit Score > 700
    - Existing EMI < 20,000
    - Age >= 21
    Eligible Loan Amount = Monthly Salary * 20
    """
    try:
        data = request.get_json() or {}
        name = data.get('applicantName', 'Anonymous')
        age = int(data.get('age', 0))
        salary = float(data.get('salary', 0))
        credit_score = int(data.get('creditScore', 0))
        existing_emi = float(data.get('existingEmi', 0))
        purpose = data.get('loanPurpose', 'General')

        # Business Rules
        pass_salary = salary > 30000
        pass_score = credit_score > 700
        pass_emi = existing_emi < 20000
        pass_age = age >= 21

        is_approved = pass_salary and pass_score and pass_emi and pass_age
        eligible_amount = int(salary * 20) if is_approved else 0

        dti = round((existing_emi / salary * 100), 1) if salary > 0 else 0
        max_affordable_emi = max(0, round((salary * 0.40) - existing_emi))

        # Risk Classification
        if is_approved:
            risk = 'Low Risk' if dti <= 30 else 'Moderate Risk'
        else:
            failed_count = sum([not pass_salary, not pass_score, not pass_emi, not pass_age])
            risk = 'High Risk' if failed_count >= 2 or credit_score < 600 else 'Moderate Risk'

        record = {
            'id': f"APP-{int(datetime.now().timestamp())}",
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'name': name,
            'age': age,
            'salary': salary,
            'creditScore': credit_score,
            'existingEmi': existing_emi,
            'purpose': purpose,
            'status': 'Approved' if is_approved else 'Rejected',
            'eligibleAmount': eligible_amount,
            'riskClassification': risk,
            'dtiRatio': f"{dti}%",
            'maxAffordableEmi': max_affordable_emi,
            'criteria': {
                'passSalary': pass_salary,
                'passScore': pass_score,
                'passEmi': pass_emi,
                'passAge': pass_age
            }
        }

        # Auto save record
        records = load_local_db()
        records.insert(0, record)
        save_local_db(records)

        return jsonify({'success': True, 'data': record})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/calculate-emi', methods=['POST'])
def calculate_emi():
    """
    Reducing-balance EMI endpoint:
    EMI = [P * R * (1+R)^N] / [(1+R)^N - 1]
    """
    try:
        data = request.get_json() or {}
        p = float(data.get('principal', 1000000))
        annual_rate = float(data.get('annualRate', 8.5))
        tenure_months = int(data.get('tenureMonths', 120))

        if p <= 0 or annual_rate <= 0 or tenure_months <= 0:
            return jsonify({'success': False, 'error': 'Invalid loan parameters'}), 400

        r = annual_rate / 12 / 100
        factor = (1 + r) ** tenure_months
        emi = (p * r * factor) / (factor - 1)
        total_payable = emi * tenure_months
        total_interest = total_payable - p

        return jsonify({
            'success': True,
            'monthlyEmi': round(emi),
            'principal': round(p),
            'totalInterest': round(total_interest),
            'totalAmountPayable': round(total_payable)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/ai-advisory', methods=['POST'])
def ai_advisory():
    """
    Financial Reasoning using Groq / Claude API or Local Deterministic Engine
    """
    try:
        data = request.get_json() or {}
        prompt = data.get('prompt', '')
        provider = data.get('provider', 'built-in')
        groq_key = os.environ.get('GROQ_API_KEY') or data.get('groqApiKey')

        if provider == 'groq' and groq_key:
            res = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {groq_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'llama-3.3-70b-versatile',
                    'messages': [
                        {
                            'role': 'system',
                            'content': 'You are an expert BFSI Credit Underwriting and Financial Risk Officer for Credix AI. Provide clear, highly actionable, structured advice on loan eligibility, reducing-balance EMIs, CIBIL credit repair, and debt management.'
                        },
                        {'role': 'user', 'content': prompt}
                    ],
                    'max_tokens': 600,
                    'temperature': 0.6
                },
                timeout=15
            )
            if res.ok:
                resp_json = res.json()
                return jsonify({'success': True, 'response': resp_json['choices'][0]['message']['content']})

        # Fallback local expert reasoning
        return jsonify({
            'success': True,
            'response': 'BFSI Underwriting Guideline: Maintain your Fixed Obligation to Income Ratio (FOIR) under 40-50% and keep your credit utilization below 30% for steady financial credibility and loan approval.'
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/records', methods=['GET'])
def get_records():
    return jsonify({'success': True, 'records': load_local_db()})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Credix AI Flask Server starting at http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
