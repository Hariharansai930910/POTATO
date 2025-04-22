// app.js
import { auth, db } from "./firebase-config.js";
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// *** GLOBAL AUTH CHECK ***
// Check authentication status and redirect if needed
onAuthStateChanged(auth, (user) => {
  // Store email in localStorage for reference in other pages
  if (user) {
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userId", user.uid);
    
    // Check if we're on the login page and redirect if already logged in
    if (window.location.pathname.endsWith('login-extended.html')) {
      console.log("User already logged in, redirecting to index");
      window.location.href = 'index.html';
    }
  } else {
    // If not logged in and not on login page, redirect to login
    if (!window.location.pathname.endsWith('login-extended.html')) {
      console.log("User not logged in, redirecting to login");
      window.location.href = 'login-extended.html';
    }
  }
});

// *** LOGIN PAGE ***
document.addEventListener('DOMContentLoaded', () => {
  // Login form handling
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    console.log("Login form detected, adding event listener");
    
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      const rememberMe = document.getElementById('remember-me')?.checked || false;
      
      try {
        // Show loading state if UI elements exist
        const loginButton = document.getElementById('login-button');
        const loginSpinner = document.getElementById('login-spinner');
        if (loginButton) loginButton.disabled = true;
        if (loginSpinner) loginSpinner.classList.remove('hidden');
        
        // Attempt to sign in
        await signInWithEmailAndPassword(auth, email, password);
        console.log("✅ Login successful");
        
        // Update user data
        const userRef = doc(db, "users_nearby", auth.currentUser.uid);
        await setDoc(userRef, {
          email: email,
          available_to_match: true,
          last_seen: new Date().toISOString()
        }, { merge: true });
        
        // Redirect to main page
        window.location.href = 'index.html';
      } catch (err) {
        console.error("Login error:", err.code, err.message);
        
        if (err.code === 'auth/user-not-found') {
          // User doesn't exist, try to create account
          try {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log("👶 New user created");
            
            // Create user data
            const userRef = doc(db, "users_nearby", auth.currentUser.uid);
            await setDoc(userRef, {
              email: email,
              available_to_match: true,
              last_seen: new Date().toISOString()
            });
            
            // Create empty wallet for new user
            const walletRef = doc(db, "users_wallets", email);
            await setDoc(walletRef, {
              balance: 100, // Starting balance for testing
              transactions: []
            });
            
            // Redirect to main page
            window.location.href = 'index.html';
          } catch (signupErr) {
            // Reset UI state
            const loginButton = document.getElementById('login-button');
            const loginSpinner = document.getElementById('login-spinner');
            if (loginButton) loginButton.disabled = false;
            if (loginSpinner) loginSpinner.classList.add('hidden');
            
            // Show error message
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) {
              errorMessage.textContent = `Signup failed: ${signupErr.message}`;
              errorMessage.classList.remove('hidden');
            } else {
              alert(`Signup failed: ${signupErr.message}`);
            }
          }
        } else {
          // Reset UI state
          const loginButton = document.getElementById('login-button');
          const loginSpinner = document.getElementById('login-spinner');
          if (loginButton) loginButton.disabled = false;
          if (loginSpinner) loginSpinner.classList.add('hidden');
          
          // Show error message
          const errorMessage = document.getElementById('error-message');
          if (errorMessage) {
            if (err.code === 'auth/wrong-password') {
              errorMessage.textContent = 'Incorrect password. Please try again.';
            } else {
              errorMessage.textContent = `Error: ${err.message}`;
            }
            errorMessage.classList.remove('hidden');
          } else {
            alert(`Login failed: ${err.message}`);
          }
        }
      }
    });
  }
  
  // Reset password form handling
  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('reset-email').value.trim();
      
      try {
        await sendPasswordResetEmail(auth, email);
        const successMessage = document.getElementById('reset-success');
        if (successMessage) {
          successMessage.textContent = 'Password reset email sent. Check your inbox.';
          successMessage.classList.remove('hidden');
        } else {
          alert('Password reset email sent. Check your inbox.');
        }
      } catch (err) {
        const errorMessage = document.getElementById('reset-error');
        if (errorMessage) {
          errorMessage.textContent = `Error: ${err.message}`;
          errorMessage.classList.remove('hidden');
        } else {
          alert(`Error: ${err.message}`);
        }
      }
    });
  }
});

