function d(s) {
  return atob(s);
}

const delta = d("a291cm91cw==");
const alpha = d("bmlrb3M=");
const omega = d("QGdtYWls");
const zeta = d("Lg==");
const beta = d("Y29t");

const email = alpha + "." + delta + omega + zeta + beta;

const btn = document.getElementById("reveal-email");
const captchaContainer = document.getElementById("captcha-container");
const verifyBtn = document.getElementById("verify-captcha");
const instagramStandalone = document.getElementById("instagram-standalone");

let revealed = false;
let captchaShown = false;

btn.addEventListener("click", function() {
  if (!revealed && !captchaShown) {
    // First click: show CAPTCHA, hide standalone Instagram
    this.style.display = "none";
    captchaContainer.style.display = "block";
    instagramStandalone.style.display = "none";
    captchaShown = true;
  } else if (revealed) {
    // Copy to clipboard if already revealed
    navigator.clipboard.writeText(email).then(() => {
      const oldText = this.textContent;
      this.textContent = "Copied!";
      setTimeout(() => {
        this.textContent = oldText;
      }, 2000);
    });
  }
});

// This function runs immediately when user checks the box
function onCaptchaComplete(token) {
  // Hide the checkbox immediately
  document.querySelector('.g-recaptcha').style.display = 'none';
  
  // Show verifying state
  verifyBtn.textContent = "Verifying...";
  verifyBtn.disabled = true;
  
  // Auto-verify
  verifyEmail(token);
}

async function verifyEmail(captchaResponse) {
  try {
    const response = await fetch('/verify-captcha.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captchaResponse })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Hide entire CAPTCHA container, show email and standalone Instagram
      captchaContainer.style.display = "none";
      btn.style.display = "inline-block";
      btn.textContent = email;
      instagramStandalone.style.display = "inline-block";
      revealed = true;
      
      // Add copy functionality
      btn.addEventListener("mouseenter", function() {
        this.textContent = email + " (copy)";
      });
      
      btn.addEventListener("mouseleave", function() {
        this.textContent = email;
      });
    } else {
      // Reset on failure
      document.querySelector('.g-recaptcha').style.display = 'block';
      verifyBtn.textContent = "Verify & Show Email";
      verifyBtn.disabled = false;
      grecaptcha.reset();
      alert("CAPTCHA verification failed. Please try again.");
    }
  } catch (error) {
    // Reset on error
    document.querySelector('.g-recaptcha').style.display = 'block';
    verifyBtn.textContent = "Verify & Show Email";
    verifyBtn.disabled = false;
    alert("Verification error. Please try again.");
  }
}

// Keep the manual verify button as backup
verifyBtn.addEventListener("click", async function() {
  const captchaResponse = grecaptcha.getResponse();
  
  if (!captchaResponse) {
    alert("Please complete the CAPTCHA");
    return;
  }
  
  verifyEmail(captchaResponse);
});