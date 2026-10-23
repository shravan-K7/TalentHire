import { useEffect, useRef } from 'react';
import { googleLogin } from '../js/auth';

function GoogleSignIn({ onLogin, onError }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer;

    function initializeGoogleSignIn() {
      if (
        cancelled ||
        !window.google?.accounts?.id ||
        !buttonRef.current
      ) {
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const data = await googleLogin(response.credential);
              onLogin(data.user);
            } catch (error) {
              onError?.(error.message || 'Google sign-in failed.');
            }
          },
        });

        buttonRef.current.innerHTML = '';

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 280,
        });
      } catch (err) {
        console.error('Failed to initialize Google Sign-In:', err);
      }
    }

    if (window.google?.accounts?.id) {
      initializeGoogleSignIn();
      return () => {
        cancelled = true;
      };
    }

    timer = setInterval(() => {
      attempts += 1;

      if (window.google?.accounts?.id) {
        clearInterval(timer);
        initializeGoogleSignIn();
      } else if (attempts >= 40) {
        clearInterval(timer);
        onError?.(
          'Google Sign-In could not load. Refresh and try again.'
        );
      }
    }, 200);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [onLogin, onError]);

  return <div ref={buttonRef}></div>;
}

export default GoogleSignIn;