// *** INDEX PAGE ***
// Find Match Button Logic
const findMatchBtn = document.getElementById('find-match-btn');
if (findMatchBtn) {
  findMatchBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent default form submission
    
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Please log in first");
        window.location.href = 'login-extended.html';
        return;
      }
      
      // Get form values - try multiple possible ID formats
      const foodName = document.querySelector('input[placeholder*="Pizza"]').value || 
                       document.getElementById('food-name')?.value || 
                       document.getElementById('foodInput')?.value;
                       
      const slicesWantedElement = document.querySelector('select[id*="slice"]') || 
                                 document.getElementById('slice-count') || 
                                 document.getElementById('sliceInput');
      const slicesWanted = parseInt(slicesWantedElement?.value || "4");
      
      const preferenceElement = document.querySelector('select[id*="meet"]') || 
                              document.getElementById('match-pref') || 
                              document.getElementById('matchPref');
      const deliveryPreference = preferenceElement?.value || "restaurant";
      
      const deliveryAddress = document.getElementById('delivery-address')?.value || '';
      
      if (!foodName) {
        alert("Please enter what food you're sharing");
        return;
      }
      
      console.log("Creating match with:", {
        food: foodName,
        slices: slicesWanted,
        preference: deliveryPreference
      });
      
      // Create match request in Firestore
      const matchRequestRef = db.collection("match_requests").doc();
      const requestId = matchRequestRef.id;
      
      await matchRequestRef.set({
        request_id: requestId,
        user_id: user.uid,
        user_email: user.email,
        food_name: foodName,
        slices_wanted: slicesWanted,
        delivery_preference: deliveryPreference,
        delivery_address: deliveryAddress,
        status: "waiting",
        created_at: new Date().toISOString(),
        payment_status: "pending"
      });
      
      // Store request ID in localStorage for reference
      localStorage.setItem("matchRequestId", requestId);
      
      console.log("✅ Match request created, redirecting to waiting page");
      window.location.href = 'waiting.html';
    } catch (err) {
      console.error("Error creating match request:", err);
      alert("Failed to create match request: " + err.message);
    }
  });
}

// *** WAITING PAGE ***
const cancelMatchBtn = document.getElementById('cancel-match');
if (cancelMatchBtn) {
  cancelMatchBtn.addEventListener('click', async () => {
    const requestId = localStorage.getItem("matchRequestId");
    
    if (requestId) {
      try {
        const requestRef = doc(db, "match_requests", requestId);
        await updateDoc(requestRef, {
          status: "cancelled",
          cancelled_at: new Date().toISOString()
        });
        
        console.log("✅ Match request cancelled");
        localStorage.removeItem("matchRequestId");
        window.location.href = 'index.html';
      } catch (err) {
        console.error("Error cancelling match:", err);
        alert("Failed to cancel match. Please try again.");
      }
    } else {
      console.log("No active match request found");
      window.location.href = 'index.html';
    }
  });
}

// *** RESPOND PAGE ***
const respondForm = document.getElementById('respond-form');
if (respondForm) {
  respondForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get('requestId');
    
    if (!requestId) {
      alert("Invalid request ID");
      window.location.href = 'index.html';
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first");
      window.location.href = 'login-extended.html';
      return;
    }
    
    const deliveryMethod = document.querySelector('input[name="delivery-method"]:checked')?.value;
    
    if (!deliveryMethod) {
      alert("Please select a delivery method");
      return;
    }
    
    try {
      // Update the match request
      const requestRef = doc(db, "match_requests", requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) {
        alert("Match request not found");
        window.location.href = 'index.html';
        return;
      }
      
      await updateDoc(requestRef, {
        status: "matched",
        matched_at: new Date().toISOString(),
        response_by: user.email,
        response_user_id: user.uid,
        delivery_method: deliveryMethod
      });
      
      console.log("✅ Match response submitted, redirecting to payment");
      
      // Store request ID for payment page
      localStorage.setItem("matchRequestId", requestId);
      
      // Redirect to payment page
      window.location.href = `payment-respond.html?requestId=${requestId}`;
    } catch (err) {
      console.error("Error responding to match:", err);
      alert("Failed to respond to match. Please try again.");
    }
  });
}

// *** PAYMENT RESPOND PAGE ***
const payButton = document.getElementById('payButton');
if (payButton) {
  payButton.addEventListener('click', async () => {
    // The click handler is implemented in the page itself
    // Just ensure it works with our authentication system
    if (!auth.currentUser) {
      alert("Please log in first");
      window.location.href = 'login-extended.html';
      return;
    }
  });
}

// *** ORDER SUMMARY PAGE ***
// This page loads details on its own via the script in the HTML
// Just ensure authentication is checked

// When DOM is fully loaded, log that app.js is connected
document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ app.js connected successfully to", window.location.pathname);
});
