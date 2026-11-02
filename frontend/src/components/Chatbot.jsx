
import { useState, useEffect, useRef } from "react";
import "../css/Chatbot.css";

const supportOptions = {
  main: {
    message:
      "Hello! Welcome to TalentHire Support. How can I help you today?",
    options: [
      { label: "Find an Artist", next: "findArtist" },
      { label: "Booking Help", next: "booking" },
      { label: "Payments & Refunds", next: "payments" },
      { label: "Artist Account", next: "artist" },
      { label: "Account & Login", next: "account" },
      { label: "Contact Support", next: "contact" },
    ],
  },

  findArtist: {
    message: "What would you like to know about finding artists?",
    options: [
      {
        label: "How to browse artists?",
        answer:
          "Visit the TalentHire home page and explore the available artist categories. Select an artist to view their profile and portfolio.",
      },
      {
        label: "Artist categories",
        answer:
          "TalentHire provides different performing artist categories such as singers, dancers, DJs, musicians, orchestras and anchors. Browse the available categories on the home page.",
      },
      {
        label: "Artist profiles",
        answer:
          "Artist profiles contain information such as stage name, category, biography, location, starting price and portfolio.",
      },
    ],
  },

  booking: {
    message: "Select a booking-related question.",
    options: [
      {
        label: "How to book an artist?",
        answer:
          "Browse artists, select an artist profile, review their details and submit a booking request with your event information.",
      },
      {
        label: "Check booking status",
        answer:
          "Log in to your customer account and visit your bookings section to check your booking status.",
      },
      {
        label: "Cancel a booking",
        answer:
          "Visit your bookings section and check the available cancellation options. Contact support if you need further assistance.",
      },
    ],
  },

  payments: {
    message: "What payment assistance do you need?",
    options: [
      {
        label: "Payment methods",
        answer:
          "Available payment methods will be displayed during the checkout process.",
      },
      {
        label: "Payment failed",
        answer:
          "Check your payment status and transaction details before trying again. Contact support if the payment issue continues.",
      },
      {
        label: "Refund information",
        answer:
          "Refund requests depend on the booking and payment status. Contact TalentHire support with your booking and transaction details.",
      },
    ],
  },

  artist: {
    message: "How can we help with your artist account?",
    options: [
      {
        label: "Register as an artist",
        answer:
          "Create a TalentHire account or log in, then select Register as a Performing Artist to complete your artist profile.",
      },
      {
        label: "Manage artist profile",
        answer:
          "Log in to your artist account and open your artist dashboard to manage your profile.",
      },
      {
        label: "Booking requests",
        answer:
          "Artists can view and manage incoming booking requests from their artist dashboard.",
      },
    ],
  },

  account: {
    message: "Select an account-related topic.",
    options: [
      {
        label: "Create an account",
        answer:
          "Click Register on TalentHire and enter the required account details.",
      },
      {
        label: "Login help",
        answer:
          "Enter your registered username or email and password on the Login page.",
      },
      {
        label: "Google login",
        answer:
          "Use the Continue with Google option on the Login page to sign in with your Google account.",
      },
      {
        label: "Forgot password",
        answer:
          "Use the password reset option on the Login page if available.",
      },
    ],
  },

  contact: {
    message:
      "For further assistance, please contact the TalentHire support team through the Contact section of our website.",
    options: [],
  },
};

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState("main");
  const [history, setHistory] = useState([]);
  const [answer, setAnswer] = useState("");

  const messagesEndRef = useRef(null);

  const currentOptions = supportOptions[currentStep];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [currentStep, answer, isOpen]);

  function handleOptionClick(option) {
    setAnswer("");

    if (option.next) {
      setHistory((previous) => [
        ...previous,
        currentStep,
      ]);

      setCurrentStep(option.next);
    } else {
      setAnswer(option.answer);
    }
  }

  function goBack() {
    if (history.length === 0) {
      goToMainMenu();
      return;
    }

    const previousStep = history[history.length - 1];

    setCurrentStep(previousStep);
    setHistory((previous) => previous.slice(0, -1));
    setAnswer("");
  }

  function goToMainMenu() {
    setCurrentStep("main");
    setHistory([]);
    setAnswer("");
  }

  return (
    <div className="chatbot">

      {isOpen && (
        <section className="chatbot-window">

          <header className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  <path d="M19 19v1a2 2 0 0 1-2 2h-3" />
                </svg>
              </div>
              <div>
                <strong>TalentHire Support</strong>
                <small>How can we help you?</small>
              </div>
            </div>

            <button
              type="button"
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close support"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div className="chatbot-messages">

            <div className="chat-message assistant">
              {currentOptions.message}
            </div>

            <div className="chatbot-options">
              {currentOptions.options.map((option) => (
                <button
                  type="button"
                  key={option.label}
                  className="chatbot-option"
                  onClick={() => handleOptionClick(option)}
                >
                  {option.label}
                  <span> ›</span>
                </button>
              ))}
            </div>

            {answer && (
              <div className="chat-message assistant chatbot-answer">
                {answer}
              </div>
            )}

            <div ref={messagesEndRef} />

          </div>

          <footer className="chatbot-footer">

            <button
              type="button"
              onClick={goBack}
              disabled={history.length === 0}
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={goToMainMenu}
            >
              Main Menu
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentStep("contact");
                setHistory([]);
                setAnswer("");
              }}
            >
              Contact Support
            </button>

          </footer>

        </section>
      )}

      <button
        type="button"
        className={`chatbot-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Close Support" : "Support"}
        title={isOpen ? "Close Support" : "Support"}
      >
        {isOpen ? (
          <svg
            className="chatbot-toggle-icon"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            className="chatbot-toggle-icon"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            <path d="M19 19v1a2 2 0 0 1-2 2h-3" />
          </svg>
        )}
      </button>

    </div>
  );
}

export default Chatbot;
