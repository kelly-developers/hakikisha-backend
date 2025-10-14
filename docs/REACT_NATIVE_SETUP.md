# React Native Mobile App Integration Guide

## Quick Setup

### 1. Install Dependencies
```bash
npm install axios @react-native-async-storage/async-storage
```

### 2. API Configuration
```javascript
// src/config/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'https://api.hakikisha.com/api';

export const apiClient = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
};
```

### 3. Authentication Example
```javascript
// src/services/auth.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../config/api';

export const login = async (email, password) => {
  const data = await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  // Save token
  await AsyncStorage.setItem('authToken', data.token);
  await AsyncStorage.setItem('refreshToken', data.refreshToken);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));

  return data;
};

export const logout = async () => {
  await apiClient('/auth/logout', { method: 'POST' });
  await AsyncStorage.clear();
};
```

### 4. Role-Based Navigation
```javascript
// App.js
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  const navigateByRole = (userData) => {
    if (userData.role === 'admin') {
      navigation.navigate('AdminDashboard');
    } else if (userData.role === 'fact_checker') {
      navigation.navigate('FactCheckerDashboard');
    } else {
      navigation.navigate('UserDashboard');
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="UserDashboard" component={UserDashboard} />
        <Stack.Screen name="FactCheckerDashboard" component={FactCheckerDashboard} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### 5. Submit Claim Example
```javascript
export const submitClaim = async (claimData) => {
  return await apiClient('/claims/submit', {
    method: 'POST',
    body: JSON.stringify(claimData)
  });
};
```

## Testing
Test API: `http://localhost:5000/health`
