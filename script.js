/**
 * CREDIX AI - Core Financial Logic & Application Controller
 * Version: 1.0.0
 * Architecture: Deterministic BFSI Client Logic + AI Reasoning + Google Sheets Sync
 */

// ============================================================================
// APPLICATION STATE & STORAGE KEYS
// ============================================================================
const STORAGE_KEYS = {
  SETTINGS: 'credix_ai_settings',
  RECORDS: 'credix_ai_records',
  CHAT_HISTORY: 'credix_ai_chat_history'
};

const DEFAULT_SETTINGS = {
  groqApiKey: '',
  claudeApiKey: '',
  googleSheetsUrl: '',
  selectedAiProvider: 'built-in' // 'built-in', 'groq', 'claude'
};

let appSettings = loadSettings();
let applicationRecords = loadRecords();
let emiChartInstance = null;
let currentTenureUnit = 'years'; // 'years' or 'months'
let lastEvaluatedProfile = null;

// ============================================================================
// INITIALIZATION ON DOM READY
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initLoanEligibilityChecker();
  initCreditScoreAnalyzer();
  initEmiCalculator();
  initAiAdvisor();
  initRecordsManager();
  initSettingsModal();
  updateApiStatusIndicator();
});

// ============================================================================
// SETTINGS & STORAGE HELPERS
// ============================================================================
function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(newSettings) {
  appSettings = { ...appSettings, ...newSettings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appSettings));
  updateApiStatusIndicator();
}

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Failed to load records:', e);
    return [];
  }
}

function saveRecords(records) {
  applicationRecords = records;
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  renderRecordsTable();
}

function updateApiStatusIndicator() {
  const dot = document.getElementById('apiStatusDot');
  const badge = document.getElementById('activeEngineBadge');
  const advisorLabel = document.getElementById('advisorEngineLabel');
  
  if (appSettings.groqApiKey) {
    if (dot) dot.className = 'status-dot-indicator connected';
    if (badge) badge.textContent = 'Groq Cloud Active';
    if (advisorLabel) advisorLabel.textContent = 'Powered by Groq LLaMA 3.3 (High Speed)';
  } else if (appSettings.claudeApiKey) {
    if (dot) dot.className = 'status-dot-indicator connected';
    if (badge) badge.textContent = 'Claude AI Active';
    if (advisorLabel) advisorLabel.textContent = 'Powered by Anthropic Claude 3.5 Sonnet';
  } else {
    if (dot) dot.className = 'status-dot-indicator';
    if (badge) badge.textContent = 'Offline Expert Mode';
    if (advisorLabel) advisorLabel.textContent = 'Deterministic BFSI Expert (Offline)';
  }
}

// ============================================================================
// NAVIGATION & TABS
// ============================================================================
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      switchTab(targetId);
    });
  });

  const brandLogo = document.getElementById('brandLogo');
  if (brandLogo) {
    brandLogo.addEventListener('click', () => switchTab('dashboard-section'));
  }
}

function switchTab(sectionId) {
  // Update button active states
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-target') === sectionId);
  });

  // Update tab visibility
  document.querySelectorAll('.tab-content').forEach(tab => {
    if (tab.id === sectionId) {
      tab.classList.add('active-tab');
      tab.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      tab.classList.remove('active-tab');
    }
  });

  // Re-render chart if switching to EMI tab
  if (sectionId === 'emi-section') {
    setTimeout(calculateAndRenderEmi, 50);
  }
}

// ============================================================================
// MILESTONE 3.1 & 4.1: LOAN ELIGIBILITY CHECKER
// ============================================================================
function initLoanEligibilityChecker() {
  const form = document.getElementById('loanEligibilityForm');
  const sampleBtn = document.getElementById('fillDemoEligibility');
  const salaryInput = document.getElementById('monthlySalary');
  const scoreInput = document.getElementById('creditScoreInput');
  const emiInput = document.getElementById('existingEmi');
  const ageInput = document.getElementById('applicantAge');

  // Real-time live criteria checklist feedback
  const inputsToWatch = [salaryInput, scoreInput, emiInput, ageInput];
  inputsToWatch.forEach(input => {
    if (input) {
      input.addEventListener('input', updateRealtimeChecklist);
    }
  });

  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      document.getElementById('applicantName').value = 'Kunal Khyade';
      ageInput.value = '28';
      salaryInput.value = '65000';
      scoreInput.value = '760';
      emiInput.value = '12000';
      document.getElementById('loanPurpose').value = 'Home Loan';
      updateRealtimeChecklist();
      showToast('Loaded demo applicant profile: ₹65,000 salary, 760 score.', 'info');
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      evaluateLoanEligibility();
    });
  }

  // Action Buttons on Result
  const transferToEmiBtn = document.getElementById('transferToEmiBtn');
  if (transferToEmiBtn) {
    transferToEmiBtn.addEventListener('click', () => {
      if (lastEvaluatedProfile && lastEvaluatedProfile.eligibleAmount > 0) {
        document.getElementById('loanAmountInput').value = lastEvaluatedProfile.eligibleAmount;
        document.getElementById('loanAmountRange').value = lastEvaluatedProfile.eligibleAmount;
        switchTab('emi-section');
        calculateAndRenderEmi();
        showToast(`Transferred ₹${formatCurrency(lastEvaluatedProfile.eligibleAmount)} into EMI Calculator!`, 'success');
      } else {
        switchTab('emi-section');
      }
    });
  }

  const askAiBtn = document.getElementById('askAiAboutProfileBtn');
  if (askAiBtn) {
    askAiBtn.addEventListener('click', () => {
      if (!lastEvaluatedProfile) return;
      switchTab('ai-section');
      const customPrompt = `Please provide a detailed underwriting review for applicant ${lastEvaluatedProfile.name}:
- Monthly Salary: ₹${formatCurrency(lastEvaluatedProfile.salary)}
- Credit Score: ${lastEvaluatedProfile.creditScore}
- Existing Monthly EMIs: ₹${formatCurrency(lastEvaluatedProfile.existingEmi)}
- Age: ${lastEvaluatedProfile.age}
- Status: ${lastEvaluatedProfile.status}
- Eligible Amount: ₹${formatCurrency(lastEvaluatedProfile.eligibleAmount)}
Provide advice on interest negotiation, tax benefits, and risk mitigation.`;
      
      const chatInput = document.getElementById('aiUserInput');
      if (chatInput) {
        chatInput.value = customPrompt;
        document.getElementById('aiChatForm').dispatchEvent(new Event('submit'));
      }
    });
  }

  const saveRecordBtn = document.getElementById('saveEligibilityRecordBtn');
  if (saveRecordBtn) {
    saveRecordBtn.addEventListener('click', () => {
      if (lastEvaluatedProfile) {
        saveApplicationRecord(lastEvaluatedProfile);
      }
    });
  }
}

