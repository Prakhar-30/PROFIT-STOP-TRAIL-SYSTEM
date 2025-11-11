import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'profit_locking_contracts';

export const useContracts = (account) => {
  const [contracts, setContracts] = useState({
    callback: null,
    reactive: null,
  });

  const [isDeployed, setIsDeployed] = useState(false);

  // Load contracts from localStorage on mount
  useEffect(() => {
    if (account) {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${account.toLowerCase()}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setContracts(parsed);
          setIsDeployed(true);
        } catch (error) {
          console.error('Error loading contracts:', error);
        }
      }
    }
  }, [account]);

  const saveContracts = useCallback((callbackAddress, reactiveAddress) => {
    if (!account) return;

    const contractData = {
      callback: callbackAddress,
      reactive: reactiveAddress,
    };

    localStorage.setItem(`${STORAGE_KEY}_${account.toLowerCase()}`, JSON.stringify(contractData));
    setContracts(contractData);
    setIsDeployed(true);
  }, [account]);

  const clearContracts = useCallback(() => {
    if (!account) return;

    localStorage.removeItem(`${STORAGE_KEY}_${account.toLowerCase()}`);
    setContracts({
      callback: null,
      reactive: null,
    });
    setIsDeployed(false);
  }, [account]);

  return {
    contracts,
    isDeployed,
    saveContracts,
    clearContracts,
  };
};
