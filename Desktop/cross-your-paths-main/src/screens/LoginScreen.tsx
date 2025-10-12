import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import {CustomButton} from '../components';
import {setItem} from '../utils/AsyncStorage';
import LineInputField from '../components/LineInputField';

type RootStackParamList = {
  ForgotPassword: undefined;
  Signup: undefined;
  HomeScreen: undefined;
  AdminDashboard: undefined;
  FactCheckerDashboard: undefined;
};

const LoginScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  // State to track focused inputs
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Error', 'Please enter email/username and password');
      return;
    }

    setIsSubmitting(true);
    
    try {
      setTimeout(async () => {
        await setItem('isAuthenticated', 'true');
        await setItem('userEmail', form.email);
        
        // Show role selection dialog
        Alert.alert(
          'Select Your Role',
          'Choose how you want to access the app:',
          [
            {
              text: 'User',
              onPress: async () => {
                await setItem('userRole', 'user');
                setIsSubmitting(false);
                navigation.navigate('HomeScreen');
              },
            },
            {
              text: 'Fact Checker',
              onPress: async () => {
                await setItem('userRole', 'fact_checker');
                setIsSubmitting(false);
                navigation.navigate('FactCheckerDashboard');
              },
            },
            {
              text: 'Admin',
              onPress: async () => {
                await setItem('userRole', 'admin');
                setIsSubmitting(false);
                navigation.navigate('AdminDashboard');
              },
            },
          ],
          {cancelable: false}
        );
      }, 1000);
      
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Login failed. Please check your credentials.');
    }
  };
  
  const handleNavigateToSignUp = () => {
    navigation.navigate('Signup');
  };

  const embassyImage = require('../assets/images/emabsy_of_finlad.png');
  const crecoImage = require('../assets/images/creco-kenya.png');
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView 
        contentContainerStyle={{flexGrow: 1}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 bg-white pt-12">
          {/* Login content first */}
          <View className="px-6 pb-4">
            <View className="mb-6">
              <Text className="text-2xl font-pbold text-gray-900 text-center mb-2">
                HAKIKISHA
              </Text>
              <Text className="text-sm font-pregular text-gray-600 text-center">
                Sign in to continue
              </Text>
            </View>

            <LineInputField
              title="Email"
              value={form.email}
              placeholder="Email or Username"
              onChangeText={(e: string) => {
                setEmailError('');
                setForm({...form, email: e});
              }}
              error={emailError}
              fieldName="email"
              focusedField={focusedField}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />

            <LineInputField
              title="Password"
              value={form.password}
              placeholder="Password"
              onChangeText={(e: string) => {
                setPasswordError('');
                setForm({...form, password: e});
              }}
              error={passwordError}
              secureTextEntry={true}
              fieldName="password"
              focusedField={focusedField}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
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
              containerStyle="py-2 bg-white border-2 border-gray-300"
              textStyle="text-[#0A864D] text-sm"
            />
          </View>

          {/* Powered by section moved up */}
          <View className="px-4 pb-4">
            <Text className="text-sm font-pregular text-gray-500 text-center mb-2">
              Powered by
            </Text>
            <View className="flex-row justify-between items-center px-2">
              <View className="flex-1 items-center">
                <Image 
                  source={embassyImage}
                  className="w-32 h-20"
                  resizeMode="contain"
                />
              </View>
              
              <View className="flex-1 items-center">
                <Image 
                  source={crecoImage}
                  className="w-32 h-20"
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;