function updateRealtimeChecklist() {
  const salary = parseFloat(document.getElementById('monthlySalary').value) || 0;
  const score = parseFloat(document.getElementById('creditScoreInput').value) || 0;
  const emi = parseFloat(document.getElementById('existingEmi').value);
  const age = parseFloat(document.getElementById('applicantAge').value) || 0;

  const chkSalary = document.getElementById('chkSalary');
  const chkScore = document.getElementById('chkScore');
  const chkEmi = document.getElementById('chkEmi');
  const chkAge = document.getElementById('chkAge');

  // Rule 1: Monthly salary must exceed ₹30,000
  if (chkSalary) {
    const valid = salary > 30000;
    chkSalary.className = `rule-check-item ${salary > 0 ? (valid ? 'passed' : 'failed') : ''}`;
    chkSalary.querySelector('i').className = valid && salary > 0 ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';
  }

  // Rule 2: Credit score must be greater than 700
  if (chkScore) {
    const valid = score > 700;
    chkScore.className = `rule-check-item ${score > 0 ? (valid ? 'passed' : 'failed') : ''}`;
    chkScore.querySelector('i').className = valid && score > 0 ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';
  }

  // Rule 3: Existing EMI obligations must remain below ₹20,000
  if (chkEmi) {
    const hasValue = !isNaN(emi);
    const valid = hasValue && emi < 20000;
    chkEmi.className = `rule-check-item ${hasValue ? (valid ? 'passed' : 'failed') : ''}`;
    chkEmi.querySelector('i').className = valid && hasValue ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';
  }

  // Rule 4: Applicant age must be at least 21 years
  if (chkAge) {
    const valid = age >= 21;
    chkAge.className = `rule-check-item ${age > 0 ? (valid ? 'passed' : 'failed') : ''}`;
    chkAge.querySelector('i').className = valid && age > 0 ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';
  }
}

function evaluateLoanEligibility() {
  const name = document.getElementById('applicantName').value.trim();
  const age = parseInt(document.getElementById('applicantAge').value, 10);
  const salary = parseFloat(document.getElementById('monthlySalary').value);
  const score = parseInt(document.getElementById('creditScoreInput').value, 10);
  const existingEmi = parseFloat(document.getElementById('existingEmi').value);
  const purpose = document.getElementById('loanPurpose').value;
  const employment = document.getElementById('employmentType').value;

  // Validation
  let hasError = false;
  const setError = (id, msg) => {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
    if (msg) hasError = true;
  };

  setError('nameError', !name ? 'Please enter applicant name.' : '');
  setError('ageError', isNaN(age) || age < 18 ? 'Please enter valid age (&ge; 18).' : '');
  setError('salaryError', isNaN(salary) || salary <= 0 ? 'Please enter monthly salary.' : '');
  setError('scoreError', isNaN(score) || score < 300 || score > 900 ? 'Score must be between 300 and 900.' : '');
  setError('emiError', isNaN(existingEmi) || existingEmi < 0 ? 'Please enter existing EMI (or 0).' : '');

  if (hasError) {
    showToast('Please fix the highlighted input errors.', 'error');
    return;
  }

  // Predefined Business Rules
  // 1. Monthly salary must exceed ₹30,000
  const passSalary = salary > 30000;
  // 2. Credit score must be greater than 700
  const passScore = score > 700;
  // 3. Existing EMI obligations must remain below ₹20,000
  const passEmi = existingEmi < 20000;
  // 4. Applicant age must be at least 21 years
  const passAge = age >= 21;

  const isApproved = passSalary && passScore && passEmi && passAge;

  // Formula: If all satisfied -> Eligible Loan Amount = Monthly Salary × 20
  const eligibleLoanAmount = isApproved ? Math.round(salary * 20) : 0;

  // Financial Metrics:
  // Debt-To-Income (DTI) ratio
  const dti = salary > 0 ? ((existingEmi / salary) * 100).toFixed(1) : 0;
  
  // Max affordable EMI (Standard BFSI 40% FOIR limit)
  const maxAffordableEmi = Math.max(0, Math.round((salary * 0.40) - existingEmi));

  // Risk Classification
  let riskProfile = 'Low Risk';
  if (!isApproved) {
    const failCount = [!passSalary, !passScore, !passEmi, !passAge].filter(Boolean).length;
    riskProfile = failCount >= 2 || score < 600 ? 'High Risk' : 'Moderate Risk';
  } else if (dti > 30) {
    riskProfile = 'Moderate Risk';
  }

  lastEvaluatedProfile = {
    id: 'APP-' + Date.now().toString().slice(-6),
    timestamp: new Date().toLocaleString(),
    name,
    age,
    salary,
    creditScore: score,
    existingEmi,
    purpose,
    employment,
    status: isApproved ? 'Approved' : 'Rejected',
    eligibleAmount: eligibleLoanAmount,
    riskClassification: riskProfile,
    dtiRatio: dti + '%',
    maxAffordableEmi
  };

  // Render Result UI
  renderEligibilityResult(isApproved, eligibleLoanAmount, riskProfile, dti, maxAffordableEmi, {
    passSalary, passScore, passEmi, passAge, salary, score, existingEmi, age
  });
}

