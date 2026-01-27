interface CrispConversation {
  session_id: string;
  website_id: string;
  messages: Array<{
    type: string;
    from: string;
    content: string;
    timestamp: number;
  }>;
  meta: {
    email?: string;
    data?: Record<string, unknown>;
  };
  device?: {
    capabilities?: string[];
    geolocation?: {
      country?: string;
      city?: string;
    };
    system?: {
      os?: { name?: string; version?: string };
      browser?: { name?: string; version?: string };
    };
  };
}

interface CrispSDK {
  setHeight: (height: number) => void;
  acquireData: (namespace: 'conversation' | 'operator' | 'operators' | 'plugin_settings') => void;
  showToast: (type: 'success' | 'failure' | 'info', message: string, action?: { label: string; url: string }) => void;
  onDataAcquired: (callback: (namespace: string) => void) => void;
  data: {
    conversation?: CrispConversation;
    operator?: {
      user_id: string;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
}

declare global {
  interface Window {
    $crisp: CrispSDK;
    CRISP_READY_TRIGGER: () => void;
  }
}

export {};
