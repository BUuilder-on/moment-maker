declare global {
  interface Window {
    FedaPay: {
      init: (config: {
        public_key: string;
        transaction: {
          amount: number;
          description: string;
          custom_id?: string;
        };
        customer: {
          email: string;
          lastname: string;
        };
        onComplete: (response: {
          reason: string;
        }) => void;
      }) => {
        open: () => void;
      };
      CHECKOUT_COMPLETE: string;
    };
  }
}

export {};