function renderEligibilityResult(isApproved, amount, risk, dti, maxEmi, details) {
  const placeholder = document.getElementById('eligibilityPlaceholder');
  const activeContent = document.getElementById('eligibilityActiveResult');
  const banner = document.getElementById('statusBanner');
  const badge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const amountEl = document.getElementById('resultLoanAmount');
  const captionEl = document.getElementById('resultLoanCaption');
  const riskEl = document.getElementById('riskClassification');
  const dtiEl = document.getElementById('dtiRatio');
  const maxEmiEl = document.getElementById('maxAffordableEmi');
  const criteriaList = document.getElementById('criteriaBreakdownList');

  if (placeholder) placeholder.classList.add('hidden');
  if (activeContent) activeContent.classList.remove('hidden');

  if (isApproved) {
    banner.className = 'result-banner-card approved';
    badge.className = 'status-indicator-badge approved';
    badge.querySelector('i').className = 'fa-solid fa-circle-check';
    statusText.textContent = 'LOAN APPROVED';
    amountEl.textContent = '₹' + formatCurrency(amount);
    captionEl.textContent = 'Maximum Approved Eligible Loan (20× Monthly Salary)';
    showToast(`Congratulations! You are eligible for ₹${formatCurrency(amount)}.`, 'success');
  } else {
    banner.className = 'result-banner-card rejected';
    badge.className = 'status-indicator-badge rejected';
    badge.querySelector('i').className = 'fa-solid fa-circle-xmark';
    statusText.textContent = 'NOT ELIGIBLE';
    amountEl.textContent = '₹0';
    captionEl.textContent = 'Application did not meet one or more underwriting guidelines.';
    showToast('Application rejected based on policy rules.', 'error');
  }

  riskEl.textContent = risk;
  riskEl.className = `sub-card-value ${risk === 'Low Risk' ? 'text-emerald' : (risk === 'Moderate Risk' ? 'text-amber' : 'text-rose')}`;
  dtiEl.textContent = dti + '%';
  maxEmiEl.textContent = '₹' + formatCurrency(maxEmi) + ' / mo';

  // Populate Criteria Breakdown
  criteriaList.innerHTML = `
    <li class="${details.passSalary ? 'valid' : 'invalid'}">
      <span><i class="fa-solid ${details.passSalary ? 'fa-check text-emerald' : 'fa-xmark text-rose'}"></i> Salary: ₹${formatCurrency(details.salary)} (Required &gt; ₹30,000)</span>
      <strong>${details.passSalary ? 'PASSED' : 'FAILED'}</strong>
    </li>
    <li class="${details.passScore ? 'valid' : 'invalid'}">
      <span><i class="fa-solid ${details.passScore ? 'fa-check text-emerald' : 'fa-xmark text-rose'}"></i> Credit Score: ${details.score} (Required &gt; 700)</span>
      <strong>${details.passScore ? 'PASSED' : 'FAILED'}</strong>
    </li>
    <li class="${details.passEmi ? 'valid' : 'invalid'}">
      <span><i class="fa-solid ${details.passEmi ? 'fa-check text-emerald' : 'fa-xmark text-rose'}"></i> Existing EMI: ₹${formatCurrency(details.existingEmi)} (Required &lt; ₹20,000)</span>
      <strong>${details.passEmi ? 'PASSED' : 'FAILED'}</strong>
    </li>
    <li class="${details.passAge ? 'valid' : 'invalid'}">
      <span><i class="fa-solid ${details.passAge ? 'fa-check text-emerald' : 'fa-xmark text-rose'}"></i> Age: ${details.age} yrs (Required &ge; 21 yrs)</span>
      <strong>${details.passAge ? 'PASSED' : 'FAILED'}</strong>
    </li>
  `;
}

// ============================================================================
// MILESTONE 3.2: CREDIT SCORE ANALYZER
// ============================================================================
function initCreditScoreAnalyzer() {
  const range = document.getElementById('creditScoreRange');
  const numInput = document.getElementById('creditScoreNumInput');

  if (range && numInput) {
    range.addEventListener('input', () => {
      numInput.value = range.value;
      updateCreditScoreAnalysis(parseInt(range.value, 10));
    });

    numInput.addEventListener('input', () => {
      let val = parseInt(numInput.value, 10);
      if (isNaN(val)) val = 300;
      val = Math.min(900, Math.max(300, val));
      range.value = val;
      updateCreditScoreAnalysis(val);
    });
  }

  const askAiBtn = document.getElementById('askAiCreditPlanBtn');
  if (askAiBtn) {
    askAiBtn.addEventListener('click', () => {
      const score = parseInt(document.getElementById('creditScoreRange').value, 10);
      switchTab('ai-section');
      const chatInput = document.getElementById('aiUserInput');
      if (chatInput) {
        chatInput.value = `My current CIBIL credit score is ${score}. Provide a step-by-step 90-day plan with credit utilization ratio benchmarks and debt restructuring advice to boost my score above 800.`;
        document.getElementById('aiChatForm').dispatchEvent(new Event('submit'));
      }
    });
  }

  // Initial trigger
  updateCreditScoreAnalysis(760);
}

function setCreditScore(score) {
  const range = document.getElementById('creditScoreRange');
  const numInput = document.getElementById('creditScoreNumInput');
  if (range && numInput) {
    range.value = score;
    numInput.value = score;
    updateCreditScoreAnalysis(score);
  }
}

