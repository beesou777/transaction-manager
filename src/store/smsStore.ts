import { create } from 'zustand';
import { storageService } from '@/storage/asyncStorage';
import { Platform, PermissionsAndroid } from 'react-native';
import { parseSMSMessage, ParsedTransaction } from '@/utils/smsParser';
import { DEMO_MODE } from '@/constants/demoMode';
import { getDemoSMSMessages, getDemoAvailableSenders } from '@/utils/demoData';

// Dynamically import SMS reading package
let ReadSms: any = null;
let isSMSPackageAvailable = false;

// Safely check if we can load the SMS package
try {
  const { NativeModules } = require('react-native');
  ReadSms = NativeModules.RNExpoReadSms;
  // Test if the module actually works
  if (ReadSms && typeof ReadSms.readSms === 'function') {
    isSMSPackageAvailable = true;
  }
} catch (error) {
  // Module not available or not working
  isSMSPackageAvailable = false;
  ReadSms = null;
}

export interface SMSSender {
  id: string;
  businessId: string;
  senderName: string;
  enabled: boolean;
  createdAt: string;
}

export interface SMSMessage {
  _id: string;
  address: string;
  body: string;
  date: number;
}

interface SMSState {
  senders: SMSSender[];
  availableSenders: string[]; // List of SMS senders from device
  messages: SMSMessage[]; // SMS messages from selected sender
  parsedTransactions: ParsedTransaction[]; // Parsed transactions from messages
  allParsedTransactions: ParsedTransaction[]; // All parsed transactions from all banks
  selectedSender: string | null; // Currently selected sender for viewing messages
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSenders: (businessId: string) => Promise<void>;
  loadAvailableSenders: () => Promise<void>;
  loadMessages: (senderName: string, count?: number) => Promise<void>;
  loadAllMessages: (senderNames: string[], count?: number) => Promise<void>;
  parseMessages: (messages: SMSMessage[], senderName: string) => void;
  requestSMSPermission: () => Promise<boolean>;
  addSender: (businessId: string, senderName: string) => Promise<SMSSender>;
  toggleSender: (id: string, enabled: boolean) => Promise<void>;
  deleteSender: (id: string) => Promise<void>;
  setSelectedSender: (senderName: string | null) => void;
  clearError: () => void;
}

