# Credix AI | Intelligent BFSI Loan Eligibility & Financial Advisory Suite

Demo : https://drive.google.com/file/d/1T4es7TTiXU0vJcyD-bEpAVMXbBAwfpqW/view

Document : https://1drv.ms/w/c/554CFF5685301CFC/IQBFbOl7cDVJTqIuECr8JvZJAXwtHpS9ktkszUj6gK4hQQY?e=bUm5jJ

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-success)](https://developer.mozilla.org/)
[![Backend](https://img.shields.io/badge/Backend-Python%20Flask-blue)](https://flask.palletsprojects.com/)
[![AI Models](https://img.shields.io/badge/AI-Groq%20LLaMA%203.3%20%7C%20Claude%203.5-purple)](https://console.groq.com/)
[![Storage](https://img.shields.io/badge/Database-Serverless%20Google%20Sheets-green)](https://developers.google.com/apps-script)

An AI-powered BFSI (Banking, Financial Services, and Insurance) platform engineered to simplify financial decision-making for applicants and loan underwriters. The suite integrates deterministic rule validation, reducing-balance EMI actuarial simulations, multi-tier credit score risk profiling, and contextual AI reasoning powered by **Groq LLaMA 3.3** and **Anthropic Claude 3.5**.

---

## 🏛️ Project Architecture & Milestones Summary

### **Milestone 1: Planning & Architecture Setup**
- **Domain Scope:** BFSI retail credit underwriting, CIBIL credit score evaluation, and reducing-balance actuarial mathematics.
- **Architecture:** Zero-dependency client-first design for instantaneous, serverless deployment on static hosting (GitHub Pages, Vercel, Netlify), backed optionally by a Python Flask microservice (`app.py`) for enterprise API proxying and Ngrok tunneling.

### **Milestone 2: Frontend & UI Development**
- **Design Philosophy:** Ultra-modern dark fintech glassmorphism design system (`styles.css`).
- **Visuals:** Layered backdrop blur (`backdrop-filter: blur(18px)`), ambient neon glow orbs, responsive CSS Grid and Flexbox layouts, dynamic micro-animations, and custom typography (`Outfit`, `Plus Jakarta Sans`, `JetBrains Mono`).

### **Milestone 3: Core Financial Feature Development**
1. **Loan Eligibility Engine (Milestone 3.1):**
   - **Monthly Salary:** Must exceed ₹30,000.
   - **Credit Score:** Must be greater than 700.
   - **Existing EMI Obligations:** Must remain below ₹20,000.
   - **Applicant Age:** Must be at least 21 years.
   - **Borrowing Capacity Formula:**
     $$\text{Eligible Loan Amount} = \text{Monthly Salary} \times 20$$
2. **Credit Score Analyzer (Milestone 3.2):**
   - Multi-tier bureau risk classification:
     - **Excellent (750–900):** Prime lowest rates, negligible default probability, >95% approval odds.
     - **Good (650–749):** Standard commercial rates, moderate risk, ~75-85% approval odds.
     - **Poor (300–649):** High default risk, subprime pricing, actionable 90-day recovery roadmap.
3. **Reducing-Balance EMI Calculator (Milestone 3.3):**
   - Standard mathematical reducing-balance formula:
     $$\text{EMI} = \frac{P \times R \times (1 + R)^N}{(1 + R)^N - 1}$$
     *Where $P$ = Principal Loan Amount, $R$ = Monthly Interest Rate ($\frac{\text{Annual Rate}}{12 \times 100}$), $N$ = Loan Tenure in Months.*
   - Interactive Chart.js Donut visualization (Principal vs. Interest share).
   - Complete annual amortization table with CSV export.

### **Milestone 4: Client Logic & Integration**
- **Vanilla JavaScript (`script.js`):** Client-side state handling, dynamic DOM updates, real-time input criteria checklist feedback, and instant recalculations.
- **Claude & Groq AI Reasoning (Milestone 4.2):** Live LLM integration via Groq Cloud (`llama-3.3-70b-versatile`) or Anthropic Claude, plus a deterministic offline expert system that guarantees zero downtime.
- **Google Sheets Serverless Sync (Milestone 4.3):** Direct asynchronous POST webhook integration via Google Apps Script (`google_apps_script.js`), appending underwriting records directly to Google Sheets without complex server infrastructure.

### **Milestone 5: Testing & Deployment**
- Static hosting ready (GitHub Pages).
- Python Flask development server ready with Ngrok public tunneling support.

---

## 🚀 Quick Start Guide

### Option 1: Run Instantly (No Installation Required)
Simply double-click or open **[`index.html`](file:///c:/Users/kunal%20khyade/OneDrive/Desktop/AI-loan-checker/index.html)** in any modern web browser (Chrome, Edge, Firefox, Safari). All features, calculations, charts, and the built-in AI expert engine work immediately offline!

---

### Option 2: Run with Python Flask Server
If you wish to run the Python backend:

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **(Optional) Set Groq or Anthropic API Keys in your environment:**
   ```bash
   # In Windows PowerShell:
   $env:GROQ_API_KEY="your-groq-api-key"
   # Or in Command Prompt:
   set GROQ_API_KEY=your-groq-api-key
   ```

3. **Launch Flask Server:**
   ```bash
   python app.py
   ```
   Open your browser at `http://localhost:5000`.

---

### Option 3: Expose Publicly using Ngrok
To share your local Flask development server with external reviewers:
```bash
# After starting python app.py on port 5000:
ngrok http 5000
```
Copy the secure `https://....ngrok-free.app` URL and test on mobile or remote devices!

---

## 📊 Google Sheets Serverless Integration

To save applicant records automatically into your own Google Sheet:

1. Create a new Google Spreadsheet at [sheets.new](https://sheets.new).
2. Go to **Extensions > Apps Script**.
3. Copy and paste the code from [`google_apps_script.js`](file:///c:/Users/kunal%20khyade/OneDrive/Desktop/AI-loan-checker/google_apps_script.js).
4. Click **Deploy > New Deployment**.
5. Select type: **Web app**.
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
6. Click **Deploy**, authorize permissions, and copy the **Web App URL**.
7. In the Credix AI web interface, click the **Settings icon (Gear)** at top right, paste the URL, and click **Save Configuration**.

Now, every time you click **"Save & Sync"**, the record is saved locally and instantly appended to your Google Sheet!

---

## 📂 File Structure

```
AI-loan-checker/
│
├── index.html               # Main single-page application dashboard
├── styles.css               # Glassmorphism UI tokens, layout, and animations
├── script.js                # Core BFSI business logic, EMI formulas, Chart.js, & AI
├── app.py                   # Python Flask server & REST API proxy
├── requirements.txt         # Python package dependencies
├── google_apps_script.js    # Ready-to-deploy Google Apps Script Webhook
└── README.md                # Comprehensive documentation & setup instructions
```

---

## 🔒 Security & BFSI Compliance
- API keys entered via the settings drawer are stored locally in the browser's `localStorage` and never transmitted to untrusted third parties.
- Standard BFSI Fixed Obligation to Income Ratio (FOIR) is benchmarked against the 40-50% threshold to prevent customer over-indebtedness.