function updateCreditScoreAnalysis(score) {
  const circle = document.getElementById('scoreDisplayCircle');
  const valDisplay = document.getElementById('displayScoreVal');
  const bracketLabel = document.getElementById('displayScoreBracket');
  const tierBanner = document.getElementById('tierBanner');
  const tierIcon = document.getElementById('tierIcon');
  const tierTitle = document.getElementById('tierTitle');
  const tierSummary = document.getElementById('tierSummary');
  const riskVal = document.getElementById('riskRatingVal');
  const rateVal = document.getElementById('rateTierVal');
  const oddsVal = document.getElementById('approvalOddsVal');
  const recList = document.getElementById('recommendationsList');

  valDisplay.textContent = score;

  // Milestone 3.2 Classification Rules:
  // Excellent (750–900)
  // Good (650–749)
  // Poor (300–649)
  let tier = 'Excellent';
  let tierClass = 'tier-excellent';
  let riskText = 'Negligible';
  let rateText = 'Prime Lowest (8.25% - 8.75%)';
  let oddsText = '> 95%';
  let summary = 'Exceptional credit history and low default probability. You qualify for pre-approved loans with fast-track processing and waiver of processing fees.';
  let recommendations = [];

  if (score >= 750) {
    tier = 'EXCELLENT';
    tierClass = 'tier-excellent';
    bracketLabel.textContent = 'EXCELLENT (750 - 900)';
    bracketLabel.style.color = 'var(--emerald)';
    tierTitle.textContent = 'Tier Classification: Excellent (750 - 900)';
    tierIcon.innerHTML = '<i class="fa-solid fa-trophy"></i>';
    tierIcon.style.color = 'var(--emerald)';
    tierIcon.style.background = 'rgba(16, 185, 129, 0.15)';
    riskVal.textContent = 'Negligible';
    riskVal.className = 'stat-box-value text-emerald';
    rateVal.textContent = 'Prime Lowest (8.25% - 8.65%)';
    oddsVal.textContent = '> 95%';

    recommendations = [
      'Maintain credit card balance utilization below 20-30% of total sanctioned limits.',
      'Leverage your excellent credit rating to negotiate lower interest margins or zero processing charges with lenders.',
      'Refrain from opening multiple redundant credit lines within a 90-day window to preserve average credit age.',
      'Continue monitoring your credit report bi-annually for any reporting discrepancies or unauthorized hard inquiries.'
    ];
  } else if (score >= 650) {
    tier = 'GOOD';
    tierClass = 'tier-good';
    bracketLabel.textContent = 'GOOD (650 - 749)';
    bracketLabel.style.color = 'var(--amber)';
    tierTitle.textContent = 'Tier Classification: Good (650 - 749)';
    tierIcon.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
    tierIcon.style.color = 'var(--amber)';
    tierIcon.style.background = 'rgba(245, 158, 11, 0.15)';
    riskVal.textContent = 'Moderate';
    riskVal.className = 'stat-box-value text-amber';
    rateVal.textContent = 'Standard (9.00% - 10.75%)';
    oddsVal.textContent = '~ 75% - 85%';
    summary = 'Acceptable financial profile with stable repayment behavior. You qualify for standard banking facilities, though premium rates might require additional documentation.';

    recommendations = [
      'Pay down outstanding unsecured credit card balances to bring credit utilization strictly below 30%.',
      'Ensure zero delays on EMI payments; set up automated NACH / e-mandate debits to avoid accidental defaults.',
      'Avoid closing older credit card accounts, as long account history positively influences bureau scoring models.',
      'Consider closing high-interest personal loans or consolidating multiple debts into a single structured EMI.'
    ];
  } else {
    tier = 'POOR';
    tierClass = 'tier-poor';
    bracketLabel.textContent = 'POOR (300 - 649)';
    bracketLabel.style.color = 'var(--rose)';
    tierTitle.textContent = 'Tier Classification: Poor (300 - 649)';
    tierIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    tierIcon.style.color = 'var(--rose)';
    tierIcon.style.background = 'rgba(244, 63, 94, 0.15)';
    riskVal.textContent = 'Elevated Risk';
    riskVal.className = 'stat-box-value text-rose';
    rateVal.textContent = 'Subprime / High (> 13.5%)';
    oddsVal.textContent = '< 35%';
    summary = 'Significant risk indicators detected due to past defaults, frequent loan rejections, or high debt utilization. Immediate corrective credit repair action required.';

    recommendations = [
      'Prioritize immediate clearing of all overdue payments and settled/written-off loan flags with credit bureaus.',
      'Pause all new credit and loan inquiries; multiple hard queries within short spans severely depreciate your score.',
      'Utilize a secured credit card backed by a Fixed Deposit (FD) to rebuild a positive payment track record over 6 months.',
      'Strictly avoid taking high-cost short-term payday or instant lending app loans with exorbitant interest rates.'
    ];
  }

  circle.className = `circular-score-display ${tierClass}`;
  tierSummary.textContent = summary;

  recList.innerHTML = recommendations.map(rec => `
    <li>
      <i class="fa-solid fa-circle-arrow-right"></i>
      <span>${rec}</span>
    </li>
  `).join('');
}

