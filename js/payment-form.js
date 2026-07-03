/**
 * Reusable Payment Form Component
 * Renders an interactive credit card checkout form inside a specified container.
 */
(function () {
  window.PaymentForm = {
    render(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container #${containerId} not found.`);
        return;
      }

      const amount = options.amount || "₹99";
      const buttonText = options.buttonText || `Pay & Upgrade — ${amount}`;
      const onSuccess = options.onSuccess || function() {};

      // Inject HTML structure (Form inputs only, clean and minimal)
      container.innerHTML = `
        <div class="pay-form-wrapper">
          <!-- INPUT FORM -->
          <form class="pay-actual-form" id="checkoutForm" novalidate>
            <div class="pay-field">
              <label class="pay-label" for="cardName">Cardholder Name</label>
              <input type="text" id="cardName" class="pay-input" placeholder="e.g. Shruti Gupta" required autocomplete="cc-name">
            </div>

            <div class="pay-field">
              <label class="pay-label" for="cardNumber">Card Number</label>
              <div class="pay-input-with-icon">
                <input type="text" id="cardNumber" class="pay-input" placeholder="0000 0000 0000 0000" maxlength="19" required autocomplete="cc-number">
                <span class="pay-input-brand-icon" id="inputBrandIcon"></span>
              </div>
            </div>

            <div class="pay-row">
              <div class="pay-field">
                <label class="pay-label" for="cardExpiry">Expiration Date</label>
                <input type="text" id="cardExpiry" class="pay-input" placeholder="MM/YY" maxlength="5" required autocomplete="cc-exp">
              </div>
              <div class="pay-field">
                <label class="pay-label" for="cardCvv">CVV / CVC</label>
                <input type="password" id="cardCvv" class="pay-input" placeholder="•••" maxlength="4" required autocomplete="cc-csc">
              </div>
            </div>

            <div id="paymentError" class="pay-error-msg" style="display:none;"></div>

            <button type="submit" class="pay-submit-btn" id="paySubmitBtn">
              <span class="btn-text-content">${buttonText}</span>
              <div class="pay-btn-spinner" style="display:none;"></div>
            </button>
          </form>
        </div>
      `;

      // DOM Reference handles
      const inputBrandIcon = document.getElementById("inputBrandIcon");

      const cardNameInput = document.getElementById("cardName");
      const cardNumberInput = document.getElementById("cardNumber");
      const cardExpiryInput = document.getElementById("cardExpiry");
      const cardCvvInput = document.getElementById("cardCvv");
      const checkoutForm = document.getElementById("checkoutForm");
      const paySubmitBtn = document.getElementById("paySubmitBtn");
      const paymentError = document.getElementById("paymentError");

      // Dynamic Card Brand Logo detection
      function getBrand(number) {
        const cleaned = number.replace(/\D/g, "");
        if (cleaned.startsWith("4")) {
          return "visa";
        }
        if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(cleaned)) {
          return "mastercard";
        }
        if (/^(60|65|81|82)/.test(cleaned)) {
          return "rupay";
        }
        return "generic";
      }

      function updateBrandIcons(brand) {
        inputBrandIcon.className = `pay-input-brand-icon icon-${brand}`;
      }

      // Formatting card number & dynamic brand icon selection on input
      cardNumberInput.addEventListener("input", (e) => {
        let cursorPosition = e.target.selectionStart;
        let value = e.target.value;
        const previousLength = value.length;
        
        // Remove all non-digits
        const digits = value.replace(/\D/g, "");
        
        // Format with spaces
        let formatted = "";
        for (let i = 0; i < digits.length; i++) {
          if (i > 0 && i % 4 === 0) {
            formatted += " ";
          }
          formatted += digits[i];
        }
        
        e.target.value = formatted;
        
        // Adjust cursor position if space was added/removed
        if (cursorPosition !== null) {
          if (formatted.length > previousLength && formatted[cursorPosition - 1] === " ") {
            cursorPosition++;
          }
          e.target.setSelectionRange(cursorPosition, cursorPosition);
        }

        // Update card brand icon dynamically
        const brand = getBrand(digits);
        updateBrandIcons(brand);
      });

      // Format Expiration Date on input
      cardExpiryInput.addEventListener("input", (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 2) {
          val = val.slice(0, 2) + "/" + val.slice(2, 4);
        }
        e.target.value = val;
      });

      // Strip non-digits from CVV on input
      cardCvvInput.addEventListener("input", (e) => {
        const val = e.target.value.replace(/\D/g, "");
        e.target.value = val;
      });

      // Simple Luhn Algorithm validation (mocked for checkout testing convenience)
      function checkLuhn(cardNumber) {
        const cleaned = cardNumber.replace(/\D/g, "");
        return cleaned.length >= 13 && cleaned.length <= 19;
      }

      // Form validation error display helper
      function showError(msg) {
        paymentError.textContent = msg;
        paymentError.style.display = "block";
      }

      function hideError() {
        paymentError.textContent = "";
        paymentError.style.display = "none";
      }

      // Checkout form submission
      checkoutForm.addEventListener("submit", (e) => {
        e.preventDefault();
        hideError();

        const name = cardNameInput.value.trim();
        const number = cardNumberInput.value.replace(/\s/g, "");
        const expiry = cardExpiryInput.value.trim();
        const cvv = cardCvvInput.value.trim();

        if (!name) {
          showError("Please enter the cardholder name.");
          cardNameInput.focus();
          return;
        }
        if (number.length < 13 || !checkLuhn(number)) {
          showError("Please enter a valid credit card number.");
          cardNumberInput.focus();
          return;
        }
        if (expiry.length < 5 || !/^\d{2}\/\d{2}$/.test(expiry)) {
          showError("Please enter a valid expiration date (MM/YY).");
          cardExpiryInput.focus();
          return;
        }
        const [month, year] = expiry.split("/").map(Number);
        if (month < 1 || month > 12) {
          showError("Expiration month must be between 01 and 12.");
          cardExpiryInput.focus();
          return;
        }
        // Skip current date expiry checks for testing convenience
        if (cvv.length < 3) {
          showError("Please enter a valid 3 or 4 digit CVV.");
          cardCvvInput.focus();
          return;
        }

        // Visual loading transition state
        paySubmitBtn.disabled = true;
        const textSpan = paySubmitBtn.querySelector(".btn-text-content");
        const spinner = paySubmitBtn.querySelector(".pay-btn-spinner");
        if (textSpan) textSpan.textContent = "Processing payment...";
        if (spinner) spinner.style.display = "block";

        // Mock processor delay (1.8 seconds)
        setTimeout(() => {
          if (textSpan) textSpan.textContent = "Upgrade Complete!";
          if (spinner) spinner.style.display = "none";
          paySubmitBtn.classList.add("payment-success");

          setTimeout(() => {
            onSuccess({
              cardholderName: name,
              cardBrand: getBrand(number)
            });
          }, 600);
        }, 1800);
      });
    }
  };
})();