export const useSMSStore = create<SMSState>((set, get) => ({
  senders: [],
  availableSenders: [],
  messages: [],
  parsedTransactions: [],
  allParsedTransactions: [],
  selectedSender: null,
  isLoading: false,
  error: null,

  loadSenders: async (businessId) => {
    set({ isLoading: true, error: null });
    try {
      const allSenders = await storageService.getSMSSenders();
      const filtered = allSenders.filter((s) => s.businessId === businessId);
      set({ senders: filtered, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadAvailableSenders: async () => {
    // Demo mode - return fake senders
    if (DEMO_MODE) {
      const demoSenders = getDemoAvailableSenders();
      set({ availableSenders: demoSenders, error: null });
      return;
    }

    if (Platform.OS !== 'android') {
      // iOS/other platforms - show empty list, user can add manually
      set({ availableSenders: [], error: 'SMS reading is only available on Android' });
      return;
    }

    try {
      // Check if permission is already granted
      const checkResult = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      
      if (!checkResult) {
        // Permission not granted - show empty list
        set({ availableSenders: [], error: null });
        return;
      }

      // Permission granted - read actual SMS messages
      // Try to load the package dynamically if not already loaded
      if (!ReadSms) {
        try {
          const { NativeModules } = require('react-native');
          ReadSms = NativeModules.RNExpoReadSms;
        } catch (importError) {
          console.error('Error importing SMS package:', importError);
        }
      }

      // Check if SMS reading package is available
      if (!ReadSms || typeof ReadSms.readSms !== 'function') {
        console.error('SMS package not available. ReadSms:', ReadSms);
        set({ availableSenders: [], error: 'SMS reading package not available. Please grant SMS permission.' });
        return;
      }

      // Read SMS messages (limit to last 5000 for better coverage)
      let smsList: any[] = [];
      try {
        // Use the native readSms method with Promise (React Native bridges Promise automatically)
        smsList = await ReadSms.readSms(5000);
      } catch (readError) {
        set({ availableSenders: [], error: `Failed to read SMS: ${(readError as Error).message}` });
        return;
      }

      // Extract unique senders from SMS messages
      // Filter out phone numbers and numeric codes
      const uniqueSenders = new Set<string>();
      
      if (smsList && Array.isArray(smsList) && smsList.length > 0) {
        smsList.forEach((sms: any) => {
          // Try different property names (address, sender, from, etc.)
          const senderAddress = sms.address || sms.sender || sms.from || sms.phoneNumber || sms.number;
          if (senderAddress) {
            // Extract sender name/number
            const sender = String(senderAddress).trim();
            
            // Filter out phone numbers (starting with +977 or other country codes)
            if (/^\+?\d{10,}$/.test(sender) || sender.startsWith('+977')) {
              return; // Skip phone numbers
            }
            
            // Filter out pure numeric codes (all digits)
            if (/^\d+$/.test(sender)) {
              return; // Skip numeric codes
            }
            
            // Only add valid senders (non-empty, reasonable length, not phone numbers)
            if (sender && sender.length > 0 && sender.length <= 50) {
              uniqueSenders.add(sender);
            }
          }
        });
      }

      // Convert to array and sort
      const sendersArray = Array.from(uniqueSenders).sort();
      
      // Show all unique senders from actual SMS messages
      if (sendersArray.length > 0) {
        set({ availableSenders: sendersArray, error: null });
      } else {
        // If no senders found, show empty list (user can add manually)
        set({ availableSenders: [], error: 'No SMS senders found in your messages. You can add senders manually.' });
      }
    } catch (error) {
      console.error('Error loading available senders:', error);
      set({ availableSenders: [], error: `Error loading senders: ${(error as Error).message}` });
    }
  },

  requestSMSPermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission Required',
          message: 'This app needs access to read SMS to automatically detect bank transactions from your messages.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Grant Permission',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        // Reload available senders after permission granted
        await get().loadAvailableSenders();
        return true;
      } else {
        set({ error: 'SMS permission is required to auto-detect transactions' });
        return false;
      }
    } catch (error) {
      console.error('Error requesting SMS permission:', error);
      set({ error: (error as Error).message });
      return false;
    }
  },

  addSender: async (businessId, senderName) => {
    set({ isLoading: true, error: null });
    try {
      const id = `sender_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const newSender: SMSSender = {
        id,
        businessId,
        senderName,
        enabled: true,
        createdAt: now,
      };

      const allSenders = await storageService.getSMSSenders();
      allSenders.push(newSender);
      await storageService.saveSMSSenders(allSenders);

      set((state) => ({
        senders: [newSender, ...state.senders],
        isLoading: false,
      }));
      return newSender;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  toggleSender: async (id, enabled) => {
    set({ isLoading: true, error: null });
    try {
      const allSenders = await storageService.getSMSSenders();
      const index = allSenders.findIndex((s) => s.id === id);
      if (index === -1) throw new Error('Sender not found');

      allSenders[index].enabled = enabled;
      await storageService.saveSMSSenders(allSenders);

      set((state) => ({
        senders: state.senders.map((s) => (s.id === id ? allSenders[index] : s)),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteSender: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const allSenders = await storageService.getSMSSenders();
      const filtered = allSenders.filter((s) => s.id !== id);
      await storageService.saveSMSSenders(filtered);

      set((state) => ({
        senders: state.senders.filter((s) => s.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  loadMessages: async (senderName: string, count: number = 100) => {
    // Demo mode - return fake messages
    if (DEMO_MODE) {
      set({ isLoading: true, error: null });
      try {
        const demoMessages = getDemoSMSMessages(senderName);
        
        // Parse messages into transactions
        const parsed: ParsedTransaction[] = [];
        demoMessages.forEach((msg) => {
          const parsedTx = parseSMSMessage(msg.body, senderName);
          if (parsedTx) {
            parsed.push(parsedTx);
          }
        });
        parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        set({ messages: demoMessages, parsedTransactions: parsed, isLoading: false, error: null });
      } catch (error) {
        console.error('Error loading demo SMS messages:', error);
        set({ messages: [], error: (error as Error).message, isLoading: false });
      }
      return;
    }

    if (Platform.OS !== 'android') {
      set({ messages: [], error: 'SMS reading only available on Android' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // Check if permission is granted
      const checkResult = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      
      if (!checkResult) {
        set({ messages: [], error: 'SMS permission not granted', isLoading: false });
        return;
      }

      // Try to load the package dynamically if not already loaded
      if (!ReadSms) {
        try {
          const { NativeModules } = require('react-native');
          ReadSms = NativeModules.RNExpoReadSms;
        } catch (importError) {
          console.error('Error importing SMS package:', importError);
        }
      }

      if (!ReadSms || typeof ReadSms.readSms !== 'function') {
        set({ messages: [], error: 'SMS reading package not available', isLoading: false });
        return;
      }

      // Read SMS messages
      let smsList: any[] = [];
      try {
        smsList = await ReadSms.readSms(count);
      } catch (readError) {
        console.error('Error reading SMS:', readError);
        set({ messages: [], error: `Failed to read SMS: ${(readError as Error).message}`, isLoading: false });
        return;
      }

      // Filter messages by sender name
      const filteredMessages: SMSMessage[] = [];
      if (smsList && Array.isArray(smsList)) {
        smsList.forEach((sms: any) => {
          const senderAddress = sms.address || sms.sender || sms.from || sms.phoneNumber || sms.number;
          if (senderAddress && String(senderAddress).trim().toLowerCase().includes(senderName.toLowerCase())) {
            filteredMessages.push({
              _id: sms._id || sms.id || String(Date.now()) + Math.random(),
              address: String(senderAddress).trim(),
              body: sms.body || sms.message || sms.text || '',
              date: sms.date || sms.timestamp || Date.now(),
            });
          }
        });
      }

      // Sort by date (newest first)
      filteredMessages.sort((a, b) => b.date - a.date);

      // Parse messages into transactions
      const parsed: ParsedTransaction[] = [];
      filteredMessages.forEach((msg) => {
        const parsedTx = parseSMSMessage(msg.body, senderName);
        if (parsedTx) {
          parsed.push(parsedTx);
        }
      });
      parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      set({ messages: filteredMessages, parsedTransactions: parsed, isLoading: false, error: null });
    } catch (error) {
      console.error('Error loading SMS messages:', error);
      set({ messages: [], error: (error as Error).message, isLoading: false });
    }
  },

  parseMessages: (messages: SMSMessage[], senderName: string) => {
    const parsed: ParsedTransaction[] = [];
    
    messages.forEach((msg) => {
      const parsedTx = parseSMSMessage(msg.body, senderName);
      if (parsedTx) {
        parsed.push(parsedTx);
      }
    });
    
    // Sort by date (newest first)
    parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    set({ parsedTransactions: parsed });
  },

  loadAllMessages: async (senderNames: string[], count: number = 5000) => {
    // Demo mode - return fake messages from all senders
    if (DEMO_MODE) {
      set({ isLoading: true, error: null });
      try {
        const allParsed: ParsedTransaction[] = [];
        
        for (const senderName of senderNames) {
          const demoMessages = getDemoSMSMessages(senderName);
          demoMessages.forEach((msg) => {
            const parsedTx = parseSMSMessage(msg.body, senderName);
            if (parsedTx) {
              allParsed.push(parsedTx);
            }
          });
        }
        
        // Sort by date (newest first)
        allParsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        set({ allParsedTransactions: allParsed, isLoading: false, error: null });
      } catch (error) {
        console.error('Error loading demo all messages:', error);
        set({ allParsedTransactions: [], error: (error as Error).message, isLoading: false });
      }
      return;
    }

    if (Platform.OS !== 'android') {
      set({ allParsedTransactions: [], error: 'SMS reading only available on Android' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const checkResult = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      
      if (!checkResult) {
        set({ allParsedTransactions: [], error: 'SMS permission not granted', isLoading: false });
        return;
      }

      if (!ReadSms) {
        try {
          const { NativeModules } = require('react-native');
          ReadSms = NativeModules.RNExpoReadSms;
        } catch (importError) {
          console.error('Error importing SMS package:', importError);
        }
      }

      if (!ReadSms || typeof ReadSms.readSms !== 'function') {
        set({ allParsedTransactions: [], error: 'SMS reading package not available', isLoading: false });
        return;
      }

      // Read all SMS messages
      let smsList: any[] = [];
      try {
        smsList = await ReadSms.readSms(count);
      } catch (readError) {
        console.error('Error reading SMS:', readError);
        set({ allParsedTransactions: [], error: `Failed to read SMS: ${(readError as Error).message}`, isLoading: false });
        return;
      }

      // Optimize matching with Map/Set for O(1) lookups
      const senderNamesMap = new Map<string, {
        normalized: string;
        isNica: boolean;
        isLaxmi: boolean;
      }>();
      
      senderNames.forEach(name => {
        const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        senderNamesMap.set(name, {
          normalized,
          isNica: normalized.includes('nica') || normalized === 'nicaalert' || normalized.includes('nicas'),
          isLaxmi: normalized.includes('laxmi') || normalized === 'laxmialert' || normalized.includes('sunrise'),
        });
      });
      
      // Parse all messages from all enabled senders
      const allParsed: ParsedTransaction[] = [];
      if (smsList && Array.isArray(smsList)) {
        for (const sms of smsList) {
          const senderAddress = sms.address || sms.sender || sms.from || sms.phoneNumber || sms.number;
          const messageBody = sms.body || sms.message || sms.text || '';
          
          if (!senderAddress || !messageBody) continue;
          
          const senderStr = String(senderAddress).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          const messageLower = messageBody.toLowerCase();
          
          // Determine bank type for sender address (normalized)
          const senderIsNica = senderStr.includes('nica') || senderStr === 'nicas' || senderStr === 'nicasia';
          const senderIsLaxmi = senderStr.includes('laxmi') || senderStr.includes('sunrise');
          const senderIsNicAsia = (senderStr.includes('nic') && senderStr.includes('asia')) || senderStr === 'nicasia';
          const messageIsNica = messageLower.includes('nic asia') || messageLower.includes('nica bank');
          const messageIsLaxmi = messageLower.includes('laxmi') || messageLower.includes('sunrise bank');
          
          // Find matching sender using optimized lookup
          let matchingSender: string | null = null;
          
          // First try exact match
          for (const [name, data] of senderNamesMap.entries()) {
            if (senderStr === data.normalized) {
              matchingSender = name;
              break;
            }
          }
          
          // If no exact match, try bank-specific matching
          if (!matchingSender) {
            for (const [name, data] of senderNamesMap.entries()) {
              // NIC ASIA matching - both sender AND stored name must indicate NIC ASIA
              if ((senderIsNica || senderIsNicAsia) && data.isNica) {
                if (messageIsNica || !messageIsLaxmi) {
                  matchingSender = name;
                  break;
                }
              }
              
              // LAXMI matching - both sender AND stored name must indicate LAXMI
              if (senderIsLaxmi && data.isLaxmi) {
                if (messageIsLaxmi || !messageIsNica) {
                  matchingSender = name;
                  break;
                }
              }
            }
          }
          
          if (matchingSender) {
            const parsedTx = parseSMSMessage(messageBody, matchingSender);
            if (parsedTx) {
              allParsed.push(parsedTx);
            }
          }
        }
      }

      // Sort by date (newest first)
      allParsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      set({ allParsedTransactions: allParsed, isLoading: false, error: null });
    } catch (error) {
      console.error('Error loading all messages:', error);
      set({ allParsedTransactions: [], error: (error as Error).message, isLoading: false });
    }
  },

  setSelectedSender: (senderName: string | null) => {
    set({ selectedSender: senderName });
    if (senderName) {
      get().loadMessages(senderName);
    } else {
      set({ messages: [], parsedTransactions: [] });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