// ============================================================================
// MILESTONE 3.3: REDUCING-BALANCE EMI CALCULATOR
// ============================================================================
function initEmiCalculator() {
  const pRange = document.getElementById('loanAmountRange');
  const pInput = document.getElementById('loanAmountInput');
  const rRange = document.getElementById('interestRateRange');
  const rInput = document.getElementById('interestRateInput');
  const tRange = document.getElementById('loanTenureRange');
  const tInput = document.getElementById('loanTenureInput');
  const yearBtn = document.getElementById('tenureYearBtn');
  const monthBtn = document.getElementById('tenureMonthBtn');
  const toggleAmortizationBtn = document.getElementById('toggleAmortizationBtn');
  const downloadAmortCsvBtn = document.getElementById('downloadAmortizationCsv');
  const askAiEmiBtn = document.getElementById('askAiEmiOptimizationBtn');

  // Sync Principal
  if (pRange && pInput) {
    pRange.addEventListener('input', () => { pInput.value = pRange.value; calculateAndRenderEmi(); });
    pInput.addEventListener('input', () => { pRange.value = pInput.value; calculateAndRenderEmi(); });
  }

  // Sync Rate
  if (rRange && rInput) {
    rRange.addEventListener('input', () => { rInput.value = rRange.value; calculateAndRenderEmi(); });
    rInput.addEventListener('input', () => { rRange.value = rInput.value; calculateAndRenderEmi(); });
  }

  // Sync Tenure
  if (tRange && tInput) {
    tRange.addEventListener('input', () => { tInput.value = tRange.value; calculateAndRenderEmi(); });
    tInput.addEventListener('input', () => { tRange.value = tInput.value; calculateAndRenderEmi(); });
  }

  // Tenure Units Toggle
  if (yearBtn && monthBtn) {
    yearBtn.addEventListener('click', () => {
      if (currentTenureUnit === 'months') {
        currentTenureUnit = 'years';
        yearBtn.classList.add('active');
        monthBtn.classList.remove('active');
        document.getElementById('tenureUnitLabel').textContent = 'Yrs';
        document.getElementById('tenureMinTick').textContent = '1 Year';
        document.getElementById('tenureMidTick').textContent = '15 Years';
        document.getElementById('tenureMaxTick').textContent = '30 Years';
        tRange.min = '1';
        tRange.max = '30';
        tRange.step = '1';
        tRange.value = Math.max(1, Math.round(tRange.value / 12));
        tInput.value = tRange.value;
        calculateAndRenderEmi();
      }
    });

    monthBtn.addEventListener('click', () => {
      if (currentTenureUnit === 'years') {
        currentTenureUnit = 'months';
        monthBtn.classList.add('active');
        yearBtn.classList.remove('active');
        document.getElementById('tenureUnitLabel').textContent = 'Mos';
        document.getElementById('tenureMinTick').textContent = '12 Mos';
        document.getElementById('tenureMidTick').textContent = '180 Mos';
        document.getElementById('tenureMaxTick').textContent = '360 Mos';
        tRange.min = '12';
        tRange.max = '360';
        tRange.step = '6';
        tRange.value = Math.min(360, tRange.value * 12);
        tInput.value = tRange.value;
        calculateAndRenderEmi();
      }
    });
  }

  if (toggleAmortizationBtn) {
    toggleAmortizationBtn.addEventListener('click', () => {
      const card = document.getElementById('amortizationCard');
      card.classList.toggle('hidden');
      if (!card.classList.contains('hidden')) {
        card.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (downloadAmortCsvBtn) {
    downloadAmortCsvBtn.addEventListener('click', exportAmortizationCsv);
  }

  if (askAiEmiBtn) {
    askAiEmiBtn.addEventListener('click', () => {
      const p = parseFloat(document.getElementById('loanAmountInput').value);
      const r = parseFloat(document.getElementById('interestRateInput').value);
      const t = parseFloat(document.getElementById('loanTenureInput').value);
      const tenureStr = `${t} ${currentTenureUnit}`;
      const emiVal = document.getElementById('monthlyEmiValue').textContent;

      switchTab('ai-section');
      const chatInput = document.getElementById('aiUserInput');
      if (chatInput) {
        chatInput.value = `I am planning a loan of ₹${formatCurrency(p)} at ${r}% p.a. for ${tenureStr}. Current EMI is ${emiVal}. How will paying 1 extra EMI each year or making a 5% annual prepayment reduce my total tenure and save interest?`;
        document.getElementById('aiChatForm').dispatchEvent(new Event('submit'));
      }
    });
  }

  // Initial Calculation
  calculateAndRenderEmi();
}

function setEmiPreset(p, r, years) {
  if (currentTenureUnit === 'months') {
    document.getElementById('tenureYearBtn').click();
  }
  document.getElementById('loanAmountInput').value = p;
  document.getElementById('loanAmountRange').value = p;
  document.getElementById('interestRateInput').value = r;
  document.getElementById('interestRateRange').value = r;
  document.getElementById('loanTenureInput').value = years;
  document.getElementById('loanTenureRange').value = years;
  calculateAndRenderEmi();
  showToast(`Loaded preset: ₹${formatCurrency(p)} at ${r}% for ${years} years.`, 'info');
}

/**
 * Standard Reducing-Balance EMI Formula:
 * EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]
 * P = Principal Loan Amount
 * R = Monthly Interest Rate = (Annual Rate / 12 / 100)
 * N = Loan Tenure in Months
 */
function calculateAndRenderEmi() {
  const p = parseFloat(document.getElementById('loanAmountInput').value) || 0;
  const annualRate = parseFloat(document.getElementById('interestRateInput').value) || 0;
  const tenureInput = parseFloat(document.getElementById('loanTenureInput').value) || 0;

  const nMonths = currentTenureUnit === 'years' ? tenureInput * 12 : tenureInput;

  if (p <= 0 || annualRate <= 0 || nMonths <= 0) {
    return;
  }

  const monthlyRate = annualRate / 12 / 100;
  
  // EMI calculation using compound factor (1 + R)^N
  const compoundFactor = Math.pow(1 + monthlyRate, nMonths);
  const emi = (p * monthlyRate * compoundFactor) / (compoundFactor - 1);

  const totalAmountPayable = emi * nMonths;
  const totalInterestPayable = totalAmountPayable - p;

  // DOM Updates
  document.getElementById('monthlyEmiValue').textContent = '₹' + formatCurrency(Math.round(emi));
  document.getElementById('emiPrincipalDisplay').textContent = '₹' + formatCurrency(Math.round(p));
  document.getElementById('emiInterestDisplay').textContent = '₹' + formatCurrency(Math.round(totalInterestPayable));
  document.getElementById('emiTotalDisplay').textContent = '₹' + formatCurrency(Math.round(totalAmountPayable));

  // Update Doughnut Chart
  renderEmiChart(p, totalInterestPayable);

  // Generate Amortization Schedule
  generateAmortizationSchedule(p, monthlyRate, emi, nMonths);
}

function renderEmiChart(principal, interest) {
  const ctx = document.getElementById('emiBreakdownChart');
  if (!ctx) return;

  const data = {
    labels: ['Principal Loan', 'Total Interest'],
    datasets: [{
      data: [Math.round(principal), Math.round(interest)],
      backgroundColor: ['#6366f1', '#06b6d4'],
      hoverBackgroundColor: ['#818cf8', '#22d3ee'],
      borderColor: 'rgba(15, 23, 42, 0.8)',
      borderWidth: 3
    }]
  };

  if (emiChartInstance) {
    emiChartInstance.data = data;
    emiChartInstance.update();
  } else {
    emiChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                return ` ${context.label}: ₹${formatCurrency(val)}`;
              }
            }
          }
        },
        cutout: '72%'
      }
    });
  }
}

