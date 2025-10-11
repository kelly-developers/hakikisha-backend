import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState, useEffect} from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import {icons} from '../constants';

type Props = {};

type User = {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'fact_checker' | 'admin';
  status: 'active' | 'suspended';
};

type FactCheckerActivity = {
  id: string;
  username: string;
  claimsVerified: number;
  lastActive: string;
};

type DashboardStats = {
  totalUsers: number;
  totalClaims: number;
  pendingClaims: number;
  verifiedClaims: number;
  falseClaims: number;
  factCheckers: number;
  admins: number;
};

const AdminDashboardScreen = (props: Props) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'factcheckers' | 'register'>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalClaims: 0,
    pendingClaims: 0,
    verifiedClaims: 0,
    falseClaims: 0,
    factCheckers: 0,
    admins: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [factCheckerActivity, setFactCheckerActivity] = useState<FactCheckerActivity[]>([]);
  const [registerForm, setRegisterForm] = useState({
    email: '',
    username: '',
    password: '',
    role: 'fact_checker' as 'fact_checker' | 'admin',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // TODO: Replace with actual API calls to your backend
    // Mock data for now
    setStats({
      totalUsers: 1250,
      totalClaims: 3400,
      pendingClaims: 45,
      verifiedClaims: 2890,
      falseClaims: 465,
      factCheckers: 12,
      admins: 3,
    });

    setUsers([
      {id: '1', username: 'johndoe', email: 'john@example.com', role: 'user', status: 'active'},
      {id: '2', username: 'factchecker1', email: 'fc1@example.com', role: 'fact_checker', status: 'active'},
    ]);

    setFactCheckerActivity([
      {id: '1', username: 'factchecker1', claimsVerified: 45, lastActive: '2 hours ago'},
      {id: '2', username: 'factchecker2', claimsVerified: 38, lastActive: '5 hours ago'},
    ]);
  };

  const handleRegisterUser = async () => {
    if (!registerForm.email || !registerForm.username || !registerForm.password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // TODO: Implement API call to register fact-checker or admin
    // POST /api/admin/register-fact-checker or /api/admin/register-admin
    Alert.alert('Success', `${registerForm.role === 'fact_checker' ? 'Fact Checker' : 'Admin'} registered successfully`);
    setRegisterForm({email: '', username: '', password: '', role: 'fact_checker'});
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'delete' | 'activate') => {
    // TODO: Implement API call to suspend/delete/activate user
    // POST /api/admin/user-action
    Alert.alert('Success', `User ${action}d successfully`);
    loadDashboardData();
  };

  const handleLogout = async () => {
    // TODO: Clear auth tokens and redirect to login
    navigation.navigate('Login');
  };

  const renderOverview = () => (
    <View>
      <Text className="text-2xl font-pbold mb-6" style={{color: '#0A864D'}}>
        Dashboard Overview
      </Text>
      <View className="flex-row flex-wrap">
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Total Users</Text>
            <Text className="text-3xl font-pbold" style={{color: '#0A864D'}}>
              {stats.totalUsers}
            </Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Total Claims</Text>
            <Text className="text-3xl font-pbold" style={{color: '#EF9334'}}>
              {stats.totalClaims}
            </Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Pending</Text>
            <Text className="text-3xl font-pbold text-gray-800">{stats.pendingClaims}</Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Verified</Text>
            <Text className="text-3xl font-pbold" style={{color: '#0A864D'}}>
              {stats.verifiedClaims}
            </Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">False Claims</Text>
            <Text className="text-3xl font-pbold text-red-600">{stats.falseClaims}</Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2">Fact Checkers</Text>
            <Text className="text-3xl font-pbold" style={{color: '#EF9334'}}>
              {stats.factCheckers}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderUsers = () => (
    <View>
      <Text className="text-2xl font-pbold mb-6" style={{color: '#0A864D'}}>
        Manage Users
      </Text>
      {users.map(user => (
        <View key={user.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <View>
              <Text className="font-psemibold text-base">{user.username}</Text>
              <Text className="text-gray-600 text-sm">{user.email}</Text>
            </View>
            <View
              className="px-3 py-1 rounded-full"
              style={{backgroundColor: user.role === 'admin' ? '#EF9334' : user.role === 'fact_checker' ? '#0A864D' : '#e5e7eb'}}>
              <Text className="text-white text-xs font-pmedium">{user.role}</Text>
            </View>
          </View>
          <View className="flex-row gap-2 mt-2">
            {user.status === 'active' ? (
              <TouchableOpacity
                className="flex-1 bg-red-100 py-2 rounded-xl"
                onPress={() => handleUserAction(user.id, 'suspend')}>
                <Text className="text-red-600 font-pmedium text-center">Suspend</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="flex-1 bg-green-100 py-2 rounded-xl"
                onPress={() => handleUserAction(user.id, 'activate')}>
                <Text className="text-green-600 font-pmedium text-center">Activate</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-1 bg-gray-100 py-2 rounded-xl"
              onPress={() => handleUserAction(user.id, 'delete')}>
              <Text className="text-gray-600 font-pmedium text-center">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderFactCheckers = () => (
    <View>
      <Text className="text-2xl font-pbold mb-6" style={{color: '#0A864D'}}>
        Fact Checker Activity
      </Text>
      {factCheckerActivity.map(fc => (
        <View key={fc.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <Text className="font-psemibold text-base mb-2">{fc.username}</Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-600 text-sm">Claims Verified</Text>
              <Text className="font-pbold text-xl" style={{color: '#0A864D'}}>
                {fc.claimsVerified}
              </Text>
            </View>
            <View>
              <Text className="text-gray-600 text-sm">Last Active</Text>
              <Text className="font-pmedium text-sm">{fc.lastActive}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderRegister = () => (
    <View>
      <Text className="text-2xl font-pbold mb-6" style={{color: '#0A864D'}}>
        Register New User
      </Text>
      <View className="bg-white rounded-2xl p-6 shadow-sm">
        <Text className="font-pmedium mb-2">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
          placeholder="email@example.com"
          value={registerForm.email}
          onChangeText={text => setRegisterForm({...registerForm, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text className="font-pmedium mb-2">Username</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
          placeholder="username"
          value={registerForm.username}
          onChangeText={text => setRegisterForm({...registerForm, username: text})}
          autoCapitalize="none"
        />

        <Text className="font-pmedium mb-2">Password</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
          placeholder="Password"
          value={registerForm.password}
          onChangeText={text => setRegisterForm({...registerForm, password: text})}
          secureTextEntry
        />

        <Text className="font-pmedium mb-2">Role</Text>
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            className="flex-1 py-3 rounded-xl"
            style={{
              backgroundColor: registerForm.role === 'fact_checker' ? '#0A864D' : '#f3f4f6',
            }}
            onPress={() => setRegisterForm({...registerForm, role: 'fact_checker'})}>
            <Text
              className="text-center font-pmedium"
              style={{color: registerForm.role === 'fact_checker' ? 'white' : '#666'}}>
              Fact Checker
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-3 rounded-xl"
            style={{
              backgroundColor: registerForm.role === 'admin' ? '#EF9334' : '#f3f4f6',
            }}
            onPress={() => setRegisterForm({...registerForm, role: 'admin'})}>
            <Text
              className="text-center font-pmedium"
              style={{color: registerForm.role === 'admin' ? 'white' : '#666'}}>
              Admin
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="py-4 rounded-xl"
          style={{backgroundColor: '#0A864D'}}
          onPress={handleRegisterUser}>
          <Text className="text-white text-center font-pbold text-lg">Register User</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <Text className="text-3xl font-pbold" style={{color: '#0A864D'}}>
            Admin
          </Text>
          <TouchableOpacity onPress={handleLogout}>
            <Image source={icons.profile} style={{width: 32, height: 32, tintColor: '#666'}} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 py-4 bg-white border-b border-gray-200">
        <TouchableOpacity
          className="px-4 py-2 rounded-full mr-2"
          style={{backgroundColor: activeTab === 'overview' ? '#0A864D' : '#f3f4f6'}}
          onPress={() => setActiveTab('overview')}>
          <Text
            className="font-pmedium"
            style={{color: activeTab === 'overview' ? 'white' : '#666'}}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-4 py-2 rounded-full mr-2"
          style={{backgroundColor: activeTab === 'users' ? '#0A864D' : '#f3f4f6'}}
          onPress={() => setActiveTab('users')}>
          <Text
            className="font-pmedium"
            style={{color: activeTab === 'users' ? 'white' : '#666'}}>
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-4 py-2 rounded-full mr-2"
          style={{backgroundColor: activeTab === 'factcheckers' ? '#0A864D' : '#f3f4f6'}}
          onPress={() => setActiveTab('factcheckers')}>
          <Text
            className="font-pmedium"
            style={{color: activeTab === 'factcheckers' ? 'white' : '#666'}}>
            Fact Checkers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-4 py-2 rounded-full"
          style={{backgroundColor: activeTab === 'register' ? '#0A864D' : '#f3f4f6'}}
          onPress={() => setActiveTab('register')}>
          <Text
            className="font-pmedium"
            style={{color: activeTab === 'register' ? 'white' : '#666'}}>
            Register
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView className="flex-1 px-6 py-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'factcheckers' && renderFactCheckers()}
        {activeTab === 'register' && renderRegister()}
      </ScrollView>
    </View>
  );
};

export default AdminDashboardScreen;
