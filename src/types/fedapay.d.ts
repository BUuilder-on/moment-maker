declare global {
  interface Window {
    FedaPay: {
      init: (
        selector: string,
        config: {
          public_key: string;
          environment?: 'sandbox' | 'live';
          onComplete?: (reason: string, transaction?: any) => void;
        }
      ) => void;
      // Alternative: init with inline config (for programmatic usage)
      CHECKOUT_COMPLETED: string;
      DIALOG_DISMISSED: string;
      // Legacy constants (kept for backwards compatibility)
      CHECKOUT_COMPLETE?: string;
      CHECKOUT_CANCELED?: string;
    };
  }
}

export {};