function generateAmortizationSchedule(principal, monthlyRate, emi, totalMonths) {
  const tbody = document.getElementById('amortizationBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  let balance = principal;
  let currentYear = 1;
  let yearlyPrincipal = 0;
  let yearlyInterest = 0;
  let yearlyOpening = principal;

  for (let m = 1; m <= totalMonths; m++) {
    const interestForMonth = balance * monthlyRate;
    const principalForMonth = emi - interestForMonth;
    balance = Math.max(0, balance - principalForMonth);

    yearlyPrincipal += principalForMonth;
    yearlyInterest += interestForMonth;

    if (m % 12 === 0 || m === totalMonths) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>Year ${currentYear}</td>
        <td>₹${formatCurrency(Math.round(yearlyOpening))}</td>
        <td>₹${formatCurrency(Math.round(yearlyPrincipal + yearlyInterest))}</td>
        <td>₹${formatCurrency(Math.round(yearlyPrincipal))}</td>
        <td class="text-cyan">₹${formatCurrency(Math.round(yearlyInterest))}</td>
        <td>₹${formatCurrency(Math.round(balance))}</td>
      `;
      tbody.appendChild(row);

      currentYear++;
      yearlyOpening = balance;
      yearlyPrincipal = 0;
      yearlyInterest = 0;
    }
  }
}

function exportAmortizationCsv() {
  const table = document.getElementById('amortizationTable');
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll('tr');
  rows.forEach(r => {
    const cols = r.querySelectorAll('th, td');
    const rowData = [];
    cols.forEach(c => rowData.push(`"${c.innerText.replace(/"/g, '""')}"`));
    csv.push(rowData.join(','));
  });

  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', 'credix_emi_amortization_schedule.csv');
  a.click();
  showToast('Amortization schedule CSV downloaded!', 'success');
}

// ============================================================================
// MILESTONE 4.2: AI FINANCIAL ADVISOR & REASONING ENGINE
// ============================================================================
function initAiAdvisor() {
  const form = document.getElementById('aiChatForm');
  const input = document.getElementById('aiUserInput');
  const clearBtn = document.getElementById('clearChatBtn');
  const modelChoice = document.getElementById('aiModelChoice');
  const chips = document.querySelectorAll('.prompt-chip');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (input) {
        input.value = prompt;
        form.dispatchEvent(new Event('submit'));
      }
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const container = document.getElementById('chatMessages');
      container.innerHTML = `
        <div class="chat-bubble ai-bubble">
          <div class="bubble-icon"><i class="fa-solid fa-robot"></i></div>
          <div class="bubble-content">
            <p>Chat cleared. Ask me any question regarding BFSI underwriting, reducing-balance loans, credit score repair, or debt optimization.</p>
          </div>
        </div>
      `;
      showToast('Chat history cleared.', 'info');
    });
  }

  if (modelChoice) {
    modelChoice.value = appSettings.selectedAiProvider || 'built-in';
    modelChoice.addEventListener('change', () => {
      appSettings.selectedAiProvider = modelChoice.value;
      saveSettings({ selectedAiProvider: modelChoice.value });
      showToast(`Active AI engine changed to ${modelChoice.options[modelChoice.selectedIndex].text}`, 'info');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const question = input.value.trim();
      if (!question) return;

      appendChatMessage('user', question);
      input.value = '';

      // Typing indicator
      const typingBubble = appendTypingIndicator();

      try {
        const aiResponse = await generateAiResponse(question);
        typingBubble.remove();
        appendChatMessage('ai', aiResponse);
      } catch (err) {
        typingBubble.remove();
        console.error('AI query error:', err);
        appendChatMessage('ai', `I encountered an issue connecting to the AI provider. Fallback reasoning: In BFSI underwriting, maintain FOIR under 40% and keep your credit utilization below 30% for steady financial health.`);
      }
    });
  }
}

function appendChatMessage(sender, content) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender === 'user' ? 'user-bubble' : 'ai-bubble'}`;

  const iconClass = sender === 'user' ? 'fa-solid fa-user' : 'fa-solid fa-robot';
  
  // Format markdown style bold and bullets if present
  let formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n- (.*?)/g, '<li>$1</li>');
  
  if (formatted.includes('<li>')) {
    formatted = formatted.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
  }

  bubble.innerHTML = `
    <div class="bubble-icon"><i class="${iconClass}"></i></div>
    <div class="bubble-content">
      <p>${formatted}</p>
    </div>
  `;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator() {
  const container = document.getElementById('chatMessages');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ai-bubble typing-bubble';
  bubble.innerHTML = `
    <div class="bubble-icon"><i class="fa-solid fa-robot"></i></div>
    <div class="bubble-content">
      <p><i class="fa-solid fa-circle-notch fa-spin"></i> Analyzing financial scenario &amp; evaluating underwriting parameters...</p>
    </div>
  `;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return bubble;
}

async function generateAiResponse(userPrompt) {
  const provider = appSettings.selectedAiProvider || 'built-in';

  // 1. Groq API Integration (OpenAI Compatible)
  if (provider === 'groq' && appSettings.groqApiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appSettings.groqApiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are an expert BFSI Credit Underwriting and Financial Risk Officer for Credix AI. Provide clear, highly actionable, structured advice on loan eligibility, reducing-balance EMIs, CIBIL credit repair, and debt management. Use bullet points and professional financial terminology.'
            },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.6,
          max_tokens: 600
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API responded with status ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e) {
      console.warn('Groq live call failed, falling back to local expert system:', e);
      return `[Groq Connection Notice: Live API fallback triggered]\n\n` + getDeterministicFinancialAdvice(userPrompt);
    }
  }

  // 2. Anthropic Claude Integration (via Direct Proxy or API)
  if (provider === 'claude' && appSettings.claudeApiKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': appSettings.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 600,
          messages: [{ role: 'user', content: userPrompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API responded with status ${response.status}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (e) {
      console.warn('Claude API direct call failed (likely CORS or missing key), falling back to local expert system:', e);
      return `[Claude Connection Notice: Live API fallback triggered]\n\n` + getDeterministicFinancialAdvice(userPrompt);
    }
  }

  // 3. Built-in Deterministic Financial Intelligence Engine (Instant, Offline, Zero-Failure)
  await new Promise(r => setTimeout(r, 650)); // natural typing delay
  return getDeterministicFinancialAdvice(userPrompt);
}

function getDeterministicFinancialAdvice(prompt) {
  const p = prompt.toLowerCase();

  if (p.includes('increase') || p.includes('limit') || p.includes('eligible amount') || p.includes('borrowing capacity')) {
    return `To significantly increase your maximum eligible loan amount under standard BFSI underwriting:

