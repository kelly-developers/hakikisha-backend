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
  Modal,
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

type Claim = {
  id: string;
  title: string;
  category: string;
  status: 'verified' | 'false' | 'misleading' | 'needs_context';
  verifiedDate: string;
};

type FactCheckerActivity = {
  id: string;
  username: string;
  email: string;
  claimsVerified: number;
  lastActive: string;
  recentClaims: Claim[];
  joinDate: string;
  accuracy: string;
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
  const [selectedFactChecker, setSelectedFactChecker] = useState<FactCheckerActivity | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Mock data
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
      {
        id: '1',
        username: 'alex_johnson',
        email: 'alex.johnson@example.com',
        claimsVerified: 45,
        lastActive: '2 hours ago',
        joinDate: '2024-01-15',
        accuracy: '96%',
        recentClaims: [
          {
            id: '101',
            title: 'Government increased education budget by 50%',
            category: 'Governance',
            status: 'verified',
            verifiedDate: '2025-01-10'
          },
          {
            id: '102',
            title: 'New study shows coffee prevents cancer',
            category: 'Health',
            status: 'misleading',
            verifiedDate: '2025-01-09'
          },
          {
            id: '103',
            title: 'Unemployment rate dropped to 3%',
            category: 'Economics',
            status: 'false',
            verifiedDate: '2025-01-08'
          }
        ]
      },
      {
        id: '2',
        username: 'sarah_williams',
        email: 'sarah.w@example.com',
        claimsVerified: 38,
        lastActive: '5 hours ago',
        joinDate: '2024-02-20',
        accuracy: '94%',
        recentClaims: [
          {
            id: '104',
            title: 'New tax reforms announced',
            category: 'Governance',
            status: 'verified',
            verifiedDate: '2025-01-11'
          },
          {
            id: '105',
            title: 'Climate change study findings',
            category: 'Environment',
            status: 'needs_context',
            verifiedDate: '2025-01-10'
          }
        ]
      },
      {
        id: '3',
        username: 'mike_chen',
        email: 'mike.chen@example.com',
        claimsVerified: 52,
        lastActive: '1 hour ago',
        joinDate: '2024-01-10',
        accuracy: '98%',
        recentClaims: [
          {
            id: '106',
            title: 'Healthcare policy updates',
            category: 'Health',
            status: 'verified',
            verifiedDate: '2025-01-12'
          },
          {
            id: '107',
            title: 'Education system reforms',
            category: 'Education',
            status: 'verified',
            verifiedDate: '2025-01-11'
          }
        ]
      }
    ]);
  };

  const handleRegisterUser = async () => {
    if (!registerForm.email || !registerForm.username || !registerForm.password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // TODO: Implement API call to register fact-checker or admin
    Alert.alert('Success', `${registerForm.role === 'fact_checker' ? 'Fact Checker' : 'Admin'} registered successfully`);
    setRegisterForm({email: '', username: '', password: '', role: 'fact_checker'});
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'delete' | 'activate') => {
    // TODO: Implement API call to suspend/delete/activate user
    Alert.alert('Success', `User ${action}d successfully`);
    loadDashboardData();
  };

  const handleFactCheckerAction = async (factCheckerId: string, action: 'suspend' | 'activate') => {
    // TODO: Implement API call to suspend/activate fact checker
    Alert.alert('Success', `Fact Checker ${action}d successfully`);
    loadDashboardData();
  };

  const handleLogout = async () => {
    // TODO: Clear auth tokens and redirect to login
    navigation.navigate('Login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#0A864D';
      case 'false': return '#dc2626';
      case 'misleading': return '#EF9334';
      case 'needs_context': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'false': return 'False';
      case 'misleading': return 'Misleading';
      case 'needs_context': return 'Needs Context';
      default: return status;
    }
  };

  const renderOverview = () => (
    <View className="pb-6">
      <Text className="text-xl font-pbold mb-4" style={{color: '#0A864D'}}>
        Dashboard Overview
      </Text>
      <View className="flex-row flex-wrap">
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2 text-sm">Total Users</Text>
            <Text className="text-2xl font-pbold" style={{color: '#0A864D'}}>
              {stats.totalUsers}
            </Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2 text-sm">Total Claims</Text>
            <Text className="text-2xl font-pbold" style={{color: '#EF9334'}}>
              {stats.totalClaims}
            </Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2 text-sm">Pending</Text>
            <Text className="text-2xl font-pbold text-gray-800">{stats.pendingClaims}</Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2 text-sm">Verified</Text>
            <Text className="text-2xl font-pbold" style={{color: '#0A864D'}}>
              {stats.verifiedClaims}
            </Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2 text-sm">False Claims</Text>
            <Text className="text-2xl font-pbold text-red-600">{stats.falseClaims}</Text>
          </View>
        </View>
        <View className="w-1/2 p-2">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-600 font-pregular mb-2 text-sm">Fact Checkers</Text>
            <Text className="text-2xl font-pbold" style={{color: '#EF9334'}}>
              {stats.factCheckers}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderUsers = () => (
    <View className="pb-6">
      <Text className="text-xl font-pbold mb-4" style={{color: '#0A864D'}}>
        Manage Users
      </Text>
      {users.map(user => (
        <View key={user.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <View>
              <Text className="font-psemibold text-sm">{user.username}</Text>
              <Text className="text-gray-600 text-xs">{user.email}</Text>
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
                className="flex-1 bg-red-100 py-2 rounded-lg"
                onPress={() => handleUserAction(user.id, 'suspend')}>
                <Text className="text-red-600 font-pmedium text-center text-xs">Suspend</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="flex-1 bg-green-100 py-2 rounded-lg"
                onPress={() => handleUserAction(user.id, 'activate')}>
                <Text className="text-green-600 font-pmedium text-center text-xs">Activate</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-1 bg-gray-100 py-2 rounded-lg"
              onPress={() => handleUserAction(user.id, 'delete')}>
              <Text className="text-gray-600 font-pmedium text-center text-xs">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderFactCheckers = () => (
    <View className="pb-6">
      <Text className="text-xl font-pbold mb-4" style={{color: '#0A864D'}}>
        Fact Checker Activity
      </Text>
      {factCheckerActivity.map(fc => (
        <TouchableOpacity
          key={fc.id}
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          onPress={() => setSelectedFactChecker(fc)}>
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text className="font-psemibold text-base mb-1">{fc.username}</Text>
              <Text className="text-gray-600 text-xs mb-2">{fc.email}</Text>
              <View className="flex-row items-center mb-1">
                <Text className="text-gray-500 text-xs mr-2">Joined: {fc.joinDate}</Text>
                <Text className="text-gray-500 text-xs">Accuracy: {fc.accuracy}</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-xs text-gray-500 mb-1">Last Active</Text>
              <Text className="font-pmedium text-xs">{fc.lastActive}</Text>
            </View>
          </View>
          
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-gray-600 text-xs">Claims Verified</Text>
              <Text className="font-pbold text-lg" style={{color: '#0A864D'}}>
                {fc.claimsVerified}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="bg-blue-100 px-3 py-1 rounded-lg"
                onPress={() => setSelectedFactChecker(fc)}>
                <Text className="text-blue-600 font-pmedium text-xs">View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRegister = () => (
    <View className="pb-6">
      <Text className="text-xl font-pbold mb-4" style={{color: '#0A864D'}}>
        Register New User
      </Text>
      <View className="bg-white rounded-2xl p-4 shadow-sm">
        <Text className="font-pmedium mb-2 text-sm">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-2 mb-4 text-gray-800"
          placeholder="email@example.com"
          placeholderTextColor="#9CA3AF"
          value={registerForm.email}
          onChangeText={text => setRegisterForm({...registerForm, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text className="font-pmedium mb-2 text-sm">Username</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-2 mb-4 text-gray-800"
          placeholder="username"
          placeholderTextColor="#9CA3AF"
          value={registerForm.username}
          onChangeText={text => setRegisterForm({...registerForm, username: text})}
          autoCapitalize="none"
        />

        <Text className="font-pmedium mb-2 text-sm">Password</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-2 mb-4 text-gray-800"
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={registerForm.password}
          onChangeText={text => setRegisterForm({...registerForm, password: text})}
          secureTextEntry
        />

        <Text className="font-pmedium mb-2 text-sm">Role</Text>
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            className="flex-1 py-2 rounded-lg"
            style={{
              backgroundColor: registerForm.role === 'fact_checker' ? '#0A864D' : '#f3f4f6',
            }}
            onPress={() => setRegisterForm({...registerForm, role: 'fact_checker'})}>
            <Text
              className="text-center font-pmedium text-sm"
              style={{color: registerForm.role === 'fact_checker' ? 'white' : '#666'}}>
              Fact Checker
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-2 rounded-lg"
            style={{
              backgroundColor: registerForm.role === 'admin' ? '#EF9334' : '#f3f4f6',
            }}
            onPress={() => setRegisterForm({...registerForm, role: 'admin'})}>
            <Text
              className="text-center font-pmedium text-sm"
              style={{color: registerForm.role === 'admin' ? 'white' : '#666'}}>
              Admin
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="py-3 rounded-lg"
          style={{backgroundColor: '#0A864D'}}
          onPress={handleRegisterUser}>
          <Text className="text-white text-center font-pbold">Register User</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-pbold" style={{color: '#0A864D'}}>
            Admin
          </Text>
          <TouchableOpacity onPress={handleLogout}>
            <Image source={icons.profile} style={{width: 32, height: 32, tintColor: '#666'}} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="px-6 py-3 bg-white border-b border-gray-200">
        <View className="flex-row justify-between">
          <TouchableOpacity
            className="flex-1 mx-1 py-2 rounded-lg"
            style={{backgroundColor: activeTab === 'overview' ? '#0A864D' : '#f3f4f6'}}
            onPress={() => setActiveTab('overview')}>
            <Text
              className="text-center font-pmedium text-sm"
              style={{color: activeTab === 'overview' ? 'white' : '#666'}}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 mx-1 py-2 rounded-lg"
            style={{backgroundColor: activeTab === 'users' ? '#0A864D' : '#f3f4f6'}}
            onPress={() => setActiveTab('users')}>
            <Text
              className="text-center font-pmedium text-sm"
              style={{color: activeTab === 'users' ? 'white' : '#666'}}>
              Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 mx-1 py-2 rounded-lg"
            style={{backgroundColor: activeTab === 'factcheckers' ? '#0A864D' : '#f3f4f6'}}
            onPress={() => setActiveTab('factcheckers')}>
            <Text
              className="text-center font-pmedium text-sm"
              style={{color: activeTab === 'factcheckers' ? 'white' : '#666'}}>
              Fact Checkers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 mx-1 py-2 rounded-lg"
            style={{backgroundColor: activeTab === 'register' ? '#0A864D' : '#f3f4f6'}}
            onPress={() => setActiveTab('register')}>
            <Text
              className="text-center font-pmedium text-sm"
              style={{color: activeTab === 'register' ? 'white' : '#666'}}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        className="flex-1 px-6 py-6"
        contentContainerStyle={{paddingBottom: 20}}
        showsVerticalScrollIndicator={true}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'factcheckers' && renderFactCheckers()}
        {activeTab === 'register' && renderRegister()}
      </ScrollView>

      {/* Fact Checker Details Modal */}
      <Modal
        visible={selectedFactChecker !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedFactChecker(null)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-pbold" style={{color: '#0A864D'}}>
                Fact Checker Details
              </Text>
              <TouchableOpacity onPress={() => setSelectedFactChecker(null)}>
                <Text className="text-gray-600 text-2xl">×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="flex-1"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{paddingBottom: 10}}>
              {selectedFactChecker && (
                <>
                  <View className="mb-4">
                    <Text className="font-psemibold text-lg mb-1">{selectedFactChecker.username}</Text>
                    <Text className="text-gray-600 text-sm mb-2">{selectedFactChecker.email}</Text>
                    <View className="flex-row justify-between">
                      <View>
                        <Text className="text-gray-500 text-xs">Joined</Text>
                        <Text className="font-pmedium text-sm">{selectedFactChecker.joinDate}</Text>
                      </View>
                      <View>
                        <Text className="text-gray-500 text-xs">Accuracy</Text>
                        <Text className="font-pmedium text-sm" style={{color: '#0A864D'}}>{selectedFactChecker.accuracy}</Text>
                      </View>
                      <View>
                        <Text className="text-gray-500 text-xs">Last Active</Text>
                        <Text className="font-pmedium text-sm">{selectedFactChecker.lastActive}</Text>
                      </View>
                    </View>
                  </View>

                  <View className="bg-green-50 rounded-lg p-4 mb-4">
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-gray-600 text-sm">Total Claims Verified</Text>
                        <Text className="text-2xl font-pbold" style={{color: '#0A864D'}}>
                          {selectedFactChecker.claimsVerified}
                        </Text>
                      </View>
                      <View className="bg-green-100 px-3 py-2 rounded-full">
                        <Text className="text-green-800 font-pmedium text-xs">Active</Text>
                      </View>
                    </View>
                  </View>

                  <Text className="font-psemibold text-base mb-3" style={{color: '#0A864D'}}>
                    Recent Claims Worked On
                  </Text>
                  
                  {selectedFactChecker.recentClaims.map(claim => (
                    <View key={claim.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                      <Text className="font-pmedium text-sm mb-1">{claim.title}</Text>
                      <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center">
                          <View 
                            className="px-2 py-1 rounded-full mr-2"
                            style={{backgroundColor: getStatusColor(claim.status)}}
                          >
                            <Text className="text-white text-xs font-pmedium">
                              {getStatusText(claim.status)}
                            </Text>
                          </View>
                          <Text className="text-gray-500 text-xs">{claim.category}</Text>
                        </View>
                        <Text className="text-gray-500 text-xs">{claim.verifiedDate}</Text>
                      </View>
                    </View>
                  ))}

                  <View className="flex-row gap-2 mt-4">
                    <TouchableOpacity
                      className="flex-1 py-3 rounded-lg bg-red-100"
                      onPress={() => handleFactCheckerAction(selectedFactChecker.id, 'suspend')}>
                      <Text className="text-red-600 text-center font-pmedium">Suspend</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 py-3 rounded-lg bg-gray-100"
                      onPress={() => setSelectedFactChecker(null)}>
                      <Text className="text-gray-600 text-center font-pmedium">Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AdminDashboardScreen;