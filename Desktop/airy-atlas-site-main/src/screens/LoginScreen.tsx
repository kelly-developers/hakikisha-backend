import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {
  Image,
  ImageSourcePropType,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {CustomButton, FormField} from '../components';
import {icons} from '../constants';
import {setItem} from '../utils/AsyncStorage';

type Props = {};

// Move RootStackParamList definition to the top
type RootStackParamList = {
  ForgotPassword: undefined;
  Signup: undefined;
  HomeScreen: undefined;
};

const LoginScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
  });
  
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleLogin = async () => {
    // Basic validation
    if (!form.email || !form.password) {
      setEmailError('Please enter email/username and password');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Replace with your backend API call
      // const response = await fetch('YOUR_BACKEND_URL/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     email: form.email,
      //     password: form.password,
      //   }),
      // });
      
      // For now, simulate successful login
      setTimeout(async () => {
        // Store authentication state
        await setItem('isAuthenticated', 'true');
        await setItem('userEmail', form.email);
        
        setIsSubmitting(false);
        // Navigate to HomeScreen after successful login
        navigation.navigate('HomeScreen');
      }, 1000);
      
    } catch (error) {
      setIsSubmitting(false);
      setEmailError('Login failed. Please check your credentials.');
    }
  };
  
  const handleSignInWithProvider = () => {};
  
  const handleNavigateToSignUp = () => {
    navigation.navigate('Signup');
  };
  
  return (
    <View className="flex-1 bg-white justify-center">
      <View className="px-6">
        <View className="mb-8">
          <Text className="text-sm font-pregular text-gray-600 text-center">
            Sign in to continue
          </Text>
        </View>

        <FormField
          title="Email"
          value={form.email}
          setError={setEmailError}
          error={emailError}
          handleChangeText={(e: any) => {
            setEmailError('');
            setForm({...form, email: e});
          }}
          placeholder="Email or Username"
          otherStyles="mb-3"
        />
        <FormField
          title="Password"
          value={form.password}
          setError={setPasswordError}
          error={passwordError}
          handleChangeText={(e: any) => {
            setPasswordError('');
            setForm({...form, password: e});
          }}
          placeholder="Password"
          otherStyles="mb-3"
        />
        <TouchableOpacity onPress={handleForgotPassword} className="mb-5">
          <Text className="text-[#EF9334] text-sm font-pmedium self-end">
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <CustomButton
          title="Login"
          handlePress={handleLogin}
          isLoading={isSubmitting}
          containerStyle="py-2 mb-3"
        />
        
        <CustomButton
          title="Sign Up"
          handlePress={handleNavigateToSignUp}
          containerStyle="py-2 bg-white border-2"
          textStyle="text-[#0A864D] text-sm"
        />
      </View>
    </View>
  );
};

export default LoginScreen;