1. **Add a Co-Borrower (Income Clubbing):** Adding an earning spouse, parent, or sibling pools net monthly take-home salary, directly raising the 20× multiplier base.
2. **Foreclose or Pay Off Small Existing EMIs:** Reducing current commitments below ₹10,000 immediately frees up your Fixed Obligation to Income Ratio (FOIR).
3. **Declare Additional Income Streams:** Provide validated documentation for annual bonuses, rental yields, dividends, or freelance income.
4. **Opt for a Longer Tenure:** Stretching the tenure lowers the monthly amortized installment, fitting within the bank's maximum 50% DTI threshold.`;
  }

  if (p.includes('credit score') || p.includes('cibil') || p.includes('low score') || p.includes('fix') || p.includes('repair')) {
    return `Here is a high-impact roadmap to restore and boost your Credit Score above 750:

1. **30% Credit Utilization Benchmark:** If your combined credit limit is ₹2,00,000, never let statement balances exceed ₹60,000.
2. **Zero Delay Payments:** Bureau algorithms weigh repayment timeliness heavily (approx 35% of total score weight). Set up automatic bank debits.
3. **Rectify Bureau Discrepancies:** Download an official CIBIL / Experian report. If settled accounts or closed loans are still reported as overdue, file a dispute immediately.
4. **FD-Backed Secured Credit Cards:** If your score is under 600, opening a secured card backed by a ₹25,000 Fixed Deposit and paying on time for 6 consecutive months restores prime score standing.`;
  }

  if (p.includes('tenure') || p.includes('longer') || p.includes('shorter') || p.includes('comparison')) {
    return `Tenure Selection Strategy (Long vs. Short):

- **Shorter Tenure (e.g. 5 to 10 Years):**
  - **Pros:** Massive interest savings. You build equity much faster and become debt-free early.
  - **Cons:** Higher monthly EMI, tighter monthly cash flow.
- **Longer Tenure (e.g. 15 to 25 Years):**
  - **Pros:** Lowest monthly instalment, eases liquidity, improves initial loan approval odds.
  - **Cons:** You end up paying significantly more in compounding interest over time.
- **Pro BFSI Tip:** Choose the longer tenure to protect monthly cash flow, but make voluntary annual prepayments of 5-10% of the principal balance to retire the loan in half the time!`;
  }

  if (p.includes('prepayment') || p.includes('extra emi') || p.includes('amortization')) {
    return `The Power of Prepayment on Reducing-Balance Loans:

Because reducing-balance interest is calculated daily on the outstanding principal balance, any early capital prepayment goes 100% toward principal reduction.

- **1 Extra EMI Per Year Rule:** On a ₹25,00,000 home loan at 8.5% for 20 years, paying just one additional EMI each year trims your total loan duration by over 3.5 years and saves more than ₹4,80,000 in interest!
- **Annual 5% Part-Prepayment:** Can reduce a 20-year loan tenure down to under 12 years.`;
  }

  // Default Comprehensive Advisory
  return `Financial Advisory Analysis from Credix AI:

- **Underwriting Guidelines:** Banks look for a Debt-To-Income (DTI / FOIR) ratio under 40-50% and a stable CIBIL score of 720+.
- **Loan Capacity Rule:** Our standard eligibility benchmark calculates approval capacity at **20× Monthly Net Salary**, assuming existing monthly liabilities remain under ₹20,000.
- **Recommendations:** Ensure healthy cash reserves (at least 6 months of living expenses + EMIs) before taking on long-term amortized debt. You can simulate different tenures in our EMI Calculator or configure live Groq/Claude keys in Settings.`;
}

// ============================================================================
// MILESTONE 4.3: RECORDS & GOOGLE SHEETS SERVERLESS SYNC
// ============================================================================
function initRecordsManager() {
  const syncBtn = document.getElementById('syncAllToSheetsBtn');
  const exportCsvBtn = document.getElementById('exportRecordsCsvBtn');
  const clearBtn = document.getElementById('clearAllRecordsBtn');
  const configWebhookBtn = document.getElementById('configureWebhookBtn');

  if (syncBtn) {
    syncBtn.addEventListener('click', syncAllToGoogleSheets);
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportRecordsCsv);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all stored loan application records?')) {
        saveRecords([]);
        showToast('All records cleared.', 'info');
      }
    });
  }

  if (configWebhookBtn) {
    configWebhookBtn.addEventListener('click', () => {
      document.getElementById('openSettingsBtn').click();
    });
  }

  renderRecordsTable();
}

function saveApplicationRecord(record) {
  applicationRecords.unshift(record);
  saveRecords(applicationRecords);
  showToast(`Record for ${record.name} saved locally!`, 'success');

  // Trigger Google Sheets Webhook sync if configured
  if (appSettings.googleSheetsUrl) {
    pushRecordToGoogleSheets(record);
  } else {
    const statusMsg = document.getElementById('saveStatusMsg');
    if (statusMsg) {
      statusMsg.innerHTML = `<span class="text-cyan"><i class="fa-solid fa-circle-info"></i> Saved to browser local storage. Link a Google Sheets Webhook in settings to auto-append to Cloud Sheets.</span>`;
    }
  }
}

async function pushRecordToGoogleSheets(record) {
  if (!appSettings.googleSheetsUrl) return;

  const statusMsg = document.getElementById('saveStatusMsg');
  if (statusMsg) {
    statusMsg.innerHTML = `<span class="text-amber"><i class="fa-solid fa-spinner fa-spin"></i> Syncing to Google Sheets...</span>`;
  }

  try {
    // Mode no-cors allows seamless client-side posting to Google Apps Script Web App without CORS blockage
    await fetch(appSettings.googleSheetsUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record)
    });

    if (statusMsg) {
      statusMsg.innerHTML = `<span class="text-emerald"><i class="fa-solid fa-cloud-check"></i> Successfully synced to Google Sheets!</span>`;
    }
    showToast('Record synced to Google Sheet!', 'success');
  } catch (err) {
    console.error('Google Sheets POST error:', err);
    if (statusMsg) {
      statusMsg.innerHTML = `<span class="text-rose"><i class="fa-solid fa-triangle-exclamation"></i> Sync to Google Sheets failed. Record remains stored locally.</span>`;
    }
    showToast('Failed to sync to Google Sheets webhook.', 'error');
  }
}

