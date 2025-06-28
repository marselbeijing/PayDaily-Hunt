import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { api } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  loading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    case 'LOGOUT':
      return {
        ...initialState,
        loading: false
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { tg, user: telegramUser, isReady } = useTelegram();

  // Session recovery on load
  useEffect(() => {
    const initAuth = async () => {
      if (!isReady) return;

      console.log('Auth init:', { isReady, telegramUser, initData: tg?.initData });

      const token = localStorage.getItem('paydaily_token');
      const userData = localStorage.getItem('paydaily_user');

      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          api.setAuthToken(token);
          dispatch({
            type: 'SET_USER',
            payload: { user, token }
          });
          return;
        } catch (error) {
          console.error('Session recovery error:', error);
          localStorage.removeItem('paydaily_token');
          localStorage.removeItem('paydaily_user');
        }
      }

      // If no saved session, try to authorize via Telegram
      const initData = tg?.initData || tg?.initDataUnsafe || window.Telegram?.WebApp?.initData || '';
      if (initData) {
        try {
          console.log('Calling login with initData:', initData);
          await login(initData);
        } catch (error) {
          console.error('Auto-authorization error:', error);
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('No initData, setting loading false');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, [isReady, telegramUser, tg]);

  // Authorization via Telegram
  const login = async (initData, referralCode = null) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await api.post('/auth/telegram', {
        initData,
        referralCode
      });

      const { token, user } = response;

      // Save to localStorage
      localStorage.setItem('paydaily_token', token);
      localStorage.setItem('paydaily_user', JSON.stringify(user));

      // Set token for API
      api.setAuthToken(token);

      dispatch({
        type: 'SET_USER',
        payload: { user, token }
      });

      // Show welcome message for new users
      if (user.isNewUser) {
        toast.success(`Welcome, ${user.firstName}! 🎉`);
      } else {
        toast.success('Welcome back! 👋');
      }

      return { success: true, user, token };
    } catch (error) {
      console.error('Authorization error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Authorization error';
      
      dispatch({
        type: 'SET_ERROR',
        payload: errorMessage
      });

      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('paydaily_token');
    localStorage.removeItem('paydaily_user');
    api.removeAuthToken();
    dispatch({ type: 'LOGOUT' });
    toast.success('You have been logged out');
  };

  // Update user data
  const updateUser = (userData) => {
    dispatch({
      type: 'UPDATE_USER',
      payload: userData
    });

    // Update localStorage
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('paydaily_user', JSON.stringify(updatedUser));
  };

  // Daily check-in
  const performCheckIn = async () => {
    try {
      const response = await api.post('/auth/checkin');
      const { bonus, streak, newBalance, levelChanged, newLevel, message } = response.data;

      // Update user
      updateUser({
        balance: newBalance,
        checkInStreak: streak,
        vipLevel: levelChanged ? newLevel : state.user.vipLevel
      });

      // Show notifications
      toast.success(message);

      if (levelChanged) {
        toast.success(`🎉 Congratulations! New VIP level: ${newLevel.toUpperCase()}!`, {
          duration: 5000
        });
      }

      return {
        success: true,
        bonus,
        streak,
        newBalance,
        levelChanged,
        newLevel
      };
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error.response?.data?.error || 'Check-in error';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      
      updateUser(response.data.user);
      toast.success('Profile successfully updated');
      
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.error || 'Profile update error';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Get actual user data
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/profile');
      updateUser(response.user);
      return { success: true };
    } catch (error) {
      console.error('Data update error:', error);
      return { success: false };
    }
  };

  // Token verification
  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/profile');
      return { success: true, user: response.user };
    } catch (error) {
      console.error('Token invalid:', error);
      logout();
      return { success: false };
    }
  };

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    performCheckIn,
    updateProfile,
    refreshUser,
    verifyToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 