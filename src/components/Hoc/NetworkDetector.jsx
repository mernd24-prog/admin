import React, { useState, useEffect } from 'react';

function NetworkDetector(ComposedComponent) {
  const EnhancedComponent = (props) => {
    const [isDisconnected, setIsDisconnected] = useState(false);

    const handleConnectionChange = () => {
      const condition = navigator.onLine ? 'online' : 'offline';
      if (condition === 'online') {
        const webPing = setInterval(() => {
          fetch('//google.com', { mode: 'no-cors' })
            .then(() => {
              setIsDisconnected(false);
              clearInterval(webPing);
            })
            .catch(() => setIsDisconnected(true));
        }, 2000);
        return;
      }
      setIsDisconnected(true);
    };

    useEffect(() => {
      handleConnectionChange();
      window.addEventListener('online', handleConnectionChange);
      window.addEventListener('offline', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleConnectionChange);
        window.removeEventListener('offline', handleConnectionChange);
      };
    }, []);

    // console.log("isDisconnected  ", isDisconnected);

    return (
      <div>
        {isDisconnected && (
          <div className="internet-error">
            <p className="flex justify-center items-center bg-red-500 text-black text-bold py-2">No Internet Connection</p>
          </div>
        )}
        <ComposedComponent {...props} />
      </div>
    );
  };

  return EnhancedComponent;
}

export default NetworkDetector;