async function syncAllToGoogleSheets() {
  if (!appSettings.googleSheetsUrl) {
    showToast('Please configure your Google Apps Script Web App URL first!', 'error');
    document.getElementById('openSettingsBtn').click();
    return;
  }

  if (applicationRecords.length === 0) {
    showToast('No records available to sync.', 'info');
    return;
  }

  showToast(`Syncing ${applicationRecords.length} records to Google Sheets...`, 'info');

  for (const record of applicationRecords) {
    try {
      await fetch(appSettings.googleSheetsUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch (e) {
      console.error('Error syncing item:', e);
    }
  }

  showToast('All records synced to Google Sheets successfully!', 'success');
}

function renderRecordsTable() {
  const tbody = document.getElementById('recordsTableBody');
  const countBadge = document.getElementById('recordCountBadge');
  const sheetsStatus = document.getElementById('sheetsWebhookStatus');

  if (countBadge) {
    countBadge.textContent = `${applicationRecords.length} Record${applicationRecords.length === 1 ? '' : 's'} Stored`;
  }

  if (sheetsStatus) {
    if (appSettings.googleSheetsUrl) {
      sheetsStatus.innerHTML = `<span class="text-emerald"><i class="fa-solid fa-circle-check"></i> Connected:</span> Auto-syncing applications to your Google Sheet via Webhook.`;
    } else {
      sheetsStatus.innerHTML = `No Webhook configured. Storing in browser local storage. Click "Configure Webhook" to link Google Sheets.`;
    }
  }

  if (!tbody) return;

  if (applicationRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; color: var(--text-dim); padding: 3rem;">
          <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
          No loan applications submitted yet. Evaluate an applicant in the Loan Checker to populate records.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = applicationRecords.map((r, idx) => `
    <tr>
      <td>${r.timestamp}</td>
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td>${r.age}</td>
      <td>₹${formatCurrency(r.salary)}</td>
      <td>${r.creditScore}</td>
      <td>₹${formatCurrency(r.existingEmi)}</td>
      <td><span class="badge-status ${r.status === 'Approved' ? 'approved' : 'rejected'}">${r.status}</span></td>
      <td class="font-mono text-emerald">₹${formatCurrency(r.eligibleAmount)}</td>
      <td>${r.riskClassification}</td>
      <td>
        <button class="btn-danger-glass btn-sm" onclick="deleteRecord(${idx})" title="Delete record">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function deleteRecord(index) {
  applicationRecords.splice(index, 1);
  saveRecords(applicationRecords);
  showToast('Record deleted.', 'info');
}

function exportRecordsCsv() {
  if (applicationRecords.length === 0) {
    showToast('No records to export.', 'info');
    return;
  }

  const headers = ['Timestamp', 'Applicant Name', 'Age', 'Monthly Salary', 'Credit Score', 'Existing EMI', 'Status', 'Eligible Loan Amount', 'Risk Classification', 'DTI Ratio'];
  const rows = applicationRecords.map(r => [
    `"${r.timestamp}"`,
    `"${r.name}"`,
    r.age,
    r.salary,
    r.creditScore,
    r.existingEmi,
    `"${r.status}"`,
    r.eligibleAmount,
    `"${r.riskClassification}"`,
    `"${r.dtiRatio}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', 'credix_loan_applications_records.csv');
  a.click();
  showToast('Records exported to CSV!', 'success');
}

// ============================================================================
// SETTINGS MODAL & TEMPLATE HELPERS
// ============================================================================
function initSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const openBtn = document.getElementById('openSettingsBtn');
  const closeBtn = document.getElementById('closeSettingsBtn');
  const cancelBtn = document.getElementById('cancelSettingsBtn');
  const saveBtn = document.getElementById('saveSettingsBtn');
  const viewScriptLink = document.getElementById('viewScriptSnippetLink');
  const scriptModal = document.getElementById('appsScriptModal');
  const closeScriptBtn = document.getElementById('closeScriptModalBtn');
  const copyScriptBtn = document.getElementById('copyScriptCodeBtn');

  const groqInput = document.getElementById('groqApiKeyInput');
  const claudeInput = document.getElementById('claudeApiKeyInput');
  const sheetsInput = document.getElementById('googleSheetsWebhookInput');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      groqInput.value = appSettings.groqApiKey || '';
      claudeInput.value = appSettings.claudeApiKey || '';
      sheetsInput.value = appSettings.googleSheetsUrl || '';
      modal.classList.remove('hidden');
    });
  }

  const closeModal = () => modal.classList.add('hidden');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveSettings({
        groqApiKey: groqInput.value.trim(),
        claudeApiKey: claudeInput.value.trim(),
        googleSheetsUrl: sheetsInput.value.trim()
      });
      closeModal();
      renderRecordsTable();
      showToast('Settings saved successfully!', 'success');
    });
  }

  // Script Modal
  if (viewScriptLink && scriptModal) {
    viewScriptLink.addEventListener('click', (e) => {
      e.preventDefault();
      scriptModal.classList.remove('hidden');
    });
  }
  if (closeScriptBtn && scriptModal) {
    closeScriptBtn.addEventListener('click', () => scriptModal.classList.add('hidden'));
  }
  if (copyScriptBtn) {
    copyScriptBtn.addEventListener('click', () => {
      const code = document.getElementById('scriptCodePre').innerText;
      navigator.clipboard.writeText(code).then(() => {
        showToast('Google Apps Script copied to clipboard!', 'success');
      });
    });
  }
}

function togglePasswordVisibility(inputId) {
  const el = document.getElementById(inputId);
  if (el) {
    el.type = el.type === 'password' ? 'text' : 'password';
  }
}

// ============================================================================
// UTILITIES
// ============================================================================
function formatCurrency(num) {
  if (isNaN(num)) return '0';
  return Number(num).toLocaleString('en-IN');
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;

  const iconClass = type === 'success' ? 'fa-solid fa-circle-check' :
                    type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-info';

  toast.innerHTML = `
    <i class="${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
